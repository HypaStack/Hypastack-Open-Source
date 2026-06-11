import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { validateCsrfToken } from "@/lib/security"
import { getCdnAssetById, getTotalStorageUsed, updateCdnAssetAfterSwap } from "@/lib/cdn-model"
import { getPresignedCdnUploadUrl, headCdnObject } from "@/lib/r2"
import { getUserTier } from "@/lib/user-model"
import { getTierLimits } from "@/constants/tier-limits"
import { logOperation } from "@/lib/credits"
import { API_ERRORS } from "@/constants"

/**
 * POST: Initialize a hot swap — returns a presigned PUT URL for the existing R2 key.
 *
 * The client uploads the new file directly to R2, overwriting the old object in-place.
 * The filename in the R2 key stays the same as the original asset — the handler
 * ignores whatever local filename the user picked and uses the original name from the DB.
 */
export async function handleHotSwapInit(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"Authentication required"}`);
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const body = await request.json()
    const { assetId, fileSize, contentType, csrfToken } = body

    if (!assetId || typeof fileSize !== "number" || !contentType || !csrfToken) {
        console.error(`[API Error] 400 Bad Request: ${"Missing required fields"}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
        console.error(`[API Error] 403 Forbidden: ${"Invalid CSRF token"}`);
      return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
    }

    // Verify asset exists and belongs to user
    const asset = await getCdnAssetById(assetId)
    if (!asset || asset.user_id !== currentUser.userId) {
        console.error(`[API Error] 404 Not Found: ${"Asset not found"}`);
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }

    // Credits gate
    const opsResult = await logOperation(currentUser.userId, 'A', 'cdn_hotswap', true)
    if (!opsResult.allowed) {
        console.error(`[API Error] 402 Error: ${opsResult.reason || "Insufficient credits for CDN operations."}`);
      return NextResponse.json({ error: "402 Error" }, { status: 402 })
    }

    // Tier limits check
    const [userTier, currentStorage] = await Promise.all([
      getUserTier(currentUser.userId),
      getTotalStorageUsed(currentUser.userId),
    ])
    const tier = getTierLimits(userTier)

    if (fileSize <= 0 || fileSize > tier.maxCdnFileSize) {
      const limitMB = Math.round(tier.maxCdnFileSize / (1024 * 1024))
        console.error(`[API Error] 413 Payload Too Large: ${`File is too large. Maximum ${limitMB}MB per file on your plan.`}`);
      return NextResponse.json({ error: API_ERRORS.PAYLOAD_TOO_LARGE }, { status: 413 })
    }

    // Storage quota: account for the size difference (new - old)
    const sizeDelta = fileSize - asset.file_size
    if (sizeDelta > 0 && currentStorage + sizeDelta > tier.maxCdnStorage) {
      const remaining = Math.max(0, tier.maxCdnStorage - currentStorage)
      const remainingMB = Math.floor(remaining / (1024 * 1024))
        console.error(`[API Error] 413 Payload Too Large: ${`Not enough storage. You have ${remainingMB}MB remaining.`}`);
      return NextResponse.json({ error: API_ERRORS.PAYLOAD_TOO_LARGE }, { status: 413 })
    }

    // Generate presigned PUT URL for the EXISTING R2 key (overwrites in-place)
    const { uploadUrl } = await getPresignedCdnUploadUrl(
      asset.id,
      asset.original_name,
      contentType,
    )

    return NextResponse.json({
      success: true,
      uploadUrl,
      r2Key: asset.r2_key,
      assetId: asset.id,
      originalName: asset.original_name,
    })
  } catch (error: any) {
    console.error("[CDN Hot Swap Init] Error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to initialize hot swap"}`);
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

/**
 * PUT: Complete a hot swap — verify the new file is in R2, update the DB record.
 */
export async function handleHotSwapComplete(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"Authentication required"}`);
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const body = await request.json()
    const { assetId } = body

    if (!assetId) {
        console.error(`[API Error] 400 Bad Request: ${"Missing assetId"}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    // Verify asset exists and belongs to user
    const asset = await getCdnAssetById(assetId)
    if (!asset || asset.user_id !== currentUser.userId) {
        console.error(`[API Error] 404 Not Found: ${"Asset not found"}`);
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }

    // HEAD the R2 object to confirm the new file landed
    const head = await headCdnObject(asset.r2_key)
    if (!head) {
        console.error(`[API Error] 404 Not Found: ${"Upload not found in storage. Did the upload finish?"}`);
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }

    // Update DB record with new size and content type
    const updated = await updateCdnAssetAfterSwap(asset.id, currentUser.userId, {
      file_size: head.size,
      content_type: head.contentType,
    })

    if (!updated) {
        console.error(`[API Error] 500 Internal Server Error: ${"Failed to update asset record"}`);
      return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      id: asset.id,
      cdnUrl: asset.cdn_url,
      fileName: asset.original_name,
      fileSize: head.size,
      contentType: head.contentType,
    })
  } catch (error: any) {
    console.error("[CDN Hot Swap Complete] Error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to complete hot swap"}`);
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

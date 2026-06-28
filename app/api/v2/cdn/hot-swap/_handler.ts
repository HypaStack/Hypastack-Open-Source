import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { getCurrentUser } from "@/lib/auth"
import { validateCsrfToken } from "@/lib/security"
import { getCdnAssetById, getTotalStorageUsed, updateCdnAssetAfterSwap } from "@/lib/cdn-model"
import { getPresignedCdnUploadUrl, headCdnObject } from "@/lib/r2"
import { getUserTier } from "@/lib/user-model"
import { getTierLimits } from "@/constants/tier-limits"
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
      return apiError(401, API_ERRORS.UNAUTHORIZED, "Authentication required")
    }

    const body = await request.json()
    const { assetId, fileSize, contentType, csrfToken } = body

    if (!assetId || typeof fileSize !== "number" || !contentType || !csrfToken) {
      return apiError(400, API_ERRORS.BAD_REQUEST, "Missing required fields")
    }

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
      return apiError(403, API_ERRORS.FORBIDDEN, "Invalid CSRF token")
    }

    // Verify asset exists and belongs to user
    const asset = await getCdnAssetById(assetId)
    if (!asset || asset.user_id !== currentUser.userId) {
      return apiError(404, API_ERRORS.NOT_FOUND, "Asset not found")
    }

    // Tier limits check
    const [userTier, currentStorage] = await Promise.all([
      getUserTier(currentUser.userId),
      getTotalStorageUsed(currentUser.userId),
    ])
    const tier = getTierLimits(userTier)

    if (fileSize <= 0 || fileSize > tier.maxCdnFileSize) {
      const limitMB = Math.round(tier.maxCdnFileSize / (1024 * 1024))
      return apiError(413, API_ERRORS.PAYLOAD_TOO_LARGE, "File is too large. Maximum ${limitMB}MB per file on your plan.")
    }

    // Storage quota: account for the size difference (new - old)
    const sizeDelta = fileSize - asset.file_size
    if (sizeDelta > 0 && currentStorage + sizeDelta > tier.maxCdnStorage) {
      const remaining = Math.max(0, tier.maxCdnStorage - currentStorage)
      const remainingMB = Math.floor(remaining / (1024 * 1024))
      return apiError(413, API_ERRORS.PAYLOAD_TOO_LARGE, "Not enough storage. You have ${remainingMB}MB remaining.")
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
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to initialize hot swap")
  }
}

/**
 * PUT: Complete a hot swap — verify the new file is in R2, update the DB record.
 */
export async function handleHotSwapComplete(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return apiError(401, API_ERRORS.UNAUTHORIZED, "Authentication required")
    }

    const body = await request.json()
    const { assetId, csrfToken } = body

    if (!assetId || !csrfToken) {
      return apiError(400, API_ERRORS.BAD_REQUEST, "Missing required fields")
    }

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
      return apiError(403, API_ERRORS.FORBIDDEN, "Invalid CSRF token")
    }

    // Verify asset exists and belongs to user
    const asset = await getCdnAssetById(assetId)
    if (!asset || asset.user_id !== currentUser.userId) {
      return apiError(404, API_ERRORS.NOT_FOUND, "Asset not found")
    }

    // HEAD the R2 object to confirm the new file landed
    const head = await headCdnObject(asset.r2_key)
    if (!head) {
      return apiError(404, API_ERRORS.NOT_FOUND, "Upload not found in storage. Did the upload finish?")
    }

    // Authoritative quota check using the ACTUAL uploaded size from R2 — the
    // init-time check used client-reported fileSize which can be falsified.
    const [userTier, currentStorage] = await Promise.all([
      getUserTier(currentUser.userId),
      getTotalStorageUsed(currentUser.userId),
    ])
    const tier = getTierLimits(userTier)
    const actualDelta = head.size - asset.file_size
    if (actualDelta > 0 && currentStorage + actualDelta > tier.maxCdnStorage) {
      const remaining = Math.max(0, tier.maxCdnStorage - currentStorage)
      const remainingMB = Math.floor(remaining / (1024 * 1024))
      return apiError(413, API_ERRORS.PAYLOAD_TOO_LARGE, "Uploaded file exceeds storage quota. You have ${remainingMB}MB remaining.")
    }

    // Update DB record with new size and content type
    const updated = await updateCdnAssetAfterSwap(asset.id, currentUser.userId, {
      file_size: head.size,
      content_type: head.contentType,
    })

    if (!updated) {
      return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to update asset record")
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
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to complete hot swap")
  }
}

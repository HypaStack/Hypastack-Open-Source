import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { getCurrentUser } from "@/lib/security/auth"
import { validateCsrfToken } from "@/lib/security/security"
import { getCdnAssetById, getTotalStorageUsed, updateCdnAssetAfterSwap } from "@/lib/models/cdnModel"
import { getPresignedCdnUploadUrlForKey, headCdnObject } from "@/lib/storage/r2"
import { getUserTier } from "@/lib/models/userModel"
import { getTierLimits } from "@/constants/tier-limits"
import { API_ERRORS } from "@/constants"

// Presigns a PUT for the existing R2 key, overwriting in-place. Filename in the
// key stays the DB's original, ignoring whatever local filename the user picked.
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
      return apiError(413, API_ERRORS.PAYLOAD_TOO_LARGE, `File is too large, the max is ${limitMB}MB per file on your plan.`)
    }

    // Storage quota: account for the size difference (new - old)
    const sizeDelta = fileSize - asset.file_size
    if (sizeDelta > 0 && currentStorage + sizeDelta > tier.maxCdnStorage) {
      const remaining = Math.max(0, tier.maxCdnStorage - currentStorage)
      const remainingMB = Math.floor(remaining / (1024 * 1024))
      return apiError(413, API_ERRORS.PAYLOAD_TOO_LARGE, `Not enough storage. You have ${remainingMB}MB remaining.`)
    }

    // Presign the EXISTING R2 key so the new bytes overwrite in place. Derive
    // it from the stored key, not from asset.id, once an asset has a slug the
    // id is no longer the path segment, and presigning cdn/<id>/<name> would
    // write an orphan while the live object stayed untouched.
    const { uploadUrl } = await getPresignedCdnUploadUrlForKey(asset.r2_key, contentType)

    return NextResponse.json({
      success: true,
      uploadUrl,
      r2Key: asset.r2_key,
      assetId: asset.id,
      originalName: asset.original_name,
    })
  } catch (error) {
    console.error("[CDN Hot Swap Init] Error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to initialize hot swap")
  }
}

/**
 * PUT: Complete a hot swap, verify the new file is in R2, update the DB record.
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

    // Authoritative quota check using the ACTUAL uploaded size from R2, the
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
  } catch (error) {
    console.error("[CDN Hot Swap Complete] Error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to complete hot swap")
  }
}

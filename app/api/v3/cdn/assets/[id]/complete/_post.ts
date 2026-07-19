import { withApiKey } from "@/lib/http/v3/withApiKey"
import { v3Ok, v3Error } from "@/lib/http/v3/respond"
import { V3_CODES } from "@/lib/http/v3/codes"
import { loadOwnedCdnAsset } from "@/lib/http/v3/owned"
import { toV3CdnAsset } from "@/lib/http/v3/serialize"
import { headCdnObject } from "@/lib/storage/r2"
import {
  createCdnAsset,
  getCdnAssetById,
  getCdnStaging,
  deleteCdnStaging,
  getTotalStorageUsed,
  updateCdnAssetAfterSwap,
} from "@/lib/models/cdnModel"
import { getTierLimits } from "@/constants/tier-limits"

/**
 * Finalises whatever upload is outstanding for this id — a first upload or a
 * swap. One endpoint for both so the flow a developer learns (init → PUT →
 * complete) is identical either way.
 *
 * Sizes come from R2's HEAD rather than the caller's claim, so the quota is
 * enforced against the bytes that actually landed.
 */
export const POST = withApiKey<{ id: string }>(async ({ requestId, userId, tier, params, rate }) => {
  const limits = getTierLimits(tier)

  // Already an asset → this completes a swap.
  const existing = await loadOwnedCdnAsset(params.id, userId)
  if (existing) {
    const head = await headCdnObject(existing.r2_key)
    if (!head) {
      return v3Error(V3_CODES.INVALID_REQUEST, requestId, {
        message: "No uploaded object was found for this asset yet. PUT to the upload_url first.",
        rate,
      })
    }

    if (head.size > limits.maxCdnFileSize) {
      return v3Error(V3_CODES.FILE_TOO_LARGE, requestId, {
        message: `That file is ${head.size} bytes; your plan allows ${limits.maxCdnFileSize} per CDN asset.`,
        rate,
      })
    }

    const delta = head.size - existing.file_size
    if (delta > 0) {
      const used = await getTotalStorageUsed(userId)
      if (used + delta > limits.maxCdnStorage) {
        return v3Error(V3_CODES.QUOTA_EXCEEDED, requestId, {
          message: "That upload would exceed your plan's CDN storage.",
          rate,
        })
      }
    }

    await updateCdnAssetAfterSwap(existing.id, userId, {
      file_size: head.size,
      content_type: head.contentType,
    })

    const refreshed = await getCdnAssetById(existing.id)
    return v3Ok(toV3CdnAsset(refreshed ?? { ...existing, file_size: head.size, content_type: head.contentType }), requestId, rate)
  }

  const staging = await getCdnStaging(params.id)
  if (!staging || staging.user_id !== userId) {
    return v3Error(V3_CODES.NOT_FOUND, requestId, { rate })
  }

  const head = await headCdnObject(staging.r2_key)
  if (!head) {
    return v3Error(V3_CODES.INVALID_REQUEST, requestId, {
      message: "No uploaded object was found for this id yet. PUT to the upload_url first.",
      rate,
    })
  }

  if (head.size > limits.maxCdnFileSize) {
    return v3Error(V3_CODES.FILE_TOO_LARGE, requestId, {
      message: `That file is ${head.size} bytes; your plan allows ${limits.maxCdnFileSize} per CDN asset.`,
      rate,
    })
  }

  const used = await getTotalStorageUsed(userId)
  if (used + head.size > limits.maxCdnStorage) {
    return v3Error(V3_CODES.QUOTA_EXCEEDED, requestId, {
      message: "That upload would exceed your plan's CDN storage.",
      rate,
    })
  }

  const cdnDomain = process.env.R2_CDN_DOMAIN
  if (!cdnDomain) {
    return v3Error(V3_CODES.INTERNAL_ERROR, requestId, { log: "R2_CDN_DOMAIN is not configured", rate })
  }

  await createCdnAsset({
    id: staging.id,
    user_id: userId,
    r2_key: staging.r2_key,
    original_name: staging.original_name,
    file_size: head.size,
    content_type: head.contentType,
    cdn_url: `https://${cdnDomain}/cdn/${staging.id}/${encodeURIComponent(staging.original_name)}`,
  })
  await deleteCdnStaging(staging.id)

  const asset = await getCdnAssetById(staging.id)
  if (!asset) {
    return v3Error(V3_CODES.INTERNAL_ERROR, requestId, {
      log: `cdn asset ${staging.id} did not read back after insert`,
      rate,
    })
  }

  return v3Ok(toV3CdnAsset(asset), requestId, rate)
}, { scope: "cdn.write", label: "cdn complete" })

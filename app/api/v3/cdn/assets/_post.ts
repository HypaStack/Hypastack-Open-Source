import { z } from "zod"
import { withApiKey } from "@/lib/http/v3/withApiKey"
import { v3Ok, v3Error } from "@/lib/http/v3/respond"
import { V3_CODES } from "@/lib/http/v3/codes"
import { parseBody, readJson } from "@/lib/http/v3/validate"
import { getPresignedCdnUploadUrl } from "@/lib/storage/r2"
import { isExtensionBlocked } from "@/lib/validation/fileValidation"
import { sanitizeCdnFilename } from "@/lib/security/zeroTrust"
import { generateCdnId, getTotalStorageUsed, getUserCdnStats, createCdnStaging } from "@/lib/models/cdnModel"
import { getUserFileStats } from "@/lib/models/fileModel"
import { getTierLimits } from "@/constants/tier-limits"

const Body = z.object({
  name: z.string().min(1).max(200),
  size: z.number().int().positive(),
  content_type: z.string().min(1).max(255),
})

export const POST = withApiKey(async ({ request, requestId, userId, tier, rate }) => {
  const json = await readJson(request)
  if (!json.ok) {
    return v3Error(V3_CODES.INVALID_REQUEST, requestId, { message: "The request body is not valid JSON.", rate })
  }

  const parsed = parseBody(Body, json.value)
  if (!parsed.ok) {
    return v3Error(V3_CODES.INVALID_REQUEST, requestId, {
      message: parsed.failure.message,
      param: parsed.failure.param,
      rate,
    })
  }

  const { name, size, content_type } = parsed.value
  const limits = getTierLimits(tier)

  if (size > limits.maxCdnFileSize) {
    return v3Error(V3_CODES.FILE_TOO_LARGE, requestId, {
      message: `That file is ${size} bytes; your plan allows ${limits.maxCdnFileSize} per CDN asset.`,
      param: "size",
      rate,
    })
  }

  if (isExtensionBlocked(name)) {
    return v3Error(V3_CODES.INVALID_REQUEST, requestId, {
      message: "That file type is not allowed on the CDN.",
      param: "name",
      rate,
    })
  }

  const sanitized = sanitizeCdnFilename(name)
  if (!sanitized.isValid) {
    return v3Error(V3_CODES.INVALID_REQUEST, requestId, {
      message: sanitized.error || "That filename is not valid.",
      param: "name",
      rate,
    })
  }

  const [storageUsed, cdnStats, fileStats] = await Promise.all([
    getTotalStorageUsed(userId),
    getUserCdnStats(userId),
    getUserFileStats(userId),
  ])

  if (cdnStats.totalAssets + 1 > limits.maxCdnLinks) {
    return v3Error(V3_CODES.QUOTA_EXCEEDED, requestId, {
      message: `You have reached your plan's limit of ${limits.maxCdnLinks} CDN assets.`,
      rate,
    })
  }

  if (limits.maxTotalFiles > 0 && fileStats.activeFiles + cdnStats.totalAssets + 1 > limits.maxTotalFiles) {
    return v3Error(V3_CODES.QUOTA_EXCEEDED, requestId, {
      message: `You have reached your plan's limit of ${limits.maxTotalFiles} files.`,
      rate,
    })
  }

  if (storageUsed + size > limits.maxCdnStorage) {
    return v3Error(V3_CODES.QUOTA_EXCEEDED, requestId, {
      message: "That upload would exceed your plan's CDN storage.",
      rate,
    })
  }

  const cdnId = generateCdnId()
  const { uploadUrl, r2Key } = await getPresignedCdnUploadUrl(cdnId, sanitized.sanitized, content_type)

  await createCdnStaging({
    id: cdnId,
    user_id: userId,
    r2_key: r2Key,
    original_name: sanitized.sanitized,
    content_type,
  })

  return v3Ok(
    {
      object: "upload",
      id: cdnId,
      upload_url: uploadUrl,
      upload_method: "PUT",
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    },
    requestId,
    rate,
    201,
  )
}, { scope: "cdn.write", label: "cdn create" })

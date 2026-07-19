import { z } from "zod"
import { withApiKey } from "@/lib/http/v3/withApiKey"
import { v3Ok, v3Error } from "@/lib/http/v3/respond"
import { V3_CODES } from "@/lib/http/v3/codes"
import { parseBody, readJson } from "@/lib/http/v3/validate"
import { generateFileId, getExpirationDate, getCustomExpirationDate, getPresignedUploadUrlByKey } from "@/lib/storage/r2"
import { encryptFilename, generateOpaqueStorageName } from "@/lib/security/filenameCrypto"
import { createStagingRecord, getUserFileStats } from "@/lib/models/fileModel"
import { getUserCdnStats } from "@/lib/models/cdnModel"
import { getTierLimits } from "@/constants/tier-limits"

const Body = z.object({
  name: z.string().min(1).max(200),
  size: z.number().int().positive(),
  content_type: z.string().min(1).max(255),
  /** Seconds. Clamped server-side to [60, 30 days]. */
  expires_in: z.number().int().positive().optional(),
  burn_on_read: z.boolean().optional(),
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

  const { name, size, content_type, expires_in, burn_on_read } = parsed.value
  const limits = getTierLimits(tier)

  if (size > limits.maxNormalUploadSize) {
    return v3Error(V3_CODES.FILE_TOO_LARGE, requestId, {
      message: `That file is ${size} bytes; your plan allows ${limits.maxNormalUploadSize}.`,
      param: "size",
      rate,
    })
  }

  // Combined Drive + CDN ceiling, same rule the dashboard enforces.
  if (limits.maxTotalFiles > 0) {
    const [fileStats, cdnStats] = await Promise.all([
      getUserFileStats(userId),
      getUserCdnStats(userId),
    ])
    if (fileStats.activeFiles + cdnStats.totalAssets >= limits.maxTotalFiles) {
      return v3Error(V3_CODES.QUOTA_EXCEEDED, requestId, {
        message: `You have reached your plan's limit of ${limits.maxTotalFiles} files.`,
        rate,
      })
    }
  }

  const fileId = generateFileId()
  const r2Key = `uploads/${fileId}/${generateOpaqueStorageName()}`
  const expiresAt = expires_in
    ? getCustomExpirationDate(Math.max(1, Math.round(expires_in / 60)))
    : getExpirationDate(size, limits.expirationMultiplier)

  const uploadUrl = await getPresignedUploadUrlByKey(r2Key, content_type)
  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/d/${fileId}`

  // The insert is quota-guarded in one statement, so two concurrent calls can't
  // both slip past the link limit.
  const staged = await createStagingRecord({
    id: fileId,
    r2_key: r2Key,
    original_name: encryptFilename(name),
    file_size: size,
    content_type,
    expires_at: expiresAt,
    burn_on_read: burn_on_read === true,
    share_url: shareUrl,
    user_id: userId,
    encryption_total_parts: 1,
  }, limits.maxFileLinks)

  if (!staged) {
    return v3Error(V3_CODES.QUOTA_EXCEEDED, requestId, {
      message: `You have reached your plan's limit of ${limits.maxFileLinks} active file links.`,
      rate,
    })
  }

  return v3Ok(
    {
      object: "upload",
      id: fileId,
      upload_url: uploadUrl,
      upload_method: "PUT",
      expires_at: expiresAt.toISOString(),
    },
    requestId,
    rate,
    201,
  )
}, { scope: "files.write", label: "files create" })

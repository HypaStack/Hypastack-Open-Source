import { z } from "zod"
import { withApiKey } from "@/lib/http/v3/withApiKey"
import { v3Ok, v3Error } from "@/lib/http/v3/respond"
import { V3_CODES } from "@/lib/http/v3/codes"
import { parseBody, readJson } from "@/lib/http/v3/validate"
import { loadOwnedCdnAsset } from "@/lib/http/v3/owned"
import { getPresignedCdnUploadUrl } from "@/lib/storage/r2"
import { getTotalStorageUsed } from "@/lib/models/cdnModel"
import { getTierLimits } from "@/constants/tier-limits"

const Body = z.object({
  size: z.number().int().positive(),
  content_type: z.string().min(1).max(255),
})

/**
 * Replace an asset's bytes in place — same id, same public URL. The presign
 * targets the asset's existing r2_key, so a deploy can repoint a live URL
 * without every consumer having to learn a new one.
 *
 * The path segment is read back out of the stored key rather than rebuilt from
 * the id: an asset created with a custom slug lives at `cdn/<slug>/<name>`, and
 * rebuilding from the id would silently write to a different object.
 */
export const POST = withApiKey<{ id: string }>(async ({ request, requestId, userId, tier, params, rate }) => {
  const asset = await loadOwnedCdnAsset(params.id, userId)
  if (!asset) return v3Error(V3_CODES.NOT_FOUND, requestId, { rate })

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

  const { size, content_type } = parsed.value
  const limits = getTierLimits(tier)

  if (size > limits.maxCdnFileSize) {
    return v3Error(V3_CODES.FILE_TOO_LARGE, requestId, {
      message: `That file is ${size} bytes; your plan allows ${limits.maxCdnFileSize} per CDN asset.`,
      param: "size",
      rate,
    })
  }

  // Only the growth counts against the quota — the old bytes are being replaced.
  const delta = size - asset.file_size
  if (delta > 0) {
    const used = await getTotalStorageUsed(userId)
    if (used + delta > limits.maxCdnStorage) {
      return v3Error(V3_CODES.QUOTA_EXCEEDED, requestId, {
        message: "That upload would exceed your plan's CDN storage.",
        rate,
      })
    }
  }

  const segments = asset.r2_key.split("/")
  const pathSegment = segments[1] ?? asset.id
  const fileName = segments.slice(2).join("/") || asset.original_name

  const { uploadUrl } = await getPresignedCdnUploadUrl(pathSegment, fileName, content_type)

  return v3Ok(
    {
      object: "upload",
      id: asset.id,
      upload_url: uploadUrl,
      upload_method: "PUT",
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    },
    requestId,
    rate,
  )
}, { scope: "cdn.write", label: "cdn swap" })

import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { checkFunnelUploadRateLimit } from "@/lib/data/rateLimit"
import { getHashedIp } from "@/lib/http/ip"
import { headCdnObject, deleteByKey } from "@/lib/storage/r2"
import { completeMultipartUpload } from "@/lib/storage/r2Multipart"
import { getTotalStorageUsed } from "@/lib/models/cdnModel"
import { getUserById } from "@/lib/models/userModel"
import { getTierLimits, normalizeTier } from "@/constants/tier-limits"
import {
  getActiveFunnelBySlug,
  consumeFunnel,
  createFunnelFile,
  funnelObjectKey,
  deleteFunnelStaging,
} from "@/lib/models/funnelModel"
import { API_ERRORS } from "@/constants"

const FILE_ID_RE = /^[a-z0-9]{12}$/
const MAX_NAME = 2000
const MAX_WRAPPED_KEY = 1500

// Finalize a drop: verify the ciphertext landed, claim the one-time link (burns
// it), and record the received file with the crypto material the owner needs.
export async function handleFunnelComplete(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  try {
    const { slug } = await params

    const rl = await checkFunnelUploadRateLimit(getHashedIp(request))
    if (!rl.allowed) return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "429 Too Many Requests")

    const body = await request.json()
    const { fileId, uploadId, parts, nameEncrypted, wrappedKey, contentType, chunkSize, totalParts } = body

    if (typeof fileId !== "string" || !FILE_ID_RE.test(fileId)) {
      return apiError(400, API_ERRORS.BAD_REQUEST, "Invalid file id")
    }
    if (typeof nameEncrypted !== "string" || !nameEncrypted || nameEncrypted.length > MAX_NAME) {
      return apiError(400, API_ERRORS.BAD_REQUEST, "Invalid encrypted name")
    }
    if (typeof wrappedKey !== "string" || !wrappedKey || wrappedKey.length > MAX_WRAPPED_KEY) {
      return apiError(400, API_ERRORS.BAD_REQUEST, "Invalid wrapped key")
    }

    const funnel = await getActiveFunnelBySlug(slug)
    if (!funnel) return apiError(410, API_ERRORS.GONE, "This funnel link is already closed.")

    const r2Key = funnelObjectKey(funnel.id, fileId)

    // Finalize the multipart object before we can HEAD it.
    if (uploadId && Array.isArray(parts)) {
      const normalized = parts
        .map((p: any) => ({ partNumber: Number(p.partNumber), etag: String(p.etag) }))
        .filter((p) => Number.isInteger(p.partNumber) && p.etag)
      if (normalized.length === 0) return apiError(400, API_ERRORS.BAD_REQUEST, "Missing upload parts")
      await completeMultipartUpload({ r2Key, uploadId, parts: normalized })
    }

    const head = await headCdnObject(r2Key)
    if (!head) return apiError(404, API_ERRORS.NOT_FOUND, "Upload not found in storage. Did it finish?")

    // Re-check the owner's storage against the real (R2-reported) size.
    const owner = await getUserById(funnel.user_id)
    if (!owner) return apiError(410, API_ERRORS.GONE, "This funnel link is already closed.")
    const tier = getTierLimits(normalizeTier(owner.tier))
    const currentStorage = await getTotalStorageUsed(funnel.user_id)
    if (currentStorage + head.size > tier.maxCdnStorage) {
      await deleteByKey(r2Key).catch(() => {})
      return apiError(413, API_ERRORS.PAYLOAD_TOO_LARGE, "The recipient doesn't have enough storage for this file.")
    }

    // Atomically claim the one-time link. If a concurrent drop already won, back out.
    const claimed = await consumeFunnel(funnel.id)
    if (!claimed) {
      await deleteByKey(r2Key).catch(() => {})
      return apiError(410, API_ERRORS.GONE, "This funnel link is already closed.")
    }

    try {
      await createFunnelFile({
        id: fileId,
        funnel_id: funnel.id,
        user_id: funnel.user_id,
        r2_key: r2Key,
        name_encrypted: nameEncrypted,
        file_size: head.size,
        content_type: typeof contentType === "string" && contentType ? contentType.slice(0, 200) : "application/octet-stream",
        wrapped_key: wrappedKey,
        encryption_chunk_size: Number.isInteger(chunkSize) ? chunkSize : null,
        encryption_total_parts: Number.isInteger(totalParts) ? totalParts : null,
      })
    } catch (e) {
      await deleteByKey(r2Key).catch(() => {})
      throw e
    }

    // Clear the in-flight marker so the sweep won't touch this now-live object.
    // Best-effort: the sweep also skips ids that became a funnel_files row.
    await deleteFunnelStaging(fileId).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Funnel Complete] error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "500 Internal Server Error")
  }
}

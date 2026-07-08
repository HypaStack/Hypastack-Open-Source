import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { validateCsrfToken } from "@/lib/security/security"
import { verifyTurnstileToken } from "@/lib/security/turnstile"
import { checkFunnelUploadRateLimit } from "@/lib/data/rateLimit"
import { getHashedIp } from "@/lib/http/ip"
import { getActiveFunnelBySlug, generateFunnelFileId, funnelObjectKey, createFunnelStaging } from "@/lib/models/funnelModel"
import { getUserById } from "@/lib/models/userModel"
import { getTotalStorageUsed } from "@/lib/models/cdnModel"
import { getTierLimits, normalizeTier } from "@/constants/tier-limits"
import { getPresignedUploadUrlByKey } from "@/lib/storage/r2"
import { initiateMultipartUpload } from "@/lib/storage/r2Multipart"
import { API_ERRORS, MULTIPART_THRESHOLD, DEFAULT_CHUNK_SIZE } from "@/constants"

// Anonymous sender init: size-check against the OWNER's tier, then hand back a
// presigned URL (or multipart URLs) for the encrypted bytes. The object name is
// opaque (the real filename is E2E-encrypted and posted at complete).
export async function handleFunnelInit(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  try {
    const { slug } = await params

    const rl = await checkFunnelUploadRateLimit(getHashedIp(request))
    if (!rl.allowed) return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "429 Too Many Requests")

    const body = await request.json()
    const { fileSize, contentType, csrfToken, turnstileToken } = body

    if (!csrfToken || !(await validateCsrfToken(csrfToken))) {
      return apiError(403, API_ERRORS.FORBIDDEN, "Invalid CSRF Token")
    }
    if (process.env.NODE_ENV !== "development") {
      const turnstile = await verifyTurnstileToken(turnstileToken)
      if (!turnstile.success) {
        return apiError(403, API_ERRORS.FORBIDDEN, turnstile.error || "Security Verification Failed")
      }
    }

    if (typeof fileSize !== "number" || !Number.isFinite(fileSize) || fileSize <= 0) {
      return apiError(400, API_ERRORS.BAD_REQUEST, "Invalid file size")
    }

    const funnel = await getActiveFunnelBySlug(slug)
    if (!funnel) return apiError(404, API_ERRORS.NOT_FOUND, "This funnel link is closed or doesn't exist.")

    const owner = await getUserById(funnel.user_id)
    if (!owner) return apiError(404, API_ERRORS.NOT_FOUND, "This funnel link is closed or doesn't exist.")

    const tier = getTierLimits(normalizeTier(owner.tier))
    if (fileSize > tier.maxFunnelUploadSize) {
      const limitMB = Math.round(tier.maxFunnelUploadSize / (1024 * 1024))
      return apiError(413, API_ERRORS.PAYLOAD_TOO_LARGE, `File exceeds this funnel's ${limitMB}MB limit.`)
    }

    // Funnel storage counts toward the owner's persistent storage pool.
    const currentStorage = await getTotalStorageUsed(funnel.user_id)
    if (currentStorage + fileSize > tier.maxCdnStorage) {
      return apiError(413, API_ERRORS.PAYLOAD_TOO_LARGE, "The recipient doesn't have enough storage for this file.")
    }

    const fileId = generateFunnelFileId()
    const r2Key = funnelObjectKey(funnel.id, fileId)

    // Record the in-flight drop before issuing the upload URL, so an abandoned
    // upload's object is always sweepable (no orphan without a staging row).
    await createFunnelStaging(fileId, funnel.id, r2Key)

    if (fileSize > MULTIPART_THRESHOLD) {
      const totalParts = Math.ceil(fileSize / DEFAULT_CHUNK_SIZE)
      const { uploadId, presignedUrls } = await initiateMultipartUpload({
        r2Key,
        contentType: "application/octet-stream",
        totalParts,
      })
      return NextResponse.json({
        kind: "multipart",
        fileId,
        uploadId,
        presignedUrls,
        chunkSize: DEFAULT_CHUNK_SIZE,
        totalParts,
      })
    }

    const uploadUrl = await getPresignedUploadUrlByKey(r2Key, "application/octet-stream")
    return NextResponse.json({ kind: "simple", fileId, uploadUrl })
  } catch (error) {
    console.error("[Funnel Init] error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "500 Internal Server Error")
  }
}

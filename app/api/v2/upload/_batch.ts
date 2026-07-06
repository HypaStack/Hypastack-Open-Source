import { NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { getPresignedUploadUrlByKey, generateFileId, getExpirationDate, getCustomExpirationDate } from "@/lib/storage/r2"
import { initiateMultipartUpload, abortMultipartUpload } from "@/lib/storage/r2Multipart"
import { encryptFilename, generateOpaqueStorageName } from "@/lib/security/filenameCrypto"
import { createStagingRecord, deleteStagingRecord, getUserFileStats } from "@/lib/models/fileModel"
import { resolveUploadFolder } from "@/lib/models/folderModel"
import { getUserCdnStats } from "@/lib/models/cdnModel"
import { verifyTurnstileToken } from "@/lib/security/turnstile"
import { validateCsrfToken } from "@/lib/security/security"
import { checkUploadRateLimit } from "@/lib/data/rateLimit"
import { generateProxyToken } from "@/lib/security/auth"
import { sanitizeNote, sanitizeFilename } from "@/lib/security/zeroTrust"
import { getUserTier } from "@/lib/models/userModel"
import { getTierLimits, normalizeTier, isPaidTier } from "@/constants/tier-limits"
import { API_ERRORS, MULTIPART_THRESHOLD, DEFAULT_CHUNK_SIZE } from "@/constants"

interface BatchFileInput {
  fileName: string
  fileSize: number
  contentType: string
  path?: string
}

// Tracks R2/DB side-effects so a mid-batch quota race can be fully rolled back
// instead of orphaning staging rows or multipart uploads.
interface Created {
  fileId: string
  multipart?: { r2Key: string; uploadId: string }
}

async function rollback(created: Created[]) {
  for (const c of created) {
    await deleteStagingRecord(c.fileId).catch(() => {})
    if (c.multipart) {
      await abortMultipartUpload(c.multipart).catch(() => {})
    }
  }
}

/**
 * Batched Drive upload init: verifies CSRF + Turnstile + rate limit ONCE for
 * the whole upload (one solved Turnstile token backs the entire batch), then
 * stages every file and returns a per-file presigned target. Small files get a
 * single PUT URL; files over the multipart threshold get multipart init data.
 * This is the multi-file counterpart to the single-file handler in _handler.ts.
 */
export async function handleUploadBatch(body: any, userId: string) {
  const files: BatchFileInput[] = Array.isArray(body.files) ? body.files : []
  const { burnOnRead, turnstileToken, csrfToken, customFilename, expiresInMinutes, note, folderId } = body

  if (files.length === 0) {
    return apiError(400, API_ERRORS.BAD_REQUEST, "No files provided")
  }

  const csrfValid = await validateCsrfToken(csrfToken)
  if (!csrfValid) {
    return apiError(403, API_ERRORS.FORBIDDEN, "Invalid security token. Please refresh the page and try again.")
  }

  const [userTier, fileStats, cdnStats] = await Promise.all([
    getUserTier(userId),
    getUserFileStats(userId),
    getUserCdnStats(userId),
  ])
  const tier = getTierLimits(userTier)

  const rateLimit = await checkUploadRateLimit(userId, userTier)
  if (!rateLimit.allowed) {
    return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "Rate limit reached, try again later")
  }

  if (process.env.NODE_ENV !== "development") {
    const turnstileResult = await verifyTurnstileToken(turnstileToken)
    if (!turnstileResult.success) {
      return apiError(403, API_ERRORS.FORBIDDEN, turnstileResult.error || "Security verification failed")
    }
  }

  if (files.length > tier.maxFilesPerUpload) {
    return apiError(400, API_ERRORS.BAD_REQUEST, `Too many files. Max ${tier.maxFilesPerUpload} per upload on your plan.`)
  }

  // Whole-batch quota gate (fast fail). The atomic guard inside
  // createStagingRecord is the per-insert backstop against concurrent races.
  if (fileStats.activeFiles + files.length > tier.maxFileLinks) {
    return apiError(403, API_ERRORS.FORBIDDEN, `You have reached your limit of ${tier.maxFileLinks} active file links on your current plan.`)
  }
  if (tier.maxTotalFiles > 0 && fileStats.activeFiles + cdnStats.totalAssets + files.length > tier.maxTotalFiles) {
    return apiError(403, API_ERRORS.FORBIDDEN, `You have reached your total limit of ${tier.maxTotalFiles} files (Drive + CDN combined). Upgrade your plan or delete existing files.`)
  }

  for (const f of files) {
    if (!f.fileName || typeof f.fileSize !== "number" || !f.contentType) {
      return apiError(400, API_ERRORS.BAD_REQUEST, "Missing required fields")
    }
    if (f.fileName.length > 200) {
      return apiError(400, API_ERRORS.BAD_REQUEST, "Filename too long. Max 200 characters.")
    }
    if (f.fileSize > tier.maxNormalUploadSize) {
      const limitMB = Math.round(tier.maxNormalUploadSize / (1024 * 1024))
      return apiError(413, API_ERRORS.PAYLOAD_TOO_LARGE, `File too large. Max ${limitMB}MB on your plan.`)
    }
  }

  const useCustomExpiry = isPaidTier(normalizeTier(userTier)) && typeof expiresInMinutes === "number" && expiresInMinutes > 0
  const sanitizedCustomFilename = customFilename ? sanitizeFilename(customFilename).sanitized || null : null
  const sanitizedNote = note ? sanitizeNote(note) : null
  const encryptedCustomFilename = sanitizedCustomFilename ? encryptFilename(sanitizedCustomFilename) : null

  const created: Created[] = []
  const results: any[] = []

  try {
    for (const f of files) {
      const fileId = generateFileId()
      const storageName = generateOpaqueStorageName()
      const r2Key = `uploads/${fileId}/${storageName}`
      const expiresAt = useCustomExpiry
        ? getCustomExpirationDate(expiresInMinutes)
        : getExpirationDate(f.fileSize, tier.expirationMultiplier)
      const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/d/${fileId}`

      const folderResult = await resolveUploadFolder(userId, folderId, f.path)
      if (!folderResult.ok) {
        await rollback(created)
        return apiError(403, API_ERRORS.FORBIDDEN, "Folder not found or unauthorized")
      }

      const isMultipart = f.fileSize > MULTIPART_THRESHOLD
      const chunkSize = DEFAULT_CHUNK_SIZE
      const totalParts = isMultipart ? Math.ceil(f.fileSize / chunkSize) : 1

      let multipart: { uploadId: string; presignedUrls: string[] } | null = null
      if (isMultipart) {
        multipart = await initiateMultipartUpload({
          r2Key,
          contentType: f.contentType || "application/octet-stream",
          totalParts,
        })
      }

      // Track before staging so a failed insert or a later throw still aborts
      // the multipart upload and clears any staging row (delete is a no-op if
      // the insert never landed).
      created.push({ fileId, multipart: multipart ? { r2Key, uploadId: multipart.uploadId } : undefined })

      const staged = await createStagingRecord({
        id: fileId,
        r2_key: r2Key,
        original_name: encryptFilename(f.fileName),
        file_size: f.fileSize,
        content_type: f.contentType,
        expires_at: expiresAt,
        burn_on_read: burnOnRead === true,
        share_url: shareUrl,
        custom_filename: encryptedCustomFilename,
        note: sanitizedNote,
        user_id: userId,
        encryption_chunk_size: isMultipart ? chunkSize : null,
        encryption_total_parts: totalParts,
        folder_id: folderResult.folderId,
        slug: null,
      }, tier.maxFileLinks)

      if (!staged) {
        await rollback(created)
        return apiError(403, API_ERRORS.FORBIDDEN, `You have reached your limit of ${tier.maxFileLinks} active file links on your current plan.`)
      }

      if (isMultipart && multipart) {
        results.push({
          fileId,
          kind: "multipart",
          uploadId: multipart.uploadId,
          presignedUrls: multipart.presignedUrls,
          totalParts,
          chunkSize,
          shareUrl,
          expiresAt: expiresAt.toISOString(),
        })
      } else {
        results.push({
          fileId,
          kind: "simple",
          uploadUrl: await getPresignedUploadUrlByKey(r2Key, f.contentType),
          proxyToken: generateProxyToken(fileId),
          shareUrl,
          expiresAt: expiresAt.toISOString(),
        })
      }
    }
  } catch (e) {
    await rollback(created)
    throw e
  }

  return NextResponse.json({ success: true, files: results })
}

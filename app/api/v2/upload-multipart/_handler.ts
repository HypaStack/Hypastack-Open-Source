import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { getCurrentUser } from "@/lib/security/auth"
import { validateCsrfToken } from "@/lib/security/security"
import { verifyTurnstileToken } from "@/lib/security/turnstile"
import { checkUploadRateLimit } from "@/lib/data/rateLimit"
import { generateFileId, getExpirationDate } from "@/lib/storage/r2"
import { createStagingRecord, getUserFileStats } from "@/lib/models/fileModel"
import { getUserCdnStats } from "@/lib/models/cdnModel"
import { getUserTier } from "@/lib/models/userModel"
import { getTierLimits } from "@/constants/tier-limits"
import { initiateMultipartUpload, abortMultipartUpload } from "@/lib/storage/r2Multipart"
import { sanitizeNote, sanitizeFilename } from "@/lib/security/zeroTrust"
import { DEFAULT_CHUNK_SIZE } from "@/lib/storage/multipart"
import { encryptFilename, generateOpaqueStorageName } from "@/lib/security/filenameCrypto"
import { resolveUploadFolder } from "@/lib/models/folderModel"
import { API_ERRORS } from "@/constants"

export async function handleUploadMultipartPost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        return apiError(401, API_ERRORS.UNAUTHORIZED, "401 Authentication Required")
    }

    const body = await request.json()
    const {
      fileName,
      fileSize,
      contentType,

      burnOnRead,
      csrfToken,
      turnstileToken,
      customFilename,
      chunkSize: clientChunkSize,
      path,
      folderId,
      note,
    } = body

    if (!fileName || !fileSize || !contentType) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "400 Missing Required Fields")
    }

    if (fileName.length > 200) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "400 File Name Too Long")
    }

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
        return apiError(403, API_ERRORS.FORBIDDEN, "403 Invalid CSRF Token")
    }

    if (process.env.NODE_ENV !== "development") {
      const turnstileResult = await verifyTurnstileToken(turnstileToken)
      if (!turnstileResult.success) {
        return apiError(403, API_ERRORS.FORBIDDEN, turnstileResult.error || "Security Verification Failed")
      }
    }

    const [userTier, fileStats, cdnStats] = await Promise.all([
      getUserTier(currentUser.userId),
      getUserFileStats(currentUser.userId),
      getUserCdnStats(currentUser.userId),
    ])
    const tier = getTierLimits(userTier)

    const rateLimit = await checkUploadRateLimit(currentUser.userId, userTier)
    if (!rateLimit.allowed) {
        return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "429 Too Many Requests")
    }

    if (fileSize > tier.maxNormalUploadSize) {
        return apiError(413, API_ERRORS.PAYLOAD_TOO_LARGE, `413 File Too Large`)
    }

    if (fileStats.activeFiles >= tier.maxFileLinks) {
        return apiError(403, API_ERRORS.FORBIDDEN, `403 Active File Limit Reached`)
    }

    if (tier.maxTotalFiles > 0) {
      const totalFiles = fileStats.activeFiles + cdnStats.totalAssets
      if (totalFiles >= tier.maxTotalFiles) {
          return apiError(403, API_ERRORS.FORBIDDEN, `403 Total File Limit Reached`)
      }
    }

    const sanitizedCustomFilename = customFilename
      ? sanitizeFilename(customFilename).sanitized || null
      : null
    const sanitizedNote = note ? sanitizeNote(note) : null

    const fileId = generateFileId()
    const storageName = generateOpaqueStorageName()
    const r2Key = `uploads/${fileId}/${storageName}`
    const expiresAt = getExpirationDate(fileSize, tier.expirationMultiplier)
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/d/${fileId}`

    const chunkSize = clientChunkSize || DEFAULT_CHUNK_SIZE
    const totalParts = Math.ceil(fileSize / chunkSize)

    const { uploadId, presignedUrls } = await initiateMultipartUpload({
      r2Key,
      contentType: contentType || "application/octet-stream",
      totalParts,
    })

    const encryptedOriginalName = encryptFilename(fileName)
    const encryptedCustomFilename = sanitizedCustomFilename
      ? encryptFilename(sanitizedCustomFilename)
      : null

    const folderResult = await resolveUploadFolder(currentUser.userId, folderId, path)
    if (!folderResult.ok) {
      return apiError(403, API_ERRORS.FORBIDDEN, "403 Folder Not Found")
    }
    const finalFolderId = folderResult.folderId

    // Pass the tier limit so the insert is quota-guarded atomically at the DB
    // level. The pre-check above is only a fast early-out; this closes the
    // TOCTOU race where concurrent multipart inits could both pass that check.
    const staged = await createStagingRecord({
      id: fileId,
      r2_key: r2Key,
      original_name: encryptedOriginalName,
      file_size: fileSize,
      content_type: contentType,
      expires_at: expiresAt,
      pin: null,
      burn_on_read: burnOnRead === true,
      share_url: shareUrl,
      custom_filename: encryptedCustomFilename,
      note: sanitizedNote,
      user_id: currentUser.userId,
      encryption_chunk_size: chunkSize,
      encryption_total_parts: totalParts,
      folder_id: finalFolderId,
    }, tier.maxFileLinks)

    if (!staged) {
      // Quota was reached between the pre-check and the insert.
      await abortMultipartUpload({ r2Key, uploadId }).catch(() => {})
      return apiError(403, API_ERRORS.FORBIDDEN, "403 Active File Limit Reached")
    }


    return NextResponse.json({
      success: true,
      fileId,
      uploadId,
      r2Key,
      presignedUrls,
      shareUrl,
      expiresAt: expiresAt.toISOString(),
      totalParts,
      chunkSize,
    })
  } catch (error: any) {
    console.error("[Upload Multipart] Error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, error.message || "500 Multipart Upload Failed")
  }
}

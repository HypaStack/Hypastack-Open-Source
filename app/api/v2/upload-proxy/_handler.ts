import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { uploadFileBuffer, getExpirationDate } from "@/lib/storage/r2"
import { createFileRecord, markUploadComplete } from "@/lib/models/fileModel"
import { getCurrentUser, verifyProxyToken } from "@/lib/security/auth"
import { checkUploadRateLimit } from "@/lib/data/rateLimit"
import { validateCsrfToken } from "@/lib/security/security"
import {
  sanitizeNote,
  sanitizeFilename,
  verifyFileType,
  stripMetadata,
  encryptFile,
} from "@/lib/security/zeroTrust"
import { getUserTier } from "@/lib/models/userModel"
import { getTierLimits } from "@/constants/tier-limits"
import { API_ERRORS } from "@/constants"

export async function handleUploadProxyPost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        return apiError(401, API_ERRORS.UNAUTHORIZED, "401 Not Authenticated")
    }

    const userTier = await getUserTier(currentUser.userId)
    const tier = getTierLimits(userTier)
    const rateLimit = await checkUploadRateLimit(currentUser.userId, userTier)
    if (!rateLimit.allowed) {
        return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "429 Too Many Requests")
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const fileId = formData.get("fileId") as string | null
    const proxyToken = formData.get("proxyToken") as string | null
    const csrfToken = formData.get("csrfToken") as string | null
    const burnOnRead = formData.get("burnOnRead") === "true"
    const note = formData.get("note") as string | null
    const customFilename = formData.get("customFilename") as string | null

    if (!fileId || !proxyToken || !verifyProxyToken(proxyToken, fileId)) {
        return apiError(403, API_ERRORS.FORBIDDEN, "403 Upload Session Invalid")
    }

    const csrfValid = await validateCsrfToken(csrfToken || "")
    if (!csrfValid) {
        return apiError(403, API_ERRORS.FORBIDDEN, "403 Invalid CSRF Token")
    }

    if (!file) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "400 No File Provided")
    }

    const MAX_PROXY_SIZE = 50 * 1024 * 1024; // 50MB
    const limit = Math.min(tier.maxNormalUploadSize, MAX_PROXY_SIZE);
    if (file.size > limit) {
      const limitMB = Math.round(limit / (1024 * 1024))
      return apiError(413, API_ERRORS.PAYLOAD_TOO_LARGE, "Proxy Upload Limit Exceeded (Max ${limitMB}MB)")
    }

    const bytes = await file.arrayBuffer()
    // eslint-disable-next-line prefer-const
    let buffer: Buffer = Buffer.from(bytes)

    const typeVerification = await verifyFileType(buffer)
    if (!typeVerification.valid) {
        return apiError(415, API_ERRORS.UNSUPPORTED_MEDIA_TYPE, typeVerification.error || "415 Unsupported File Type")
    }

    const filenameSanitization = sanitizeFilename(file.name)
    if (!filenameSanitization.isValid) {
        return apiError(400, API_ERRORS.BAD_REQUEST, filenameSanitization.error || "400 Invalid Filename")
    }

    buffer = await stripMetadata(buffer, typeVerification.mimeType!)
    const encryption = encryptFile(buffer)
    buffer = encryption.encrypted

    const sanitizedNote = sanitizeNote(note)
    const sanitizedCustomFilename = customFilename
      ? sanitizeFilename(customFilename).sanitized || null
      : null

    const expiresAt = getExpirationDate(buffer.length, tier.expirationMultiplier)
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/d/${fileId}`

    await uploadFileBuffer(
      fileId,
      filenameSanitization.sanitized,
      buffer,
      "application/octet-stream"
    )

    await createFileRecord({
      id: fileId,
      r2_key: `uploads/${fileId}/${filenameSanitization.sanitized}`,
      original_name: filenameSanitization.sanitized,
      file_size: buffer.length,
      content_type: typeVerification.mimeType!,
      expires_at: expiresAt,
      pin: null,
      burn_on_read: burnOnRead,
      custom_filename: sanitizedCustomFilename,
      note: sanitizedNote,
      user_id: currentUser.userId,
      encryption_iv: encryption.iv,
      encryption_auth_tag: encryption.authTag,
    })

    await markUploadComplete(fileId, undefined)

    return NextResponse.json({
      success: true,
      fileId,
      expiresAt: expiresAt.toISOString(),
      shareUrl,
    })

  } catch (error: any) {
    console.error("[UploadProxy] Error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "500 Proxy Upload Failed")
  }
}

import { NextRequest, NextResponse } from "next/server"
import { uploadFileBuffer, getExpirationDate } from "@/lib/r2"
import { createFileRecord, markUploadComplete } from "@/lib/file-model"
import { getCurrentUser, verifyProxyToken } from "@/lib/auth"
import { checkUploadRateLimit } from "@/lib/rate-limit"
import { validateCsrfToken } from "@/lib/security"
import {
  sanitizeNote,
  sanitizeFilename,
  verifyFileType,
  stripMetadata,
  encryptFile,
} from "@/lib/security/zero-trust"
import { getUserTier } from "@/lib/user-model"
import { getTierLimits } from "@/constants/tier-limits"
import { API_ERRORS } from "@/constants"

export async function handleUploadProxyPost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"401 Not Authenticated"}`);
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const userTier = await getUserTier(currentUser.userId)
    const tier = getTierLimits(userTier)
    const rateLimit = await checkUploadRateLimit(currentUser.userId, userTier)
    if (!rateLimit.allowed) {
        console.error(`[API Error] 429 Too Many Requests: ${"429 Too Many Requests"}`);
      return NextResponse.json({ error: API_ERRORS.TOO_MANY_REQUESTS }, { status: 429 })
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
        console.error(`[API Error] 403 Forbidden: ${"403 Upload Session Invalid"}`);
      return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
    }

    const csrfValid = await validateCsrfToken(csrfToken || "")
    if (!csrfValid) {
        console.error(`[API Error] 403 Forbidden: ${"403 Invalid CSRF Token"}`);
      return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
    }

    if (!file) {
        console.error(`[API Error] 400 Bad Request: ${"400 No File Provided"}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    const MAX_PROXY_SIZE = 50 * 1024 * 1024; // 50MB
    const limit = Math.min(tier.maxNormalUploadSize, MAX_PROXY_SIZE);
    if (file.size > limit) {
      const limitMB = Math.round(limit / (1024 * 1024))
      console.error(`[API Error] 413 Payload Too Large: Proxy Upload Limit Exceeded (Max ${limitMB}MB)`);
      return NextResponse.json({ error: API_ERRORS.PAYLOAD_TOO_LARGE }, { status: 413 })
    }

    const bytes = await file.arrayBuffer()
    // eslint-disable-next-line prefer-const
    let buffer: Buffer = Buffer.from(bytes)

    const typeVerification = await verifyFileType(buffer)
    if (!typeVerification.valid) {
        console.error(`[API Error] 415 Unsupported Media Type: ${typeVerification.error || "415 Unsupported File Type"}`);
      return NextResponse.json({ error: API_ERRORS.UNSUPPORTED_MEDIA_TYPE }, { status: 415 })
    }

    const filenameSanitization = sanitizeFilename(file.name)
    if (!filenameSanitization.isValid) {
        console.error(`[API Error] 400 Bad Request: ${filenameSanitization.error || "400 Invalid Filename"}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
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
    console.error(`[API Error] 500 Internal Server Error: ${"500 Proxy Upload Failed"}`);
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

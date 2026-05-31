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
import { getTierLimits } from "@/lib/tier-limits"

/**
 * Zero-Trust Upload Proxy Route
 *
 * Security measures:
 * - Proxy token validation (proves user passed Turnstile + CSRF in /api/v2/)
 * - CSRF token validation
 * - DOMPurify sanitization
 * - Magic bytes verification (file-type)
 * - Path traversal protection
 * - EXIF/metadata stripping (sharp)
 * - AES-256-GCM encryption
 * - Hard file size limits
 */

export async function handleUploadProxyPost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      )
    }
    const userTier = await getUserTier(currentUser.userId)
    const tier = getTierLimits(userTier)
    const rateLimit = await checkUploadRateLimit(currentUser.userId, userTier)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached, try again later" },
        { status: 429 }
      )
    }

    // 1. Parse and validate FormData
    const formData = await request.formData()

    const file = formData.get("file") as File | null
    const fileId = formData.get("fileId") as string | null
    const proxyToken = formData.get("proxyToken") as string | null
    const csrfToken = formData.get("csrfToken") as string | null
    const pin = formData.get("pin") as string | null
    const burnOnRead = formData.get("burnOnRead") === "true"
    const note = formData.get("note") as string | null
    const customFilename = formData.get("customFilename") as string | null

    // 2. Validate proxy token (proves user passed Turnstile + CSRF in /api/v2/)
    if (!fileId || !proxyToken || !verifyProxyToken(proxyToken, fileId)) {
      return NextResponse.json(
        { error: "Invalid or expired upload session. Please start over." },
        { status: 403 }
      )
    }

    // 3. Validate CSRF token
    const csrfValid = await validateCsrfToken(csrfToken || "")
    if (!csrfValid) {
      return NextResponse.json(
        { error: "Invalid security token. Please refresh the page and try again." },
        { status: 403 }
      )
    }

    // 4. Validate file presence
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // 5. Tier-based file size check (tier pulled from DB, not client/JWT)
    // Tier already fetched
    if (file.size > tier.maxNormalUploadSize) {
      const limitMB = Math.round(tier.maxNormalUploadSize / (1024 * 1024))
      return NextResponse.json(
        { error: `File too large. Max ${limitMB}MB on your plan.` },
        { status: 413 }
      )
    }

    // 6. Convert file to buffer for processing
    const bytes = await file.arrayBuffer()
    // eslint-disable-next-line prefer-const
    let buffer: Buffer = Buffer.from(bytes)

    // 7. Verify file type with magic bytes (zero-trust: don't trust the header)
    const typeVerification = await verifyFileType(buffer)
    if (!typeVerification.valid) {
      return NextResponse.json(
        { error: typeVerification.error || "Invalid file type" },
        { status: 415 }
      )
    }

    // 8. Sanitize filename with path traversal protection
    const filenameSanitization = sanitizeFilename(file.name)
    if (!filenameSanitization.isValid) {
      return NextResponse.json(
        { error: filenameSanitization.error || "Invalid filename" },
        { status: 400 }
      )
    }

    // 9. Strip EXIF/metadata from images
    buffer = await stripMetadata(buffer, typeVerification.mimeType!)

    // 10. Encrypt file with AES-256-GCM
    const encryption = encryptFile(buffer)
    buffer = encryption.encrypted

    // 11. Sanitize note with DOMPurify
    const sanitizedNote = sanitizeNote(note)

    // 12. Sanitize custom filename
    const sanitizedCustomFilename = customFilename
      ? sanitizeFilename(customFilename).sanitized || null
      : null

    // 13. Validate PIN format
    if (pin && !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 6 digits" },
        { status: 400 }
      )
    }

    // 14. Calculate expiration (premium gets longer retention)
    const expiresAt = getExpirationDate(buffer.length, tier.expirationMultiplier)
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/d/${fileId}`

    // 15. Upload encrypted file to R2
    await uploadFileBuffer(
      fileId,
      filenameSanitization.sanitized,
      buffer,
      "application/octet-stream" // Store as binary since it's encrypted
    )

    // 16. Save metadata to database (with encryption metadata)
    await createFileRecord({
      id: fileId,
      r2_key: `uploads/${fileId}/${filenameSanitization.sanitized}`,
      original_name: filenameSanitization.sanitized,
      file_size: buffer.length,
      content_type: typeVerification.mimeType!,
      expires_at: expiresAt,
      pin: pin || null,
      burn_on_read: burnOnRead,
      custom_filename: sanitizedCustomFilename,
      note: sanitizedNote,
      user_id: currentUser.userId,
      encryption_iv: encryption.iv,
      encryption_auth_tag: encryption.authTag,
    })

    // 17. Mark upload complete
    await markUploadComplete(fileId, undefined)


    return NextResponse.json({
      success: true,
      fileId,
      expiresAt: expiresAt.toISOString(),
      shareUrl,
    })

  } catch (error: any) {
    console.error("[UploadProxy] Error:", error)
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    )
  }
}

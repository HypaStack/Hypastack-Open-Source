import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { validateCsrfToken } from "@/lib/security"
import { checkUploadRateLimit } from "@/lib/rate-limit"
import { isExtensionBlocked } from "@/lib/file-validation"
import { generateFileId, getExpirationDate } from "@/lib/r2"
import { createStagingRecord, getUserFileStats } from "@/lib/file-model"
import { getUserCdnStats } from "@/lib/cdn-model"
import { getUserTier } from "@/lib/user-model"
import { getTierLimits } from "@/lib/tier-limits"
import { initiateMultipartUpload } from "@/lib/r2-multipart"
import { sanitizeNote, sanitizeFilename } from "@/lib/security/zero-trust"
import { DEFAULT_CHUNK_SIZE } from "@/lib/multipart"
import { encryptFilename, generateOpaqueStorageName } from "@/lib/filename-crypto"
import { ensureFolderPath } from "@/lib/folder-model"

/**
 * POST /api/v2/upload-multipart
 *
 * Initiates a multipart upload for files >50MB.
 * Returns presigned URLs for each chunk — the client encrypts and uploads
 * each chunk directly to R2. The origin server never touches file data.
 *
 * Response time target: <31ms (just metadata + URL signing).
 */
export async function handleUploadMultipartPost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }

    const body = await request.json()
    const {
      fileName,
      fileSize,
      contentType,
      pin,
      burnOnRead,
      csrfToken,
      customFilename,
      chunkSize: clientChunkSize,
      encryptionKeyHash,
      path,
      folderId,
      note,
    } = body

    // Validation
    if (!fileName || !fileSize || !contentType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (fileName.length > 200) {
      return NextResponse.json({ error: "Filename too long. Max 200 characters." }, { status: 400 })
    }

    // CSRF
    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
      return NextResponse.json({ error: "Invalid security token." }, { status: 403 })
    }

    // Tier limits + rate limit + file stats — all independent, run in parallel
    const [userTier, fileStats, cdnStats] = await Promise.all([
      getUserTier(currentUser.userId),
      getUserFileStats(currentUser.userId),
      getUserCdnStats(currentUser.userId),
    ])
    const tier = getTierLimits(userTier)

    // Rate limit
    const rateLimit = await checkUploadRateLimit(currentUser.userId, userTier)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached, try again later" },
        { status: 429 }
      )
    }

    // File extension blocklist check removed for normal uploads
    // to allow executables and scripts.

    // Moved to top
    if (fileSize > tier.maxNormalUploadSize) {
      const limitMB = Math.round(tier.maxNormalUploadSize / (1024 * 1024))
      return NextResponse.json({ error: `File too large. Max ${limitMB}MB on your plan.` }, { status: 413 })
    }

    // File link limit
    if (fileStats.activeFiles >= tier.maxFileLinks) {
      return NextResponse.json(
        { error: `You have reached your limit of ${tier.maxFileLinks} active file links.` },
        { status: 403 }
      )
    }

    // Total file cap (Drive + CDN)
    if (tier.maxTotalFiles > 0) {
      const totalFiles = fileStats.activeFiles + cdnStats.totalAssets
      if (totalFiles >= tier.maxTotalFiles) {
        return NextResponse.json(
          { error: `Total limit of ${tier.maxTotalFiles} files reached. Upgrade or delete files.` },
          { status: 403 }
        )
      }
    }

    // PIN validation
    if (pin && !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be exactly 6 digits" }, { status: 400 })
    }

    // Sanitize
    const sanitizedCustomFilename = customFilename
      ? sanitizeFilename(customFilename).sanitized || null
      : null
    const sanitizedNote = note ? sanitizeNote(note) : null

    // Generate IDs
    const fileId = generateFileId()
    const storageName = generateOpaqueStorageName()
    const r2Key = `uploads/${fileId}/${storageName}`
    const expiresAt = getExpirationDate(fileSize, tier.expirationMultiplier)
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/d/${fileId}`

    // Calculate number of parts
    const chunkSize = clientChunkSize || DEFAULT_CHUNK_SIZE
    const totalParts = Math.ceil(fileSize / chunkSize)

    // Initiate multipart upload on R2 and get presigned URLs
    const { uploadId, presignedUrls } = await initiateMultipartUpload({
      r2Key,
      contentType: contentType || "application/octet-stream",
      totalParts,
    })

    // Encrypt filename and custom filename before storing in DB
    const encryptedOriginalName = encryptFilename(fileName)
    const encryptedCustomFilename = sanitizedCustomFilename
      ? encryptFilename(sanitizedCustomFilename)
      : null

    // Ensure folder hierarchy exists if a path was provided
    let finalFolderId = folderId || null
    if (path) {
      // path might be "Folder/Subfolder/file.ext", we only care about the dir part
      const dirPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : null
      if (dirPath) {
        finalFolderId = await ensureFolderPath(currentUser.userId, dirPath, folderId || null)
      }
    }

    // Create staging record
    await createStagingRecord({
      id: fileId,
      r2_key: r2Key,
      original_name: encryptedOriginalName,
      file_size: fileSize,
      content_type: contentType,
      expires_at: expiresAt,
      pin: pin || null,
      burn_on_read: burnOnRead === true,
      share_url: shareUrl,
      custom_filename: encryptedCustomFilename,
      note: sanitizedNote,
      user_id: currentUser.userId,
      // Multipart encryption metadata — required for correct decryption
      encryption_chunk_size: chunkSize,
      encryption_total_parts: totalParts,
      folder_id: finalFolderId,
    })

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
    return NextResponse.json(
      { error: error.message || "Failed to initialize multipart upload" },
      { status: 500 }
    )
  }
}

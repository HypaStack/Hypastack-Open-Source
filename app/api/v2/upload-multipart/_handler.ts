import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { validateCsrfToken } from "@/lib/security"
import { checkUploadRateLimit } from "@/lib/rate-limit"
import { generateFileId, getExpirationDate } from "@/lib/r2"
import { createStagingRecord, getUserFileStats } from "@/lib/file-model"
import { getUserCdnStats } from "@/lib/cdn-model"
import { getUserTier } from "@/lib/user-model"
import { getTierLimits } from "@/constants/tier-limits"
import { initiateMultipartUpload } from "@/lib/r2-multipart"
import { sanitizeNote, sanitizeFilename } from "@/lib/security/zero-trust"
import { DEFAULT_CHUNK_SIZE } from "@/lib/multipart"
import { encryptFilename, generateOpaqueStorageName } from "@/lib/filename-crypto"
import { ensureFolderPath, getFoldersByUserId } from "@/lib/folder-model"
import { logOperation } from "@/lib/credits"

export async function handleUploadMultipartPost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"401 Authentication Required"}`);
      return NextResponse.json({ error: "401 Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      fileName,
      fileSize,
      contentType,

      burnOnRead,
      csrfToken,
      customFilename,
      chunkSize: clientChunkSize,
      path,
      folderId,
      note,
    } = body

    if (!fileName || !fileSize || !contentType) {
        console.error(`[API Error] 400 Bad Request: ${"400 Missing Required Fields"}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }

    if (fileName.length > 200) {
        console.error(`[API Error] 400 Bad Request: ${"400 File Name Too Long"}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
        console.error(`[API Error] 403 Forbidden: ${"403 Invalid CSRF Token"}`);
      return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
    }

    const [userTier, fileStats, cdnStats] = await Promise.all([
      getUserTier(currentUser.userId),
      getUserFileStats(currentUser.userId),
      getUserCdnStats(currentUser.userId),
    ])
    const tier = getTierLimits(userTier)

    const rateLimit = await checkUploadRateLimit(currentUser.userId, userTier)
    if (!rateLimit.allowed) {
        console.error(`[API Error] 429 Too Many Requests: ${"429 Too Many Requests"}`);
      return NextResponse.json({ error: "429 Too Many Requests" }, { status: 429 })
    }

    if (fileSize > tier.maxNormalUploadSize) {
        console.error(`[API Error] 413 Payload Too Large: ${`413 File Too Large`}`);
      return NextResponse.json({ error: "413 Payload Too Large" }, { status: 413 })
    }

    if (fileStats.activeFiles >= tier.maxFileLinks) {
        console.error(`[API Error] 403 Forbidden: ${`403 Active File Limit Reached`}`);
      return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
    }

    if (tier.maxTotalFiles > 0) {
      const totalFiles = fileStats.activeFiles + cdnStats.totalAssets
      if (totalFiles >= tier.maxTotalFiles) {
          console.error(`[API Error] 403 Forbidden: ${`403 Total File Limit Reached`}`);
        return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
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

    let finalFolderId = folderId || null
    if (finalFolderId) {
      const userFolders = await getFoldersByUserId(currentUser.userId)
      if (!userFolders.some(f => f.id === finalFolderId)) {
          console.error(`[API Error] 403 Forbidden: ${"403 Folder Not Found"}`);
        return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
      }
    }

    if (path) {
      // path may be "Folder/Subfolder/file.ext" — extract dir portion only
      const dirPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : null
      if (dirPath) {
        finalFolderId = await ensureFolderPath(currentUser.userId, dirPath, folderId || null)
      }
    }

    await createStagingRecord({
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
    })

    // track class a operations
    logOperation(currentUser.userId, 'A', 'upload_multipart', false).catch(() => {})

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
    console.error(`[API Error] 500 Internal Server Error: ${error.message || "500 Multipart Upload Failed"}`);
    return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
  }
}

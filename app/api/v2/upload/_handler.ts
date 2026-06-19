import { NextRequest, NextResponse } from "next/server"
import { getPresignedUploadUrlByKey, generateFileId, getExpirationDate } from "@/lib/r2"
import { encryptFilename, generateOpaqueStorageName } from "@/lib/filename-crypto"
import { createStagingRecord, getUserFileStats } from "@/lib/file-model"
import { ensureFolderPath, getFoldersByUserId } from "@/lib/folder-model"
import { getUserCdnStats } from "@/lib/cdn-model"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { validateCsrfToken } from "@/lib/security"
import { checkUploadRateLimit } from "@/lib/rate-limit"
import { getCurrentUser, generateProxyToken } from "@/lib/auth"
import { sanitizeNote, sanitizeFilename } from "@/lib/security/zero-trust"
import { getUserTier } from "@/lib/user-model"
import { getTierLimits } from "@/constants/tier-limits"
import { API_ERRORS } from "@/constants"

export async function handleUploadPost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"Authentication required. Please sign in."}`);
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const body = await request.json()
    const { fileName, fileSize, contentType, burnOnRead, turnstileToken, csrfToken, customFilename, note, path, folderId } = body

    if (!fileName || !fileSize || !contentType) {
        console.error(`[API Error] 400 Bad Request: ${"Missing required fields"}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    if (fileName.length > 200) {
        console.error(`[API Error] 400 Bad Request: ${"Filename too long. Max 200 characters."}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    const [userTier, fileStats, cdnStats] = await Promise.all([
      getUserTier(currentUser.userId),
      getUserFileStats(currentUser.userId),
      getUserCdnStats(currentUser.userId),
    ])
    const tier = getTierLimits(userTier)

    if (fileSize > tier.maxNormalUploadSize) {
      const limitMB = Math.round(tier.maxNormalUploadSize / (1024 * 1024))
        console.error(`[API Error] 413 Payload Too Large: ${`File too large. Max ${limitMB}MB on your plan.`}`);
      return NextResponse.json({ error: API_ERRORS.PAYLOAD_TOO_LARGE }, { status: 413 })
    }

    if (tier.maxTotalFiles > 0) {
      const totalFiles = fileStats.activeFiles + cdnStats.totalAssets
      if (totalFiles >= tier.maxTotalFiles) {
          console.error(`[API Error] 403 Forbidden: ${`You have reached your total limit of ${tier.maxTotalFiles} files (Drive + CDN combined). Upgrade your plan or delete existing files.`}`);
        return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
      }
    }

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
        console.error(`[API Error] 403 Forbidden: ${"Invalid security token. Please refresh the page and try again."}`);
      return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
    }

    const rateLimit = await checkUploadRateLimit(currentUser.userId, userTier)
    if (!rateLimit.allowed) {
        console.error(`[API Error] 429 Too Many Requests: ${"Rate limit reached, try again later"}`);
      return NextResponse.json({ error: API_ERRORS.TOO_MANY_REQUESTS }, { status: 429 })
    }

    if (process.env.NODE_ENV !== "development") {
      const turnstileResult = await verifyTurnstileToken(turnstileToken)
      if (!turnstileResult.success) {
          console.error(`[API Error] 403 Forbidden: ${turnstileResult.error || "Security verification failed"}`);
        return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
      }
    }

    const fileId = generateFileId()
    const storageName = generateOpaqueStorageName()
    const r2Key = `uploads/${fileId}/${storageName}`

    const expiresAt = getExpirationDate(fileSize, tier.expirationMultiplier)
    const uploadUrl = await getPresignedUploadUrlByKey(r2Key, contentType)

    const sanitizedCustomFilename = customFilename
      ? sanitizeFilename(customFilename).sanitized || null
      : null
    const sanitizedNote = note ? sanitizeNote(note) : null

    const encryptedOriginalName = encryptFilename(fileName)
    const encryptedCustomFilename = sanitizedCustomFilename
      ? encryptFilename(sanitizedCustomFilename)
      : null

    let finalFolderId = folderId || null
    if (finalFolderId) {
      const userFolders = await getFoldersByUserId(currentUser.userId)
      if (!userFolders.some(f => f.id === finalFolderId)) {
          console.error(`[API Error] 403 Forbidden: ${"Folder not found or unauthorized"}`);
        return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
      }
    }

    if (path) {
      const dirPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : null
      if (dirPath) {
        finalFolderId = await ensureFolderPath(currentUser.userId, dirPath, folderId || null)
      }
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/d/${fileId}`

    // Atomically check quota + create staging record in one query (fixes TOCTOU race)
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
      encryption_total_parts: 1,
      encryption_chunk_size: null,
      folder_id: finalFolderId,
    }, tier.maxFileLinks)

    if (!staged) {
        console.error(`[API Error] 403 Forbidden: ${`You have reached your limit of ${tier.maxFileLinks} active file links on your current plan.`}`);
      return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
    }

    const proxyToken = generateProxyToken(fileId)

    return NextResponse.json({
      success: true,
      fileId,
      uploadUrl,
      proxyToken,
      expiresAt: expiresAt.toISOString(),
      shareUrl,
    })

  } catch (error: any) {
    console.error("[Upload] Error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to generate upload URL"}`);
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

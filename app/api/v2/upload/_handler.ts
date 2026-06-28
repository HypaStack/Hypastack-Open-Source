import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { getPresignedUploadUrlByKey, generateFileId, getExpirationDate } from "@/lib/r2"
import { encryptFilename, generateOpaqueStorageName } from "@/lib/filename-crypto"
import { createStagingRecord, getUserFileStats } from "@/lib/file-model"
import { resolveUploadFolder } from "@/lib/folder-model"
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
        return apiError(401, API_ERRORS.UNAUTHORIZED, "Authentication required. Please sign in.")
    }

    const body = await request.json()
    const { fileName, fileSize, contentType, burnOnRead, turnstileToken, csrfToken, customFilename, note, path, folderId } = body

    if (!fileName || !fileSize || !contentType) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Missing required fields")
    }

    if (fileName.length > 200) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Filename too long. Max 200 characters.")
    }

    const [userTier, fileStats, cdnStats] = await Promise.all([
      getUserTier(currentUser.userId),
      getUserFileStats(currentUser.userId),
      getUserCdnStats(currentUser.userId),
    ])
    const tier = getTierLimits(userTier)

    if (fileSize > tier.maxNormalUploadSize) {
      const limitMB = Math.round(tier.maxNormalUploadSize / (1024 * 1024))
        return apiError(413, API_ERRORS.PAYLOAD_TOO_LARGE, `File too large. Max ${limitMB}MB on your plan.`)
    }

    if (tier.maxTotalFiles > 0) {
      const totalFiles = fileStats.activeFiles + cdnStats.totalAssets
      if (totalFiles >= tier.maxTotalFiles) {
          return apiError(403, API_ERRORS.FORBIDDEN, `You have reached your total limit of ${tier.maxTotalFiles} files (Drive + CDN combined). Upgrade your plan or delete existing files.`)
      }
    }

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
        return apiError(403, API_ERRORS.FORBIDDEN, "Invalid security token. Please refresh the page and try again.")
    }

    const rateLimit = await checkUploadRateLimit(currentUser.userId, userTier)
    if (!rateLimit.allowed) {
        return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "Rate limit reached, try again later")
    }

    if (process.env.NODE_ENV !== "development") {
      const turnstileResult = await verifyTurnstileToken(turnstileToken)
      if (!turnstileResult.success) {
          return apiError(403, API_ERRORS.FORBIDDEN, turnstileResult.error || "Security verification failed")
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

    const folderResult = await resolveUploadFolder(currentUser.userId, folderId, path)
    if (!folderResult.ok) {
      return apiError(403, API_ERRORS.FORBIDDEN, "Folder not found or unauthorized")
    }
    const finalFolderId = folderResult.folderId

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
        return apiError(403, API_ERRORS.FORBIDDEN, `You have reached your limit of ${tier.maxFileLinks} active file links on your current plan.`)
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
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to generate upload URL")
  }
}

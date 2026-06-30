import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { getPresignedUploadUrlByKey, generateFileId, getExpirationDate, getCustomExpirationDate } from "@/lib/storage/r2"
import { encryptFilename, generateOpaqueStorageName } from "@/lib/security/filenameCrypto"
import { createStagingRecord, getUserFileStats, isSlugTaken, suggestAvailableSlugs } from "@/lib/models/fileModel"
import { resolveUploadFolder } from "@/lib/models/folderModel"
import { getUserCdnStats } from "@/lib/models/cdnModel"
import { verifyTurnstileToken } from "@/lib/security/turnstile"
import { validateCsrfToken } from "@/lib/security/security"
import { checkUploadRateLimit } from "@/lib/data/rateLimit"
import { getCurrentUser, generateProxyToken } from "@/lib/security/auth"
import { sanitizeNote, sanitizeFilename } from "@/lib/security/zeroTrust"
import { getUserTier } from "@/lib/models/userModel"
import { getTierLimits, normalizeTier, isPaidTier } from "@/constants/tier-limits"
import { validateSlug } from "@/lib/validation/slug"
import { API_ERRORS } from "@/constants"

export async function handleUploadPost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        return apiError(401, API_ERRORS.UNAUTHORIZED, "Authentication required. Please sign in.")
    }

    const body = await request.json()
    const { fileName, fileSize, contentType, burnOnRead, turnstileToken, csrfToken, customFilename, customSlug, expiresInMinutes, note, path, folderId } = body

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

    // Custom slug (paid plans only). The file is useless without the decryption
    // key in the URL fragment, so surfacing "that link is taken" + suggestions
    // leaks nothing.
    let finalSlug: string | null = null
    if (customSlug != null && String(customSlug).trim() !== "") {
      if (!isPaidTier(normalizeTier(userTier))) {
        return apiError(403, API_ERRORS.FORBIDDEN, "Custom links are available on the Essential plan and above.")
      }
      const slugCheck = validateSlug(String(customSlug))
      if (!slugCheck.ok) {
        return apiError(400, API_ERRORS.BAD_REQUEST, slugCheck.error || "Invalid custom link")
      }
      if (await isSlugTaken(slugCheck.slug)) {
        const suggestions = await suggestAvailableSlugs(slugCheck.slug)
        return apiError(409, API_ERRORS.CONFLICT, "Custom link already taken", { slug: slugCheck.slug, suggestions })
      }
      finalSlug = slugCheck.slug
    }

    const fileId = generateFileId()
    const storageName = generateOpaqueStorageName()
    const r2Key = `uploads/${fileId}/${storageName}`

    // Custom expiration is a paid feature; otherwise fall back to the size-based
    // default. The helper clamps to [1 minute, 30 days] server-side.
    const useCustomExpiry = isPaidTier(normalizeTier(userTier)) && typeof expiresInMinutes === "number" && expiresInMinutes > 0
    const expiresAt = useCustomExpiry
      ? getCustomExpirationDate(expiresInMinutes)
      : getExpirationDate(fileSize, tier.expirationMultiplier)
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

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/d/${finalSlug ?? fileId}`

    // Atomically check quota + create staging record in one query (fixes TOCTOU race)
    let staged: boolean
    try {
      staged = await createStagingRecord({
        id: fileId,
        r2_key: r2Key,
        original_name: encryptedOriginalName,
        file_size: fileSize,
        content_type: contentType,
        expires_at: expiresAt,
        burn_on_read: burnOnRead === true,
        share_url: shareUrl,
        custom_filename: encryptedCustomFilename,
        note: sanitizedNote,
        user_id: currentUser.userId,
        encryption_total_parts: 1,
        encryption_chunk_size: null,
        folder_id: finalFolderId,
        slug: finalSlug,
      }, tier.maxFileLinks)
    } catch (e: any) {
      // Race: the slug was claimed between the pre-check and the insert.
      if (e?.code === "23505" && finalSlug) {
        const suggestions = await suggestAvailableSlugs(finalSlug)
        return apiError(409, API_ERRORS.CONFLICT, "Custom link already taken", { slug: finalSlug, suggestions })
      }
      throw e
    }

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

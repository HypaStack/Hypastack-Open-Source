import { NextRequest, NextResponse } from "next/server"
import { getPresignedUploadUrlByKey, generateFileId, getExpirationDate, getR2Endpoint, getBucketName } from "@/lib/r2"
import { encryptFilename, generateOpaqueStorageName } from "@/lib/filename-crypto"
import { createStagingRecord, getUserFileStats } from "@/lib/file-model"
import { ensureFolderPath } from "@/lib/folder-model"
import { getUserCdnStats } from "@/lib/cdn-model"
import { isExtensionBlocked } from "@/lib/file-validation"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { validateCsrfToken } from "@/lib/security"
import { checkUploadRateLimit } from "@/lib/rate-limit"
import { getCurrentUser, generateProxyToken } from "@/lib/auth"
import { sanitizeNote, sanitizeFilename } from "@/lib/security/zero-trust"
import { getUserTier } from "@/lib/user-model"
import { getTierLimits } from "@/lib/tier-limits"

export async function handleUploadPost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { fileName, fileSize, contentType, pin, burnOnRead, turnstileToken, csrfToken, customFilename, note, path, folderId } = body

    // Validation
    if (!fileName || !fileSize || !contentType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check filename length (prevent DB bloat)
    if (fileName.length > 200) {
      return NextResponse.json(
        { error: "Filename too long. Max 200 characters." },
        { status: 400 }
      )
    }

    // Fetch tier, file stats, and CDN stats in parallel — they're independent
    const [userTier, fileStats, cdnStats] = await Promise.all([
      getUserTier(currentUser.userId),
      getUserFileStats(currentUser.userId),
      getUserCdnStats(currentUser.userId),
    ])
    const tier = getTierLimits(userTier)
    if (fileSize > tier.maxNormalUploadSize) {
      const limitMB = Math.round(tier.maxNormalUploadSize / (1024 * 1024))
      return NextResponse.json(
        { error: `File too large. Max ${limitMB}MB on your plan.` },
        { status: 413 }
      )
    }

    // Check file link limits
    if (fileStats.activeFiles >= tier.maxFileLinks) {
      return NextResponse.json(
        { error: `You have reached your limit of ${tier.maxFileLinks} active file links on your current plan. Please delete a link or wait for one to expire to upload new ones.` },
        { status: 403 }
      )
    }

    // Check total file cap (Drive + CDN combined) — applies to free tier
    if (tier.maxTotalFiles > 0) {
      const totalFiles = fileStats.activeFiles + cdnStats.totalAssets
      if (totalFiles >= tier.maxTotalFiles) {
        return NextResponse.json(
          { error: `You have reached your total limit of ${tier.maxTotalFiles} files (Drive + CDN combined). Upgrade your plan or delete existing files.` },
          { status: 403 }
        )
      }
    }

    // Validate CSRF token
    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
      return NextResponse.json(
        { error: "Invalid security token. Please refresh the page and try again." },
        { status: 403 }
      )
    }

    // Check upload rate limit (5 uploads per 10 minutes)
    const rateLimit = await checkUploadRateLimit(currentUser.userId, userTier)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached, try again later" },
        { status: 429 }
      )
    }

    // File extension blocklist check removed for normal uploads
    // to allow executables and scripts.

    // Verify Turnstile token (skipped in development)
    if (process.env.NODE_ENV !== "development") {
      const turnstileResult = await verifyTurnstileToken(turnstileToken)
      if (!turnstileResult.success) {
        return NextResponse.json(
          { error: turnstileResult.error || "Security verification failed" },
          { status: 403 }
        )
      }
    }

    // Generate unique ID and opaque R2 storage name
    const fileId = generateFileId()
    const storageName = generateOpaqueStorageName()
    const r2Key = `uploads/${fileId}/${storageName}`

    // Calculate expiration (premium gets longer retention)
    const expiresAt = getExpirationDate(fileSize, tier.expirationMultiplier)

    // Generate presigned URL using the opaque r2Key (hides real filename from R2)
    const uploadUrl = await getPresignedUploadUrlByKey(r2Key, contentType)

    console.error("[Upload] Generated presigned URL for r2Key:", r2Key)
    console.error("[Upload] Endpoint:", getR2Endpoint())
    console.error("[Upload] Bucket:", getBucketName())

    // Validate PIN if provided
    if (pin && (!/^\d{6}$/.test(pin))) {
      return NextResponse.json(
        { error: "PIN must be exactly 6 digits" },
        { status: 400 }
      )
    }

    // Sanitize custom filename and note
    const sanitizedCustomFilename = customFilename
      ? sanitizeFilename(customFilename).sanitized || null
      : null
    const sanitizedNote = note ? sanitizeNote(note) : null

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

    // Create staging record (will be promoted to main table after upload completes)
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/d/${fileId}`

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
      // Single-part upload: 1 encrypted chunk, no chunk_size needed
      encryption_total_parts: 1,
      encryption_chunk_size: null,
      folder_id: finalFolderId,
    })

    console.error("[Upload] Created staging record:", fileId)

    // Generate a short-lived proxy token for CORS fallback
    const proxyToken = generateProxyToken(fileId)

    // Return upload URL and file info
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
    return NextResponse.json(
      { error: error.message || "Failed to generate upload URL" },
      { status: 500 }
    )
  }
}

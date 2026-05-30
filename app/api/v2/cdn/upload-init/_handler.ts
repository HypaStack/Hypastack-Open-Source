import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { validateCsrfToken } from "@/lib/security"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { checkCdnUploadRateLimit } from "@/lib/rate-limit"
import { isExtensionBlocked } from "@/lib/file-validation"
import { sanitizeCdnFilename } from "@/lib/security/zero-trust"
import { generateCdnId, getTotalStorageUsed, getUserCdnStats } from "@/lib/cdn-model"
import { getUserFileStats } from "@/lib/file-model"
import { getPresignedCdnUploadUrl } from "@/lib/r2"
import { getUserTier } from "@/lib/user-model"
import { getTierLimits } from "@/lib/tier-limits"

interface FileInitInput {
  fileName: string
  fileSize: number
  contentType: string
}

export async function handleCdnUploadInitPost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { csrfToken, turnstileToken, folderId } = body

    // Support both single-file (legacy) and batch mode
    // Batch: { files: [{fileName, fileSize, contentType}], csrfToken, turnstileToken }
    // Legacy: { fileName, fileSize, contentType, csrfToken, turnstileToken }
    let filesToInit: FileInitInput[]
    if (Array.isArray(body.files)) {
      filesToInit = body.files
    } else {
      const { fileName, fileSize, contentType } = body
      if (!fileName || typeof fileSize !== "number" || !contentType) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }
      filesToInit = [{ fileName, fileSize, contentType }]
    }

    if (filesToInit.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    if (!csrfToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }

    if (process.env.NODE_ENV !== "development" && turnstileToken) {
      const turnstileResult = await verifyTurnstileToken(turnstileToken)
      if (!turnstileResult.success) {
        return NextResponse.json(
          { error: turnstileResult.error || "Security verification failed" },
          { status: 403 },
        )
      }
    }

    // Fetch all quota/limit data in parallel — one round-trip regardless of batch size
    const [userTier, currentStorage, cdnStats, fileStats] = await Promise.all([
      getUserTier(currentUser.userId),
      getTotalStorageUsed(currentUser.userId),
      getUserCdnStats(currentUser.userId),
      getUserFileStats(currentUser.userId),
    ])

    const rateLimit = await checkCdnUploadRateLimit(currentUser.userId, userTier)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached, try again later" },
        { status: 429 },
      )
    }

    const tier = getTierLimits(userTier)

    // Check CDN asset count limit
    if (cdnStats.totalAssets + filesToInit.length > tier.maxCdnLinks) {
      return NextResponse.json(
        { error: `You have reached your limit of ${tier.maxCdnLinks} CDN links on your current plan. Please delete a link to upload new ones.` },
        { status: 403 },
      )
    }

    // Check total file cap (Drive + CDN combined)
    if (tier.maxTotalFiles > 0) {
      const totalFiles = fileStats.activeFiles + cdnStats.totalAssets + filesToInit.length
      if (totalFiles > tier.maxTotalFiles) {
        return NextResponse.json(
          { error: `You have reached your total limit of ${tier.maxTotalFiles} files (Drive + CDN combined). Upgrade your plan or delete existing files.` },
          { status: 403 },
        )
      }
    }

    // Validate each file and calculate total size for quota check
    const sanitizedFiles: { fileName: string; fileSize: number; contentType: string; sanitizedName: string }[] = []
    let batchTotalSize = 0

    for (const f of filesToInit) {
      if (!f.fileName || typeof f.fileSize !== "number" || !f.contentType) {
        return NextResponse.json({ error: "Missing required fields in one or more files" }, { status: 400 })
      }
      if (f.fileSize <= 0 || f.fileSize > tier.maxCdnFileSize) {
        const limitMB = Math.round(tier.maxCdnFileSize / (1024 * 1024))
        return NextResponse.json(
          { error: `File "${f.fileName}" is too large. Maximum ${limitMB}MB per file on your plan.` },
          { status: 413 },
        )
      }
      if (isExtensionBlocked(f.fileName)) {
        return NextResponse.json({ error: `File type not allowed: "${f.fileName}"` }, { status: 415 })
      }
      const sanitization = sanitizeCdnFilename(f.fileName)
      if (!sanitization.isValid) {
        return NextResponse.json(
          { error: sanitization.error || `Invalid filename: "${f.fileName}"` },
          { status: 400 },
        )
      }
      batchTotalSize += f.fileSize
      sanitizedFiles.push({ ...f, sanitizedName: sanitization.sanitized })
    }

    // Storage quota check for the entire batch at once
    if (currentStorage + batchTotalSize > tier.maxCdnStorage) {
      const remaining = Math.max(0, tier.maxCdnStorage - currentStorage)
      const remainingMB = Math.floor(remaining / (1024 * 1024))
      return NextResponse.json(
        { error: `Not enough storage. You have ${remainingMB}MB remaining.` },
        { status: 413 },
      )
    }

    // Generate all presigned URLs in parallel — pure crypto signing, no R2 network calls
    const cdnDomain = process.env.R2_CDN_DOMAIN
    if (!cdnDomain) {
      return NextResponse.json({ error: "R2_CDN_DOMAIN environment variable not configured" }, { status: 500 })
    }

    const results = await Promise.all(
      sanitizedFiles.map(async (f) => {
        const cdnId = generateCdnId()
        const { uploadUrl, r2Key } = await getPresignedCdnUploadUrl(
          cdnId,
          f.sanitizedName,
          f.contentType || "application/octet-stream",
        )
        return {
          cdnId,
          uploadUrl,
          r2Key,
          sanitizedName: f.sanitizedName,
          contentType: f.contentType,
        }
      })
    )

    // Legacy single-file response shape for backward compatibility
    if (!Array.isArray(body.files)) {
      return NextResponse.json({
        success: true,
        cdnId: results[0].cdnId,
        uploadUrl: results[0].uploadUrl,
        r2Key: results[0].r2Key,
        sanitizedName: results[0].sanitizedName,
        contentType: results[0].contentType,
      })
    }

    return NextResponse.json({
      success: true,
      files: results,
    })
  } catch (error: any) {
    console.error("[CDN Init] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to initialize upload" },
      { status: 500 },
    )
  }
}

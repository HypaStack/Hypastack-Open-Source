import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { getCurrentUser } from "@/lib/security/auth"
import { validateCsrfToken } from "@/lib/security/security"
import { verifyTurnstileToken } from "@/lib/security/turnstile"
import { checkCdnUploadRateLimit } from "@/lib/data/rateLimit"
import { isExtensionBlocked } from "@/lib/validation/fileValidation"
import { sanitizeCdnFilename } from "@/lib/security/zeroTrust"
import { generateCdnId, getTotalStorageUsed, getUserCdnStats } from "@/lib/models/cdnModel"
import { getUserFileStats } from "@/lib/models/fileModel"
import { getPresignedCdnUploadUrl } from "@/lib/storage/r2"
import { getUserTier } from "@/lib/models/userModel"
import { getTierLimits } from "@/constants/tier-limits"
import { API_ERRORS } from "@/constants"

interface FileInitInput {
  fileName: string
  fileSize: number
  contentType: string
}

export async function handleCdnUploadInitPost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return apiError(401, API_ERRORS.UNAUTHORIZED, "Authentication Required")
    }

    const body = await request.json()
    const { csrfToken, turnstileToken } = body

    // Support both single-file (legacy) and batch mode
    let filesToInit: FileInitInput[]
    if (Array.isArray(body.files)) {
      filesToInit = body.files
    } else {
      const { fileName, fileSize, contentType } = body
      if (!fileName || typeof fileSize !== "number" || !contentType) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Missing Required Fields")
      }
      filesToInit = [{ fileName, fileSize, contentType }]
    }

    if (filesToInit.length === 0) {
      return apiError(400, API_ERRORS.BAD_REQUEST, "No Files Provided")
    }

    if (!csrfToken) {
      return apiError(400, API_ERRORS.BAD_REQUEST, "Missing Required Fields")
    }

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
      return apiError(403, API_ERRORS.FORBIDDEN, "Invalid CSRF Token")
    }

    if (process.env.NODE_ENV !== "development") {
      const turnstileResult = await verifyTurnstileToken(turnstileToken)
      if (!turnstileResult.success) {
        return apiError(403, API_ERRORS.FORBIDDEN, turnstileResult.error || "Security Verification Failed")
      }
    }

    // Fetch all quota/limit data in parallel
    const [userTier, currentStorage, cdnStats, fileStats] = await Promise.all([
      getUserTier(currentUser.userId),
      getTotalStorageUsed(currentUser.userId),
      getUserCdnStats(currentUser.userId),
      getUserFileStats(currentUser.userId),
    ])

    const rateLimit = await checkCdnUploadRateLimit(currentUser.userId, userTier)
    if (!rateLimit.allowed) {
      return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "Rate limit exceeded")
    }

    const tier = getTierLimits(userTier)

    // Check CDN asset count limit
    if (cdnStats.totalAssets + filesToInit.length > tier.maxCdnLinks) {
      return apiError(403, API_ERRORS.FORBIDDEN, "CDN Asset Limit Reached")
    }

    // Check total file cap (Drive + CDN combined)
    if (tier.maxTotalFiles > 0) {
      const totalFiles = fileStats.activeFiles + cdnStats.totalAssets + filesToInit.length
      if (totalFiles > tier.maxTotalFiles) {
        return apiError(403, API_ERRORS.FORBIDDEN, "Total File Limit Reached")
      }
    }

    // Validate each file and calculate total size for quota check
    const sanitizedFiles: { fileName: string; fileSize: number; contentType: string; sanitizedName: string }[] = []
    let batchTotalSize = 0

    for (const f of filesToInit) {
      if (!f.fileName || typeof f.fileSize !== "number" || !f.contentType) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Missing Required Fields")
      }
      if (f.fileSize <= 0 || f.fileSize > tier.maxCdnFileSize) {
        const limitMB = Math.round(tier.maxCdnFileSize / (1024 * 1024))
        return apiError(413, API_ERRORS.PAYLOAD_TOO_LARGE, "File Exceeds Limit (maximum ${limitMB}MB per file on your plan)")
      }
      if (isExtensionBlocked(f.fileName)) {
        return apiError(415, API_ERRORS.UNSUPPORTED_MEDIA_TYPE, "File Type Not Allowed")
      }
      const sanitization = sanitizeCdnFilename(f.fileName)
      if (!sanitization.isValid) {
        return apiError(400, API_ERRORS.BAD_REQUEST, sanitization.error || "Invalid Filename")
      }
      batchTotalSize += f.fileSize
      sanitizedFiles.push({ ...f, sanitizedName: sanitization.sanitized })
    }

    // Storage quota check for the entire batch at once
    if (currentStorage + batchTotalSize > tier.maxCdnStorage) {
      return apiError(413, API_ERRORS.PAYLOAD_TOO_LARGE, "Insufficient Storage")
    }

    const cdnDomain = process.env.R2_CDN_DOMAIN
    if (!cdnDomain) {
      console.error("500 Internal Server Error: R2_CDN_DOMAIN Env Variable Not Set!")
      return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "R2_CDN_DOMAIN not configured")
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
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Upload Failed")
  }
}

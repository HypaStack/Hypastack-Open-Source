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
import { getTierLimits } from "@/constants/tier-limits"
import { logOperation } from "@/lib/credits"

interface FileInitInput {
  fileName: string
  fileSize: number
  contentType: string
}

export async function handleCdnUploadInitPost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"401 Authentication Required"}`);
      return NextResponse.json({ error: "401 Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { csrfToken, turnstileToken } = body

    // Support both single-file (legacy) and batch mode
    // Batch: { files: [{fileName, fileSize, contentType}], csrfToken, turnstileToken }
    // Legacy: { fileName, fileSize, contentType, csrfToken, turnstileToken }
    let filesToInit: FileInitInput[]
    if (Array.isArray(body.files)) {
      filesToInit = body.files
    } else {
      const { fileName, fileSize, contentType } = body
      if (!fileName || typeof fileSize !== "number" || !contentType) {
          console.error(`[API Error] 400 Bad Request: ${"400 Missing Required Fields"}`);
        return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
      }
      filesToInit = [{ fileName, fileSize, contentType }]
    }

    if (filesToInit.length === 0) {
        console.error(`[API Error] 400 Bad Request: ${"400 No Files Provided"}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }

    if (!csrfToken) {
        console.error(`[API Error] 400 Bad Request: ${"400 Missing Required Fields"}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
        console.error(`[API Error] 403 Forbidden: ${"403 Invalid CSRF Token"}`);
      return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
    }

    if (process.env.NODE_ENV !== "development" && turnstileToken) {
      const turnstileResult = await verifyTurnstileToken(turnstileToken)
      if (!turnstileResult.success) {
          console.error(`[API Error] 403 Forbidden: ${turnstileResult.error || "403 Security Verification Failed"}`);
        return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
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
        console.error(`[API Error] 429 Too Many Requests: ${"429 Too Many Requests"}`);
      return NextResponse.json({ error: "429 Too Many Requests" }, { status: 429 })
    }

    // Credits gate — CDN operations require credits after free tier
    const opsResult = await logOperation(currentUser.userId, 'A', 'cdn_upload', true)
    if (!opsResult.allowed) {
        console.error(`[API Error] 402 Error: ${opsResult.reason || "402 Insufficient Balance"}`);
      return NextResponse.json({ error: "402 Error" }, { status: 402 })
    }

    const tier = getTierLimits(userTier)

    // Check CDN asset count limit
    if (cdnStats.totalAssets + filesToInit.length > tier.maxCdnLinks) {
        console.error(`[API Error] 403 Forbidden: ${`403 CDN Asset Limit Reached`}`);
      return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
    }

    // Check total file cap (Drive + CDN combined)
    if (tier.maxTotalFiles > 0) {
      const totalFiles = fileStats.activeFiles + cdnStats.totalAssets + filesToInit.length
      if (totalFiles > tier.maxTotalFiles) {
          console.error(`[API Error] 403 Forbidden: ${`403 Total File Limit Reached`}`);
        return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
      }
    }

    // Validate each file and calculate total size for quota check
    const sanitizedFiles: { fileName: string; fileSize: number; contentType: string; sanitizedName: string }[] = []
    let batchTotalSize = 0

    for (const f of filesToInit) {
      if (!f.fileName || typeof f.fileSize !== "number" || !f.contentType) {
          console.error(`[API Error] 400 Bad Request: ${"400 Missing Required Fields"}`);
        return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
      }
      if (f.fileSize <= 0 || f.fileSize > tier.maxCdnFileSize) {
        const limitMB = Math.round(tier.maxCdnFileSize / (1024 * 1024))
          console.error(`[API Error] 413 Payload Too Large: ${`413 File Exceeds Limit (maximum ${limitMB}MB per file on your plan)`}`);
        return NextResponse.json({ error: "413 Payload Too Large" }, { status: 413 })
      }
      if (isExtensionBlocked(f.fileName)) {
          console.error(`[API Error] 415 Unsupported Media Type: ${`415 File Type Not Allowed`}`);
        return NextResponse.json({ error: "415 Unsupported Media Type" }, { status: 415 })
      }
      const sanitization = sanitizeCdnFilename(f.fileName)
      if (!sanitization.isValid) {
          console.error(`[API Error] 400 Bad Request: ${sanitization.error || `400 Invalid Filename`}`);
        return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
      }
      batchTotalSize += f.fileSize
      sanitizedFiles.push({ ...f, sanitizedName: sanitization.sanitized })
    }

    // Storage quota check for the entire batch at once
    if (currentStorage + batchTotalSize > tier.maxCdnStorage) {
        console.error(`[API Error] 413 Payload Too Large: ${`413 Insufficient Storage`}`);
      return NextResponse.json({ error: "413 Payload Too Large" }, { status: 413 })
    }

    // Generate all presigned URLs in parallel — pure crypto signing, no R2 network calls
    const cdnDomain = process.env.R2_CDN_DOMAIN
    if (!cdnDomain) {
      console.error("500 Internal Server Error: R2_CDN_DOMAIN Env Variable Not Set!");
        console.error(`[API Error] 500 Internal Server Error: ${"500 Internal Server Error"}`);
      return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
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
    console.error(`[API Error] 500 Internal Server Error: ${"500 Upload Failed"}`);
    return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
  }
}

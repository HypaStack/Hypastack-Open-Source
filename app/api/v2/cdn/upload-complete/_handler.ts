import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { getCurrentUser } from "@/lib/security/auth"
import { validateCsrfToken } from "@/lib/security/security"
import { headCdnObject, downloadHeadByKey, deleteByKey } from "@/lib/storage/r2"
import { verifyCdnFileType } from "@/lib/security/zeroTrust"
import { getFileExtension } from "@/lib/validation/fileValidation"
import { createCdnAssetsBatch, deleteCdnStaging, getCdnStaging, getTotalStorageUsed, suggestAvailableCdnSlugs, type CdnStagingRecord } from "@/lib/models/cdnModel"
import { getCdnFoldersByUserId } from "@/lib/models/cdnFolderModel"
import { getUserTier } from "@/lib/models/userModel"
import { getTierLimits } from "@/constants/tier-limits"
import { API_ERRORS } from "@/constants"
import { errorCode } from "@/lib/errors"

interface FileCompleteInput {
  cdnId: string
  folderId?: string | null
}

export async function handleCdnUploadCompletePost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        return apiError(401, API_ERRORS.UNAUTHORIZED, "Authentication required")
    }

    const body = await request.json()

    const csrfValid = await validateCsrfToken(body.csrfToken)
    if (!csrfValid) {
      return apiError(403, API_ERRORS.FORBIDDEN, "Invalid CSRF token")
    }

    // Support both single-file (legacy) and batch mode. Only the id and the
    // destination folder are read — name, content type and slug come from the
    // staging row written at init.
    // Batch: { files: [{cdnId, folderId}] }
    // Legacy: { cdnId, folderId }
    let filesToComplete: FileCompleteInput[]
    if (Array.isArray(body.files)) {
      filesToComplete = body.files
    } else {
      const { cdnId, folderId } = body
      if (!cdnId) {
          return apiError(400, API_ERRORS.BAD_REQUEST, "Missing required fields")
      }
      filesToComplete = [{ cdnId, folderId }]
    }

    if (filesToComplete.length === 0) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "No files provided")
    }

    if (filesToComplete.some(f => typeof f?.cdnId !== "string" || !f.cdnId)) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Missing required fields")
    }

    const cdnDomain = process.env.R2_CDN_DOMAIN
    if (!cdnDomain) {
        return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "R2_CDN_DOMAIN environment variable not configured")
    }

    const userCdnFolders = await getCdnFoldersByUserId(currentUser.userId);
    for (const f of filesToComplete) {
      if (f.folderId && !userCdnFolders.some(folder => folder.id === f.folderId)) {
          return apiError(403, API_ERRORS.FORBIDDEN, "CDN Folder not found or unauthorized")
      }
    }

    // Resolve every id against its staging row. A row that is missing or owned
    // by someone else is indistinguishable from an id that never existed.
    const staged = await Promise.all(filesToComplete.map(f => getCdnStaging(f.cdnId)))
    const resolved: { cdnId: string; folderId?: string | null; staging: CdnStagingRecord }[] = []
    for (let i = 0; i < filesToComplete.length; i++) {
      const staging = staged[i]
      if (!staging || staging.user_id !== currentUser.userId) {
        return apiError(404, API_ERRORS.NOT_FOUND, "Upload session not found or expired")
      }
      resolved.push({ ...filesToComplete[i], staging })
    }

    // Verify all files exist in R2 in parallel — one concurrent batch of HEAD requests
    const headResults = await Promise.all(
      resolved.map(async (f) => {
        const r2Key = f.staging.r2_key
        const head = await headCdnObject(r2Key)
        return {
          cdnId: f.cdnId,
          folderId: f.folderId,
          slug: f.staging.slug ?? null,
          sanitizedName: f.staging.original_name,
          contentType: f.staging.content_type,
          r2Key,
          head,
        }
      })
    )

    // Check for any files not found in R2
    const missing = headResults.filter(r => !r.head)
    if (missing.length > 0) {
      const names = missing.map(r => r.sanitizedName).join(", ")
        return apiError(404, API_ERRORS.NOT_FOUND, `Upload not found in storage for: ${names}. Did the upload finish?`)
    }

    // Magic-byte validation: CDN assets are public and unencrypted, so verify
    // the actual bytes don't decode to a known-dangerous executable/script that
    // was renamed to a safe extension. Types without distinctive magic bytes
    // (svg, text, fonts, etc.) pass through unchanged.
    const typeChecks = await Promise.all(
      headResults.map(async (r) => {
        try {
          const head = await downloadHeadByKey(r.r2Key, 65536)
          const ext = getFileExtension(r.sanitizedName).replace(/^\./, "")
          const result = await verifyCdnFileType(head, ext)
          return { r2Key: r.r2Key, name: r.sanitizedName, valid: result.valid, error: result.error }
        } catch {
          return { r2Key: r.r2Key, name: r.sanitizedName, valid: false, error: "File validation failed" }
        }
      })
    )
    const blocked = typeChecks.filter(c => !c.valid)
    if (blocked.length > 0) {
      // Remove the rejected objects so they never become reachable on the CDN.
      await Promise.all(blocked.map(c => deleteByKey(c.r2Key).catch(() => {})))
      const names = blocked.map(c => c.name).join(", ")
      return apiError(415, API_ERRORS.UNSUPPORTED_MEDIA_TYPE, `Blocked file contents for: ${names}`)
    }

    // Storage quota check using R2-reported sizes (don't trust the client)
    const [userTier, currentStorage] = await Promise.all([
      getUserTier(currentUser.userId),
      getTotalStorageUsed(currentUser.userId),
    ])
    const tier = getTierLimits(userTier)
    const batchTotalSize = headResults.reduce((sum, r) => sum + (r.head!.size), 0)

    if (currentStorage + batchTotalSize > tier.maxCdnStorage) {
        return apiError(413, API_ERRORS.PAYLOAD_TOO_LARGE, "Storage limit exceeded after upload.")
    }

    // Build asset records and do a single batch DB insert
    const assetInputs = headResults.map(r => ({
      id: r.cdnId,
      user_id: currentUser.userId,
      r2_key: r.r2Key,
      original_name: r.sanitizedName,
      file_size: r.head!.size,
      content_type: r.head!.contentType || r.contentType || "application/octet-stream",
      cdn_url: `https://${cdnDomain}/cdn/${r.slug ?? r.cdnId}/${encodeURIComponent(r.sanitizedName)}`,
      folder_id: r.folderId || null,
      slug: r.slug ?? null,
    }))

    try {
      await createCdnAssetsBatch(assetInputs)
    } catch (e) {
      // Someone else's init won the slug between our init and this completion.
      // The R2 object is left in place: the key came from our own staging row,
      // but the object at it belongs to whoever completed first. A rare orphan
      // from a legitimate race is the safe trade.
      const taken = assetInputs.find(a => a.slug)?.slug ?? null
      if (errorCode(e) === "23505" && taken) {
        const suggestions = await suggestAvailableCdnSlugs(taken)
        return apiError(409, API_ERRORS.CONFLICT, "Custom link already taken", { slug: taken, suggestions })
      }
      throw e
    }

    // One-shot: the ids can't be completed twice.
    await Promise.all(assetInputs.map(a => deleteCdnStaging(a.id).catch(() => {})))

    // Build response assets array
    const completedAssets = assetInputs.map(a => ({
      id: a.id,
      cdnUrl: a.cdn_url,
      fileName: a.original_name,
      fileSize: a.file_size,
      contentType: a.content_type,
    }))

    // Legacy single-file response shape for backward compatibility
    if (!Array.isArray(body.files)) {
      const a = completedAssets[0]
      return NextResponse.json({
        success: true,
        id: a.id,
        cdnUrl: a.cdnUrl,
        fileName: a.fileName,
        fileSize: a.fileSize,
        contentType: a.contentType,
      })
    }

    return NextResponse.json({
      success: true,
      files: completedAssets,
    })
  } catch (error) {
    console.error("[CDN Complete] Error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to complete upload")
  }
}

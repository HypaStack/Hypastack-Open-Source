import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { headCdnObject } from "@/lib/r2"
import { createCdnAsset, createCdnAssetsBatch, getTotalStorageUsed } from "@/lib/cdn-model"
import { getCdnFoldersByUserId } from "@/lib/cdn-folder-model"
import { getUserTier } from "@/lib/user-model"
import { getTierLimits } from "@/lib/tier-limits"

interface FileCompleteInput {
  cdnId: string
  sanitizedName: string
  contentType?: string
  folderId?: string | null
}

export async function handleCdnUploadCompletePost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()

    // Support both single-file (legacy) and batch mode
    // Batch: { files: [{cdnId, sanitizedName, contentType, folderId}] }
    // Legacy: { cdnId, sanitizedName, contentType, folderId }
    let filesToComplete: FileCompleteInput[]
    if (Array.isArray(body.files)) {
      filesToComplete = body.files
    } else {
      const { cdnId, sanitizedName, contentType, folderId } = body
      if (!cdnId || !sanitizedName) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }
      filesToComplete = [{ cdnId, sanitizedName, contentType, folderId }]
    }

    if (filesToComplete.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const cdnDomain = process.env.R2_CDN_DOMAIN
    if (!cdnDomain) {
      return NextResponse.json({ error: "R2_CDN_DOMAIN environment variable not configured" }, { status: 500 })
    }

    const userCdnFolders = await getCdnFoldersByUserId(currentUser.userId);
    for (const f of filesToComplete) {
      if (f.folderId && !userCdnFolders.some(folder => folder.id === f.folderId)) {
        return NextResponse.json({ error: "CDN Folder not found or unauthorized" }, { status: 403 })
      }
    }

    // Verify all files exist in R2 in parallel — one concurrent batch of HEAD requests
    const headResults = await Promise.all(
      filesToComplete.map(async (f) => {
        const r2Key = `cdn/${f.cdnId}/${f.sanitizedName}`
        const head = await headCdnObject(r2Key)
        return { ...f, r2Key, head }
      })
    )

    // Check for any files not found in R2
    const missing = headResults.filter(r => !r.head)
    if (missing.length > 0) {
      const names = missing.map(r => r.sanitizedName).join(", ")
      return NextResponse.json(
        { error: `Upload not found in storage for: ${names}. Did the upload finish?` },
        { status: 404 },
      )
    }

    // Storage quota check using R2-reported sizes (don't trust the client)
    const [userTier, currentStorage] = await Promise.all([
      getUserTier(currentUser.userId),
      getTotalStorageUsed(currentUser.userId),
    ])
    const tier = getTierLimits(userTier)
    const batchTotalSize = headResults.reduce((sum, r) => sum + (r.head!.size), 0)

    if (currentStorage + batchTotalSize > tier.maxCdnStorage) {
      return NextResponse.json({ error: "Storage limit exceeded after upload." }, { status: 413 })
    }

    // Build asset records and do a single batch DB insert
    const assetInputs = headResults.map(r => ({
      id: r.cdnId,
      user_id: currentUser.userId,
      r2_key: r.r2Key,
      original_name: r.sanitizedName,
      file_size: r.head!.size,
      content_type: r.head!.contentType || r.contentType || "application/octet-stream",
      cdn_url: `https://${cdnDomain}/cdn/${r.cdnId}/${encodeURIComponent(r.sanitizedName)}`,
      folder_id: r.folderId || null,
    }))

    await createCdnAssetsBatch(assetInputs)

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
  } catch (error: any) {
    console.error("[CDN Complete] Error:", error)
    return NextResponse.json(
      { error: "Failed to complete upload" },
      { status: 500 },
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { validateCsrfToken } from "@/lib/security"
import { isExtensionBlocked } from "@/lib/file-validation"
import { sanitizeCdnFilename } from "@/lib/security/zero-trust"
import { getForumPostById, getForumFileCountForPost, checkDuplicateFileName, addForumFile, getForumFileStatsForUser } from "@/lib/forum-model"
import { getUserCdnStats } from "@/lib/cdn-model"
import { getUserFileStats } from "@/lib/file-model"
import { getTotalStorageUsed } from "@/lib/cdn-model"
import { getPresignedForumUploadUrl, generateFileId, headCdnObject } from "@/lib/r2"
import { getUserTier } from "@/lib/user-model"
import { getTierLimits } from "@/constants/tier-limits"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

const MAX_FILES_PER_POST = 5

// POST /api/v2/forum/[id]/files — upload-init (get presigned URL)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const { id: postId } = await params
    const body = await request.json()
    const { csrfToken, fileName, fileSize, contentType } = body

    // CSRF check
    if (!csrfToken) {
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }
    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
      return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
    }

    // Validate inputs
    if (!fileName || typeof fileSize !== "number" || !contentType) {
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    // Verify the post exists and belongs to the current user
    const post = await getForumPostById(postId)
    if (!post) {
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }
    if (post.user_id !== currentUser.userId) {
      return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
    }

    // Check max files per post
    const currentFileCount = await getForumFileCountForPost(postId)
    if (currentFileCount >= MAX_FILES_PER_POST) {
      return NextResponse.json({ error: "Maximum 5 files per post" }, { status: 400 })
    }

    // Validate file extension
    if (isExtensionBlocked(fileName)) {
      return NextResponse.json({ error: API_ERRORS.UNSUPPORTED_MEDIA_TYPE }, { status: 415 })
    }

    // Sanitize filename
    const sanitization = sanitizeCdnFilename(fileName)
    if (!sanitization.isValid) {
      return NextResponse.json({ error: sanitization.error || "Invalid filename" }, { status: 400 })
    }
    const sanitizedName = sanitization.sanitized

    // Check for duplicate filename in this post
    const isDuplicate = await checkDuplicateFileName(postId, sanitizedName)
    if (isDuplicate) {
      return NextResponse.json({
        error: "A file with this name already exists in this post. Rename the file if you want to upload it again."
      }, { status: 409 })
    }

    // Check quota (forum files count against CDN quota)
    const [userTier, currentStorage, cdnStats, fileStats, forumStats] = await Promise.all([
      getUserTier(currentUser.userId),
      getTotalStorageUsed(currentUser.userId),
      getUserCdnStats(currentUser.userId),
      getUserFileStats(currentUser.userId),
      getForumFileStatsForUser(currentUser.userId),
    ])

    const tier = getTierLimits(userTier)

    // File size check
    if (fileSize <= 0 || fileSize > tier.maxCdnFileSize) {
      return NextResponse.json({ error: API_ERRORS.PAYLOAD_TOO_LARGE }, { status: 413 })
    }

    // Combined link count check (CDN + forum files count together)
    const totalLinks = cdnStats.totalAssets + forumStats.totalFiles + 1
    if (totalLinks > tier.maxCdnLinks) {
      return NextResponse.json({ error: "File link limit reached" }, { status: 403 })
    }

    // Total file cap check
    if (tier.maxTotalFiles > 0) {
      const totalFiles = fileStats.activeFiles + cdnStats.totalAssets + forumStats.totalFiles + 1
      if (totalFiles > tier.maxTotalFiles) {
        return NextResponse.json({ error: "Total file limit reached" }, { status: 403 })
      }
    }

    // Storage quota check
    if (currentStorage + fileSize > tier.maxCdnStorage) {
      return NextResponse.json({ error: API_ERRORS.PAYLOAD_TOO_LARGE }, { status: 413 })
    }

    // Generate presigned upload URL
    const fileId = generateFileId()
    const { uploadUrl, r2Key } = await getPresignedForumUploadUrl(
      postId,
      fileId,
      sanitizedName,
      contentType || "application/octet-stream"
    )

    return NextResponse.json({
      success: true,
      fileId,
      uploadUrl,
      r2Key,
      sanitizedName,
      contentType,
    })
  } catch (error: any) {
    console.error("[Forum Files] POST error:", error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

// PATCH /api/v2/forum/[id]/files — upload-complete (confirm file in R2)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const { id: postId } = await params
    const body = await request.json()
    const { fileId, sanitizedName, contentType } = body

    if (!fileId || !sanitizedName) {
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    // Verify the post exists and belongs to the current user
    const post = await getForumPostById(postId)
    if (!post || post.user_id !== currentUser.userId) {
      return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
    }

    // Verify file exists in R2
    const r2Key = `forums/${postId}/${fileId}/${sanitizedName}`
    const head = await headCdnObject(r2Key)
    if (!head) {
      return NextResponse.json({ error: "Upload not found in storage. Did the upload finish?" }, { status: 404 })
    }

    // Final storage quota check using actual R2 size
    const [userTier, currentStorage] = await Promise.all([
      getUserTier(currentUser.userId),
      getTotalStorageUsed(currentUser.userId),
    ])
    const tier = getTierLimits(userTier)

    if (currentStorage + head.size > tier.maxCdnStorage) {
      return NextResponse.json({ error: "Storage limit exceeded" }, { status: 413 })
    }

    // Build public URL
    const cdnDomain = process.env.R2_CDN_DOMAIN
    if (!cdnDomain) {
      return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
    }

    const publicUrl = `https://${cdnDomain}/forums/${postId}/${fileId}/${encodeURIComponent(sanitizedName)}`

    // Insert file record
    const file = await addForumFile({
      id: fileId,
      postId,
      userId: currentUser.userId,
      r2Key,
      originalName: sanitizedName,
      fileSize: head.size,
      contentType: head.contentType || contentType || "application/octet-stream",
      publicUrl,
    })

    return NextResponse.json({
      success: true,
      id: file.id,
      publicUrl: file.public_url,
      fileName: file.original_name,
      fileSize: file.file_size,
      contentType: file.content_type,
    })
  } catch (error: any) {
    console.error("[Forum Files] PATCH error:", error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

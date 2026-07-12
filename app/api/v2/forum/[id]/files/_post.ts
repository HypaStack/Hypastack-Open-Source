import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/security/auth"
import { validateCsrfToken } from "@/lib/security/security"
import { isExtensionBlocked } from "@/lib/validation/fileValidation"
import { sanitizeCdnFilename } from "@/lib/security/zeroTrust"
import { getForumPostById, getForumFileCountForPost, checkDuplicateFileName, getForumFileStatsForUser } from "@/lib/models/forumModel"
import { getUserCdnStats, getTotalStorageUsed } from "@/lib/models/cdnModel"
import { getUserFileStats } from "@/lib/models/fileModel"
import { getPresignedForumUploadUrl, generateFileId } from "@/lib/storage/r2"
import { getUserTier } from "@/lib/models/userModel"
import { getTierLimits } from "@/constants/tier-limits"
import { API_ERRORS } from "@/constants"

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
  } catch (error) {
    console.error("[Forum Files] POST error:", error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

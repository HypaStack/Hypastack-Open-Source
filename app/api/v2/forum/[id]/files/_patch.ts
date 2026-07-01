import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/security/auth"
import { validateCsrfToken } from "@/lib/security/security"
import { getForumPostById, addForumFile } from "@/lib/models/forumModel"
import { getTotalStorageUsed } from "@/lib/models/cdnModel"
import { headCdnObject } from "@/lib/storage/r2"
import { getUserTier } from "@/lib/models/userModel"
import { getTierLimits } from "@/constants/tier-limits"
import { API_ERRORS } from "@/constants"

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
    const { fileId, sanitizedName, contentType, csrfToken } = body

    if (!fileId || !sanitizedName || !csrfToken) {
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
      return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
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

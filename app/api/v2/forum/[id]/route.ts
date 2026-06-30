import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { getForumPostById, getForumPostBySlug, incrementViewCount, deleteForumPost, getForumFileR2KeysByPostId } from "@/lib/models/forumModel"
import { deleteObjectsBatch } from "@/lib/storage/r2"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

// GET /api/v2/forum/[id] — public, get single post by ID or slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Try by slug first, then by ID
    let post = await getForumPostBySlug(id)
    if (!post) {
      const byId = await getForumPostById(id)
      if (byId) {
        post = await getForumPostBySlug(byId.slug)
      }
    }

    if (!post) {
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }

    // Increment view count if requested (fire and forget)
    const url = new URL(request.url)
    if (url.searchParams.get("view") === "1") {
      incrementViewCount(post.id).catch(() => {})
    }

    return NextResponse.json({ post })
  } catch (error: any) {
    console.error("[Forum] GET [id] error:", error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

// DELETE /api/v2/forum/[id] — owner-only delete
export const DELETE = withAuth<{ id: string }>(async ({ user, params }) => {
    const { id } = params

    // Get R2 keys before deleting DB records
    const r2Keys = await getForumFileR2KeysByPostId(id)

    const deleted = await deleteForumPost(id, user.userId)
    if (!deleted) {
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }

    // Clean up R2 objects
    if (r2Keys.length > 0) {
      deleteObjectsBatch(r2Keys).catch(err => {
        console.error("[Forum] Failed to clean up R2 objects:", err)
      })
    }

    return NextResponse.json({ success: true })
}, { label: "Forum DELETE" })

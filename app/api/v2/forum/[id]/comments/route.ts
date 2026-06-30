import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { validateCsrfToken } from "@/lib/security/security"
import { getForumPostById, addComment, getCommentsByPostId } from "@/lib/models/forumModel"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

// GET /api/v2/forum/[id]/comments — public, get threaded comments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params

    const post = await getForumPostById(postId)
    if (!post) {
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }

    const comments = await getCommentsByPostId(postId)
    return NextResponse.json({ comments })
  } catch (error: any) {
    console.error("[Forum Comments] GET error:", error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

// POST /api/v2/forum/[id]/comments — add a comment (auth required)
export const POST = withAuth<{ id: string }>(async ({ request, user: currentUser, params }) => {
  try {
    const { id: postId } = params
    const body = await request.json()
    const { csrfToken, body: commentBody, parentId } = body

    if (!csrfToken) {
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }
    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
      return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
    }

    if (!commentBody || typeof commentBody !== "string" || commentBody.trim().length === 0) {
      return NextResponse.json({ error: "Comment body is required" }, { status: 400 })
    }

    if (commentBody.length > 2000) {
      return NextResponse.json({ error: "Comment must be 2000 characters or less" }, { status: 400 })
    }

    const post = await getForumPostById(postId)
    if (!post) {
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }

    const comment = await addComment({
      postId,
      userId: currentUser.userId,
      parentId: parentId ? Number(parentId) : null,
      body: commentBody.trim(),
    })

    return NextResponse.json({ success: true, comment })
  } catch (error: any) {
    if (error.message === "Parent comment not found") {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 404 })
    }
    console.error("[Forum Comments] POST error:", error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}, { label: "Forum Comments POST" })

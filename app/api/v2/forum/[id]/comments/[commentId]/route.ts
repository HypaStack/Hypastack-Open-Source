import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { deleteComment } from "@/lib/models/forumModel"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

// DELETE /api/v2/forum/[id]/comments/[commentId] — soft-delete own comment
export const DELETE = withAuth<{ id: string; commentId: string }>(async ({ user, params }) => {
    const { commentId } = params
    const commentIdNum = parseInt(commentId, 10)

    if (isNaN(commentIdNum)) {
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    const deleted = await deleteComment(commentIdNum, user.userId)
    if (!deleted) {
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }

    return NextResponse.json({ success: true })
}, { label: "Forum Comments DELETE" })

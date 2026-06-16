import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { deleteComment } from "@/lib/forum-model"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

// DELETE /api/v2/forum/[id]/comments/[commentId] — soft-delete own comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const { commentId } = await params
    const commentIdNum = parseInt(commentId, 10)

    if (isNaN(commentIdNum)) {
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    const deleted = await deleteComment(commentIdNum, currentUser.userId)
    if (!deleted) {
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Forum Comments] DELETE error:", error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

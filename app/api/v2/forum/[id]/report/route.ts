import { NextRequest, NextResponse } from "next/server"
import { getForumPostById, reportPost } from "@/lib/forum-model"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

// POST /api/v2/forum/[id]/report — report a post (public, rate limited by IP)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    const body = await request.json().catch(() => ({}))
    const reason = body?.reason ?? null

    const post = await getForumPostById(postId)
    if (!post) {
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null

    await reportPost(postId, ip, reason)

    return NextResponse.json({
      success: true,
      message: "Report submitted. You can also contact me directly.",
      contact: "https://t.me/t_usekiko",
    })
  } catch (error: any) {
    console.error("[Forum Report] POST error:", error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

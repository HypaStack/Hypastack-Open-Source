import { NextRequest, NextResponse } from "next/server"
import { withRouteCache } from "@/lib/http/routeCache"
import { withAuth } from "@/lib/http/route"
import { validateCsrfToken } from "@/lib/security/security"
import { createForumPost, getForumPosts, normalizeTags } from "@/lib/models/forumModel"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

// GET /api/v2/forum — public listing/search
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get("page") ?? "1", 10)
    const tag = url.searchParams.get("tag") ?? undefined
    const q = url.searchParams.get("q") ?? undefined

    const result = await getForumPosts({ page, limit: 30, tag, q })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[Forum] GET error:", error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

// POST /api/v2/forum — create a new post (auth required)
export const POST = withAuth(async ({ request, user: currentUser }) => {
    const body = await request.json()
    const { csrfToken, title, description, tags } = body

    if (!csrfToken) {
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    const csrfValid = await validateCsrfToken(csrfToken)
    if (!csrfValid) {
      return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (title.trim().length > 200) {
      return NextResponse.json({ error: "Title must be 200 characters or less" }, { status: 400 })
    }

    if (description && typeof description === "string" && description.length > 5000) {
      return NextResponse.json({ error: "Description must be 5000 characters or less" }, { status: 400 })
    }

    const normalizedTags = Array.isArray(tags) ? normalizeTags(tags) : []

    const post = await createForumPost({
      userId: currentUser.userId,
      title: title.trim(),
      description: description?.trim() || undefined,
      tags: normalizedTags,
    })

    return NextResponse.json({ success: true, postId: post.id, slug: post.slug })
}, { rateLimit: true, label: "Forum POST" })

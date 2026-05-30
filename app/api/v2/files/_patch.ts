import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getFileById, toggleFileStarred } from "@/lib/file-model"
import { checkApiRateLimit } from "@/lib/rate-limit"

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    const rateLimit = await checkApiRateLimit(currentUser.userId)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached, try again later" },
        { status: 429 }
      )
    }

    const { fileId, starred } = await request.json()
    if (!fileId || typeof starred !== "boolean") {
      return NextResponse.json({ error: "fileId and starred (boolean) required" }, { status: 400 })
    }

    const file = await getFileById(fileId)
    if (!file || file.user_id !== currentUser.userId) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 })
    }

    const updated = await toggleFileStarred(fileId, currentUser.userId, starred)
    if (!updated) {
      return NextResponse.json({ error: "Failed to update file" }, { status: 500 })
    }

    return NextResponse.json({ success: true, starred })
  } catch (error) {
    console.error("[Auth Files] PATCH error:", error)
    return NextResponse.json(
      { error: "Failed to update file" },
      { status: 500 }
    )
  }
}

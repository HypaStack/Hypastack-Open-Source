import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserById } from "@/lib/user-model"
import { downloadHeadByKey } from "@/lib/r2"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const user = await getUserById(currentUser.userId)
    if (!user?.avatar_url) {
      return new NextResponse("No avatar", { status: 404 })
    }

    const buffer = await downloadHeadByKey(user.avatar_url, 10 * 1024 * 1024)

    // Determine content type from key extension
    const ext = user.avatar_url.split('.').pop()?.toLowerCase()
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      webp: 'image/webp', gif: 'image/gif',
    }
    const safeContentType = mimeMap[ext || ''] || 'image/png'

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": safeContentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch (error: any) {
    console.error("[Avatar] Proxy error:", error)
    return new NextResponse("Failed to load avatar", { status: 500 })
  }
}

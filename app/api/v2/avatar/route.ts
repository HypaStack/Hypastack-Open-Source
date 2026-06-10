import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserById } from "@/lib/user-model"
import { getPresignedDownloadUrl } from "@/lib/r2"

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

    // Determine content type from key extension
    const ext = user.avatar_url.split('.').pop()?.toLowerCase()
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      webp: 'image/webp', gif: 'image/gif',
    }
    const safeContentType = mimeMap[ext || ''] || 'image/png'

    const url = await getPresignedDownloadUrl({
      r2Key: user.avatar_url,
      originalName: `avatar.${ext || 'png'}`,
      contentType: safeContentType,
      expiresIn: 3600,
      disposition: "inline",
    })

    return NextResponse.redirect(url, 303)
  } catch (error: any) {
    console.error("[Avatar] Proxy error:", error)
    return new NextResponse("Failed to load avatar", { status: 500 })
  }
}

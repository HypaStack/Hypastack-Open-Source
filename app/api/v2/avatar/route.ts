import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserById } from "@/lib/user-model"

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

    // Proxy the image server-side so the browser never touches r2.hypastack.com directly
    const r2Url = `https://r2.hypastack.com/${user.avatar_url}`
    const r2Res = await fetch(r2Url)

    if (!r2Res.ok) {
      return new NextResponse("Avatar not found", { status: 404 })
    }

    const contentType = r2Res.headers.get("Content-Type") || "image/webp"
    const buffer = await r2Res.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Length": buffer.byteLength.toString(),
      },
    })
  } catch (error: any) {
    console.error("[Avatar] Proxy error:", error)
    return new NextResponse("Failed to load avatar", { status: 500 })
  }
}

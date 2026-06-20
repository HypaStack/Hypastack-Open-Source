import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserById } from "@/lib/user-model"
import { createHmac } from "crypto"

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

    // Redirect browser to the public R2 URL — loaded directly, no proxy overhead
    return NextResponse.redirect(`https://r2.hypastack.com/${user.avatar_url}`, { status: 302 })
  } catch (error: any) {
    console.error("[Avatar] Error redirecting to avatar:", error)
    return new NextResponse("Failed to load avatar", { status: 500 })
  }
}

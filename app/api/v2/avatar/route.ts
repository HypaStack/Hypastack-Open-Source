import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserById } from "@/lib/user-model"
import { createHmac } from "crypto"

export const dynamic = "force-dynamic"

/**
 * Generates a short-lived HMAC-SHA256 presigned URL for a profile picture.
 * The signature covers "<r2Key>:<expiresMs>" so it is bound to the specific file and expiry time.
 */
function signAvatarUrl(r2Key: string): string {
  const secret = process.env.AVATAR_SIGNING_SECRET!
  const expires = Date.now() + 60 * 60 * 1000 // 1 hour
  const sig = createHmac("sha256", secret)
    .update(`${r2Key}:${expires}`)
    .digest("hex")
  return `https://r2.hypastack.com/${r2Key}?expires=${expires}&sig=${sig}`
}

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

    const presignedUrl = signAvatarUrl(user.avatar_url)

    // Redirect browser to the presigned R2 URL — loaded directly, no proxy overhead
    return NextResponse.redirect(presignedUrl, { status: 302 })
  } catch (error: any) {
    console.error("[Avatar] Error generating presigned URL:", error)
    return new NextResponse("Failed to load avatar", { status: 500 })
  }
}

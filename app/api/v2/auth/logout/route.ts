import { NextRequest, NextResponse } from "next/server"
import { clearAuthCookie, clearRefreshCookie, getCurrentUser } from "@/lib/auth"
import { revokeSession } from "@/lib/user-model"
import { bustCache } from "@/lib/cache"
import { API_ERRORS } from "@/constants"

export async function POST(request: NextRequest) {
  try {
    // Revoke the session in DB so the token is dead immediately even if stolen.
    // This also invalidates the refresh token since it is scoped to the session.
    const currentUser = await getCurrentUser(request)
    if (currentUser?.sessionId) {
      await revokeSession(currentUser.sessionId)
      // Bust the cached revocation flag (getCurrentUser caches it for 60s),
      // otherwise a just-revoked/stolen token stays valid until the TTL lapses.
      await bustCache(`session:${currentUser.sessionId}:revoked`)
    }

    await clearAuthCookie()
    await clearRefreshCookie()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Auth] Logout error:", error)
    console.error(`[API Error] 500 Internal Server Error: Failed to logout`)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

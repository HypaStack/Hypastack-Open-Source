import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { generateToken, generateRefreshToken, setAuthCookie, setRefreshCookie } from "@/lib/auth"
import { getSessionByRefreshToken, rotateRefreshToken } from "@/lib/user-model"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refresh_token")?.value
    if (!refreshToken) {
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex")
    const session = await getSessionByRefreshToken(refreshTokenHash)

    if (!session) {
      // Token not found or revoked — could be a stolen+used token, nuke the cookies
      console.error(`[Auth] Refresh token not found or revoked — possible theft attempt`)
      const res = NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
      res.cookies.delete("auth_token")
      res.cookies.delete("refresh_token")
      return res
    }

    // Rotate: generate a new refresh token and replace the old one in DB
    const newRefreshToken = generateRefreshToken()
    const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex")
    await rotateRefreshToken(session.id, newRefreshTokenHash)

    // Issue a new short-lived access token
    const newAccessToken = generateToken({ userId: session.user_id, sessionId: session.id })
    await setAuthCookie(newAccessToken)
    await setRefreshCookie(newRefreshToken)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Auth] Refresh error:", error)
    console.error(`[API Error] 500 Internal Server Error: Failed to refresh session`)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

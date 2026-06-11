import { NextResponse } from "next/server"
import { clearAuthCookie } from "@/lib/auth"
import { API_ERRORS } from "@/constants"

export async function POST() {
  try {
    await clearAuthCookie()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Auth] Logout error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to logout"}`);
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

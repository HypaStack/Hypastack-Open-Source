import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getPool, ensureDatabase } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { discovery, usage } = await request.json()

    await ensureDatabase()
    const pool = getPool()
    
    await pool.query(
      `UPDATE users SET onboarding_data = $1 WHERE id = $2`,
      [JSON.stringify({ discovery, usage }), user.userId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Onboarding] Error saving choices:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

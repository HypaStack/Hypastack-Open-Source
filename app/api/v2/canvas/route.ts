import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getPool, ensureDatabase } from "@/lib/db"
import { checkApiRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

// GET /api/v2/canvas — load saved canvas data for current user
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    await ensureDatabase()
    const pool = getPool()
    const result = await pool.query<{ canvas_data: unknown }>(
      `SELECT canvas_data FROM users WHERE id = $1`,
      [currentUser.userId]
    )

    const data = result.rows[0]?.canvas_data ?? null
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[Canvas] GET error:", error)
    return NextResponse.json({ error: "Failed to load canvas" }, { status: 500 })
  }
}

// POST /api/v2/canvas — save canvas data for current user
export async function POST(request: NextRequest) {
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

    const body = await request.json()

    // Basic validation
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid canvas data" }, { status: 400 })
    }

    const { nodes, edges, camera } = body

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return NextResponse.json({ error: "Invalid canvas structure" }, { status: 400 })
    }

    // Limit payload size (max ~500KB)
    const json = JSON.stringify({ nodes, edges, camera })
    if (json.length > 512 * 1024) {
      return NextResponse.json({ error: "Canvas data too large" }, { status: 413 })
    }

    await ensureDatabase()
    const pool = getPool()
    await pool.query(
      `UPDATE users SET canvas_data = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [json, currentUser.userId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Canvas] POST error:", error)
    return NextResponse.json({ error: "Failed to save canvas" }, { status: 500 })
  }
}

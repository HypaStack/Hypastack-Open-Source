import { getPool, ensureDatabase } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const HEARTBEAT_URL = process.env.BETTERSTACK_HEARTBEAT_URL

async function pingBetterStack(fail = false) {
  if (!HEARTBEAT_URL) return
  const url = fail ? `${HEARTBEAT_URL}/fail` : HEARTBEAT_URL
  await fetch(url, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(5000) })
}

export async function GET() {
  try {
    await ensureDatabase()
    const pool = getPool()
    await pool.query("SELECT 1")
    await pingBetterStack(false)
    return Response.json({ ok: true })
  } catch (err: any) {
    console.error("[Heartbeat] DB check failed:", err?.message)
    await pingBetterStack(true).catch(() => {})
    return Response.json({ ok: false, error: err?.message }, { status: 503 })
  }
}

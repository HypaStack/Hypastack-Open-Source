import { getPool } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function checkDb(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now()
  try {
    const pool = getPool()
    await pool.query("SELECT 1")
    return { ok: true, latencyMs: Math.round(performance.now() - start) }
  } catch {
    return { ok: false, latencyMs: -1 }
  }
}

async function checkR2(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now()
  try {
    const cdnUrl = process.env.R2_CDN_DOMAIN || "https://r2.hypastack.com"
    const res = await fetch(`${cdnUrl}/favicon.ico`, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })
    return { ok: res.ok || res.status === 404, latencyMs: Math.round(performance.now() - start) }
  } catch {
    return { ok: false, latencyMs: -1 }
  }
}

export async function GET() {
  const [db, r2] = await Promise.all([checkDb(), checkR2()])
  return Response.json({
    timestamp: Date.now(),
    services: [
      { id: "api",      name: "API",      ok: true,   latencyMs: 0 },
      { id: "database", name: "Database", ok: db.ok,  latencyMs: db.latencyMs },
      { id: "storage",  name: "Storage",  ok: r2.ok,  latencyMs: r2.latencyMs },
    ],
  })
}

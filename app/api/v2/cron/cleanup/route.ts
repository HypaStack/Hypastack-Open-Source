import { NextRequest, NextResponse } from "next/server"
import { cleanupExpiredFiles, cleanupStaging } from "@/lib/cleanup"

export const dynamic = "force-dynamic"

/**
 * POST /api/v2/cron/cleanup
 *
 * Runs the expired-file and orphaned-staging-record cleanup jobs.
 * Should be triggered by an external cron service (e.g. Cloudflare Workers Cron,
 * cron-job.org, or GitHub Actions) on a schedule (e.g. every hour).
 *
 * Protected by ADMIN_SECRET_KEY — callers must send:
 *   Authorization: Bearer <ADMIN_SECRET_KEY>
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const expectedKey = process.env.ADMIN_SECRET_KEY

  if (!expectedKey) {
    console.error("[Cron] ADMIN_SECRET_KEY not configured")
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 })
  }

  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [filesResult, stagingResult] = await Promise.all([
      cleanupExpiredFiles(),
      cleanupStaging(),
    ])

    return NextResponse.json({
      success: true,
      expiredFiles: { cleaned: filesResult.cleaned, errors: filesResult.errors.length },
      stagingRecords: { cleaned: stagingResult.cleaned, errors: stagingResult.errors.length },
    })
  } catch (error) {
    console.error("[Cron] Cleanup error:", error)
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 })
  }
}

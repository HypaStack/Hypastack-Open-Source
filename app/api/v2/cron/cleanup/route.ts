import { NextRequest, NextResponse } from "next/server"
import { cleanupExpiredFiles, cleanupStaging } from "@/lib/cleanup"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const expectedKey = process.env.ADMIN_SECRET_KEY

  if (!expectedKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 })
  }

  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const filesResult = await cleanupExpiredFiles()
    const stagingResult = await cleanupStaging()

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

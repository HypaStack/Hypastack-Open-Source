import { NextRequest, NextResponse } from "next/server"
import { cleanupExpiredFiles, cleanupStaging, cleanupDumpsterPastes } from "@/lib/cleanup"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const expectedKey = process.env.ADMIN_SECRET_KEY

  if (!expectedKey) {
      console.error(`[API Error] 503 Service Unavailable: ${"Not configured"}`);
    return NextResponse.json({ error: "503 Service Unavailable" }, { status: 503 })
  }

  if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== expectedKey) {
      console.error(`[API Error] 401 Unauthorized: ${"Unauthorized"}`);
    return NextResponse.json({ error: "401 Unauthorized" }, { status: 401 })
  }

  try {
    const filesResult = await cleanupExpiredFiles()
    const stagingResult = await cleanupStaging()
    const dumpsterResult = await cleanupDumpsterPastes()

    return NextResponse.json({
      success: true,
      expiredFiles: { cleaned: filesResult.cleaned, errors: filesResult.errors.length },
      stagingRecords: { cleaned: stagingResult.cleaned, errors: stagingResult.errors.length },
      dumpsterPastes: { cleaned: dumpsterResult.cleaned, errors: dumpsterResult.errors.length },
    })
  } catch (error) {
    console.error("[Cron] Cleanup error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Cleanup failed"}`);
    return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
  }
}

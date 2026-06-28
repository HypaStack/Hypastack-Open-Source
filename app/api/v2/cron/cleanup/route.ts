import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import crypto from "crypto"
import { cleanupExpiredFiles, cleanupStaging, cleanupDumpsterPastes } from "@/lib/cleanup"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

/** Constant-time comparison that never short-circuits on length or content. */
function safeKeyEqual(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)
  if (providedBuf.length !== expectedBuf.length) return false
  return crypto.timingSafeEqual(providedBuf, expectedBuf)
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const expectedKey = process.env.ADMIN_SECRET_KEY

  if (!expectedKey) {
      return apiError(503, API_ERRORS.SERVICE_UNAVAILABLE, "Not configured")
  }

  if (!authHeader || !authHeader.startsWith("Bearer ") || !safeKeyEqual(authHeader.slice(7), expectedKey)) {
      return apiError(401, API_ERRORS.UNAUTHORIZED, "Unauthorized")
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
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Cleanup failed")
  }
}

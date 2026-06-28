import { NextResponse, NextRequest } from "next/server"
import { apiError } from "@/lib/api-error"
import { getClient } from "@/lib/db"
import { generateFileId, putObjectByKey } from "@/lib/r2"
import { API_ERRORS } from "@/constants"
import { getCurrentUser } from "@/lib/auth"
import { getUserTier } from "@/lib/user-model"
import { checkUploadRateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req)
    if (!currentUser) {
      return apiError(401, API_ERRORS.UNAUTHORIZED, "Authentication required to create pastes")
    }

    const userTier = await getUserTier(currentUser.userId)
    const rateLimit = await checkUploadRateLimit(currentUser.userId, userTier)
    
    if (!rateLimit.allowed) {
      return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "Rate limit reached")
    }

    const body = await req.json()
    const content = body.content

    if (!content || typeof content !== "string") {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Content is required")
    }

    if (content.length > 5 * 1024 * 1024) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Paste is too large (max 5MB)")
    }

    const id = generateFileId()
    const r2Key = `pastes/${id}/${id}.txt`
    const buffer = Buffer.from(content, "utf-8")

    // Upload to R2
    await putObjectByKey(r2Key, buffer, "text/plain")

    // Save to DB
    const client = await getClient()
    try {
      await client.query(
        `INSERT INTO dumpster_pastes (id, r2_key, created_at, last_accessed_at) VALUES ($1, $2, NOW(), NOW())`,
        [id, r2Key]
      )
    } finally {
      client.release()
    }

    return NextResponse.json({ id })
  } catch (error) {
    console.error("[Dumpster] Error creating paste:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to create paste")
  }
}

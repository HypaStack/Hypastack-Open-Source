import { NextResponse, NextRequest } from "next/server"
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
      console.error(`[API Error] 401 Unauthorized: Authentication required to create pastes`);
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const userTier = await getUserTier(currentUser.userId)
    const rateLimit = await checkUploadRateLimit(currentUser.userId, userTier)
    
    if (!rateLimit.allowed) {
      console.error(`[API Error] 429 Too Many Requests: Rate limit reached`);
      return NextResponse.json({ error: API_ERRORS.TOO_MANY_REQUESTS }, { status: 429 })
    }

    const body = await req.json()
    const content = body.content

    if (!content || typeof content !== "string") {
        console.error(`[API Error] 400 Bad Request: ${"Content is required"}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    if (content.length > 5 * 1024 * 1024) {
        console.error(`[API Error] 400 Bad Request: ${"Paste is too large (max 5MB)"}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
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
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to create paste"}`);
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

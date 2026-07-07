import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { getClient } from "@/lib/data/db"
import { downloadHeadByKey } from "@/lib/storage/r2"
import { checkApiRateLimit } from "@/lib/data/rateLimit"
import { getHashedIp } from "@/lib/http/ip"
import { API_ERRORS } from "@/constants"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id || typeof id !== 'string') {
      return apiError(400, API_ERRORS.BAD_REQUEST, "Invalid ID")
  }

  // Public, unauthenticated endpoint that reads up to 5MB from R2 — rate-limit
  // by hashed IP so it can't be hammered for scraping / cost amplification.
  const rl = await checkApiRateLimit(getHashedIp(req))
  if (!rl.allowed) {
      return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "Rate limit reached")
  }

  const client = await getClient()
  try {
    const { rows } = await client.query(`SELECT r2_key, created_at FROM dumpster_pastes WHERE id = $1`, [id])
    
    if (rows.length === 0) {
        return apiError(404, API_ERRORS.NOT_FOUND, "Paste not found")
    }
    
    const paste = rows[0]
    
    // Update last accessed time asynchronously
    client.query(`UPDATE dumpster_pastes SET last_accessed_at = NOW() WHERE id = $1`, [id]).catch(console.error)
    
    try {
      // Download max 5MB
      const buffer = await downloadHeadByKey(paste.r2_key, 5 * 1024 * 1024)
      const content = buffer.toString('utf-8')
      
      return NextResponse.json({
        id,
        content,
        createdAt: paste.created_at,
      })
    } catch (e: any) {
      console.error("[Dumpster] Error reading from R2:", e)
      return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to read paste content")
    }
  } catch (error) {
    console.error("[Dumpster] DB error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Internal server error")
  } finally {
    client.release()
  }
}

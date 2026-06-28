import { NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { getClient } from "@/lib/db"
import { downloadHeadByKey } from "@/lib/r2"
import { API_ERRORS } from "@/constants"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  if (!id || typeof id !== 'string') {
      return apiError(400, API_ERRORS.BAD_REQUEST, "Invalid ID")
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

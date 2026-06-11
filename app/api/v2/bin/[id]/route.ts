import { NextResponse } from "next/server"
import { getClient } from "@/lib/db"
import { downloadHeadByKey } from "@/lib/r2"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  if (!id || typeof id !== 'string') {
      console.error(`[API Error] 400 Bad Request: ${"Invalid ID"}`);
    return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
  }

  const client = await getClient()
  try {
    const { rows } = await client.query(`SELECT r2_key, created_at FROM dumpster_pastes WHERE id = $1`, [id])
    
    if (rows.length === 0) {
        console.error(`[API Error] 404 Not Found: ${"Paste not found"}`);
      return NextResponse.json({ error: "404 Not Found" }, { status: 404 })
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
      console.error(`[API Error] 500 Internal Server Error: ${"Failed to read paste content"}`);
      return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
    }
  } catch (error) {
    console.error("[Dumpster] DB error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Internal server error"}`);
    return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
  } finally {
    client.release()
  }
}

import { NextResponse } from "next/server"
import { getClient } from "@/lib/db"
import { downloadHeadByKey } from "@/lib/r2"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  }

  const client = await getClient()
  try {
    const { rows } = await client.query(`SELECT r2_key, created_at FROM dumpster_pastes WHERE id = $1`, [id])
    
    if (rows.length === 0) {
      return NextResponse.json({ error: "Paste not found" }, { status: 404 })
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
      return NextResponse.json({ error: "Failed to read paste content" }, { status: 500 })
    }
  } catch (error) {
    console.error("[Dumpster] DB error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    client.release()
  }
}

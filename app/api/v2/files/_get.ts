import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getFilesByUserId } from "@/lib/file-model"
import { decryptFilename } from "@/lib/filename-crypto"
import { checkApiRateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"401 Not Authenticated"}`);
      return NextResponse.json({ error: "401 Unauthorized" }, { status: 401 })
    }
    const rateLimit = await checkApiRateLimit(currentUser.userId)
    if (!rateLimit.allowed) {
        console.error(`[API Error] 429 Too Many Requests: ${"429 Too Many Requests"}`);
      return NextResponse.json({ error: "429 Too Many Requests" }, { status: 429 })
    }

    const files = await getFilesByUserId(currentUser.userId)
    
    return NextResponse.json({
      files: files.map(f => ({
        id: f.id,
        name: decryptFilename(f.custom_filename || f.original_name),
        size: f.file_size,
        contentType: f.content_type,
        uploadedAt: f.upload_date,
        expiresAt: f.expires_at,

        burnOnRead: f.burn_on_read,
        starred: !!f.starred,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/d/${f.id}`,
      }))
    })
  } catch (error) {
    console.error("[Auth Files] GET error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"500 File Fetch Failed"}`);
    return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
  }
}

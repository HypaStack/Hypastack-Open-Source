import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getFilesByUserId } from "@/lib/file-model"
import { decryptFilename } from "@/lib/filename-crypto"
import { checkApiRateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    const rateLimit = await checkApiRateLimit(currentUser.userId)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached, try again later" },
        { status: 429 }
      )
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
        hasPin: !!f.pin,
        burnOnRead: f.burn_on_read,
        starred: !!f.starred,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/d/${f.id}`,
      }))
    })
  } catch (error) {
    console.error("[Auth Files] GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    )
  }
}

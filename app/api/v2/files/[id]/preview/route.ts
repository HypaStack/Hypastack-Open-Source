import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getFileById } from "@/lib/file-model"
import { getPresignedDownloadUrl } from "@/lib/r2"
import { checkApiRateLimit } from "@/lib/rate-limit"
import { PREVIEWABLE_MIME_REGEX } from "@/constants"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

const PREVIEWABLE = PREVIEWABLE_MIME_REGEX

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request)
  if (!currentUser) {
      console.error(`[API Error] 401 Unauthorized: ${"Not authenticated"}`);
    return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
  }
  const rateLimit = await checkApiRateLimit(currentUser.userId)
  if (!rateLimit.allowed) {
      console.error(`[API Error] 429 Too Many Requests: ${"Rate limit exceeded"}`);
    return NextResponse.json({ error: API_ERRORS.TOO_MANY_REQUESTS }, { status: 429 })
  }

  const { id } = await params
  const record = await getFileById(id)
  if (!record) {
      console.error(`[API Error] 404 Not Found: ${"Not found"}`);
    return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
  }
  if (record.user_id !== currentUser.userId) {
      console.error(`[API Error] 403 Forbidden: ${"Forbidden"}`);
    return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
  }
  if (!PREVIEWABLE.test(record.content_type || "")) {
      console.error(`[API Error] 415 Unsupported Media Type: ${"Not previewable"}`);
    return NextResponse.json({ error: API_ERRORS.UNSUPPORTED_MEDIA_TYPE }, { status: 415 })
  }

  const url = await getPresignedDownloadUrl({
    r2Key: record.r2_key,
    originalName: record.original_name,
    contentType: record.content_type,
    expiresIn: 300,
    disposition: "inline",
  })

  try {
    const response = await fetch(url, {
      // Use Next.js cache to avoid repeatedly hitting R2 (Class B operations)
      next: { revalidate: 86400 }
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch preview" }, { status: response.status })
    }

    const headers = new Headers(response.headers)
    // Instruct the browser and edge to cache this aggressively
    headers.set("Cache-Control", "public, max-age=86400, immutable")
    
    // We stream the body back to the client
    return new NextResponse(response.body, { headers })
  } catch (error) {
    console.error("Preview fetch error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Internal server error"}`);
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

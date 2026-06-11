import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getFileById } from "@/lib/file-model"
import { getPresignedDownloadUrl } from "@/lib/r2"
import { checkApiRateLimit } from "@/lib/rate-limit"
import { PREVIEWABLE_MIME_REGEX } from "@/constants"

export const dynamic = "force-dynamic"

const PREVIEWABLE = PREVIEWABLE_MIME_REGEX

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request)
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const rateLimit = await checkApiRateLimit(currentUser.userId)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
  }

  const { id } = await params
  const record = await getFileById(id)
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (record.user_id !== currentUser.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!PREVIEWABLE.test(record.content_type || "")) {
    return NextResponse.json({ error: "Not previewable" }, { status: 415 })
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { getCurrentUser } from "@/lib/auth"
import { getFileById } from "@/lib/file-model"
import { getPresignedDownloadUrl } from "@/lib/r2"
import { decryptFilename } from "@/lib/filename-crypto"
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
      return apiError(401, API_ERRORS.UNAUTHORIZED, "Not authenticated")
  }
  const rateLimit = await checkApiRateLimit(currentUser.userId)
  if (!rateLimit.allowed) {
      return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "Rate limit exceeded")
  }

  const { id } = await params
  const record = await getFileById(id)
  if (!record) {
      return apiError(404, API_ERRORS.NOT_FOUND, "Not found")
  }
  if (record.user_id !== currentUser.userId) {
      return apiError(403, API_ERRORS.FORBIDDEN, "Forbidden")
  }
  if (!PREVIEWABLE.test(record.content_type || "")) {
      return apiError(415, API_ERRORS.UNSUPPORTED_MEDIA_TYPE, "Not previewable")
  }

  const url = await getPresignedDownloadUrl({
    r2Key: record.r2_key,
    originalName: decryptFilename(record.custom_filename || record.original_name),
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

    // Build a clean header set rather than echoing R2's. content_type is
    // client-supplied at upload time and the previewable check admits
    // image/svg+xml, so serving it inline could execute script on our origin.
    // `sandbox` puts the response in an opaque origin with scripts disabled
    // (neutralizing SVG/HTML payloads) and nosniff stops content-type guessing.
    const headers = new Headers()
    headers.set("Content-Type", record.content_type)
    headers.set("Content-Disposition", "inline")
    headers.set("X-Content-Type-Options", "nosniff")
    headers.set("Content-Security-Policy", "sandbox")
    headers.set("Cache-Control", "private, max-age=86400, immutable")
    const contentLength = response.headers.get("content-length")
    if (contentLength) headers.set("Content-Length", contentLength)

    // We stream the body back to the client
    return new NextResponse(response.body, { headers })
  } catch (error) {
    console.error("Preview fetch error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Internal server error")
  }
}

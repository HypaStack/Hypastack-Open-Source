import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { apiError } from "@/lib/http/apiError"
import { getPresignedDownloadUrl } from "@/lib/storage/r2"
import { getFunnelFileForOwner } from "@/lib/models/funnelModel"
import { API_ERRORS, PRESIGNED_TTL_SECONDS } from "@/constants"

export const dynamic = "force-dynamic"

// Hand the owner a short-lived presigned URL for the ciphertext. The bytes are
// fetched and decrypted in the browser; disposition is inline since the real
// filename is applied client-side after decryption.
export const GET = withAuth<{ id: string }>(async ({ user, params }) => {
  const file = await getFunnelFileForOwner(params.id, user.userId)
  if (!file) return apiError(404, API_ERRORS.NOT_FOUND, "File not found")

  const url = await getPresignedDownloadUrl({
    r2Key: file.r2_key,
    originalName: "download",
    contentType: "application/octet-stream",
    disposition: "inline",
    expiresIn: PRESIGNED_TTL_SECONDS,
  })
  return NextResponse.json({ url })
}, { rateLimit: true, label: "Funnel File Download" })

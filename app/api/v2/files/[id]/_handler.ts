import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { getFileBySlugOrId } from "@/lib/models/fileModel"
import { deleteByKey, getPresignedDownloadUrl } from "@/lib/storage/r2"
import { decryptFilename } from "@/lib/security/filenameCrypto"
import { checkApiRateLimit } from "@/lib/data/rateLimit"
import { getHashedIp } from "@/lib/http/ip"
import { API_ERRORS } from "@/constants"

export async function handleFileGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Rate limit file metadata lookups per IP
    const rateLimit = await checkApiRateLimit(getHashedIp(request))
    if (!rateLimit.allowed) {
        return apiError(429, API_ERRORS.TOO_MANY_REQUESTS, "Rate limit exceeded. Please try again later.")
    }

    if (!id) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "No file ID provided")
    }

    // Get file from database (resolves either a random id or a custom slug)
    let record
    try {
      record = await getFileBySlugOrId(id)
    } catch (dbError: any) {
      console.error("[File] Database error:", dbError.message)
      return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Database error")
    }

    if (!record) {
        return apiError(404, API_ERRORS.NOT_FOUND, "File not found")
    }

    // Check if file has been burned (burn_on_read = 2 means already downloaded)
    if (record.burn_on_read === 2) {
        return apiError(410, API_ERRORS.GONE, "File has already been downloaded")
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(record.expires_at)

    if (now > expiresAt) {
      try {
        await deleteByKey(record.r2_key)
      } catch (e) {
        console.error("[File] Failed to delete expired file from R2:", e)
      }
        return apiError(410, API_ERRORS.GONE, "File has expired")
    }



    // Decrypt filenames for display and Content-Disposition
    const decryptedName = decryptFilename(record.original_name)
    const decryptedCustom = record.custom_filename ? decryptFilename(record.custom_filename) : null

    return NextResponse.json({
      success: true,
      file: {
        id: record.id,
        name: decryptedName,
        size: record.file_size,
        contentType: record.content_type,
        expiresAt: record.expires_at,

        burnOnRead: record.burn_on_read,
        customFilename: decryptedCustom,
        note: record.note,
        // Encryption metadata for client-side decryption
        encryptionChunkSize: record.encryption_chunk_size ?? null,
        encryptionTotalParts: record.encryption_total_parts ?? null,
      },
    })

  } catch (error: any) {
    console.error("[File] Unexpected error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to get file")
  }
}

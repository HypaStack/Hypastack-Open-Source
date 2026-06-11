import { NextRequest, NextResponse } from "next/server"
import { getFileById } from "@/lib/file-model"
import { deleteByKey, getPresignedDownloadUrl } from "@/lib/r2"
import { decryptFilename } from "@/lib/filename-crypto"
import { checkApiRateLimit } from "@/lib/rate-limit"
import { getHashedIp } from "@/lib/ip"
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
        console.error(`[API Error] 429 Too Many Requests: ${"Rate limit exceeded. Please try again later."}`);
      return NextResponse.json(
        { error: API_ERRORS.TOO_MANY_REQUESTS },
        { status: 429 }
      )
    }

    if (!id) {
        console.error(`[API Error] 400 Bad Request: ${"No file ID provided"}`);
      return NextResponse.json(
        { error: API_ERRORS.BAD_REQUEST },
        { status: 400 }
      )
    }

    // Get file from database
    let record
    try {
      record = await getFileById(id)
    } catch (dbError: any) {
      console.error("[File] Database error:", dbError.message)
      console.error(`[API Error] 500 Internal Server Error: ${"Database error"}`);
      return NextResponse.json(
        { error: API_ERRORS.INTERNAL_SERVER_ERROR },
        { status: 500 }
      )
    }

    if (!record) {
        console.error(`[API Error] 404 Not Found: ${"File not found"}`);
      return NextResponse.json(
        { error: API_ERRORS.NOT_FOUND },
        { status: 404 }
      )
    }

    // Check if file has been burned (burn_on_read = 2 means already downloaded)
    if (record.burn_on_read === 2) {
        console.error(`[API Error] 410 Gone: ${"File has already been downloaded"}`);
      return NextResponse.json(
        { error: API_ERRORS.GONE },
        { status: 410 }
      )
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
        console.error(`[API Error] 410 Gone: ${"File has expired"}`);

      return NextResponse.json(
        { error: API_ERRORS.GONE },
        { status: 410 }
      )
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
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to get file"}`);
    return NextResponse.json(
      { error: API_ERRORS.INTERNAL_SERVER_ERROR },
      { status: 500 }
    )
  }
}

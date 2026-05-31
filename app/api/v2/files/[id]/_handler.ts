import { NextRequest, NextResponse } from "next/server"
import { getFileById } from "@/lib/file-model"
import { deleteByKey, getPresignedDownloadUrl } from "@/lib/r2"
import { decryptFilename } from "@/lib/filename-crypto"
import { checkApiRateLimit } from "@/lib/rate-limit"
import { getHashedIp } from "@/lib/ip"

export async function handleFileGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Rate limit file metadata lookups per IP
    const rateLimit = await checkApiRateLimit(getHashedIp(request))
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      )
    }

    if (!id) {
      return NextResponse.json(
        { error: "No file ID provided" },
        { status: 400 }
      )
    }

    // Get file from database
    let record
    try {
      record = await getFileById(id)
    } catch (dbError: any) {
      console.error("[File] Database error:", dbError.message)
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      )
    }

    if (!record) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }

    // Check if file has been burned (burn_on_read = 2 means already downloaded)
    if (record.burn_on_read === 2) {
      return NextResponse.json(
        { error: "File has already been downloaded" },
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

      return NextResponse.json(
        { error: "File has expired" },
        { status: 410 }
      )
    }

    // Check PIN protection status
    const hasPin = !!record.pin
    const pinVerified = false // PIN verification happens inline at download time

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
        hasPin,
        pinVerified,
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
    return NextResponse.json(
      { error: "Failed to get file" },
      { status: 500 }
    )
  }
}

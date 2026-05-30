import { NextRequest, NextResponse } from "next/server"
import { getFileById } from "@/lib/file-model"
import { deleteByKey, getPresignedDownloadUrl } from "@/lib/r2"
import { decryptFilename } from "@/lib/filename-crypto"
import { checkApiRateLimit } from "@/lib/rate-limit"

export async function handleFileGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Rate limit file metadata lookups
    const rateLimit = await checkApiRateLimit('anonymous')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      )
    }

    if (!id) {
      console.error("[File] No ID provided")
      return NextResponse.json(
        { error: "No file ID provided" },
        { status: 400 }
      )
    }
    
    console.error("[File] Looking up file:", id)
    
    // Get file from database
    let record
    try {
      record = await getFileById(id)
    } catch (dbError: any) {
      console.error("[File] Database error:", dbError.message)
      return NextResponse.json(
        { error: "Database error", details: dbError.message },
        { status: 500 }
      )
    }
    
    if (!record) {
      console.error("[File] File not found in database:", id)
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }
    
    console.error("[File] Found file:", record.original_name)
    
    // Check if file has been burned (burn_on_read = 2 means already downloaded)
    if (record.burn_on_read === 2) {
      console.error("[File] File already burned:", id)
      return NextResponse.json(
        { error: "File has already been downloaded" },
        { status: 410 }
      )
    }
    
    // Check if expired
    const now = new Date()
    const expiresAt = new Date(record.expires_at)
    
    console.error("[File] Current time:", now.toISOString())
    console.error("[File] Expires at:", expiresAt.toISOString())
    
    if (now > expiresAt) {
      console.error("[File] File expired, cleaning up:", id)
      try {
        await deleteByKey(record.r2_key)
      } catch (e) {
        console.error("[File] Failed to delete from R2:", e)
      }
      
      return NextResponse.json(
        { error: "File has expired" },
        { status: 410 }
      )
    }
    
    // Check PIN protection status
    const hasPin = !!record.pin
    const pinVerified = false // PIN verification now happens inline at download time
    
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
      { error: "Failed to get file", details: error.message },
      { status: 500 }
    )
  }
}

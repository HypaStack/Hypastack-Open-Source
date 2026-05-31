import { NextRequest, NextResponse } from "next/server"
import { getStagingRecord, promoteStagingToFile } from "@/lib/file-model"
import { fileExistsByKey, deleteByKey, downloadHeadByKey } from "@/lib/r2"
import { validateFileType } from "@/lib/file-validation"
import { decryptFilename } from "@/lib/filename-crypto"
import { getCurrentUser } from "@/lib/auth"
import { completeMultipartUpload, abortMultipartUpload } from "@/lib/r2-multipart"

/**
 * Upload Complete Route
 * Client calls this after uploading to R2 to confirm upload is complete
 * Server verifies file exists in R2, validates magic bytes, and promotes staging record to main table
 */
export async function handleUploadCompletePost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { fileId, uploadId, parts } = body

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      )
    }
    
    // Get staging record
    const record = await getStagingRecord(fileId)
    if (!record) {
      return NextResponse.json(
        { error: "Upload session not found or expired" },
        { status: 404 }
      )
    }

    // Verify ownership
    if (record.user_id && record.user_id !== currentUser.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // If this is a multipart upload, finalize it on R2 first
    if (uploadId && Array.isArray(parts) && parts.length > 0) {
      try {
        await completeMultipartUpload({
          r2Key: record.r2_key,
          uploadId,
          parts,
        })
      } catch (mpError: any) {
        console.error(`[UploadComplete] Multipart completion failed:`, mpError)
        // Attempt cleanup
        await abortMultipartUpload({ r2Key: record.r2_key, uploadId }).catch(() => {})
        return NextResponse.json(
          { error: "Failed to finalize multipart upload. Please try again." },
          { status: 500 }
        )
      }
    }
    
    // Verify file exists in R2 using the opaque r2_key
    const exists = await fileExistsByKey(record.r2_key)
    if (!exists) {
      return NextResponse.json(
        { error: "File not found in storage. Please upload again." },
        { status: 404 }
      )
    }
    
    // Validate file type by magic bytes (download first 64KB)
    // Skip for multipart uploads — the assembled object is AES-256-GCM encrypted
    // so magic bytes are meaningless. Extension validation already ran at init time.
    const isMultipart = !!(uploadId && Array.isArray(parts) && parts.length > 0)
    if (!isMultipart) {
      try {
        const fileHead = await downloadHeadByKey(record.r2_key, 65536)
        const validation = await validateFileType(fileHead)
        
        if (!validation.valid) {
          await deleteByKey(record.r2_key)
          console.error(`[UploadComplete] Blocked file type detected and deleted: ${fileId}`)
          return NextResponse.json(
            { error: validation.error || "This file type is not allowed." },
            { status: 415 }
          )
        }
      } catch (validationError) {
        console.error(`[UploadComplete] Magic bytes validation error:`, validationError)
        await deleteByKey(record.r2_key)
        return NextResponse.json(
          { error: "File validation failed. Please try again." },
          { status: 422 }
        )
      }
    }
    
    // Promote staging record to main files table
    const promoted = await promoteStagingToFile(fileId)
    
    if (!promoted) {
      return NextResponse.json(
        { error: "Failed to finalize upload" },
        { status: 500 }
      )
    }
    
    // Decrypt filenames for display in activity log
    const displayName = decryptFilename(record.custom_filename || record.original_name)


    return NextResponse.json({
      success: true,
      message: "Upload confirmed",
    })
    
  } catch (error) {
    console.error("[UploadComplete] Error:", error)
    return NextResponse.json(
      { error: "Failed to confirm upload" },
      { status: 500 }
    )
  }
}

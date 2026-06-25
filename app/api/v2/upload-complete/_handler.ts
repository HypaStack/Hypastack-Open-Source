import { NextRequest, NextResponse } from "next/server"
import { getStagingRecord, promoteStagingToFile } from "@/lib/file-model"
import { fileExistsByKey, deleteByKey, downloadHeadByKey } from "@/lib/r2"
import { validateFileType } from "@/lib/file-validation"
import { decryptFilename } from "@/lib/filename-crypto"
import { getCurrentUser } from "@/lib/auth"
import { completeMultipartUpload, abortMultipartUpload } from "@/lib/r2-multipart"
import { API_ERRORS } from "@/constants"

export async function handleUploadCompletePost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"Authentication required"}`);
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const body = await request.json()
    const { fileId, uploadId, parts } = body

    if (!fileId) {
        console.error(`[API Error] 400 Bad Request: ${"File ID is required"}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    const record = await getStagingRecord(fileId)
    if (!record) {
        console.error(`[API Error] 404 Not Found: ${"Upload session not found or expired"}`);
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }

    // Both upload init handlers always stamp the authenticated user_id, so a
    // null owner is unexpected. Reject anything that isn't owned by the caller
    // (including null) rather than letting the `&&` short-circuit skip the check.
    if (record.user_id !== currentUser.userId) {
        console.error(`[API Error] 403 Forbidden: ${"Unauthorized"}`);
      return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
    }

    if (uploadId && Array.isArray(parts) && parts.length > 0) {
      try {
        await completeMultipartUpload({
          r2Key: record.r2_key,
          uploadId,
          parts,
        })
      } catch (mpError: any) {
        console.error(`[UploadComplete] Multipart completion failed:`, mpError)
        await abortMultipartUpload({ r2Key: record.r2_key, uploadId }).catch(() => {})
        console.error(`[API Error] 500 Internal Server Error: ${"Failed to finalize multipart upload. Please try again."}`);
        return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
      }
    }

    const exists = await fileExistsByKey(record.r2_key)
    if (!exists) {
        console.error(`[API Error] 404 Not Found: ${"File not found in storage. Please upload again."}`);
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }

    // Skip magic-byte validation for multipart: the assembled object is AES-256-GCM
    // encrypted so magic bytes are meaningless. Extension validation ran at init time.
    const isMultipart = !!(uploadId && Array.isArray(parts) && parts.length > 0)
    if (!isMultipart) {
      try {
        const fileHead = await downloadHeadByKey(record.r2_key, 65536)
        const validation = await validateFileType(fileHead)

        if (!validation.valid) {
          await deleteByKey(record.r2_key)
          console.error(`[UploadComplete] Blocked file type detected and deleted: ${fileId}`)
            console.error(`[API Error] 415 Unsupported Media Type: ${validation.error || "This file type is not allowed."}`);
          return NextResponse.json({ error: API_ERRORS.UNSUPPORTED_MEDIA_TYPE }, { status: 415 })
        }
      } catch (validationError) {
        console.error(`[UploadComplete] Magic bytes validation error:`, validationError)
        await deleteByKey(record.r2_key)
        console.error(`[API Error] 422 Error: ${"File validation failed. Please try again."}`);
        return NextResponse.json({ error: "422 Error" }, { status: 422 })
      }
    }

    const promoted = await promoteStagingToFile(fileId)

    if (!promoted) {
        console.error(`[API Error] 500 Internal Server Error: ${"Failed to finalize upload"}`);
      return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
    }

    const displayName = decryptFilename(record.custom_filename || record.original_name)

    return NextResponse.json({
      success: true,
      message: "Upload confirmed",
    })

  } catch (error) {
    console.error("[UploadComplete] Error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to confirm upload"}`);
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

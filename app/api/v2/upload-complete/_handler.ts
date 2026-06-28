import { NextRequest, NextResponse } from "next/server"
import { getStagingRecord, promoteStagingToFile } from "@/lib/file-model"
import { fileExistsByKey, deleteByKey, downloadHeadByKey } from "@/lib/r2"
import { validateFileType } from "@/lib/file-validation"
import { decryptFilename } from "@/lib/filename-crypto"
import { getCurrentUser } from "@/lib/auth"
import { completeMultipartUpload, abortMultipartUpload } from "@/lib/r2-multipart"
import { API_ERRORS } from "@/constants"
import { apiError } from "@/lib/api-error"

export async function handleUploadCompletePost(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return apiError(401, API_ERRORS.UNAUTHORIZED, "Authentication required")
    }

    const body = await request.json()
    const { fileId, uploadId, parts } = body

    if (!fileId) {
      return apiError(400, API_ERRORS.BAD_REQUEST, "File ID is required")
    }

    const record = await getStagingRecord(fileId)
    if (!record) {
      return apiError(404, API_ERRORS.NOT_FOUND, "Upload session not found or expired")
    }

    // Both upload init handlers always stamp the authenticated user_id, so a
    // null owner is unexpected. Reject anything that isn't owned by the caller
    // (including null) rather than letting the `&&` short-circuit skip the check.
    if (record.user_id !== currentUser.userId) {
      return apiError(403, API_ERRORS.FORBIDDEN, "Unauthorized")
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
        return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to finalize multipart upload. Please try again.")
      }
    }

    const exists = await fileExistsByKey(record.r2_key)
    if (!exists) {
      return apiError(404, API_ERRORS.NOT_FOUND, "File not found in storage. Please upload again.")
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
          return apiError(415, API_ERRORS.UNSUPPORTED_MEDIA_TYPE, validation.error || "This file type is not allowed.")
        }
      } catch (validationError) {
        console.error(`[UploadComplete] Magic bytes validation error:`, validationError)
        await deleteByKey(record.r2_key)
        return apiError(422, "422 Error", "File validation failed. Please try again.")
      }
    }

    const promoted = await promoteStagingToFile(fileId)

    if (!promoted) {
      return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to finalize upload")
    }

    const displayName = decryptFilename(record.custom_filename || record.original_name)

    return NextResponse.json({
      success: true,
      message: "Upload confirmed",
    })

  } catch (error) {
    console.error("[UploadComplete] Error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to confirm upload")
  }
}

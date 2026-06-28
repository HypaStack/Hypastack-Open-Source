import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { getCurrentUser } from "@/lib/auth"
import { getStagingRecord, deleteStagingRecord } from "@/lib/file-model"
import { abortMultipartUpload } from "@/lib/r2-multipart"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        return apiError(401, API_ERRORS.UNAUTHORIZED, "Authentication required.")
    }

    const { fileId, uploadId } = await request.json()

    if (!fileId || !uploadId) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Missing required fields")
    }

    const record = await getStagingRecord(fileId)
    if (!record) {
        return apiError(404, API_ERRORS.NOT_FOUND, "Upload session not found")
    }
    if (record.user_id && record.user_id !== currentUser.userId) {
        return apiError(403, API_ERRORS.FORBIDDEN, "Unauthorized")
    }

    await abortMultipartUpload({
      r2Key: record.r2_key,
      uploadId,
    })

    await deleteStagingRecord(fileId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Upload Abort] Error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to abort upload")
  }
}

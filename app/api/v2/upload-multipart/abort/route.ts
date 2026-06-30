import { NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { withAuth } from "@/lib/http/route"
import { getStagingRecord, deleteStagingRecord } from "@/lib/models/fileModel"
import { abortMultipartUpload } from "@/lib/storage/r2Multipart"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

export const POST = withAuth(async ({ request, user: currentUser }) => {
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
}, { label: "Upload Abort" })

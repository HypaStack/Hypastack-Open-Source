import { NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { withAuth } from "@/lib/http/route"
import { getStagingRecord } from "@/lib/models/fileModel"
import { listUploadedParts, getPresignedUrlsForParts } from "@/lib/storage/r2Multipart"
import { DEFAULT_CHUNK_SIZE } from "@/lib/storage/multipart"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

export const POST = withAuth(async ({ request, user: currentUser }) => {
    const { fileId, uploadId, totalParts, chunkSize } = await request.json()

    if (!fileId || !uploadId || !totalParts) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Missing required fields")
    }

    const record = await getStagingRecord(fileId)
    if (!record) {
        return apiError(404, API_ERRORS.NOT_FOUND, "Upload session not found or expired")
    }
    if (record.user_id && record.user_id !== currentUser.userId) {
        return apiError(403, API_ERRORS.FORBIDDEN, "Unauthorized")
    }

    const uploadedParts = await listUploadedParts({
      r2Key: record.r2_key,
      uploadId,
    })

    const uploadedPartNumbers = new Set(uploadedParts.map((p) => p.partNumber))

    const missingPartNumbers: number[] = []
    for (let i = 1; i <= totalParts; i++) {
      if (!uploadedPartNumbers.has(i)) {
        missingPartNumbers.push(i)
      }
    }

    const presignedUrls = await getPresignedUrlsForParts({
      r2Key: record.r2_key,
      uploadId,
      partNumbers: missingPartNumbers,
    })

    const missingPartsWithUrls = missingPartNumbers.map((partNum, idx) => ({
      partNumber: partNum,
      presignedUrl: presignedUrls[idx],
    }))

    return NextResponse.json({
      success: true,
      fileId,
      uploadId,
      r2Key: record.r2_key,
      totalParts,
      uploadedParts: uploadedParts.map((p) => ({
        partNumber: p.partNumber,
        etag: p.etag,
      })),
      missingParts: missingPartsWithUrls,
      shareUrl: record.share_url,
      chunkSize: chunkSize || DEFAULT_CHUNK_SIZE,
    })
}, { label: "Upload Resume" })

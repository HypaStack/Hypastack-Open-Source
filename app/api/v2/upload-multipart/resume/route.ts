import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getStagingRecord } from "@/lib/file-model"
import { listUploadedParts, getPresignedUrlsForParts } from "@/lib/r2-multipart"
import { DEFAULT_CHUNK_SIZE } from "@/lib/multipart"
import { API_ERRORS } from "@/constants"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"Authentication required."}`);
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const { fileId, uploadId, totalParts, chunkSize } = await request.json()

    if (!fileId || !uploadId || !totalParts) {
        console.error(`[API Error] 400 Bad Request: ${"Missing required fields"}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    const record = await getStagingRecord(fileId)
    if (!record) {
        console.error(`[API Error] 404 Not Found: ${"Upload session not found or expired"}`);
      return NextResponse.json({ error: API_ERRORS.NOT_FOUND }, { status: 404 })
    }
    if (record.user_id && record.user_id !== currentUser.userId) {
        console.error(`[API Error] 403 Forbidden: ${"Unauthorized"}`);
      return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
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
  } catch (error: any) {
    console.error("[Upload Resume] Error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to check upload status"}`);
    return NextResponse.json(
      { error: API_ERRORS.INTERNAL_SERVER_ERROR },
      { status: 500 }
    )
  }
}

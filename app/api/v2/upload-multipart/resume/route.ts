import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getStagingRecord } from "@/lib/file-model"
import { listUploadedParts, getPresignedUrlsForParts } from "@/lib/r2-multipart"
import { DEFAULT_CHUNK_SIZE } from "@/lib/multipart"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }

    const { fileId, uploadId, totalParts, chunkSize } = await request.json()

    if (!fileId || !uploadId || !totalParts) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const record = await getStagingRecord(fileId)
    if (!record) {
      return NextResponse.json({ error: "Upload session not found or expired" }, { status: 404 })
    }
    if (record.user_id && record.user_id !== currentUser.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
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
    return NextResponse.json(
      { error: "Failed to check upload status" },
      { status: 500 }
    )
  }
}

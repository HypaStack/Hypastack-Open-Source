import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getStagingRecord, deleteStagingRecord } from "@/lib/file-model"
import { abortMultipartUpload } from "@/lib/r2-multipart"

export const dynamic = "force-dynamic"

/**
 * POST /api/v2/upload-multipart/abort
 *
 * Aborts a multipart upload: cleans up partial data on R2 and deletes the staging record.
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }

    const { fileId, uploadId } = await request.json()

    if (!fileId || !uploadId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const record = await getStagingRecord(fileId)
    if (!record) {
      return NextResponse.json({ error: "Upload session not found" }, { status: 404 })
    }
    if (record.user_id && record.user_id !== currentUser.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Abort the multipart upload on R2 (deletes all uploaded parts)
    await abortMultipartUpload({
      r2Key: record.r2_key,
      uploadId,
    })

    // Delete the staging record from DB
    await deleteStagingRecord(fileId)

    console.error(`[Upload Abort] Aborted multipart upload: ${fileId}`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Upload Abort] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to abort upload" },
      { status: 500 }
    )
  }
}

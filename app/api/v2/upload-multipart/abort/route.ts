import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getStagingRecord, deleteStagingRecord } from "@/lib/file-model"
import { abortMultipartUpload } from "@/lib/r2-multipart"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"Authentication required."}`);
      return NextResponse.json({ error: "401 Unauthorized" }, { status: 401 })
    }

    const { fileId, uploadId } = await request.json()

    if (!fileId || !uploadId) {
        console.error(`[API Error] 400 Bad Request: ${"Missing required fields"}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }

    const record = await getStagingRecord(fileId)
    if (!record) {
        console.error(`[API Error] 404 Not Found: ${"Upload session not found"}`);
      return NextResponse.json({ error: "404 Not Found" }, { status: 404 })
    }
    if (record.user_id && record.user_id !== currentUser.userId) {
        console.error(`[API Error] 403 Forbidden: ${"Unauthorized"}`);
      return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
    }

    await abortMultipartUpload({
      r2Key: record.r2_key,
      uploadId,
    })

    await deleteStagingRecord(fileId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Upload Abort] Error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to abort upload"}`);
    return NextResponse.json(
      { error: "500 Internal Server Error" },
      { status: 500 }
    )
  }
}

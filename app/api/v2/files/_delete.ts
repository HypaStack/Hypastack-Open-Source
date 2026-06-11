import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getFilesByIds, deleteFilesByIds } from "@/lib/file-model"
import { deleteObjectsBatch } from "@/lib/r2"
import { getUserTier } from "@/lib/user-model"
import { getTierDelayMs } from "@/constants/tier-limits"
import { decryptFilename } from "@/lib/filename-crypto"
import { checkApiRateLimit } from "@/lib/rate-limit"

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"401 Not Authenticated"}`);
      return NextResponse.json({ error: "401 Unauthorized" }, { status: 401 })
    }
    const rateLimit = await checkApiRateLimit(currentUser.userId)
    if (!rateLimit.allowed) {
        console.error(`[API Error] 429 Too Many Requests: ${"429 Too Many Requests"}`);
      return NextResponse.json({ error: "429 Too Many Requests" }, { status: 429 })
    }

    const { fileId, fileIds } = await request.json()

    let idsToDelete: string[] = []
    if (fileIds && Array.isArray(fileIds)) {
      idsToDelete = fileIds
    } else if (fileId) {
      idsToDelete = [fileId]
    }

    if (idsToDelete.length === 0) {
        console.error(`[API Error] 400 Bad Request: ${"400: File IDs Required"}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }

    // free tier throttle
    const userTier = await getUserTier(currentUser.userId)
    const delayMs = getTierDelayMs(userTier)
    if (idsToDelete.length > 1 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    // batch fetch all
    const ownedFiles = await getFilesByIds(idsToDelete, currentUser.userId)
    const ownedById = new Map(ownedFiles.map(f => [f.id, f]))

    // batch delete (up to 1000 keys - but we're limiting it to 500 per batch)
    const r2Keys = ownedFiles.map(f => f.r2_key)
    let failedR2Keys = new Set<string>()
    if (r2Keys.length > 0) {
      try {
        const failed = await deleteObjectsBatch(r2Keys)
        failedR2Keys = new Set(failed)
      } catch (r2Err) {
        console.error("[Auth Files] R2 batch delete error:", r2Err)
      }
    }

    // batch delete
    const idsWithR2Ok = ownedFiles
      .filter(f => !failedR2Keys.has(f.r2_key))
      .map(f => f.id)

    if (idsWithR2Ok.length > 0) {
      await deleteFilesByIds(idsWithR2Ok, currentUser.userId)
    }

    // stream results back
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        idsToDelete.forEach((id, i) => {
          const file = ownedById.get(id)
          const r2Failed = file ? failedR2Keys.has(file.r2_key) : false
          const success = !!file && !r2Failed
          const name = file
            ? (file.custom_filename
                ? decryptFilename(file.custom_filename)
                : file.original_name
                  ? decryptFilename(file.original_name)
                  : "File")
            : "Unknown"

          try {
            controller.enqueue(encoder.encode(JSON.stringify({
              index: i + 1,
              total: idsToDelete.length,
              id,
              success,
              name,
            }) + "\n"))
          } catch { }
        })
        try { controller.close() } catch { }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error("[Auth Files] DELETE error:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"500 Deletion Failed"}`);
    return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
  }
}

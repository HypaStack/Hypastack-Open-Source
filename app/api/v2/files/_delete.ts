import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getFilesByIds, deleteFilesByIds } from "@/lib/file-model"
import { deleteObjectsBatch } from "@/lib/r2"
import { getUserTier } from "@/lib/user-model"
import { getTierDelayMs } from "@/lib/tier-limits"
import { decryptFilename } from "@/lib/filename-crypto"
import { checkApiRateLimit } from "@/lib/rate-limit"

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    const rateLimit = await checkApiRateLimit(currentUser.userId)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit reached, try again later" },
        { status: 429 }
      )
    }

    const { fileId, fileIds } = await request.json()

    let idsToDelete: string[] = []
    if (fileIds && Array.isArray(fileIds)) {
      idsToDelete = fileIds
    } else if (fileId) {
      idsToDelete = [fileId]
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: "File ID(s) required" }, { status: 400 })
    }

    // Tier delay only applies when > 1 file for free-tier throttling UX.
    // For batch deletes we still honour it as a single pre-flight wait.
    const userTier = await getUserTier(currentUser.userId)
    const delayMs = getTierDelayMs(userTier)
    if (idsToDelete.length > 1 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    // 1. Batch-fetch all records (single DB query, ownership-filtered)
    const ownedFiles = await getFilesByIds(idsToDelete, currentUser.userId)
    const ownedById = new Map(ownedFiles.map(f => [f.id, f]))

    // 2. Batch-delete from R2 in one HTTP call (up to 1000 keys)
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

    // 3. Batch-delete from DB in one query
    const idsWithR2Ok = ownedFiles
      .filter(f => !failedR2Keys.has(f.r2_key))
      .map(f => f.id)

    if (idsWithR2Ok.length > 0) {
      await deleteFilesByIds(idsWithR2Ok, currentUser.userId)
    }

    // 4. Stream results back (all at once, preserving existing frontend contract)
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
          } catch { /* client disconnected */ }
        })
        try { controller.close() } catch { /* ignore */ }
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
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    )
  }
}

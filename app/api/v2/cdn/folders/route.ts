import { NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { withAuth } from "@/lib/http/route"
import { createCdnFolder, deleteCdnFolderRecursively } from "@/lib/models/cdnFolderModel"
import { API_ERRORS } from "@/constants"
export const dynamic = "force-dynamic"

export const POST = withAuth(async ({ request, user }) => {
    const { name, parentId } = await request.json()

    if (!name || typeof name !== "string" || name.trim() === "") {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Folder name is required")
    }

    if (name.length > 200) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Folder name is too long")
    }

    const folder = await createCdnFolder(user.userId, name.trim(), parentId || null)

    return NextResponse.json({ success: true, folder })
}, { label: "CDN Folders POST" })

export const DELETE = withAuth(async ({ request, user }) => {
    const { folderId } = await request.json()

    if (!folderId) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Folder ID is required")
    }

    const { deletedAssets, folderIds } = await deleteCdnFolderRecursively(user.userId, folderId)

    // Stream NDJSON progress — one line per deleted asset, then a final summary line
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const total = deletedAssets.length

        deletedAssets.forEach((asset, i) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify({
              index: i + 1,
              total,
              id: asset.id,
              name: asset.name,
              success: true,
            }) + "\n"))
          } catch { /* client disconnected */ }
        })

        // Final summary line so the client knows folders were also removed
        try {
          controller.enqueue(encoder.encode(JSON.stringify({
            done: true,
            deletedAssetCount: deletedAssets.length,
            deletedFolderIds: folderIds,
          }) + "\n"))
        } catch { /* ignore */ }

        try { controller.close() } catch { /* ignore */ }
      }
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
}, { label: "CDN Folders DELETE" })

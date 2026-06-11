import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createCdnFolder, deleteCdnFolderRecursively } from "@/lib/cdn-folder-model"
import { API_ERRORS } from "@/constants"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"Unauthorized"}`);
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const { name, parentId } = await request.json()

    if (!name || typeof name !== "string" || name.trim() === "") {
        console.error(`[API Error] 400 Bad Request: ${"Folder name is required"}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    if (name.length > 200) {
        console.error(`[API Error] 400 Bad Request: ${"Folder name is too long"}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    const folder = await createCdnFolder(currentUser.userId, name.trim(), parentId || null)

    return NextResponse.json({ success: true, folder })
  } catch (error: any) {
    console.error("[CDN Folders] Error creating folder:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to create folder"}`);
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"Unauthorized"}`);
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const { folderId } = await request.json()

    if (!folderId) {
        console.error(`[API Error] 400 Bad Request: ${"Folder ID is required"}`);
      return NextResponse.json({ error: API_ERRORS.BAD_REQUEST }, { status: 400 })
    }

    const { deletedAssets, folderIds } = await deleteCdnFolderRecursively(currentUser.userId, folderId)

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
  } catch (error: any) {
    console.error("[CDN Folders] Error deleting folder:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to delete folder"}`);
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

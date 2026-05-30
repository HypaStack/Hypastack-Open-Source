import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createCdnFolder, deleteCdnFolderRecursively } from "@/lib/cdn-folder-model"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, parentId } = await request.json()

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 })
    }

    if (name.length > 200) {
      return NextResponse.json({ error: "Folder name is too long" }, { status: 400 })
    }

    const folder = await createCdnFolder(currentUser.userId, name.trim(), parentId || null)

    return NextResponse.json({ success: true, folder })
  } catch (error: any) {
    console.error("[CDN Folders] Error creating folder:", error)
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { folderId } = await request.json()

    if (!folderId) {
      return NextResponse.json({ error: "Folder ID is required" }, { status: 400 })
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
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 })
  }
}

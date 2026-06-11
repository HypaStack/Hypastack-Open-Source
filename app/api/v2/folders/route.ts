import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createFolder, deleteFolderRecursively, getFoldersByUserId } from "@/lib/folder-model"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"Unauthorized"}`);
      return NextResponse.json({ error: "401 Unauthorized" }, { status: 401 })
    }

    const { name, parentId } = await request.json()

    if (!name || typeof name !== "string" || name.trim() === "") {
        console.error(`[API Error] 400 Bad Request: ${"Folder name is required"}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }

    if (name.length > 200) {
        console.error(`[API Error] 400 Bad Request: ${"Folder name is too long"}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }

    if (parentId) {
      const userFolders = await getFoldersByUserId(currentUser.userId)
      if (!userFolders.some(f => f.id === parentId)) {
          console.error(`[API Error] 403 Forbidden: ${"Parent folder not found or unauthorized"}`);
        return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
      }
    }

    const folder = await createFolder(currentUser.userId, name.trim(), parentId || null)

    return NextResponse.json({ success: true, folder })
  } catch (error: any) {
    console.error("[Folders] Error creating folder:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to create folder"}`);
    return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${"Unauthorized"}`);
      return NextResponse.json({ error: "401 Unauthorized" }, { status: 401 })
    }

    const { folderId } = await request.json()

    if (!folderId) {
        console.error(`[API Error] 400 Bad Request: ${"Folder ID is required"}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }

    await deleteFolderRecursively(currentUser.userId, folderId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Folders] Error deleting folder:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to delete folder"}`);
    return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
  }
}

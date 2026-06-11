import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createFolder, deleteFolderRecursively, getFoldersByUserId } from "@/lib/folder-model"
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

    if (parentId) {
      const userFolders = await getFoldersByUserId(currentUser.userId)
      if (!userFolders.some(f => f.id === parentId)) {
          console.error(`[API Error] 403 Forbidden: ${"Parent folder not found or unauthorized"}`);
        return NextResponse.json({ error: API_ERRORS.FORBIDDEN }, { status: 403 })
      }
    }

    const folder = await createFolder(currentUser.userId, name.trim(), parentId || null)

    return NextResponse.json({ success: true, folder })
  } catch (error: any) {
    console.error("[Folders] Error creating folder:", error)
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

    await deleteFolderRecursively(currentUser.userId, folderId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Folders] Error deleting folder:", error)
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to delete folder"}`);
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

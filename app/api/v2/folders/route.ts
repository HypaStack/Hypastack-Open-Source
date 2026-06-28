import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { getCurrentUser } from "@/lib/auth"
import { createFolder, deleteFolderRecursively, getFoldersByUserId } from "@/lib/folder-model"
import { API_ERRORS } from "@/constants"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        return apiError(401, API_ERRORS.UNAUTHORIZED, "Unauthorized")
    }

    const { name, parentId } = await request.json()

    if (!name || typeof name !== "string" || name.trim() === "") {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Folder name is required")
    }

    if (name.length > 200) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Folder name is too long")
    }

    if (parentId) {
      const userFolders = await getFoldersByUserId(currentUser.userId)
      if (!userFolders.some(f => f.id === parentId)) {
          return apiError(403, API_ERRORS.FORBIDDEN, "Parent folder not found or unauthorized")
      }
    }

    const folder = await createFolder(currentUser.userId, name.trim(), parentId || null)

    return NextResponse.json({ success: true, folder })
  } catch (error: any) {
    console.error("[Folders] Error creating folder:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to create folder")
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        return apiError(401, API_ERRORS.UNAUTHORIZED, "Unauthorized")
    }

    const { folderId } = await request.json()

    if (!folderId) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Folder ID is required")
    }

    await deleteFolderRecursively(currentUser.userId, folderId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Folders] Error deleting folder:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to delete folder")
  }
}

import { NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { withAuth } from "@/lib/route"
import { createFolder, deleteFolderRecursively, getFoldersByUserId } from "@/lib/folder-model"
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

    if (parentId) {
      const userFolders = await getFoldersByUserId(user.userId)
      if (!userFolders.some(f => f.id === parentId)) {
          return apiError(403, API_ERRORS.FORBIDDEN, "Parent folder not found or unauthorized")
      }
    }

    const folder = await createFolder(user.userId, name.trim(), parentId || null)

    return NextResponse.json({ success: true, folder })
}, { label: "Folders POST" })

export const DELETE = withAuth(async ({ request, user }) => {
    const { folderId } = await request.json()

    if (!folderId) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Folder ID is required")
    }

    await deleteFolderRecursively(user.userId, folderId)

    return NextResponse.json({ success: true })
}, { label: "Folders DELETE" })

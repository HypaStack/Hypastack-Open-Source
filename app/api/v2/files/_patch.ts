import { NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { withAuth } from "@/lib/http/route"
import { moveFilesToFolder } from "@/lib/models/fileModel"
import { getFoldersByUserId } from "@/lib/models/folderModel"
import { API_ERRORS } from "@/constants"

export const PATCH = withAuth(async ({ request, user }) => {
    const { fileId, fileIds, folderId } = await request.json()

    const ids: string[] = Array.isArray(fileIds) ? fileIds : fileId ? [fileId] : []
    if (ids.length === 0 || !ids.every(id => typeof id === "string")) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "File ID(s) required")
    }
    if (folderId !== null && typeof folderId !== "string") {
        return apiError(400, API_ERRORS.BAD_REQUEST, "Folder ID must be a string or null")
    }

    // A null folderId drops the files back on the drive root, so it needs no check.
    if (folderId !== null) {
        const folders = await getFoldersByUserId(user.userId)
        if (!folders.some(f => f.id === folderId)) {
            return apiError(403, API_ERRORS.FORBIDDEN, "Destination folder not found or unauthorized")
        }
    }

    const moved = await moveFilesToFolder(ids, user.userId, folderId)

    return NextResponse.json({ success: true, moved })
}, { rateLimit: true, label: "Auth Files PATCH" })

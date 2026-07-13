import { NextResponse } from 'next/server'
import { apiError } from "@/lib/http/apiError"
import { withAuth } from "@/lib/http/route"
import { moveCdnAssetsToFolder } from '@/lib/models/cdnModel'
import { getCdnFoldersByUserId } from '@/lib/models/cdnFolderModel'
import { API_ERRORS } from "@/constants"

export const PATCH = withAuth(async ({ request, user }) => {
    const { assetId, assetIds, folderId } = await request.json()

    const ids: string[] = Array.isArray(assetIds) ? assetIds : assetId ? [assetId] : []
    if (ids.length === 0 || !ids.every(id => typeof id === "string")) {
        return apiError(400, API_ERRORS.BAD_REQUEST, 'Asset ID(s) required')
    }
    if (folderId !== null && typeof folderId !== "string") {
        return apiError(400, API_ERRORS.BAD_REQUEST, 'Folder ID must be a string or null')
    }

    // A null folderId drops the assets back on the CDN root, so it needs no check.
    if (folderId !== null) {
        const folders = await getCdnFoldersByUserId(user.userId)
        if (!folders.some(f => f.id === folderId)) {
            return apiError(403, API_ERRORS.FORBIDDEN, 'Destination folder not found or unauthorized')
        }
    }

    const moved = await moveCdnAssetsToFolder(ids, user.userId, folderId)

    return NextResponse.json({ success: true, moved })
}, { rateLimit: true, label: "CDN Assets PATCH" })

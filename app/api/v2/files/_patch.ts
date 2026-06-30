import { NextResponse } from "next/server"
import { apiError } from "@/lib/api-error"
import { withAuth } from "@/lib/route"
import { getFileById, toggleFileStarred } from "@/lib/file-model"
import { API_ERRORS } from "@/constants"

export const PATCH = withAuth(async ({ request, user }) => {
    const { fileId, starred } = await request.json()
    if (!fileId || typeof starred !== "boolean") {
        return apiError(400, API_ERRORS.BAD_REQUEST, "400 Invalid Request Parameters")
    }

    const file = await getFileById(fileId)
    if (!file || file.user_id !== user.userId) {
        return apiError(404, API_ERRORS.NOT_FOUND, "404 Not Found")
    }

    const updated = await toggleFileStarred(fileId, user.userId, starred)
    if (!updated) {
        return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "500 Update Failed")
    }

    return NextResponse.json({ success: true, starred })
}, { rateLimit: true, label: "Auth Files PATCH" })

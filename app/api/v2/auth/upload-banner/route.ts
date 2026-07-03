import { NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { withAuth } from "@/lib/http/route"
import { getUserById, updateBannerUrl } from "@/lib/models/userModel"
import { putObjectByKey, deleteByKey } from "@/lib/storage/r2"
import { fileTypeFromBuffer } from "file-type"
import { isPaidTier, normalizeTier } from "@/constants/tier-limits"
import { ALLOWED_BANNER_TYPES, MAX_BANNER_SIZE } from "@/constants"
import { API_ERRORS } from "@/constants"
export const dynamic = "force-dynamic"

export const POST = withAuth(async ({ request, user: auth }) => {
    const user = await getUserById(auth.userId)
    if (!user) {
        return apiError(404, API_ERRORS.NOT_FOUND, "404 Not Found")
    }

    // Banners are a paid-plan (Essential and above) branding feature.
    if (!isPaidTier(normalizeTier(user.tier))) {
        return apiError(403, API_ERRORS.FORBIDDEN, "Download-page banners are available on Essential and above.")
    }

    const formData = await request.formData()
    const file = formData.get("banner") as File | null

    if (!file) {
        return apiError(400, API_ERRORS.BAD_REQUEST, "400 No File Provided")
    }
    if (file.size > MAX_BANNER_SIZE) {
        return apiError(413, API_ERRORS.PAYLOAD_TOO_LARGE, "413 Banner is too large (max 10 MB).")
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileType = await fileTypeFromBuffer(buffer)
    if (!fileType || !ALLOWED_BANNER_TYPES.includes(fileType.mime)) {
        return apiError(415, API_ERRORS.UNSUPPORTED_MEDIA_TYPE, "415 Invalid file type, only JPEG, PNG, GIF, and AVIF are allowed.")
    }

    // Remove the previous banner (only within the user's own prefix).
    if (user.banner_url) {
      const expectedPrefix = `profiles/${auth.userId}/`
      if (user.banner_url.startsWith(expectedPrefix)) {
        try {
          await deleteByKey(user.banner_url)
        } catch (err) {
          console.error("[Banner] Failed to delete old banner:", err)
        }
      }
    }

    const { createHash } = await import("crypto")
    const hash = createHash("md5").update(buffer).digest("hex")
    const bannerKey = `profiles/${auth.userId}/banner-${hash}.${fileType.ext}`
    await putObjectByKey(bannerKey, buffer, fileType.mime)
    await updateBannerUrl(auth.userId, bannerKey)

    return NextResponse.json({ success: true, url: bannerKey })
}, { rateLimit: true, label: "Banner Upload" })

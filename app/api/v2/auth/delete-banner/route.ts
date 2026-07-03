import { NextResponse } from "next/server"
import { withAuth } from "@/lib/http/route"
import { getUserById, updateBannerUrl } from "@/lib/models/userModel"
import { deleteByKey } from "@/lib/storage/r2"
export const dynamic = "force-dynamic"

export const POST = withAuth(async ({ user: auth }) => {
    const user = await getUserById(auth.userId)
    if (user?.banner_url) {
      const expectedPrefix = `profiles/${auth.userId}/`
      if (user.banner_url.startsWith(expectedPrefix)) {
        try {
          await deleteByKey(user.banner_url)
        } catch (err) {
          console.error("[Banner] Failed to delete banner from R2:", err)
        }
      }
      await updateBannerUrl(auth.userId, null)
    }

    return NextResponse.json({ success: true })
}, { rateLimit: true, label: "Banner Delete" })

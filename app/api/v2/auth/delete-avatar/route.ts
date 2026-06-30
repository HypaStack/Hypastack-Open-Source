import { NextResponse } from "next/server"
import { withAuth } from "@/lib/route"
import { getUserById, updateAvatarUrl } from "@/lib/user-model"
import { deleteByKey } from "@/lib/r2"
export const dynamic = "force-dynamic"

export const POST = withAuth(async ({ user: auth }) => {
    const user = await getUserById(auth.userId)
    if (user?.avatar_url) {
      const expectedPrefix = `profiles/${auth.userId}/`
      if (user.avatar_url.startsWith(expectedPrefix)) {
        try {
          await deleteByKey(user.avatar_url)
        } catch (err) {
          console.error("[Avatar] Failed to delete avatar from R2:", err)
        }
      }
      await updateAvatarUrl(auth.userId, null)
    }

    return NextResponse.json({ success: true })
}, { rateLimit: true, label: "Avatar Delete" })

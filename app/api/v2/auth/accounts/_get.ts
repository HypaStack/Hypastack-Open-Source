import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { getCurrentUser } from "@/lib/security/auth"
import { readAccounts, writeAccounts } from "@/lib/security/accountsCookie"
import { getSwitcherProfiles, getLiveSessionByRefreshHash } from "@/lib/models/userModel"
import { API_ERRORS } from "@/constants"
import crypto from "crypto"

// Everyone the browser is still signed in as. Sessions revoked elsewhere (sign
// out everywhere, suspension, an admin delete) are dropped from the cookie here
// rather than being offered as a switch that would just fail.
export async function GET(request: NextRequest) {
  try {
    const stashed = await readAccounts()
    if (stashed.length === 0) return NextResponse.json({ accounts: [] })

    const live = await Promise.all(
      stashed.map(async (a) => {
        const hash = crypto.createHash("sha256").update(a.refreshToken).digest("hex")
        const session = await getLiveSessionByRefreshHash(a.userId, hash)
        return session ? a : null
      })
    )
    const usable = live.filter((a) => a !== null)
    if (usable.length !== stashed.length) await writeAccounts(usable)

    const profiles = await getSwitcherProfiles(usable.map((a) => a.userId))
    const current = await getCurrentUser(request)

    return NextResponse.json({
      accounts: profiles
        .filter((p) => !p.suspended)
        .map((p) => ({
          id: p.id,
          nicknameEncrypted: p.nickname_encrypted,
          displayName: p.display_name,
          hasAvatar: Boolean(p.avatar_url),
          isCurrent: p.id === current?.userId,
        })),
    })
  } catch (error) {
    console.error("[Auth] Accounts list error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to load accounts")
  }
}

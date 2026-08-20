import { NextRequest, NextResponse } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { getCurrentUser } from "@/lib/security/auth"
import { readAccounts, writeAccounts, rememberAccount } from "@/lib/security/accountsCookie"
import { getSwitcherProfiles, getLiveSessionByRefreshHash, getLiveSessionUserIds } from "@/lib/models/userModel"
import { API_ERRORS, MAX_SWITCHABLE_ACCOUNTS } from "@/constants"
import crypto from "crypto"

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex")

// Everyone the browser is still signed in as. Sessions revoked elsewhere (sign
// out everywhere, suspension, an admin delete) are dropped from the cookie here
// rather than being offered as a switch that would just fail.
export async function GET(request: NextRequest) {
  try {
    const current = await getCurrentUser(request)

    // Sessions that predate the roster (or any login that didn't write it) would
    // otherwise vanish from the switcher the moment a second account is added.
    // The refresh token is right there in the request, so adopt it.
    const alreadyListed = (await readAccounts()).some((a) => a.userId === current?.userId)
    if (current && !alreadyListed) {
      const refreshToken = request.cookies.get("refresh_token")?.value
      if (refreshToken && (await getLiveSessionByRefreshHash(current.userId, hashToken(refreshToken)))) {
        await rememberAccount(current.userId, refreshToken)
      }
    }

    const stashed = await readAccounts()
    if (stashed.length === 0) {
      return NextResponse.json({ accounts: [], canAddMore: true })
    }

    const liveUserIds = await getLiveSessionUserIds(
      stashed.map((a) => ({ userId: a.userId, refreshTokenHash: hashToken(a.refreshToken) }))
    )
    const usable = stashed.filter((a) => liveUserIds.has(a.userId))
    if (usable.length !== stashed.length) await writeAccounts(usable)

    const profiles = await getSwitcherProfiles(usable.map((a) => a.userId))
    const byId = new Map(profiles.map((p) => [p.id, p]))

    // cookie order is the display order (the db doesn't preserve it), except the
    // account you're on, which always sits at the top
    const accounts = usable
      .flatMap((a) => {
        const profile = byId.get(a.userId)
        return profile && !profile.suspended ? [profile] : []
      })
      .map((p) => ({
        id: p.id,
        nicknameEncrypted: p.nickname_encrypted,
        displayName: p.display_name,
        isCurrent: p.id === current?.userId,
      }))
      .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent))

    return NextResponse.json({ accounts, canAddMore: accounts.length < MAX_SWITCHABLE_ACCOUNTS })
  } catch (error) {
    console.error("[Auth] Accounts list error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to load accounts")
  }
}

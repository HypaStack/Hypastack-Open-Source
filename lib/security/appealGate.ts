import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { isIpBlacklisted } from "@/lib/models/blacklistModel"
import { getUserForAuthById } from "@/lib/models/userModel"
import { getCurrentUser } from "@/lib/security/auth"
import { getHashedIp } from "@/lib/http/ip"

const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined
const GRANT_COOKIE = "hpsk_appeal"

/** Long enough to write an appeal after being turned away, short enough not to linger. */
const GRANT_MAX_AGE_SECONDS = 60 * 60

/**
 * Suspending an account revokes its sessions, so a suspended user has no session
 * left to prove anything with. The login attempt is the last moment the server
 * knows who they are, so it hands out a short-lived pass there.
 */
export async function grantAppealAccess(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(GRANT_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: GRANT_MAX_AGE_SECONDS,
    path: "/",
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  })
}

/**
 * The appeal page is only for people with something to appeal: a blacklisted IP,
 * a suspended account they're still signed into, or a pass from a login attempt
 * that was refused for suspension.
 */
export async function isAppealEligible(request: NextRequest): Promise<boolean> {
  if (await isIpBlacklisted(getHashedIp(request))) return true

  if (request.cookies.get(GRANT_COOKIE)?.value === "1") return true

  const current = await getCurrentUser(request)
  if (current) {
    const user = await getUserForAuthById(current.userId)
    if (user?.suspended) return true
  }

  return false
}

import { NextRequest } from "next/server"
import crypto from "crypto"
import { apiError } from "@/lib/http/apiError"
import { generateToken, setAuthCookie, setRefreshCookie } from "@/lib/security/auth"
import { forgetAccount, type StashedAccount } from "@/lib/security/accountsCookie"
import { getLiveSessionByRefreshHash, getUserForAuthById, isOwner, updateLastLogin } from "@/lib/models/userModel"
import { enforceOwnerIpGate } from "@/lib/security/ownerGate"
import { API_ERRORS } from "@/constants"

export const hashRefreshToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex")

/**
 * Makes a stashed account the active session. Every gate login runs has to run
 * here too, otherwise switching would be a way around them. Returns null on
 * success, or the error response to send back.
 */
export async function activateStashedAccount(
  request: NextRequest,
  account: StashedAccount
): Promise<Response | null> {
  // The cookie names an account, it doesn't prove anything. The refresh token
  // has to still match a live session row for that exact user.
  const session = await getLiveSessionByRefreshHash(account.userId, hashRefreshToken(account.refreshToken))
  if (!session) {
    await forgetAccount(account.userId)
    return apiError(401, API_ERRORS.UNAUTHORIZED, "That session has expired, sign in again")
  }

  const user = await getUserForAuthById(account.userId)
  if (!user) {
    await forgetAccount(account.userId)
    return apiError(404, API_ERRORS.NOT_FOUND, "Account no longer exists")
  }
  if (user.suspended) {
    return apiError(403, API_ERRORS.FORBIDDEN, "Account suspended")
  }

  if (await isOwner(account.userId)) {
    const ownerGate = await enforceOwnerIpGate(request)
    if (ownerGate) return ownerGate
  }

  await updateLastLogin(account.userId)
  await setAuthCookie(generateToken({ userId: account.userId, sessionId: session.id }))
  await setRefreshCookie(account.refreshToken)
  return null
}

import { NextRequest } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { getRawIp, getHashedIp } from "@/lib/http/ip"
import { isIpBlacklisted, blacklistIp } from "@/lib/models/blacklistModel"
import { API_ERRORS } from "@/constants"

// Reject anything from a blacklisted IP before it even reaches auth logic.
// Used at the top of both login and register, a blacklisted IP can't do
// either. `blacklisted: true` in the response is what the frontend keys off
// to render the appeal link, apiError's `error` string alone can't carry a
// hyperlink.
export async function rejectIfBlacklisted(request: NextRequest) {
  const hashedIp = getHashedIp(request)
  if (await isIpBlacklisted(hashedIp)) {
    return apiError(403, API_ERRORS.BLACKLISTED, "Blacklisted IP", { blacklisted: true })
  }
  return null
}

// The owner account only logs in from an allowlisted IP (OWNER_ALLOWED_IPS,
// set on the VPS, never committed here). A correct passkey from anywhere
// else means whoever's asking already has the credential, so the response
// isn't just "deny this login", it's "blacklist this IP for good".
export async function enforceOwnerIpGate(request: NextRequest): Promise<Response | null> {
  const allowed = (process.env.OWNER_ALLOWED_IPS || "").split(",").map((s) => s.trim()).filter(Boolean)
  const rawIp = getRawIp(request)
  if (allowed.includes(rawIp)) return null

  const hashedIp = getHashedIp(request)
  await blacklistIp(hashedIp, "Attempted owner login from a non-allowlisted IP")
  return apiError(403, API_ERRORS.BLACKLISTED, "Owner login from disallowed IP", { blacklisted: true })
}

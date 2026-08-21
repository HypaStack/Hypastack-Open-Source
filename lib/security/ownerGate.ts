import { NextRequest } from "next/server"
import { apiError } from "@/lib/http/apiError"
import { getRawIp, getHashedIp } from "@/lib/http/ip"
import { isIpBlacklisted, blacklistIp } from "@/lib/models/blacklistModel"
import { ipMatchesAny } from "@/lib/security/ipMatch"
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
  // No Cloudflare in front locally, so there's no real IP to check, same
  // reason Turnstile is skipped in dev.
  if (process.env.NODE_ENV !== "production") return null

  const allowed = (process.env.OWNER_ALLOWED_IPS || "").split(",").map((s) => s.trim()).filter(Boolean)

  // An unset or empty allowlist used to mean "nothing matches", which locked the
  // owner out and blacklisted them for a config mistake. Off is the safer read.
  if (allowed.length === 0) {
    console.warn("[ownerGate] OWNER_ALLOWED_IPS is empty, the owner IP gate is disabled")
    return null
  }

  // Entries can be plain addresses or prefixes. A dual-stack client arrives over
  // IPv6 and rotates its interface id, so an exact match alone kept failing.
  const rawIp = getRawIp(request)
  if (ipMatchesAny(rawIp, allowed)) return null

  // "unknown" means the proxy headers didn't resolve to anything, not a real
  // caller. Never blacklist that, it could be any number of unrelated people
  // if this ever fires.
  if (rawIp === "unknown") {
    return apiError(403, API_ERRORS.FORBIDDEN, "Could not verify request origin")
  }

  const hashedIp = getHashedIp(request)
  await blacklistIp(hashedIp, "Attempted owner login from a non-allowlisted IP")
  return apiError(403, API_ERRORS.BLACKLISTED, "Owner login from disallowed IP", { blacklisted: true })
}

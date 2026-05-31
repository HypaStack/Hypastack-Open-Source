import { NextRequest } from "next/server"
import crypto from "crypto"

/**
 * Extract and hash the real client IP from the request.
 * Uses X-Forwarded-For (set by Cloudflare / reverse proxy) with a TRUSTED_PROXY_COUNT
 * env var to skip internal proxy hops.
 *
 * The hash is one-way (SHA-256 + HMAC with JWT_SECRET) so no raw IP is ever
 * stored or logged — consistent with the zero-knowledge privacy design.
 */
export function getHashedIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for")
  const cfConnectingIp = request.headers.get("cf-connecting-ip")

  // Cloudflare sets CF-Connecting-IP to the real client IP — prefer it
  let rawIp: string
  if (cfConnectingIp) {
    rawIp = cfConnectingIp.trim()
  } else if (xff) {
    // X-Forwarded-For: client, proxy1, proxy2
    // Skip the last N hops based on TRUSTED_PROXY_COUNT
    const trustedProxies = parseInt(process.env.TRUSTED_PROXY_COUNT || "1", 10)
    const hops = xff.split(",").map(s => s.trim())
    const index = Math.max(0, hops.length - trustedProxies - 1)
    rawIp = hops[index] || hops[0]
  } else {
    // Fallback — no IP available, use a static key (degraded mode)
    rawIp = "unknown"
  }

  // HMAC-SHA256 so we never store the raw IP
  const secret = process.env.JWT_SECRET || "fallback-ip-hash-secret"
  return crypto.createHmac("sha256", secret).update(rawIp).digest("hex").slice(0, 32)
}

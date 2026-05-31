import { NextRequest } from "next/server"
import crypto from "crypto"

export function getHashedIp(request: NextRequest): string {
  const cfConnectingIp = request.headers.get("cf-connecting-ip")
  const xff = request.headers.get("x-forwarded-for")

  let rawIp: string
  if (cfConnectingIp) {
    rawIp = cfConnectingIp.trim()
  } else if (xff) {
    const trustedProxies = parseInt(process.env.TRUSTED_PROXY_COUNT || "1", 10)
    const hops = xff.split(",").map(s => s.trim())
    const index = Math.max(0, hops.length - trustedProxies - 1)
    rawIp = hops[index] || hops[0]
  } else {
    rawIp = "unknown"
  }

  const secret = process.env.JWT_SECRET || "fallback-ip-hash-secret"
  return crypto.createHmac("sha256", secret).update(rawIp).digest("hex").slice(0, 32)
}

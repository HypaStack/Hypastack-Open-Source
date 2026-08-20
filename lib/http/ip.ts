import { NextRequest } from "next/server"
import crypto from "crypto"

export function getRawIp(request: NextRequest): string {
  const cfConnectingIp = request.headers.get("cf-connecting-ip")
  const xff = request.headers.get("x-forwarded-for")

  if (cfConnectingIp) {
    return cfConnectingIp.trim()
  } else if (xff) {
    const trustedProxies = parseInt(process.env.TRUSTED_PROXY_COUNT || "1", 10)
    const hops = xff.split(",").map(s => s.trim())
    const index = Math.max(0, hops.length - trustedProxies - 1)
    return hops[index] || hops[0]
  }
  return "unknown"
}

export function getHashedIp(request: NextRequest): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("[ip] JWT_SECRET env var is not set")
  return crypto.createHmac("sha256", secret).update(getRawIp(request)).digest("hex").slice(0, 32)
}

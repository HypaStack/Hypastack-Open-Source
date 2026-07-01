import { NextRequest, NextResponse } from "next/server"
import { API_ERRORS } from "@/constants"
import { getHashedIp } from "@/lib/http/ip"
import { checkProxyTokenRateLimit } from "@/lib/data/rateLimit"

export const dynamic = "force-dynamic"

// Module-level key cache — importKey runs once per cold start, not per request
let _cachedKey: CryptoKey | null = null
let _cachedSecret: string | null = null

async function getSigningKey(): Promise<CryptoKey | null> {
  const secret = process.env.PROXY_SECRET
  if (!secret) return null
  if (_cachedKey && _cachedSecret === secret) return _cachedKey
  _cachedKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  _cachedSecret = secret
  return _cachedKey
}

export async function GET(req: NextRequest) {
  try {
    const rl = await checkProxyTokenRateLimit(getHashedIp(req))
    if (!rl.allowed) {
      return NextResponse.json({ error: API_ERRORS.TOO_MANY_REQUESTS }, { status: 429 })
    }

    const key = await getSigningKey()
    if (!key) {
      console.error("[ProxyToken] PROXY_SECRET env var is not set")
      return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const nonce = crypto.randomUUID().replace(/-/g, "")
    const message = `${timestamp}:${nonce}`

    const sigBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(message)
    )

    // encode signature as hex
    const sigHex = Array.from(new Uint8Array(sigBytes))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")

    // Final token: sig.timestamp.nonce
    const token = `${sigHex}.${timestamp}.${nonce}`

    return NextResponse.json({ token }, {
      headers: {
        // Don't cache this — every call should get a fresh token
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[ProxyToken] Error generating token:", error)
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

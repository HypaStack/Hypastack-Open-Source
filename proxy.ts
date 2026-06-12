import { NextRequest, NextResponse } from 'next/server'
import { MAINTENANCE, LEGAL_EXACT, AUTH_ROUTES } from '@/constants'

function isLegalPath(pathname: string): boolean {
  if (LEGAL_EXACT.has(pathname)) return true
  for (const p of LEGAL_EXACT) {
    if (pathname.startsWith(p + '/')) return true
  }
  return false
}

// Module-level key cache — importKey runs once per cold start, not per request
let _cachedKey: CryptoKey | null = null
let _cachedSecret: string | null = null

async function getCryptoKey(): Promise<CryptoKey | null> {
  const secret = process.env.JWT_SECRET
  if (!secret) return null
  // Return cached key if secret hasn't changed
  if (_cachedKey && _cachedSecret === secret) return _cachedKey
  _cachedKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  _cachedSecret = secret
  return _cachedKey
}

// --- Proxy key verification ---
const PROXY_HEADER = 'x-hypastack-proxy-key'
const PROXY_TOKEN_TTL_S = 60

let _cachedProxyKey: CryptoKey | null = null
let _cachedProxySecret: string | null = null

async function getProxyCryptoKey(): Promise<CryptoKey | null> {
  const secret = process.env.PROXY_SECRET
  if (!secret) return null
  if (_cachedProxyKey && _cachedProxySecret === secret) return _cachedProxyKey
  _cachedProxyKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  _cachedProxySecret = secret
  return _cachedProxyKey
}

async function isValidProxyKey(request: NextRequest): Promise<boolean> {
  const token = request.headers.get(PROXY_HEADER)
  if (!token) return false

  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [sigHex, tsStr, nonce] = parts

  // Reject expired tokens
  const timestamp = parseInt(tsStr, 10)
  if (isNaN(timestamp)) return false
  const age = Math.floor(Date.now() / 1000) - timestamp
  if (age < 0 || age > PROXY_TOKEN_TTL_S) return false

  const key = await getProxyCryptoKey()
  if (!key) return false

  // Decode hex signature back to bytes
  const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
  const message = new TextEncoder().encode(`${tsStr}:${nonce}`)

  try {
    return await crypto.subtle.verify('HMAC', key, sigBytes, message)
  } catch {
    return false
  }
}

// Decode base64url to Uint8Array without allocating an intermediate string array
function b64urlToBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const binary = atob(padded)
  const buf = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('auth_token')?.value
  if (!token) return false
  try {
    const dot1 = token.indexOf('.')
    const dot2 = token.indexOf('.', dot1 + 1)
    if (dot1 === -1 || dot2 === -1) return false

    const header = token.slice(0, dot1)
    const body   = token.slice(dot1 + 1, dot2)
    const sig    = token.slice(dot2 + 1)

    const key = await getCryptoKey()
    if (!key) return false

    const sigBytes = b64urlToBytes(sig)
    const msgBytes = new TextEncoder().encode(`${header}.${body}`)
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, msgBytes)
    if (!valid) return false

    // Decode payload — use indexOf to avoid full JSON parse on invalid tokens
    const payloadJson = atob(
      token.slice(dot1 + 1, dot2).replace(/-/g, '+').replace(/_/g, '/') +
      '='.repeat((4 - ((dot2 - dot1 - 1) % 4)) % 4)
    )
    const payload = JSON.parse(payloadJson) as { exp?: number }
    return typeof payload.exp === 'number' && payload.exp > (Date.now() / 1000)
  } catch {
    return false
  }
}

// Routes that require a valid session are defined in @/constants/proxy.ts

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // maintenance mode
  if (MAINTENANCE) {
    if (pathname !== '/maintenance' && !isLegalPath(pathname)) {
      return NextResponse.redirect(new URL('/maintenance', request.url))
    }
    return NextResponse.next()
  }

  // Block /maintenance when not in maintenance mode
  if (pathname === '/maintenance') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // the /bin/[id]/raw endpoint is excluded to allow direct browser viewing of raw pastes.
  const isRawBin = pathname.startsWith('/api/v2/bin/') && pathname.endsWith('/raw')
  // the /proxy-token endpoint issues tokens — it must be exempt from key verification (chicken-and-egg)
  const isProxyToken = pathname === '/api/v2/proxy-token'
  // the /avatar endpoint is loaded as an <img src> — browsers can't send custom headers for image requests.
  // It has its own JWT auth via getCurrentUser, so the proxy key is not needed.
  const isAvatar = pathname === '/api/v2/avatar'

  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/v2/cron') && !isRawBin && !isAvatar) {
    const fetchSite = request.headers.get('sec-fetch-site')
    const fetchMode = request.headers.get('sec-fetch-mode')
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')

    // direct browser
    if (fetchMode === 'navigate') {
      console.error(`[API Error] 403 Forbidden: Forbidden: Direct API access is not allowed`)
      return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
    }

    // programmatic requests
    if (fetchSite && fetchSite !== 'same-origin') {
      console.error(`[API Error] 403 Forbidden: Forbidden: Cross-origin requests are not allowed`)
      return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
    }

    // fallback
    if (!fetchSite) {
      const appOrigin = new URL(request.url).origin
      if (origin && origin !== appOrigin) {
        console.error(`[API Error] 403 Forbidden: Forbidden: Invalid Origin`)
        return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
      }
      if (!origin && referer && !referer.startsWith(appOrigin)) {
        console.error(`[API Error] 403 Forbidden: Forbidden: Invalid Referer`)
        return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
      }
    }

    // proxy key verification — skip for the token-issuing endpoint itself
    if (!isProxyToken) {
      const validKey = await isValidProxyKey(request)
      if (!validKey) {
        console.error(`[API Error] 403 Forbidden: Missing or invalid proxy key from ${pathname}`)
        return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
      }
    }
  }

  // auth guard
  for (const { prefix, fallback } of AUTH_ROUTES) {
    if (pathname.startsWith(prefix)) {
      const authed = await isAuthenticated(request)
      if (!authed) {
        const dest = new URL(fallback, request.url)
        // Only attach safe same-origin redirect params
        if (prefix === '/manage') dest.searchParams.set('redirect', pathname)
        return NextResponse.redirect(dest)
      }
      break // matched
    }
  }

  const response = NextResponse.next()

  // security headers
  response.headers.set("X-Frame-Options", "SAMEORIGIN")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  response.headers.set("X-DNS-Prefetch-Control", "on")

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap.*\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|eot|css|js|map)$).*)',
  ],
}

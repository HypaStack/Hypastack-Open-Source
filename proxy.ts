import { NextRequest, NextResponse } from 'next/server'
import { MAINTENANCE, LEGAL_EXACT, AUTH_ROUTES, PROXY_HEADER, PROXY_TOKEN_TTL_S, ALLOWED_ORIGINS } from '@/constants'

// Origin of the API when it's served from a separate host (NEXT_PUBLIC_API_BASE).
// Empty in the default same-origin setup. Added to CSP connect-src/img-src.
let API_ORIGIN = ''
try { if (process.env.NEXT_PUBLIC_API_BASE) API_ORIGIN = new URL(process.env.NEXT_PUBLIC_API_BASE).origin } catch {}
const API_ORIGIN_SUFFIX = API_ORIGIN ? ` ${API_ORIGIN}` : ''

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

// Build the Content-Security-Policy. In production we emit a per-request nonce
// and use 'strict-dynamic' instead of 'unsafe-inline', so an injected inline
// <script> cannot execute. Our framework scripts (and the Turnstile loader,
// which we render via next/script) get the nonce, and 'strict-dynamic'
// propagates that trust to the dynamic inline scripts Turnstile injects to run
// its challenge — a host allow-list can never cover those inline scripts, which
// is why nonce alone failed. 'wasm-unsafe-eval' is required because Turnstile
// runs its bot check in WebAssembly — it permits WASM compilation only, NOT
// string eval()/new Function(), so it does not re-open inline XSS.
//
// Tradeoff: under 'strict-dynamic', CSP3 browsers IGNORE the host allow-list, so
// the Cloudflare Insights beacon (auto-injected at the edge without our nonce)
// is blocked. That's analytics, not auth — acceptable. The https hosts below are
// kept only as a fallback for legacy browsers that don't understand
// 'strict-dynamic'. In development we keep the unsafe directives because
// Turbopack HMR / React Refresh require them.
function buildCsp(nonce: string | null): string {
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://static.cloudflareinsights.com`
    : `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://static.cloudflareinsights.com`
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' data: blob: https://r2.hypastack.com https://*.r2.cloudflarestorage.com https://*.eu.r2.cloudflarestorage.com${API_ORIGIN_SUFFIX}`,
    "font-src 'self' https://r2.hypastack.com https://fonts.gstatic.com",
    `connect-src 'self' https://r2.hypastack.com https://*.r2.cloudflarestorage.com https://*.eu.r2.cloudflarestorage.com https://challenges.cloudflare.com https://cloudflareinsights.com${API_ORIGIN_SUFFIX}`,
    "frame-src https://challenges.cloudflare.com",
    "media-src 'self' blob: https://r2.hypastack.com https://*.r2.cloudflarestorage.com https://*.eu.r2.cloudflarestorage.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ")
}

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

  // CORS: resolve the caller origin once. Only allow-listed origins get CORS
  // headers (and can call the API cross-origin from a separate host).
  const requestOrigin = request.headers.get('origin')
  const corsOrigin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : null

  // Preflight — the custom proxy-key header makes cross-origin API calls non-simple.
  if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 })
    if (corsOrigin) {
      preflight.headers.set('Access-Control-Allow-Origin', corsOrigin)
      preflight.headers.set('Access-Control-Allow-Credentials', 'true')
      preflight.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
      preflight.headers.set('Access-Control-Allow-Headers', `content-type, ${PROXY_HEADER}`)
      preflight.headers.set('Access-Control-Max-Age', '600')
      preflight.headers.set('Vary', 'Origin')
    }
    return preflight
  }

  // the /bin/[id]/raw endpoint is excluded to allow direct browser viewing of raw pastes.
  const isRawBin = pathname.startsWith('/api/v2/bin/') && pathname.endsWith('/raw')
  // the /proxy-token endpoint issues tokens — it must be exempt from key verification (chicken-and-egg)
  const isProxyToken = pathname === '/api/v2/proxy-token'
  // the /avatar endpoint is loaded as an <img src> — browsers can't send custom headers for image requests.
  // It has its own JWT auth via getCurrentUser, so the proxy key is not needed.
  const isAvatar = pathname === '/api/v2/avatar'
  // the /files/[id] endpoint provides public metadata for downloads/OG images (requires random ID, heavily rate limited)
  const isPublicFileMeta = request.method === 'GET' && /^\/api\/v2\/files\/[a-zA-Z0-9_-]+$/.test(pathname)
  // the /forum endpoints are publicly readable (GET only) — posting/uploading still requires auth + proxy key
  const isPublicForum = request.method === 'GET' && pathname.startsWith('/api/v2/forum')
  // the /files/[id]/stream endpoint streams ciphertext for legacy encrypted-at-rest
  // files. It's fetched raw (no proxy key) as a download, gated by the random id and
  // per-IP rate limiting — same public-GET class as the file-meta route above.
  const isStream = request.method === 'GET' && /^\/api\/v2\/files\/[a-zA-Z0-9_-]+\/stream$/.test(pathname)

  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/v2/cron') && !isRawBin && !isAvatar && !isPublicFileMeta && !isPublicForum && !isStream) {
    const fetchSite = request.headers.get('sec-fetch-site')
    const fetchMode = request.headers.get('sec-fetch-mode')
    const referer = request.headers.get('referer')
    const appOrigin = new URL(request.url).origin

    // direct browser
    if (fetchMode === 'navigate') {
      console.error(`[API Error] 403 Forbidden: Forbidden: Direct API access is not allowed`)
      return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
    }

    // Cross-site requests are allowed only from an allow-listed origin. Same-origin
    // and same-site (the app calling its own api. subdomain) pass through.
    if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site' && !corsOrigin) {
      console.error(`[API Error] 403 Forbidden: Forbidden: Cross-origin requests are not allowed`)
      return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
    }

    // fallback for clients that don't send Sec-Fetch-Site
    if (!fetchSite) {
      if (requestOrigin && requestOrigin !== appOrigin && !ALLOWED_ORIGINS.includes(requestOrigin)) {
        console.error(`[API Error] 403 Forbidden: Forbidden: Invalid Origin`)
        return NextResponse.json({ error: "403 Forbidden" }, { status: 403 })
      }
      if (!requestOrigin && referer && !referer.startsWith(appOrigin) && !ALLOWED_ORIGINS.some((o) => referer.startsWith(o))) {
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

  // Per-request nonce in production only. Forwarding the CSP (with the nonce) on
  // the request headers lets Next.js stamp the nonce onto its own framework
  // scripts and any <Script> components automatically.
  const isProd = process.env.NODE_ENV === "production"
  let response: NextResponse
  let nonce: string | null = null

  if (isProd) {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    nonce = btoa(String.fromCharCode(...bytes))
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-nonce", nonce)
    requestHeaders.set("content-security-policy", buildCsp(nonce))
    response = NextResponse.next({ request: { headers: requestHeaders } })
  } else {
    response = NextResponse.next()
  }

  // security headers
  response.headers.set("Content-Security-Policy", buildCsp(nonce))
  response.headers.set("X-Frame-Options", "SAMEORIGIN")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  response.headers.set("X-DNS-Prefetch-Control", "on")

  // CORS response headers for allow-listed cross-origin API calls
  if (pathname.startsWith('/api/') && corsOrigin) {
    response.headers.set("Access-Control-Allow-Origin", corsOrigin)
    response.headers.set("Access-Control-Allow-Credentials", "true")
    response.headers.append("Vary", "Origin")
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap.*\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|eot|css|js|map)$).*)',
  ],
}

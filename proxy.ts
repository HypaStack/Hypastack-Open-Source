import { NextRequest, NextResponse } from 'next/server'
import { MAINTENANCE, LEGAL_EXACT, AUTH_ROUTES } from '@/constants'

// ──────────────────────────────────────────────
// Maintenance mode is now driven by @/constants/proxy.ts
// ──────────────────────────────────────────────

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

  // ── Maintenance mode ────────────────────────────────────────────────────────
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

  // ── Auth guards ─────────────────────────────────────────────────────────────
  for (const { prefix, fallback } of AUTH_ROUTES) {
    if (pathname.startsWith(prefix)) {
      const authed = await isAuthenticated(request)
      if (!authed) {
        const dest = new URL(fallback, request.url)
        // Only attach safe same-origin redirect params
        if (prefix === '/manage') dest.searchParams.set('redirect', pathname)
        return NextResponse.redirect(dest)
      }
      break // matched — no need to check further routes
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *  - _next/static  (static chunks)
     *  - _next/image   (image optimisation)
     *  - favicon.ico, sitemap.xml, robots.txt
     *  - Any file with a common static extension
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap.*\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|eot|css|js|map)$).*)',
  ],
}

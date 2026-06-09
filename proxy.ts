import { NextRequest, NextResponse } from 'next/server'

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('auth_token')?.value
  if (!token) return false
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const [header, body, signature] = parts
    const secret = process.env.JWT_SECRET
    if (!secret) return false

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const pad = (s: string) => s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)
    const sigBytes = Uint8Array.from(atob(pad(signature)), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(`${header}.${body}`))
    if (!valid) return false
    const payload = JSON.parse(atob(pad(body)))
    return payload.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

// ──────────────────────────────────────────────
// Flip this to `true` to enable maintenance mode
const MAINTENANCE = true
// ──────────────────────────────────────────────

const LEGAL_PATHS = [
  "/terms",
  "/privacy",
  "/acceptable-use",
  "/child-safety",
  "/coppa-gdpr",
  "/dmca",
  "/vulnerability-disclosure",
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Maintenance mode — redirect everything except legal pages and /maintenance itself
  if (MAINTENANCE) {
    if (
      pathname !== "/maintenance" &&
      !LEGAL_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
    ) {
      const url = request.nextUrl.clone()
      url.pathname = "/maintenance"
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // Auth guard for all dashboard routes
  if (pathname.startsWith('/manage')) {
    const authed = await isAuthenticated(request)
    if (!authed) {
      const url = request.nextUrl.clone()
      url.pathname = '/signin'
      const redirectParam = pathname
      if (redirectParam.startsWith('/') && !redirectParam.startsWith('//') && !redirectParam.includes('://')) {
        url.searchParams.set('redirect', redirectParam)
      }
      return NextResponse.redirect(url)
    }
  }

  // Auth guard for /experience — redirect to /new (registration) if not logged in
  if (pathname.startsWith('/experience')) {
    const authed = await isAuthenticated(request)
    if (!authed) {
      const url = request.nextUrl.clone()
      url.pathname = '/new'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  // Run on every path except Next.js internals, API routes, static assets, and files with extensions
  matcher: ['/((?!_next/|api/|favicon\\.ico|fonts/|images/|.*\\.[\\w]+$).*)'],
}

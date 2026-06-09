import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

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

export function middleware(request: NextRequest) {
  if (!MAINTENANCE) return NextResponse.next()

  const { pathname } = request.nextUrl

  // Allow the maintenance page itself
  if (pathname === "/maintenance") return NextResponse.next()

  // Allow legal pages
  if (LEGAL_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next()
  }

  // Allow Next.js internals and static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js|woff2?|ttf|otf)$/)
  ) {
    return NextResponse.next()
  }

  // Redirect everything else to /maintenance
  const url = request.nextUrl.clone()
  url.pathname = "/maintenance"
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}

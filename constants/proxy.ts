export const MAINTENANCE = false

export const LEGAL_EXACT = new Set([
  '/terms',
  '/privacy',
  '/acceptable-use',
  '/child-safety',
  '/coppa-gdpr',
  '/dmca',
  '/vulnerability-disclosure',
])

export const AUTH_ROUTES: Array<{ prefix: string; fallback: string }> = [
  { prefix: '/manage',     fallback: '/signin' },
  { prefix: '/experience', fallback: '/new'    },
]

/** Header name used to pass the short-lived proxy HMAC token */
export const PROXY_HEADER = 'x-hypastack-proxy-key'

/** TTL in seconds for a proxy token (1 minute) */
export const PROXY_TOKEN_TTL_S = 60

/**
 * Base URL the browser uses to reach the API. Defaults to same-origin
 * ("/api/v2"); set NEXT_PUBLIC_API_BASE (e.g. "https://api.example.com/v2")
 * to serve the API from a separate origin.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api/v2'

/**
 * Origins allowed to call the API cross-origin (used by the middleware origin
 * guard and CORS headers). Comma-separated API_ALLOWED_ORIGINS, otherwise the
 * app's own origin. Empty in dev keeps everything same-origin.
 */
export const ALLOWED_ORIGINS = (process.env.API_ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

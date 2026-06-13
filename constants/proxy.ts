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

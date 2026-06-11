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

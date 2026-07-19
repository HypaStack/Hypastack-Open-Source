export const WINDOW_MINUTES = {
  upload: 3,
  cdnUpload: 2,
  download: 1,
  login: 5,
  register: 5,
  api: 1,
  forumPost: 10,
  forumUpload: 5,
  proxyToken: 1,
  funnelUpload: 5,
} as const

export const MAX_ATTEMPTS = {
  upload:         { free: 5,  essential: 30, premium: 60,  ultimate: 120 },
  cdnUpload:      { free: 5,  essential: 30, premium: 60,  ultimate: 120 },
  download:       { free: 10,   essential: 15,  premium: 20,  ultimate: 25  },
  login:          { free: 5 },
  register:       { free: 5 },
  api:            { free: 150 },
  forumPost:      { free: 5,  essential: 15, premium: 30,  ultimate: 60  },
  forumUpload:    { free: 3,  essential: 15, premium: 30,  ultimate: 60  },
  proxyToken:     { free: 60 },
  funnelUpload:   { free: 20 },
} as const

/**
 * v3 public API budget, per key per minute. Per-key rather than per-account so a
 * runaway script can't starve the account's other keys. Free never reaches this
 * — it has no keys at all.
 */
export const V3_REQUESTS_PER_MINUTE = {
  free: 0,
  essential: 120,
  premium: 600,
  ultimate: 1800,
} as const

/**
 * Hard ceiling on ALL v3 traffic, per minute, across every key and account.
 * Per-key budgets stop one bad actor; only this stops aggregate load from
 * taking the origin down. v3 is the first thing shed so v2 and the website
 * keep serving.
 */
export const V3_GLOBAL_REQUESTS_PER_MINUTE = 30_000

/** Retries for the session bootstrap fetch (auth/me, manage data) after a 429 */
export const SESSION_FETCH_MAX_RETRIES = 3

/** Delay in ms between session bootstrap retry attempts */
export const SESSION_FETCH_RETRY_DELAY_MS = 800

/** Max page refreshes allowed before triggering a lockout (Tauri desktop) */
export const DESKTOP_MAX_REFRESHES = 3

/** Sliding window in ms for counting rapid refreshes (Tauri desktop) */
export const DESKTOP_REFRESH_WINDOW_MS = 8_000

/** Lockout duration in ms after too many refreshes (Tauri desktop) */
export const DESKTOP_COOLDOWN_MS = 30_000

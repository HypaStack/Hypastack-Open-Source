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
  requestUpload: 5,
  accountSwitch: 1,
  feedback: 5,
  // one calendar-ish month, appeals are not meant to be resubmitted
  appeal: 60 * 24 * 30,
} as const

export const MAX_ATTEMPTS = {
  upload:         { free: 5,  plus: 30, pro: 60,  max: 120 },
  cdnUpload:      { free: 5,  plus: 30, pro: 60,  max: 120 },
  download:       { free: 10,   plus: 15,  pro: 20,  max: 25  },
  login:          { free: 5 },
  register:       { free: 5 },
  api:            { free: 150 },
  forumPost:      { free: 5,  plus: 15, pro: 30,  max: 60  },
  forumUpload:    { free: 3,  plus: 15, pro: 30,  max: 60  },
  proxyToken:     { free: 60 },
  requestUpload:   { free: 20 },
  accountSwitch:  { free: 10 },
  feedback:       { free: 1,  plus: 3,  pro: 5,   max: 10 },
  appeal:         { free: 1 },
} as const

/**
 * v3 public API budget, per key per minute. Per-key rather than per-account so a
 * runaway script can't starve the account's other keys. Free never reaches this
 *, it has no keys at all.
 */
export const V3_REQUESTS_PER_MINUTE = {
  free: 0,
  plus: 120,
  pro: 600,
  max: 1800,
} as const

/** Hard ceiling on all v3 traffic per minute, across every key and account. */
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

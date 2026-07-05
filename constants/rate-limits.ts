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
} as const

/** Max page refreshes allowed before triggering a lockout (Tauri desktop) */
export const DESKTOP_MAX_REFRESHES = 3

/** Sliding window in ms for counting rapid refreshes (Tauri desktop) */
export const DESKTOP_REFRESH_WINDOW_MS = 8_000

/** Lockout duration in ms after too many refreshes (Tauri desktop) */
export const DESKTOP_COOLDOWN_MS = 30_000

export const WINDOW_MINUTES = {
  upload: 3,
  cdnUpload: 2,
  download: 1,
  login: 5,
  register: 5,
  api: 1,
} as const

export const MAX_ATTEMPTS = {
  upload:         { free: 5,  essential: 30, premium: 60,  ultimate: 120 },
  cdnUpload:      { free: 5,  essential: 30, premium: 60,  ultimate: 120 },
  download:       { free: 10,   essential: 15,  premium: 20,  ultimate: 25  },
  login:          { free: 3 },
  register:       { free: 3 },
  api:            { free: 150 },
} as const

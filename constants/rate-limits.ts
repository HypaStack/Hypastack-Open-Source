export const WINDOW_MINUTES = {
  upload: 1,
  cdnUpload: 1,
  download: 1,
  login: 5,
  register: 5,
  api: 1,
} as const

export const MAX_ATTEMPTS = {
  upload:         { free: 30,  essential: 200, premium: 500,  ultimate: 1500 },
  cdnUpload:      { free: 10,  essential: 100, premium: 300,  ultimate: 1000 },
  download:       { free: 5,   essential: 50,  premium: 150,  ultimate: 500  },
  login:          { free: 5 },
  register:       { free: 5 },
  api:            { free: 120 },
} as const

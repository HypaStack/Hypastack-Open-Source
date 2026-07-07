/**
 * Upload and file transfer constants.
 * Shared across API routes and client-side upload logic.
 */

/** Accepted MIME types for user avatar uploads */
export const ALLOWED_AVATAR_TYPES: string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]

/** Maximum avatar file size in bytes (10 MB) */
export const MAX_AVATAR_SIZE = 10 * 1024 * 1024

/** Accepted MIME types for download-page banner uploads (paid plans) */
export const ALLOWED_BANNER_TYPES: string[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/avif",
]

/** Maximum banner file size in bytes (10 MB) */
export const MAX_BANNER_SIZE = 10 * 1024 * 1024

/** Maximum output dimension when cropping and resizing an avatar (px) */
export const AVATAR_MAX_DIMENSION = 512

/** TTL in seconds for a standard file download presigned URL (5 min) */
export const PRESIGNED_TTL_SECONDS = 300

/** TTL in seconds for a burn-on-read presigned URL (1 min) */
export const BURN_PRESIGNED_TTL_SECONDS = 60

/** Delay in ms before a burn-on-read file is deleted after first access (90 s) */
export const BURN_DELETE_DELAY_MS = 90_000

/** Maximum retry attempts for burn-on-read deletion (1 initial + retries) */
export const BURN_DELETE_MAX_RETRIES = 5

/** Interval in ms between burn deletion retry attempts */
export const BURN_DELETE_RETRY_INTERVAL_MS = 7_500

/** File size threshold above which multipart upload is used (50 MB) */
export const MULTIPART_THRESHOLD = 50 * 1024 * 1024

/** Hard ceiling for the buffered server-side upload proxy (50 MB). The proxy
 *  reads the whole body into memory, so the effective cap is the smaller of
 *  this and the user's per-file tier limit. */
export const MAX_PROXY_UPLOAD_SIZE = 50 * 1024 * 1024

/** Default chunk size for multipart uploads (10 MB) */
export const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024

/** Maximum number of concurrent chunk upload workers */
export const MAX_CONCURRENT_CHUNKS = 10

/** Concurrent chunk workers when resuming an interrupted multipart upload */
export const RESUME_MAX_CONCURRENT_CHUNKS = 6

/** Total attempts per chunk PUT (1 initial + retries) for transient network/TLS failures */
export const CHUNK_UPLOAD_MAX_ATTEMPTS = 3

/** Base delay in ms between chunk retry attempts (multiplied by attempt number) */
export const CHUNK_UPLOAD_RETRY_DELAY_MS = 1_000

/** Regex to detect previewable content types inline */
export const PREVIEWABLE_MIME_REGEX = /^(image|video|audio)\//

/** Cache-Control for immutable CDN assets (1-year public cache) */
export const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable"

/** Default base name for a multi-file zip archive (".zip" is appended) */
export const DEFAULT_ARCHIVE_NAME = "hypastack-archive"

/** CustomEvent the desktop app fires on the window to start a native upload */
export const NATIVE_UPLOAD_EVENT = "hypadrive:upload"

/** Min/max custom file expiration in minutes (1 minute … 30 days). Paid plans. */
export const MIN_EXPIRATION_MINUTES = 1
export const MAX_EXPIRATION_MINUTES = 30 * 24 * 60 // 43200

/**
 * Discrete steps for the custom-expiration slider (Essential+). The slider
 * indexes into this array; each step maps to a duration in minutes.
 */
export const EXPIRATION_STEPS: { minutes: number; label: string }[] = [
  { minutes: 1, label: "1 minute" },
  { minutes: 5, label: "5 minutes" },
  { minutes: 15, label: "15 minutes" },
  { minutes: 30, label: "30 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 180, label: "3 hours" },
  { minutes: 360, label: "6 hours" },
  { minutes: 720, label: "12 hours" },
  { minutes: 1440, label: "1 day" },
  { minutes: 2880, label: "2 days" },
  { minutes: 4320, label: "3 days" },
  { minutes: 10080, label: "7 days" },
  { minutes: 20160, label: "14 days" },
  { minutes: 43200, label: "30 days" },
]

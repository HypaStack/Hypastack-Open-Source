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

/** Maximum output dimension when cropping and resizing an avatar (px) */
export const AVATAR_MAX_DIMENSION = 512

/** TTL in seconds for a standard file download presigned URL (5 min) */
export const PRESIGNED_TTL_SECONDS = 300

/** TTL in seconds for a burn-on-read presigned URL (1 min) */
export const BURN_PRESIGNED_TTL_SECONDS = 60

/** Delay in ms before a burn-on-read file is deleted after first access (90 s) */
export const BURN_DELETE_DELAY_MS = 90_000

/** File size threshold above which multipart upload is used (50 MB) */
export const MULTIPART_THRESHOLD = 50 * 1024 * 1024

/** Default chunk size for multipart uploads (10 MB) */
export const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024

/** Maximum number of concurrent chunk upload workers */
export const MAX_CONCURRENT_CHUNKS = 10

/** Regex to detect previewable content types inline */
export const PREVIEWABLE_MIME_REGEX = /^(image|video|audio)\//

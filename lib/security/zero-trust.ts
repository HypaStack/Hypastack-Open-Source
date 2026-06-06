import { z } from "zod"
import { JSDOM } from "jsdom"
import DOMPurify from "dompurify"
import { fileTypeFromBuffer } from "file-type"
import path from "path"
import sharp from "sharp"
import crypto from "crypto"

const window = new JSDOM("").window
const purify = DOMPurify(window)

const BLOCKED_MIME_TYPES_SET = new Set([
  "application/x-msdownload",
  "application/x-ms-installer",
  "application/x-executable",
  "application/x-shockwave-flash",
  "application/x-java-archive",
  "application/x-php",
  "application/x-shellscript",
  "application/x-bat",
  "application/vnd.microsoft.portable-executable",
])

const BLOCKED_EXTENSIONS_SET = new Set([
  "exe", "msi", "com", "scr", "pif", "gadget",
  "bat", "cmd", "ps1", "psm1", "psd1", "vbs", "vbe",
  "wsf", "wsh", "msc", "reg",
  "sh", "bash", "zsh", "csh", "fish", "command",
  "php", "php3", "php4", "php5", "phtml",
  "asp", "aspx", "ashx", "asmx",
  "jsp", "jspx", "cgi",
  "py", "pyw", "pyc",
  "pl", "pm", "rb",
  "jar", "war", "class",
  "lnk", "url", "inf", "ins",
])

// ---------------------------------------------------------------------------
// CDN ALLOWLIST — embeddable/usable web content. Single source of truth.
// Extension allowlist is the ONLY gate; magic bytes only block dangerous types.
// ---------------------------------------------------------------------------
export const CDN_ALLOWED_EXTENSIONS = new Set([
  // Images
  "jpg", "jpeg", "png", "gif", "webp", "svg",
  "ico", "cur", "ani", "bmp", "tiff", "tif",
  "avif", "heic", "heif", "jxl", "apng",
  // Fonts
  "ttf", "otf", "woff", "woff2", "eot",
  // Audio
  "mp3", "wav", "ogg", "oga", "flac", "aac", "m4a", "opus",
  "mid", "midi", "weba",
  // Video
  "mp4", "m4v", "webm", "mov", "avi", "mkv", "ogv", "3gp", "wmv",
  // Subtitles
  "vtt", "srt", "ass", "ssa",
  // 3D / models
  "glb", "gltf", "obj", "fbx", "stl", "usdz", "ply",
  // Data / markup
  "json", "xml", "csv", "tsv", "txt", "md", "yaml", "yml", "toml",
  "html", "htm", "css",
  // Documents
  "pdf", "epub",
  // Archives (downloadable assets)
  "zip", "gz", "tar", "7z",
  // Web manifests
  "webmanifest", "manifest",
])

// size limits
export const MAX_FILE_SIZE = 500 * 1024 * 1024 // equals 500MB
const MAX_NOTE_LENGTH = 100

export const UploadRequestSchema = z.object({
  fileName: z
    .string()
    .min(1, "Filename is required")
    .max(255, "Filename too long")
    .regex(/^[^\\/:*?"<>|]+$/, "Invalid characters in filename"),
  fileSize: z
    .number()
    .int()
    .positive("File size must be positive")
    .max(MAX_FILE_SIZE, `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`),
  contentType: z.string().min(1, "Content type is required"),
  pin: z
    .string()
    .regex(/^\d{6}$/, "PIN must be exactly 6 digits")
    .nullable()
    .optional(),
  burnOnRead: z.boolean().default(false),
  customFilename: z
    .string()
    .max(100, "Custom filename too long")
    .regex(/^[^\\/:*?"<>|]*$/, "Invalid characters in custom filename")
    .nullable()
    .optional(),
  note: z
    .string()
    .max(MAX_NOTE_LENGTH, `Note exceeds ${MAX_NOTE_LENGTH} characters`)
    .nullable()
    .optional(),
  turnstileToken: z.string().min(1, "Turnstile token required"),
  csrfToken: z.string().min(1, "CSRF token required"),
})

export type UploadRequest = z.infer<typeof UploadRequestSchema>

function stripInjectionPatterns(input: string): string {
  return input
    // Control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Protocol handlers
    .replace(/javascript\s*:/gi, "")
    .replace(/data\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    // MongoDB/NoSQL operators
    .replace(/\$(?:gt|gte|lt|lte|ne|eq|in|nin|or|and|not|nor|exists|type|regex|where|expr|jsonSchema|all|elemMatch|size|set|unset|inc|push|pull|addToSet|rename|currentDate|min|max|mul)\b/gi, "")
    .replace(/\$\{/g, "\\${")   // template literal injection
    .replace(/\{\{/g, "{ {")    // template engine injection (Handlebars, Mustache)
    // SQL injection patterns
    .replace(/('|--|;|\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION|TRUNCATE|DECLARE|CAST|CONVERT|WAITFOR|xp_)\b)/gi, "")
    // Null bytes (belt-and-suspenders)
    .replace(/\0/g, "")
    .trim()
}

export function sanitizeNote(note: string | null | undefined): string | null {
  if (!note || note.trim().length === 0) return null

  let sanitized = purify.sanitize(note.trim(), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    SANITIZE_DOM: true,
    SAFE_FOR_TEMPLATES: true,
    SAFE_FOR_XML: true,
  })

  sanitized = stripInjectionPatterns(sanitized)
  if (sanitized.length > MAX_NOTE_LENGTH) sanitized = sanitized.substring(0, MAX_NOTE_LENGTH)

  return sanitized.length > 0 ? sanitized : null
}

export function sanitizeString(
  input: string | null | undefined,
  maxLength: number = 500,
): string | null {
  if (!input || input.trim().length === 0) return null

  let sanitized = purify.sanitize(input.trim(), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    SANITIZE_DOM: true,
    SAFE_FOR_TEMPLATES: true,
    SAFE_FOR_XML: true,
  })

  sanitized = stripInjectionPatterns(sanitized)
  if (sanitized.length > maxLength) sanitized = sanitized.substring(0, maxLength)

  return sanitized.length > 0 ? sanitized : null
}

export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || url.trim().length === 0) return null

  const trimmed = url.trim()

  // Block dangerous protocols
  if (/^(javascript|data|vbscript|file|ftp)\s*:/i.test(trimmed)) return null

  // Must be valid URL
  try {
    const parsed = new URL(trimmed)
    if (!["http:", "https:"].includes(parsed.protocol)) return null

    // Block URLs with credentials embedded
    if (parsed.username || parsed.password) return null

    // Block localhost/internal IPs (SSRF)
    const host = parsed.hostname.toLowerCase()
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.startsWith("172.") ||
      host === "[::1]" ||
      host.endsWith(".local")
    ) return null

    return parsed.href
  } catch {
    return null
  }
}


export function sanitizeFilename(filename: string): {
  sanitized: string
  extension: string
  isValid: boolean
  error?: string
} {
  // Reject null bytes immediately (classic attack vector)
  if (filename.includes('\0')) {
    return { sanitized: "", extension: "", isValid: false, error: "Filename contains null bytes" }
  }

  // Normalize Unicode (catch homoglyph attacks like /../ using fullwidth chars)
  let sanitized = filename.normalize("NFKC")

  // Replace all backslashes with forward slashes
  sanitized = sanitized.replace(/\\/g, "/")

  // Strip ALL path components — only keep the final segment
  sanitized = path.basename(sanitized)

  // Remove control characters (U+0000–U+001F, U+007F, U+0080–U+009F)
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, "")

  // Remove ALL path traversal sequences (even encoded or mixed)
  while (sanitized.includes("..")) {
    sanitized = sanitized.replace(/\.\.[/\\]/g, "")
    sanitized = sanitized.replace(/[/\\]\.\./g, "")
    sanitized = sanitized.replace(/\.\./g, "")
  }

  // Remove leading dots (hidden files)
  sanitized = sanitized.replace(/^\.+/, "")

  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*\x00]/g, "")

  // Strip injection patterns from the filename itself
  sanitized = stripInjectionPatterns(sanitized)

  // Extension extraction
  const extMatch = sanitized.match(/\.([^.]+)$/)
  const extension = extMatch ? extMatch[1].toLowerCase() : ""

  // Block double extensions that hide dangerous types (e.g. "file.php.jpg")
  // Disabled for normal uploads to allow any file type
  // const allExts = sanitized.split(".").slice(1).map(e => e.toLowerCase())
  // for (const ext of allExts) {
  //   if (BLOCKED_EXTENSIONS_SET.has(ext)) {
  //     return { sanitized: "", extension: "", isValid: false, error: `Hidden extension "${ext}" detected and blocked` }
  //   }
  // }

  // Length limit
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255)
  }

  // Final validation
  if (sanitized.length === 0 || sanitized === "." || sanitized === "..") {
    return { sanitized: "", extension: "", isValid: false, error: "Invalid filename after sanitization" }
  }

  return { sanitized, extension, isValid: true }
}

export async function verifyFileType(
  buffer: Buffer
): Promise<{
  valid: boolean
  mimeType: string | null
  extension: string | null
  error?: string
}> {
  try {
    // file size
    if (buffer.length > MAX_FILE_SIZE) {
      return {
        valid: false,
        mimeType: null,
        extension: null,
        error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
      }
    }

    // magic bytes analysis
    const fileType = await fileTypeFromBuffer(buffer)

    if (!fileType) {
      // Can't determine type from magic bytes — check if it looks like text or unknown binary
      const isText = isLikelyTextFile(buffer)
      return {
        valid: true,
        mimeType: isText ? "text/plain" : "application/octet-stream",
        extension: null,
      }
    }

    // MIME type and extension blocking removed for normal uploads
    // to allow executables and scripts.

    return {
      valid: true,
      mimeType: fileType.mime,
      extension: fileType.ext,
    }
  } catch (error) {
    return {
      valid: false,
      mimeType: null,
      extension: null,
      error: "File type verification failed",
    }
  }
}

function isLikelyTextFile(buffer: Buffer): boolean {
  // bom
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return true // utf-8
  }

  // first 1kb sample
  const sample = buffer.slice(0, Math.min(buffer.length, 1024))
  return !sample.includes(0)
}

export function sanitizeCdnFilename(filename: string): {
  sanitized: string
  extension: string
  isValid: boolean
  error?: string
} {
  if (filename.includes('\0')) {
    return { sanitized: "", extension: "", isValid: false, error: "Filename contains null bytes" }
  }

  let sanitized = filename.normalize("NFKC")
  sanitized = sanitized.replace(/\\/g, "/")
  sanitized = path.basename(sanitized)
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, "")
  while (sanitized.includes("..")) {
    sanitized = sanitized.replace(/\.\.[/\\]/g, "").replace(/[/\\]\.\./g, "").replace(/\.\./g, "")
  }
  sanitized = sanitized.replace(/^\.+/, "")
  sanitized = sanitized.replace(/[<>:"|?*]/g, "")
  sanitized = stripInjectionPatterns(sanitized)
  
  // Make strictly URL-safe (replace spaces, brackets, #, %, etc with hyphens)
  sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_]/g, "-")
  
  // Clean up multiple consecutive hyphens
  sanitized = sanitized.replace(/-+/g, "-")
  
  const extMatch = sanitized.match(/\.([^.]+)$/)
  const extension = extMatch ? extMatch[1].toLowerCase() : ""

  if (!CDN_ALLOWED_EXTENSIONS.has(extension)) {
    return { sanitized: "", extension: "", isValid: false, error: `File extension "${extension}" is not allowed for CDN uploads` }
  }

  // Block hidden dangerous extensions in multi-dot names
  const allExts = sanitized.split(".").slice(1).map(e => e.toLowerCase())
  for (const ext of allExts) {
    if (BLOCKED_EXTENSIONS_SET.has(ext)) {
      return { sanitized: "", extension: "", isValid: false, error: `Hidden extension "${ext}" detected and blocked` }
    }
  }

  if (sanitized.length > 255) sanitized = sanitized.substring(0, 255)
  if (!sanitized || sanitized === "." || sanitized === "..") {
    return { sanitized: "", extension: "", isValid: false, error: "Invalid filename after sanitization" }
  }

  return { sanitized, extension, isValid: true }
}

export async function verifyCdnFileType(
  buffer: Buffer,
  extension: string,
): Promise<{ valid: boolean; mimeType: string | null; extension: string | null; error?: string }> {
  try {
    if (buffer.length > MAX_FILE_SIZE) {
      return { valid: false, mimeType: null, extension: null, error: "File too large" }
    }

    const fileType = await fileTypeFromBuffer(buffer)

    if (!fileType) {
      // Magic bytes unknown — fine, extension already passed the CDN allowlist
      return { valid: true, mimeType: null, extension: null }
    }

    // Block files whose actual content is a known-dangerous executable/script,
    // even if they were renamed to a safe extension
    if (BLOCKED_MIME_TYPES_SET.has(fileType.mime) || BLOCKED_EXTENSIONS_SET.has(fileType.ext)) {
      return { valid: false, mimeType: fileType.mime, extension: fileType.ext, error: `File contents detected as "${fileType.ext}" which is not allowed` }
    }

    return { valid: true, mimeType: fileType.mime, extension: fileType.ext }
  } catch {
    return { valid: false, mimeType: null, extension: null, error: "File type verification failed" }
  }
}

export async function stripMetadata(buffer: Buffer, mimeType: string): Promise<Buffer> {
  // Only process images
  if (!mimeType.startsWith("image/")) {
    return buffer
  }

  try {
    // Use sharp to strip all metadata
    const processed = await sharp(buffer, {
      failOnError: false,
      limitInputPixels: 268402689, // ~16384x16384
    })
      .rotate() // Auto-rotate based on EXIF orientation
      .withMetadata({
        exif: {},
        icc: "",
      })
      .toBuffer()

    return processed
  } catch (error) {
    // If sharp fails (e.g., for SVG), return original buffer
    console.error("[Metadata] Stripping failed, returning original:", error)
    return buffer
  }
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY

function getEncryptionKey(): Buffer {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error("[Security] ENCRYPTION_KEY must be exactly 32 characters for AES-256. Set it in your environment variables.")
  }
  return Buffer.from(ENCRYPTION_KEY, "utf8")
}

export function encryptFile(buffer: Buffer): {
  encrypted: Buffer
  iv: string
  authTag: string
} {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    encrypted,
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  }
}

export function decryptFile(
  encrypted: Buffer,
  iv: string,
  authTag: string
): Buffer {
  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64")
  )
  decipher.setAuthTag(Buffer.from(authTag, "base64"))

  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}

export function createDecryptStream(iv: string, authTag: string): crypto.DecipherGCM {
  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64")
  )
  decipher.setAuthTag(Buffer.from(authTag, "base64"))
  return decipher
}

export async function processFileUpload(
  buffer: Buffer,
  claimedMimeType: string,
  filename: string
): Promise<{
  success: boolean
  processedBuffer: Buffer
  detectedMimeType: string
  sanitizedFilename: string
  metadata: {
    originalSize: number
    processedSize: number
    encryptionIv?: string
    encryptionAuthTag?: string
  }
  error?: string
}> {
  const originalSize = buffer.length

  try {
    const typeVerification = await verifyFileType(buffer)
    if (!typeVerification.valid) {
      return {
        success: false,
        processedBuffer: Buffer.alloc(0),
        detectedMimeType: "",
        sanitizedFilename: "",
        metadata: { originalSize, processedSize: 0 },
        error: typeVerification.error,
      }
    }

    const filenameSanitization = sanitizeFilename(filename)
    if (!filenameSanitization.isValid) {
      return {
        success: false,
        processedBuffer: Buffer.alloc(0),
        detectedMimeType: "",
        sanitizedFilename: "",
        metadata: { originalSize, processedSize: 0 },
        error: filenameSanitization.error,
      }
    }

    let processedBuffer = await stripMetadata(buffer, typeVerification.mimeType!)
    const encryption = encryptFile(processedBuffer)
    processedBuffer = encryption.encrypted

    return {
      success: true,
      processedBuffer,
      detectedMimeType: typeVerification.mimeType!,
      sanitizedFilename: filenameSanitization.sanitized,
      metadata: {
        originalSize,
        processedSize: processedBuffer.length,
        encryptionIv: encryption.iv,
        encryptionAuthTag: encryption.authTag,
      },
    }
  } catch (error) {
    return {
      success: false,
      processedBuffer: Buffer.alloc(0),
      detectedMimeType: "",
      sanitizedFilename: "",
      metadata: { originalSize, processedSize: 0 },
      error: "File processing failed",
    }
  }
}

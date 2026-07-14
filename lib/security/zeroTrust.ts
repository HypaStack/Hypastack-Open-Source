import { fileTypeFromBuffer } from "file-type"
import path from "path"
import sharp from "sharp"
import crypto from "crypto"
import { CDN_ALLOWED_EXTENSIONS, MAX_FILE_SIZE, BLOCKED_MIME_TYPES, BLOCKED_EXTENSIONS, MAX_NOTE_LENGTH } from "@/constants"
import { sanitizeViaService } from "@/lib/security/sanitizeService"

// DOMPurify (and the heavyweight jsdom it needs for a DOM) is only the
// fallback path now — the hypasan Go sidecar normally does note sanitization.
// Loaded lazily so jsdom stays out of memory while the sidecar is up.
type Purifier = { sanitize: (dirty: string, cfg?: Record<string, unknown>) => string }
let _purify: Purifier | null = null

async function getPurify(): Promise<Purifier> {
  if (!_purify) {
    const [{ JSDOM }, { default: DOMPurify }] = await Promise.all([
      import("jsdom"),
      import("dompurify"),
    ])
    _purify = DOMPurify(new JSDOM("").window) as unknown as Purifier
  }
  return _purify
}

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

export async function sanitizeNote(note: string | null | undefined): Promise<string | null> {
  if (!note || note.trim().length === 0) return null

  let sanitized: string
  try {
    sanitized = await sanitizeViaService(note, MAX_NOTE_LENGTH)
  } catch {
    const purify = await getPurify()
    sanitized = purify.sanitize(note.trim(), {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      SANITIZE_DOM: true,
      SAFE_FOR_TEMPLATES: true,
      SAFE_FOR_XML: true,
    })
    sanitized = stripInjectionPatterns(sanitized)
    if (sanitized.length > MAX_NOTE_LENGTH) sanitized = sanitized.substring(0, MAX_NOTE_LENGTH)
  }

  return sanitized.length > 0 ? sanitized : null
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

  // After path.basename() above, no path separators remain.
  // Remove any residual double-dots (cannot traverse without a separator, but strip anyway).
  sanitized = sanitized.split("..").join("")

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
  // After path.basename() above, no path separators remain.
  // Remove any residual double-dots (cannot traverse without a separator, but strip anyway).
  sanitized = sanitized.split("..").join("")
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
    if (BLOCKED_EXTENSIONS.has(ext)) {
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
    if (BLOCKED_MIME_TYPES.has(fileType.mime) || BLOCKED_EXTENSIONS.has(fileType.ext)) {
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
      failOn: "none",
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

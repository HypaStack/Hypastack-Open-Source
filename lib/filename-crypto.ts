import { randomBytes, createCipheriv, createDecipheriv } from "crypto"

const ALGO = "aes-256-gcm"
const IV_LEN = 12
const TAG_LEN = 16

function getKey(): Buffer {
  const hex = process.env.FILENAME_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      "FILENAME_ENCRYPTION_KEY env var must be a 64-character hex string (32 bytes). " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    )
  }
  return Buffer.from(hex, "hex")
}

export function encryptFilename(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  const packed = Buffer.concat([iv, tag, encrypted])
  return packed.toString("base64")
}

export function decryptFilename(encoded: string): string {
  try {
    const key = getKey()
    const packed = Buffer.from(encoded, "base64")

    if (packed.length < IV_LEN + TAG_LEN + 1) {
      return encoded
    }

    const iv = packed.subarray(0, IV_LEN)
    const tag = packed.subarray(IV_LEN, IV_LEN + TAG_LEN)
    const ciphertext = packed.subarray(IV_LEN + TAG_LEN)

    const decipher = createDecipheriv(ALGO, key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ])
    return decrypted.toString("utf8")
  } catch {
    return encoded
  }
}

export function generateOpaqueStorageName(): string {
  const bytes = randomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString("hex")
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-")
}

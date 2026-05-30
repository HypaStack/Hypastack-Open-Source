// Client-side Web Crypto API utilities for End-to-End Encryption

// --- WebCrypto Availability Guard ---
function assertWebCrypto(): void {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error(
      "Web Crypto API is not available. This site requires a modern browser over HTTPS."
    )
  }
}

/**
 * Derives a 256-bit AES-GCM key from the user's access key.
 * Uses the userId as a unique, per-account PBKDF2 salt to prevent
 * precomputation attacks across accounts.
 */
export async function deriveMasterKey(accessKey: string, userId: string): Promise<CryptoKey> {
  assertWebCrypto()
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(accessKey),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  )

  // Use the userId as a unique per-user salt
  const salt = encoder.encode(`hypastack-e2e-v2:${userId}`)

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true, // extractable so we can export to sessionStorage
    ["encrypt", "decrypt"]
  )
}

/**
 * Encrypts a plaintext string using the derived CryptoKey.
 * Returns a base64 encoded string format: "iv:ciphertext"
 */
export async function encryptE2E(plaintext: string, key: CryptoKey): Promise<string> {
  assertWebCrypto()
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encoder.encode(plaintext)
  )

  const ivBase64 = arrayBufferToBase64(iv)
  const cipherBase64 = arrayBufferToBase64(ciphertext)

  return `${ivBase64}:${cipherBase64}`
}

/**
 * Decrypts an E2E encrypted string.
 * Expects format "iv:ciphertext" in base64.
 * Returns a graceful fallback on any failure instead of throwing.
 */
export async function decryptE2E(encryptedStr: string, key: CryptoKey): Promise<string> {
  try {
    assertWebCrypto()

    if (!encryptedStr || typeof encryptedStr !== "string") {
      return "Encrypted User"
    }

    const colonIdx = encryptedStr.indexOf(":")
    if (colonIdx === -1) return "Corrupt Data"

    const ivBase64 = encryptedStr.substring(0, colonIdx)
    const cipherBase64 = encryptedStr.substring(colonIdx + 1)

    if (!ivBase64 || !cipherBase64) return "Corrupt Data"

    const iv = base64ToArrayBuffer(ivBase64)
    const ciphertext = base64ToArrayBuffer(cipherBase64)

    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      ciphertext
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (err) {
    console.error("E2E Decryption failed:", err)
    return "Encrypted User"
  }
}

// --- Session Storage Helpers ---

/**
 * Stores the derived key into sessionStorage as a raw base64 string.
 * Gracefully handles QuotaExceeded errors.
 */
export async function storeSessionKey(key: CryptoKey): Promise<void> {
  try {
    assertWebCrypto()
    const rawKey = await crypto.subtle.exportKey("raw", key)
    const keyBase64 = arrayBufferToBase64(rawKey)
    localStorage.setItem("hpsk_e2e_master", keyBase64)
  } catch (err) {
    console.error("Failed to store session key:", err)
    // Graceful degradation — user will see "Encrypted User" instead of their name
  }
}

/**
 * Retrieves the derived key from sessionStorage.
 */
export async function getSessionKey(): Promise<CryptoKey | null> {
  try {
    assertWebCrypto()
    const keyBase64 = localStorage.getItem("hpsk_e2e_master")
    if (!keyBase64) return null

    const rawKey = base64ToArrayBuffer(keyBase64)
    return await crypto.subtle.importKey(
      "raw",
      rawKey,
      "AES-GCM",
      true,
      ["encrypt", "decrypt"]
    )
  } catch (err) {
    console.error("Failed to retrieve session key:", err)
    return null
  }
}

// --- Key Generation (for Registration) ---

export function generateUserIdClient(): string {
  assertWebCrypto()
  return crypto.randomUUID()
}

export function generateAccessKeyClient(userId: string): string {
  assertWebCrypto()
  const secretBytes = crypto.getRandomValues(new Uint8Array(32))
  const secretHex = Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  const cleanId = userId.replace(/-/g, "")
  return `hpsk_${cleanId}_${secretHex}`
}

/**
 * Extracts the UUID-format userId from an access key.
 * Access key format: hpsk_<32hexCharsUuidNoDashes>_<64hexSecret>
 */
export function extractUserIdFromAccessKey(accessKey: string): string | null {
  const parts = accessKey.split("_")
  if (parts.length !== 3 || parts[0] !== "hpsk" || parts[1].length !== 32) {
    return null
  }
  const raw = parts[1]
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`
}

// --- Utility Base64 converters ---

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let binary = ""
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = atob(base64)
  const len = binary_string.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i)
  }
  return bytes.buffer
}

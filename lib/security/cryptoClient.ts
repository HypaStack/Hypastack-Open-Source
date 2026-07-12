import { STORAGE_KEY_E2E_MASTER } from "@/constants"

function assertWebCrypto(): void {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error(
      "Web Crypto API is not available. This site requires a modern browser over HTTPS."
    )
  }
}

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
    true,
    ["encrypt", "decrypt"]
  )
}

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

export async function storeSessionKey(key: CryptoKey): Promise<void> {
  try {
    assertWebCrypto()
    const rawKey = await crypto.subtle.exportKey("raw", key)
    const keyBase64 = arrayBufferToBase64(rawKey)
    localStorage.setItem(STORAGE_KEY_E2E_MASTER, keyBase64)
  } catch (err) {
    console.error("Failed to store session key:", err)
  }
}

export async function getSessionKey(): Promise<CryptoKey | null> {
  try {
    assertWebCrypto()
    const keyBase64 = localStorage.getItem(STORAGE_KEY_E2E_MASTER)
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

export function generateUserIdClient(): string {
  assertWebCrypto()
  return crypto.randomUUID()
}

// New identifier scheme: cid_<32 random alphanumerics>. Carries no embedded
// user id (the server resolves it via a deterministic lookup at login), so the
// account id is generated and stored separately.
export function generateIdentifierClient(): string {
  assertWebCrypto()
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  // Rejection sampling: discard bytes at or above the largest multiple of the
  // alphabet size so the modulo mapping stays uniform (256 % 62 != 0 would
  // otherwise bias the first few characters).
  const limit = 256 - (256 % alphabet.length)
  let out = ""
  while (out.length < 32) {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    for (let i = 0; i < bytes.length && out.length < 32; i++) {
      if (bytes[i] < limit) out += alphabet[bytes[i] % alphabet.length]
    }
  }
  return `cid_${out}`
}

export function extractUserIdFromAccessKey(accessKey: string): string | null {
  const parts = accessKey.split("_")
  if (parts.length !== 3 || parts[0] !== "hpsk" || parts[1].length !== 32) {
    return null
  }
  const raw = parts[1]
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`
}

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

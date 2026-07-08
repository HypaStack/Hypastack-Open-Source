// Client-side hybrid crypto for Funnel drops.
//
// The owner holds an RSA-OAEP keypair. The public key encrypts (wraps) the random
// AES-GCM key a sender uses for their file; the private key decrypts it. The
// private key never leaves the owner's device unwrapped — it's AES-GCM-wrapped
// with the account master key (see lib/security/cryptoClient.ts) before it's sent
// to the server, mirroring how the nickname is protected.
//
// Wrap format for the private key: "ivBase64:ciphertextBase64" (same shape as
// encryptE2E). The wrapped AES key is a plain base64 RSA-OAEP ciphertext.

function assertWebCrypto(): void {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto API is not available. This site requires a modern browser over HTTPS.")
  }
}

const RSA_PARAMS = { name: "RSA-OAEP", hash: "SHA-256" } as const

export interface FunnelKeypairExport {
  publicKey: string        // SPKI, base64
  wrappedPrivateKey: string // PKCS8, AES-GCM-wrapped by master key ("iv:cipher")
}

// Generate a keypair and return the server-storable material: the public key in
// the clear and the private key wrapped by the account master key.
export async function generateWrappedFunnelKeypair(masterKey: CryptoKey): Promise<FunnelKeypairExport> {
  assertWebCrypto()
  const pair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"]
  )

  const spki = await crypto.subtle.exportKey("spki", pair.publicKey)
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey)

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, masterKey, pkcs8)

  return {
    publicKey: toBase64(spki),
    wrappedPrivateKey: `${toBase64(iv)}:${toBase64(wrapped)}`,
  }
}

// Sender side: import the funnel public key and RSA-wrap a raw AES key.
export async function importFunnelPublicKey(spkiBase64: string): Promise<CryptoKey> {
  assertWebCrypto()
  return crypto.subtle.importKey("spki", fromBase64(spkiBase64), RSA_PARAMS, false, ["encrypt"])
}

export async function wrapAesKey(rawAesKey: ArrayBuffer, publicKey: CryptoKey): Promise<string> {
  assertWebCrypto()
  const wrapped = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawAesKey)
  return toBase64(wrapped)
}

// Owner side: unwrap the private key with the master key, then use it to unwrap a
// file's AES key back into an AES-GCM CryptoKey for decryption.
export async function unwrapFunnelPrivateKey(wrappedPrivateKey: string, masterKey: CryptoKey): Promise<CryptoKey> {
  assertWebCrypto()
  const colon = wrappedPrivateKey.indexOf(":")
  if (colon === -1) throw new Error("Malformed wrapped private key")
  const iv = fromBase64(wrappedPrivateKey.slice(0, colon))
  const cipher = fromBase64(wrappedPrivateKey.slice(colon + 1))
  const pkcs8 = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, masterKey, cipher)
  return crypto.subtle.importKey("pkcs8", pkcs8, RSA_PARAMS, false, ["decrypt"])
}

export async function unwrapAesKey(wrappedKeyBase64: string, privateKey: CryptoKey): Promise<CryptoKey> {
  assertWebCrypto()
  const raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, fromBase64(wrappedKeyBase64))
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, false, ["decrypt"])
}

function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function fromBase64(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

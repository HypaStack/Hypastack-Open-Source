// Biometric unlock: a WebAuthn passkey acts as a local, biometric-gated vault
// for the access key. We never register the credential server-side — the
// passkey is only used to derive a stable secret via the PRF extension, which
// wraps the access key on this device. Unlock = biometric -> PRF -> unwrap the
// access key -> the caller replays the normal login. Nothing new reaches the
// server, so the zero-knowledge model is untouched.

const STORAGE_KEY = "hpsk_bio_v1"
// Fixed salt -> stable PRF output for a given credential across unlocks.
const PRF_SALT = new TextEncoder().encode("hypastack-prf-v1")

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

// A platform authenticator with user verification (Face ID / Touch ID /
// Windows Hello) — necessary but not sufficient; PRF is confirmed at enroll.
export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential || !navigator.credentials) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function isBiometricEnrolled(): boolean {
  if (typeof window === "undefined") return false
  return !!localStorage.getItem(STORAGE_KEY)
}

export function clearBiometric(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}

function importWrapKey(prf: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", prf, "AES-GCM", false, ["encrypt", "decrypt"])
}

// Query the passkey and pull the PRF output as a 32-byte key. Reading PRF at
// get() time is the reliable cross-engine path (some engines omit it during
// create()).
async function getPrfOutput(credentialId?: ArrayBuffer): Promise<ArrayBuffer | null> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      userVerification: "required",
      ...(credentialId ? { allowCredentials: [{ type: "public-key", id: credentialId }] } : {}),
      extensions: { prf: { eval: { first: PRF_SALT } } },
    } as PublicKeyCredentialRequestOptions,
  })) as PublicKeyCredential | null
  if (!assertion) return null
  const first = assertion.getClientExtensionResults().prf?.results?.first
  if (!first) return null
  const src = first instanceof ArrayBuffer
    ? new Uint8Array(first)
    : new Uint8Array(first.buffer, first.byteOffset, first.byteLength)
  const out = new Uint8Array(32)
  out.set(src.subarray(0, 32))
  return out.buffer
}

// Create a passkey, confirm PRF works, wrap the access key, persist the blob.
// Returns false (storing nothing) when PRF is unavailable on this device.
export async function enrollBiometric(accessKey: string): Promise<boolean> {
  if (!(await isBiometricSupported())) return false
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: "Hypastack", id: location.hostname },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: "hypastack",
          displayName: "Hypastack",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          residentKey: "preferred",
          userVerification: "required",
        },
        timeout: 60000,
        extensions: { prf: {} },
      } as PublicKeyCredentialCreationOptions,
    })) as PublicKeyCredential | null
    if (!cred) return false

    const credId = cred.rawId
    const prf = await getPrfOutput(credId)
    if (!prf) return false // PRF unsupported here — abandon, store nothing

    const key = await importWrapKey(prf)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(accessKey))
    localStorage.setItem(STORAGE_KEY, `${bufToB64(credId)}:${bufToB64(iv)}:${bufToB64(ct)}`)
    return true
  } catch {
    return false
  }
}

// Prompt the biometric and return the unwrapped access key, or null on cancel /
// no enrollment / PRF or decrypt failure.
export async function unlockWithBiometric(): Promise<string | null> {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  const [credB64, ivB64, ctB64] = stored.split(":")
  if (!credB64 || !ivB64 || !ctB64) return null
  try {
    const prf = await getPrfOutput(b64ToBuf(credB64))
    if (!prf) return null
    const key = await importWrapKey(prf)
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBuf(ivB64) },
      key,
      b64ToBuf(ctB64),
    )
    return new TextDecoder().decode(pt)
  } catch {
    return null
  }
}

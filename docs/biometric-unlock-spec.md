# Biometric Unlock (Face ID / Touch ID / Windows Hello) — Design Spec

**Status:** Draft for review. No code yet.
**Goal:** Let a returning user re-establish their session with a device biometric
instead of pasting their 70-char access key, without weakening the
zero-knowledge model.

---

## 1. The core idea

"Face ID on the web" = a **WebAuthn passkey** whose biometric gate protects a
stable secret via the **PRF extension** (`hmac-secret`). We use that secret to
wrap the account's **access key** on the device. Biometric unlock then means:

```
Face ID → passkey → PRF secret → unwrap access key → run the existing login
```

Because the access key is recovered verbatim, everything downstream
(`/api/v2/auth/login`, `deriveMasterKey`, `storeSessionKey`) is **unchanged**.
Biometric unlock is a drop-in replacement for "typing the access key."

### Why this is client-only (no backend changes)

We do **not** use WebAuthn for server authentication. The passkey is created and
queried entirely in the browser; its attestation is never sent anywhere. The
server still authenticates the normal way (access-key PBKDF2 via hypahash). The
passkey is purely a **local, biometric-gated vault** for the access key.

Consequences:
- No new API routes, no DB table, no changes to `/api/v2/auth/*`.
- The wrapped blob lives on the device (`localStorage`), inert without the
  passkey. Zero-knowledge is preserved — nothing new reaches the server.
- Single-device by design in v1 (see §7 open decisions for server-sync v2).

---

## 2. New module: `lib/security/biometric.ts`

One focused file. Public API:

```ts
// Feature detection — cheap, sync-ish; safe to call on render.
export async function isBiometricSupported(): Promise<boolean>

// True if this device has an enrolled biometric vault for any account.
export function isBiometricEnrolled(): boolean

// Create a passkey, confirm PRF works, wrap `accessKey`, persist the blob.
// Resolves false (and stores nothing) if PRF is unavailable on this device.
export async function enrollBiometric(accessKey: string): Promise<boolean>

// Prompt biometric, unwrap and return the access key, or null if the user
// cancels / no enrollment / PRF fails.
export async function unlockWithBiometric(): Promise<string | null>

// Remove the local vault (used by "forget this device" / disable toggle).
export function clearBiometric(): void
```

### Storage format (localStorage)

Mirrors the existing `hpsk_e2e_master` convention (base64, colon-joined).

```
key:   "hpsk_bio_v1"
value: `${credentialIdB64}:${ivB64}:${wrappedAccessKeyB64}`
```

- `credentialIdB64` — the passkey id, replayed in `allowCredentials` on unlock.
- Wrapping key = `importKey("raw", prfOutput, "AES-GCM")` (PRF output is 32 bytes).
- Wrapped value = `AES-GCM(iv, accessKey)`.

### PRF salt

Fixed app constant, e.g. `TextEncoder().encode("hypastack-prf-v1")`. A fixed salt
gives a stable PRF output for that credential across unlocks.

---

## 3. Enroll flow

Trigger points: right after a successful **manual login** (`app/signin`) and after
**registration** (`app/new`) — both already hold the plaintext access key at that
moment. Also reachable from the preferences toggle (§6).

```
1. isBiometricSupported() → if false, don't offer enrollment.
2. navigator.credentials.create({
     publicKey: {
       challenge: randomBytes(32),           // local, never sent
       rp: { name: "Hypastack", id: location.hostname },
       user: { id: randomBytes(16), name: "hypastack", displayName: "Hypastack" },
       pubKeyCredParams: [{ type: "public-key", alg: -7 }, { alg: -257 }],
       authenticatorSelection: {
         authenticatorAttachment: "platform",
         residentKey: "preferred",
         userVerification: "required",        // forces the biometric
       },
       extensions: { prf: {} },
     }
   })
3. Immediately navigator.credentials.get({ ... , allowCredentials: [thisId],
     extensions: { prf: { eval: { first: SALT } } } })
   → read getClientExtensionResults().prf.results.first
   (get()-time PRF is the reliable cross-platform path; some engines omit PRF on create.)
4. If no PRF result → PRF unsupported here: discard the credential, return false,
   tell the user biometric unlock isn't available on this device.
5. Wrap accessKey with the PRF output, write "hpsk_bio_v1".
6. Return true.
```

## 4. Unlock flow

Trigger point: `app/signin` shows an "Unlock with biometrics" button when
`isBiometricEnrolled()`.

```
1. Read credentialId from "hpsk_bio_v1".
2. navigator.credentials.get({ publicKey: {
     challenge: randomBytes(32),
     allowCredentials: [{ type: "public-key", id: credentialId }],
     userVerification: "required",
     extensions: { prf: { eval: { first: SALT } } },
   }})  → biometric prompt fires here.
3. Derive wrap key from prf.results.first, AES-GCM-decrypt → accessKey.
4. Feed accessKey into the EXISTING login path (identical to handleSubmit):
     POST /api/v2/auth/login → userId → deriveMasterKey → storeSessionKey →
     redirect /manage/files.
5. On any failure (cancel, PRF mismatch, decrypt error) → fall back to the
   access-key text field. On repeated decrypt failure, clearBiometric() and tell
   the user to re-enroll.
```

---

## 5. The security upgrade (worth stating)

Today `storeSessionKey()` writes the raw master key to `localStorage`
(`hpsk_e2e_master`) in **plaintext** — readable by anyone with device/JS access.
This feature doesn't remove that, but it removes the need to *re-enter the access
key* and gives the option to gate the account secret behind a biometric. A v1.1
could additionally wrap `hpsk_e2e_master` with the same PRF key so the at-rest
master key stops being plaintext (out of scope here; noted).

---

## 6. Integration points (exact)

| File | Change |
|------|--------|
| `lib/security/biometric.ts` | **New.** The module in §2. |
| `app/signin/page.tsx:33-62` | Add "Unlock with biometrics" button (shown when `isBiometricEnrolled()`); on success run the same steps as `handleSubmit` using the recovered key. After a manual login, offer "Enable biometric unlock on this device?" → `enrollBiometric(accessKey)`. |
| `app/new/page.tsx:61-73` | After registration succeeds, offer the same enroll prompt (access key is in scope there). |
| `components/preferences-modal.tsx` | Add a toggle: on → `enrollBiometric` (needs the access key, so gate behind a re-entry field or only enable right after login); off → `clearBiometric`. |
| `hooks/useAuth.tsx:69-80` (`logout`) | **Decision needed.** Recommended: do **not** clear the vault on normal logout (it's a device convenience). Provide explicit removal via the preferences toggle instead. |

No server files change in v1.

---

## 7. Fallback matrix

| Environment | Behaviour |
|-------------|-----------|
| Chrome / Edge / Android (platform authenticator + PRF) | Full support. |
| Safari + iOS/macOS **18+** | Full support (real Face ID / Touch ID). |
| iOS/Safari **< 18**, or PRF absent | `enrollBiometric` returns false after the create+get probe; UI never shows the unlock button; access-key entry only. |
| No platform authenticator (many desktops) | `isBiometricSupported()` false; access-key entry only. |
| Enrolled elsewhere, not this device | No local `hpsk_bio_v1`; access-key entry only (v1 is single-device). |
| User cancels the biometric prompt | Silent fall back to the access-key field. |

Access-key entry is **always** present as the ground-truth path. Biometric
unlock is strictly additive.

---

## 8. Decisions (locked for v1)

1. **Logout keeps the vault.** Biometric unlock is a device convenience; removal
   is an explicit action in Preferences → Security. Logout does not wipe it.
2. **Multi-device deferred.** v1 is client-only, single-device. Server-synced
   inert blob is a future v2.
3. **Synced passkeys allowed.** `residentKey: "preferred"`, platform attachment;
   we don't fight iCloud/Google sync — it's the user's own keychain.
4. **Master-key hardening deferred.** PRF-wrapping `hpsk_e2e_master` would force a
   biometric prompt on every profile read (bad UX), so it stays out of v1.

---

## 9. Explicitly out of scope

- Any server-side WebAuthn registration/verification.
- Replacing the access key as the root identity — it stays the ultimate backup
  and the only recovery path (consistent with "no recovery, that's the point").
- Passkey-based *account recovery*. This is unlock convenience, not recovery.

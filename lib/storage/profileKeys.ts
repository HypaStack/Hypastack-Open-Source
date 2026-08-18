// Avatar/banner keys live under an opaque storageToken namespace, not the raw
// user id, so public URLs never reveal the account. Legacy raw-id keys still validate.

export function isOwnProfileKey(
  key: string | null | undefined,
  userId: string,
  storageToken: string | null,
): boolean {
  if (!key) return false
  if (storageToken && key.startsWith(`profiles/${storageToken}/`)) return true
  return key.startsWith(`profiles/${userId}/`) // legacy fallback
}

// True only for the opaque token namespace, used where a legacy (id-bearing)
// key must NOT be exposed publicly, e.g. the anonymous download page.
export function isTokenProfileKey(key: string | null | undefined, storageToken: string | null): boolean {
  if (!key || !storageToken) return false
  return key.startsWith(`profiles/${storageToken}/`)
}

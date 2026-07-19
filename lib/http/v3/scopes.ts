/** The six things a v3 key can be granted. Closed set. */
export const V3_SCOPES = [
  "files.read",
  "files.write",
  "files.delete",
  "cdn.read",
  "cdn.write",
  "cdn.delete",
] as const

export type V3Scope = (typeof V3_SCOPES)[number]

export function isV3Scope(value: string): value is V3Scope {
  return (V3_SCOPES as readonly string[]).includes(value)
}

/** Keeps unknown strings out of the DB when a key is created. */
export function parseScopes(input: unknown): V3Scope[] | null {
  if (!Array.isArray(input) || input.length === 0) return null
  const out: V3Scope[] = []
  for (const raw of input) {
    if (typeof raw !== "string" || !isV3Scope(raw)) return null
    if (!out.includes(raw)) out.push(raw)
  }
  return out
}

export function hasScope(granted: readonly string[], required: V3Scope): boolean {
  return granted.includes(required)
}

/** Human label for the Developer tab. */
export const V3_SCOPE_LABELS: Record<V3Scope, string> = {
  "files.read": "Read files",
  "files.write": "Upload files",
  "files.delete": "Delete files",
  "cdn.read": "Read CDN assets",
  "cdn.write": "Upload and swap CDN assets",
  "cdn.delete": "Delete CDN assets",
}

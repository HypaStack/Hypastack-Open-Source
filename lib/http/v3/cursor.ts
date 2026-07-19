/**
 * Opaque list cursors. Encodes the last row's sort position so the next page
 * resumes exactly where the previous one ended, even if rows are inserted in
 * between — which is why v3 never paginates by offset.
 *
 * The payload is base64url'd rather than signed: it holds a timestamp and an id
 * the caller already saw in the response, so there is nothing to protect. A
 * tampered cursor can only move the caller around their *own* result set, since
 * every list query is scoped by user id regardless of what the cursor says.
 */
export interface Cursor {
  /** Sort key of the last row on the previous page (epoch ms). */
  ts: number
  /** Tiebreaker for rows sharing a timestamp. */
  id: string
}

export const DEFAULT_LIMIT = 50
export const MAX_LIMIT = 100

export function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.ts}:${c.id}`).toString("base64url")
}

export function decodeCursor(raw: string): Cursor | null {
  try {
    const decoded = Buffer.from(raw, "base64url").toString()
    const sep = decoded.indexOf(":")
    if (sep <= 0) return null
    const ts = Number(decoded.slice(0, sep))
    const id = decoded.slice(sep + 1)
    if (!Number.isFinite(ts) || ts < 0 || !id) return null
    return { ts, id }
  } catch {
    return null
  }
}

/** Clamp a caller-supplied `limit` into range. Absent or junk falls to default. */
export function parseLimit(raw: string | null): number {
  if (raw === null || raw === "") return DEFAULT_LIMIT
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1) return DEFAULT_LIMIT
  return Math.min(n, MAX_LIMIT)
}

/**
 * Build a list response. Callers fetch `limit + 1` rows; the extra row is the
 * has-more probe and is dropped from the payload.
 */
export function buildPage<T>(
  rows: T[],
  limit: number,
  toCursor: (row: T) => Cursor,
): { data: T[]; has_more: boolean; next_cursor: string | null } {
  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows
  return {
    data,
    has_more: hasMore,
    next_cursor: hasMore && data.length > 0 ? encodeCursor(toCursor(data[data.length - 1])) : null,
  }
}

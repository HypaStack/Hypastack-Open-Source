/**
 * Display formatters shared across the app. One copy each — don't fork these
 * into page-local helpers.
 */

const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"]

/** Byte count as a human-readable size, e.g. "1.5 MB". */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + SIZE_UNITS[i]
}

/** Short date, e.g. "Mar 4, 2026". */
export function formatDate(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/** Coarse relative time, e.g. "5m ago". Tops out at months. */
export function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

// Address matching for the owner allowlist. Exact string comparison isn't
// enough: a dual-stack client usually arrives over IPv6, and IPv6 rotates its
// interface id, so the allowlist needs prefixes (2a02:db8:1:2::/64) as well as
// plain addresses.

/** Address to bytes, 4 for v4 and 16 for v6. Null if it isn't an address at all. */
function toBytes(ip: string): number[] | null {
  const value = ip.trim().toLowerCase()

  // ::ffff:1.2.3.4 is IPv4 wearing an IPv6 hat, treat it as the v4 address so
  // it still matches a plain v4 entry.
  const mapped = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)
  const target = mapped ? mapped[1] : value

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(target)) {
    const parts = target.split(".").map(Number)
    return parts.every((n) => n >= 0 && n <= 255) ? parts : null
  }

  if (!target.includes(":")) return null

  const halves = target.split("::")
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(":") : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : []

  let groups: string[]
  if (halves.length === 2) {
    const fill = 8 - head.length - tail.length
    if (fill < 0) return null
    groups = [...head, ...Array(fill).fill("0"), ...tail]
  } else {
    groups = head
  }
  if (groups.length !== 8) return null

  const bytes: number[] = []
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null
    const n = parseInt(group, 16)
    bytes.push((n >> 8) & 0xff, n & 0xff)
  }
  return bytes
}

/**
 * True when `ip` is the allowlist `entry`, or falls inside it when the entry
 * carries a prefix length. A v4 address never matches a v6 entry or vice versa.
 */
export function ipMatchesEntry(ip: string, entry: string): boolean {
  const [base, prefix] = entry.trim().split("/")
  const ipBytes = toBytes(ip)
  const baseBytes = toBytes(base)
  if (!ipBytes || !baseBytes || ipBytes.length !== baseBytes.length) return false

  const bits = prefix === undefined ? ipBytes.length * 8 : Number(prefix)
  if (!Number.isInteger(bits) || bits < 0 || bits > ipBytes.length * 8) return false

  const wholeBytes = bits >> 3
  for (let i = 0; i < wholeBytes; i++) {
    if (ipBytes[i] !== baseBytes[i]) return false
  }
  const spare = bits & 7
  if (spare) {
    const mask = (0xff << (8 - spare)) & 0xff
    if ((ipBytes[wholeBytes] & mask) !== (baseBytes[wholeBytes] & mask)) return false
  }
  return true
}

export function ipMatchesAny(ip: string, entries: string[]): boolean {
  return entries.some((entry) => ipMatchesEntry(ip, entry))
}

// Escapes "<" and the U+2028/U+2029 line separators before embedding in a
// <script type="application/ld+json">, plain JSON.stringify doesn't and a
// "</script>" in user-controlled data would break out of the tag (stored XSS).
const JSONLD_UNSAFE = new RegExp("[<>&\\u2028\\u2029]", "g")

export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(
    JSONLD_UNSAFE,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
  )
}

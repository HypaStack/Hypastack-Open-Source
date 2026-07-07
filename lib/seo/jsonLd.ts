/**
 * Serialize an object for embedding inside a <script type="application/ld+json">.
 *
 * Plain JSON.stringify does NOT escape "<", so a value containing "</script>"
 * (or the U+2028/U+2029 line separators) could break out of the script tag —
 * a stored-XSS vector the moment any user-controlled field lands in JSON-LD.
 * This escapes those characters so the block is safe regardless of its inputs.
 */
const JSONLD_UNSAFE = new RegExp("[<>&\\u2028\\u2029]", "g")

export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(
    JSONLD_UNSAFE,
    (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"),
  )
}

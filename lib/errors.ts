// Narrow an unknown catch value to a human-readable message.
export function errorMessage(e: unknown, fallback = "Something went wrong"): string {
  if (e instanceof Error && e.message) return e.message
  if (typeof e === "string" && e) return e
  return fallback
}

// Machine-readable code carried by pg errors ("23505") and node syscall errors
// ("ECONNREFUSED"); undefined for anything else.
export function errorCode(e: unknown): string | undefined {
  const code = (e as { code?: unknown } | null | undefined)?.code
  return typeof code === "string" ? code : undefined
}

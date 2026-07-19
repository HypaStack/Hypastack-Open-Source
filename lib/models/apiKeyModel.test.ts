import { describe, it, expect } from "vitest"
import { generateApiKey, keyHint, KEY_PREFIX } from "./apiKeyModel"
import { computeKeyLookup } from "@/lib/security/auth"

describe("api key generation", () => {
  it("carries the hsk_ prefix so a leaked key is greppable", () => {
    expect(generateApiKey().startsWith(KEY_PREFIX)).toBe(true)
  })

  it("is unique across many draws", () => {
    const seen = new Set(Array.from({ length: 500 }, () => generateApiKey()))
    expect(seen.size).toBe(500)
  })

  it("carries enough entropy to make the plain SHA-256 lookup safe", () => {
    // 32 random bytes → 43 base64url chars. If this shrinks, the decision to
    // skip PBKDF2 on the lookup column stops being justified.
    const body = generateApiKey().slice(KEY_PREFIX.length)
    expect(body.length).toBeGreaterThanOrEqual(43)
    expect(body).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it("hints only the first 8 characters after the prefix", () => {
    const key = generateApiKey()
    const hint = keyHint(key)
    expect(hint).toHaveLength(KEY_PREFIX.length + 8)
    expect(key.startsWith(hint)).toBe(true)
    // The hint must never be enough to reconstruct the key.
    expect(hint.length).toBeLessThan(key.length / 2)
  })
})

describe("key lookup", () => {
  it("is deterministic for the same key", () => {
    const key = generateApiKey()
    expect(computeKeyLookup(key)).toBe(computeKeyLookup(key))
  })

  it("differs for different keys", () => {
    expect(computeKeyLookup(generateApiKey())).not.toBe(computeKeyLookup(generateApiKey()))
  })

  it("never returns the key itself", () => {
    const key = generateApiKey()
    const lookup = computeKeyLookup(key)
    expect(lookup).not.toContain(key.slice(KEY_PREFIX.length))
    expect(lookup).toMatch(/^[a-f0-9]{64}$/)
  })
})

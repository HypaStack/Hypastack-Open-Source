import { describe, it, expect } from "vitest"
import { V3_CODES, V3_STATUS, V3_MESSAGE, type V3Code } from "./codes"
import { parseScopes, hasScope, isV3Scope, V3_SCOPES } from "./scopes"
import { encodeCursor, decodeCursor, parseLimit, buildPage, DEFAULT_LIMIT, MAX_LIMIT } from "./cursor"
import { limitForTier } from "./limit"

describe("error catalogue", () => {
  it("gives every code a status and a message", () => {
    for (const code of Object.values(V3_CODES)) {
      expect(V3_STATUS[code], `status for ${code}`).toBeGreaterThan(0)
      expect(V3_MESSAGE[code], `message for ${code}`).toBeTruthy()
    }
  })

  it("keeps the catalogue closed at twelve codes", () => {
    expect(Object.keys(V3_STATUS)).toHaveLength(12)
    expect(Object.keys(V3_MESSAGE)).toHaveLength(12)
  })

  it("never names the owner in the not_found message", () => {
    // The ambiguity between "never existed" and "not yours" is the security
    // property — wording that hints at ownership would undo it.
    const msg = V3_MESSAGE.not_found.toLowerCase()
    expect(msg).not.toContain("owner")
    expect(msg).not.toContain("permission")
    expect(msg).not.toContain("belongs")
  })

  it("maps auth failures to 401 and authorisation failures to 403", () => {
    expect(V3_STATUS[V3_CODES.MISSING_KEY]).toBe(401)
    expect(V3_STATUS[V3_CODES.INVALID_KEY]).toBe(401)
    expect(V3_STATUS[V3_CODES.INSUFFICIENT_SCOPE]).toBe(403)
    expect(V3_STATUS[V3_CODES.PLAN_REQUIRED]).toBe(403)
    expect(V3_STATUS[V3_CODES.KEY_LIMIT_EXCEEDED]).toBe(403)
    expect(V3_STATUS[V3_CODES.NOT_FOUND]).toBe(404)
  })
})

describe("scopes", () => {
  it("accepts exactly the six documented scopes", () => {
    expect(V3_SCOPES).toHaveLength(6)
    for (const s of V3_SCOPES) expect(isV3Scope(s)).toBe(true)
  })

  it("rejects unknown, empty and non-string scope lists", () => {
    expect(parseScopes(["files.read", "files.admin"])).toBeNull()
    expect(parseScopes([])).toBeNull()
    expect(parseScopes(["files.read", 7])).toBeNull()
    expect(parseScopes("files.read")).toBeNull()
    expect(parseScopes(null)).toBeNull()
  })

  it("dedupes a valid list", () => {
    expect(parseScopes(["files.read", "files.read", "cdn.read"])).toEqual(["files.read", "cdn.read"])
  })

  it("grants only what was asked for", () => {
    const granted = ["files.read", "cdn.read"]
    expect(hasScope(granted, "files.read")).toBe(true)
    expect(hasScope(granted, "files.delete")).toBe(false)
    // read must never imply write
    expect(hasScope(["files.read"], "files.write")).toBe(false)
    // and write must never imply delete
    expect(hasScope(["files.write"], "files.delete")).toBe(false)
    expect(hasScope(["cdn.write"], "cdn.delete")).toBe(false)
  })
})

describe("cursors", () => {
  it("round-trips", () => {
    const c = { ts: 1770000000000, id: "abc123xyz" }
    expect(decodeCursor(encodeCursor(c))).toEqual(c)
  })

  it("survives ids containing a colon", () => {
    const c = { ts: 1, id: "a:b:c" }
    expect(decodeCursor(encodeCursor(c))).toEqual(c)
  })

  it("returns null on junk rather than throwing", () => {
    expect(decodeCursor("not-base64!!")).toBeNull()
    expect(decodeCursor("")).toBeNull()
    expect(decodeCursor(Buffer.from("noseparator").toString("base64url"))).toBeNull()
    expect(decodeCursor(Buffer.from("abc:xyz").toString("base64url"))).toBeNull()
    expect(decodeCursor(Buffer.from("123:").toString("base64url"))).toBeNull()
  })
})

describe("limit parsing", () => {
  it("defaults when absent or junk", () => {
    expect(parseLimit(null)).toBe(DEFAULT_LIMIT)
    expect(parseLimit("")).toBe(DEFAULT_LIMIT)
    expect(parseLimit("abc")).toBe(DEFAULT_LIMIT)
    expect(parseLimit("0")).toBe(DEFAULT_LIMIT)
    expect(parseLimit("-5")).toBe(DEFAULT_LIMIT)
    expect(parseLimit("1.5")).toBe(DEFAULT_LIMIT)
  })

  it("clamps to the maximum", () => {
    expect(parseLimit("1000")).toBe(MAX_LIMIT)
    expect(parseLimit("100")).toBe(MAX_LIMIT)
    expect(parseLimit("25")).toBe(25)
  })
})

describe("pagination", () => {
  const toCursor = (r: { id: string; ts: number }) => ({ ts: r.ts, id: r.id })
  const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `id${i}`, ts: i }))

  it("reports no more when the probe row is absent", () => {
    const page = buildPage(rows(3), 5, toCursor)
    expect(page.data).toHaveLength(3)
    expect(page.has_more).toBe(false)
    expect(page.next_cursor).toBeNull()
  })

  it("drops the probe row and emits a cursor when there is more", () => {
    const page = buildPage(rows(6), 5, toCursor)
    expect(page.data).toHaveLength(5)
    expect(page.has_more).toBe(true)
    expect(decodeCursor(page.next_cursor!)).toEqual({ ts: 4, id: "id4" })
  })

  it("handles an empty result", () => {
    const page = buildPage([], 5, toCursor)
    expect(page.data).toEqual([])
    expect(page.has_more).toBe(false)
    expect(page.next_cursor).toBeNull()
  })
})

describe("tier budgets", () => {
  it("matches the documented numbers", () => {
    expect(limitForTier("free")).toBe(0)
    expect(limitForTier("essential")).toBe(120)
    expect(limitForTier("premium")).toBe(600)
    expect(limitForTier("ultimate")).toBe(1800)
  })
})

describe("code type", () => {
  it("keeps V3Code assignable from the const map", () => {
    const code: V3Code = V3_CODES.NOT_FOUND
    expect(code).toBe("not_found")
  })
})

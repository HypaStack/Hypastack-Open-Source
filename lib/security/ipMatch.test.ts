import { describe, it, expect } from "vitest"
import { ipMatchesEntry, ipMatchesAny } from "./ipMatch"

describe("ipMatchesEntry", () => {
  it("matches an exact v4 address", () => {
    expect(ipMatchesEntry("89.228.233.88", "89.228.233.88")).toBe(true)
    expect(ipMatchesEntry("89.228.233.89", "89.228.233.88")).toBe(false)
  })

  it("treats an ipv4-mapped v6 address as its v4 form", () => {
    expect(ipMatchesEntry("::ffff:89.228.233.88", "89.228.233.88")).toBe(true)
  })

  it("never matches a v6 client against a v4 entry", () => {
    expect(ipMatchesEntry("2a02:a31b:843f:1c80::5", "89.228.233.88")).toBe(false)
  })

  it("matches a rotating v6 address inside its /64", () => {
    const entry = "2a02:a31b:843f:1c80::/64"
    expect(ipMatchesEntry("2a02:a31b:843f:1c80:1111:2222:3333:4444", entry)).toBe(true)
    expect(ipMatchesEntry("2a02:a31b:843f:1c80:aaaa:bbbb:cccc:dddd", entry)).toBe(true)
    expect(ipMatchesEntry("2a02:a31b:843f:1c81::1", entry)).toBe(false)
  })

  it("handles v4 cidr including non byte aligned prefixes", () => {
    expect(ipMatchesEntry("37.47.157.121", "37.47.157.0/24")).toBe(true)
    expect(ipMatchesEntry("37.47.158.121", "37.47.157.0/24")).toBe(false)
    expect(ipMatchesEntry("37.47.157.121", "37.47.157.64/26")).toBe(true)
    expect(ipMatchesEntry("37.47.157.10", "37.47.157.64/26")).toBe(false)
  })

  it("rejects junk instead of matching it", () => {
    expect(ipMatchesEntry("unknown", "89.228.233.88")).toBe(false)
    expect(ipMatchesEntry("89.228.233.88", "not-an-ip")).toBe(false)
    expect(ipMatchesEntry("999.1.1.1", "999.1.1.1")).toBe(false)
    expect(ipMatchesEntry("89.228.233.88", "89.228.233.88/33")).toBe(false)
  })

  it("checks every entry in the list", () => {
    const list = ["89.228.233.88", "2a02:a31b:843f:1c80::/64"]
    expect(ipMatchesAny("2a02:a31b:843f:1c80::9", list)).toBe(true)
    expect(ipMatchesAny("1.2.3.4", list)).toBe(false)
  })
})

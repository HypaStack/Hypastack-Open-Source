import { describe, it, expect } from "vitest"
import { buildUploadEmbeds, chunkEmbeds, type UploadEntry, type UploadMeta } from "./discordWebhook"

const NOW = Date.UTC(2026, 7, 23, 12, 0, 0)
const META: UploadMeta = { expirationMinutes: 60, burnOnRead: false }

function upload(over: Partial<UploadEntry> = {}): UploadEntry {
  return { link: "https://hypastack.com/f/abc123", name: "tax-return-2025.pdf", size: 4_404_019, ...over }
}

function fieldValue(fields: { name: string; value: string }[], name: string): string | undefined {
  return fields.find((f) => f.name === name)?.value
}

describe("buildUploadEmbeds", () => {
  it("keeps the filename out of the payload entirely when not opted in", () => {
    const [embed] = buildUploadEmbeds([upload()], META, false, NOW)
    expect(embed.title).toBe("New Hypastack upload")
    expect(JSON.stringify(embed)).not.toContain("tax-return-2025")
  })

  it("titles the embed with the filename once opted in", () => {
    const [embed] = buildUploadEmbeds([upload()], META, true, NOW)
    expect(embed.title).toBe("tax-return-2025.pdf")
  })

  it("truncates a filename past Discord's title cap", () => {
    const [embed] = buildUploadEmbeds([upload({ name: "x".repeat(400) })], META, true, NOW)
    expect(embed.title).toHaveLength(256)
    expect(embed.title.endsWith("…")).toBe(true)
  })

  it("strips the key fragment whether or not filenames are on", () => {
    const link = "https://hypastack.com/f/abc123#s3cr3t-decryption-key"
    for (const includeFilenames of [false, true]) {
      const [embed] = buildUploadEmbeds([upload({ link })], META, includeFilenames, NOW)
      expect(embed.url).toBe("https://hypastack.com/f/abc123")
      expect(JSON.stringify(embed)).not.toContain("s3cr3t")
    }
  })

  it("formats sizes across unit boundaries", () => {
    const sizes = [0, 900, 1024, 4_404_019, 1024 ** 3]
    const embeds = buildUploadEmbeds(sizes.map((size) => upload({ size })), META, false, NOW)
    expect(embeds.map((e) => fieldValue(e.fields, "Size"))).toEqual(["0 B", "900 B", "1 KB", "4.2 MB", "1 GB"])
  })

  it("omits Size when the file behind a link is unknown", () => {
    const [embed] = buildUploadEmbeds([upload({ name: "", size: Number.NaN })], META, true, NOW)
    expect(fieldValue(embed.fields, "Size")).toBeUndefined()
    expect(embed.title).toBe("New Hypastack upload")
  })

  it("derives Expires from expirationMinutes as a relative timestamp", () => {
    const [embed] = buildUploadEmbeds([upload()], { expirationMinutes: 1440, burnOnRead: false }, false, NOW)
    expect(fieldValue(embed.fields, "Expires")).toBe(`<t:${NOW / 1000 + 86_400}:R>`)
  })

  it("says Never for a permanent upload, e.g. a CDN asset", () => {
    const [embed] = buildUploadEmbeds([upload()], { expirationMinutes: null, burnOnRead: false }, false, NOW)
    expect(fieldValue(embed.fields, "Expires")).toBe("Never")
  })

  // "Never" and "we couldn't work it out" are different claims; only the second
  // is allowed to go unstated.
  it("omits Expires when the expiry is unknown rather than absent", () => {
    for (const expirationMinutes of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const [embed] = buildUploadEmbeds([upload()], { expirationMinutes, burnOnRead: false }, false, NOW)
      expect(fieldValue(embed.fields, "Expires")).toBeUndefined()
    }
  })

  it("shows Burn on read only when it is set", () => {
    const off = buildUploadEmbeds([upload()], { ...META, burnOnRead: false }, false, NOW)[0]
    const on = buildUploadEmbeds([upload()], { ...META, burnOnRead: true }, false, NOW)[0]
    expect(fieldValue(off.fields, "Burn on read")).toBeUndefined()
    expect(fieldValue(on.fields, "Burn on read")).toBe("Yes")
  })
})

describe("chunkEmbeds", () => {
  const build = (n: number) =>
    buildUploadEmbeds(
      Array.from({ length: n }, (_, i) => upload({ link: `https://hypastack.com/f/file${i}` })),
      META,
      false,
      NOW,
    )

  it("keeps a full ten in one message", () => {
    expect(chunkEmbeds(build(10)).map((c) => c.length)).toEqual([10])
  })

  it("splits the moment the cap is exceeded", () => {
    expect(chunkEmbeds(build(11)).map((c) => c.length)).toEqual([10, 1])
    expect(chunkEmbeds(build(25)).map((c) => c.length)).toEqual([10, 10, 5])
  })

  it("loses no embed and preserves order across the split", () => {
    const embeds = build(23)
    const flat = chunkEmbeds(embeds).flat()
    expect(flat).toEqual(embeds)
  })

  it("produces nothing for an empty batch", () => {
    expect(chunkEmbeds([])).toEqual([])
  })
})

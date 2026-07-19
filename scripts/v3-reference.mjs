#!/usr/bin/env node
/**
 * Hypastack v3 API — runnable reference.
 *
 * Walks the whole surface end to end and prints every request and response, so
 * it doubles as a smoke test and as the worked example the docs will be built
 * from.
 *
 *   HYPASTACK_API_KEY=hsk_... node scripts/v3-reference.mjs
 *   HYPASTACK_API_KEY=hsk_... V3_BASE=https://api.hypastack.com/v3 node scripts/v3-reference.mjs
 *
 * The key is read from the environment on purpose — never paste one into a file
 * that gets committed.
 *
 * It creates a file and a CDN asset, then deletes both on the way out. Nothing
 * it makes is meant to survive the run.
 */

const BASE = process.env.V3_BASE ?? "http://localhost:3000/api/v3"
const KEY = process.env.HYPASTACK_API_KEY

if (!KEY) {
  console.error("Set HYPASTACK_API_KEY first:\n  HYPASTACK_API_KEY=hsk_... node scripts/v3-reference.mjs")
  process.exit(1)
}

const dim = (s) => `\x1b[2m${s}\x1b[0m`
const bold = (s) => `\x1b[1m${s}\x1b[0m`
const green = (s) => `\x1b[32m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`
const cyan = (s) => `\x1b[36m${s}\x1b[0m`

let passed = 0
let failed = 0

/**
 * Every v3 call goes through here. Two things worth copying into your own
 * client: the key travels as a bearer token, and the budget is echoed on every
 * response so you can back off before you get a 429 rather than after.
 */
async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${KEY}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const text = await res.text()
  let json
  try { json = text ? JSON.parse(text) : null } catch { json = { raw: text.slice(0, 200) } }

  const remaining = res.headers.get("x-ratelimit-remaining")
  const limit = res.headers.get("x-ratelimit-limit")
  const reqId = res.headers.get("x-request-id")

  console.log(
    `  ${cyan(method.padEnd(6))} ${path.padEnd(42)} ${res.ok ? green(res.status) : red(res.status)}` +
    dim(`  ${remaining ?? "-"}/${limit ?? "-"} left  ${reqId ?? ""}`),
  )

  return { status: res.status, json, headers: res.headers }
}

function check(label, condition, detail) {
  if (condition) {
    passed++
    console.log(`  ${green("PASS")} ${label}`)
  } else {
    failed++
    console.log(`  ${red("FAIL")} ${label}${detail ? dim(` — ${detail}`) : ""}`)
  }
}

function section(title) {
  console.log(`\n${bold(title)}`)
}

/** Upload flow, both resources: init → PUT the bytes to R2 → complete. */
async function putBytes(uploadUrl, bytes, contentType) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: bytes,
  })
  console.log(`  ${cyan("PUT   ")} ${dim("<presigned R2 url>".padEnd(42))} ${res.ok ? green(res.status) : red(res.status)}`)
  return res.ok
}

async function main() {
  console.log(bold(`\nHypastack v3 reference  ${dim(BASE)}`))

  section("Auth")
  const noKey = await fetch(`${BASE}/files`).then(r => r.json().then(j => ({ s: r.status, j })))
  check("no key returns 401 missing_key", noKey.s === 401 && noKey.j?.error?.code === "missing_key", noKey.j?.error?.code)

  const badKey = await fetch(`${BASE}/files`, { headers: { authorization: "Bearer hsk_totally-made-up" } })
    .then(r => r.json().then(j => ({ s: r.status, j })))
  check("bad key returns 401 invalid_key", badKey.s === 401 && badKey.j?.error?.code === "invalid_key", badKey.j?.error?.code)

  section("Files — list")
  const list = await call("GET", "/files?limit=5")
  check("list returns a data array", Array.isArray(list.json?.data), JSON.stringify(list.json)?.slice(0, 120))
  check("list reports has_more", typeof list.json?.has_more === "boolean")
  check("budget headers present", list.headers.get("x-ratelimit-limit") !== null)

  section("Files — upload")
  const content = Buffer.from(`hypastack v3 reference — ${new Date().toISOString()}\n`)
  const init = await call("POST", "/files", {
    name: "v3-reference.txt",
    size: content.length,
    content_type: "text/plain",
    expires_in: 3600,
  })
  check("init returns 201 with an upload_url", init.status === 201 && !!init.json?.upload_url, init.json?.error?.code)

  let fileId = init.json?.id
  if (init.json?.upload_url) {
    const ok = await putBytes(init.json.upload_url, content, "text/plain")
    check("bytes reach R2", ok)

    const done = await call("POST", `/files/${fileId}/complete`)
    check("complete returns the file", done.json?.object === "file", done.json?.error?.code)
    check("size round-trips", done.json?.size === content.length)

    const again = await call("POST", `/files/${fileId}/complete`)
    check("complete is idempotent", again.status === 200 && again.json?.id === fileId)
  }

  section("Files — read")
  if (fileId) {
    const one = await call("GET", `/files/${fileId}`)
    check("retrieve by id", one.json?.id === fileId)
    check("no internal fields leak", !("r2_key" in (one.json ?? {})) && !("user_id" in (one.json ?? {})))

    const dl = await call("GET", `/files/${fileId}/download`)
    check("download returns a url, not a redirect", typeof dl.json?.download_url === "string")

    if (dl.json?.download_url) {
      const fetched = await fetch(dl.json.download_url).then(r => r.text())
      check("downloaded bytes match what we uploaded", fetched === content.toString())
    }
  }

  section("Errors")
  const missing = await call("GET", "/files/definitely-not-a-real-id")
  check("unknown id returns 404 not_found", missing.status === 404 && missing.json?.error?.code === "not_found")
  check("404 message reveals nothing about ownership",
    !/own|permission|belong/i.test(missing.json?.error?.message ?? ""))

  const bad = await call("POST", "/files", { name: "x", size: -5, content_type: "text/plain" })
  check("invalid body returns 400 invalid_request", bad.status === 400 && bad.json?.error?.code === "invalid_request")
  check("400 names the offending param", typeof bad.json?.error?.param === "string", bad.json?.error?.param)

  const badCursor = await call("GET", "/files?cursor=not-a-cursor")
  check("bad cursor is rejected", badCursor.status === 400 && badCursor.json?.error?.param === "cursor")

  section("CDN")
  const cdnList = await call("GET", "/cdn/assets?limit=5")
  check("cdn list returns data", Array.isArray(cdnList.json?.data), cdnList.json?.error?.code)

  const img = Buffer.from(`/* v3 reference asset */\nbody{color:#000}\n`)
  const cdnInit = await call("POST", "/cdn/assets", {
    name: "v3-reference.css",
    size: img.length,
    content_type: "text/css",
  })
  check("cdn init returns an upload_url", cdnInit.status === 201 && !!cdnInit.json?.upload_url, cdnInit.json?.error?.code)

  let assetId = cdnInit.json?.id
  if (cdnInit.json?.upload_url) {
    await putBytes(cdnInit.json.upload_url, img, "text/css")
    const cdnDone = await call("POST", `/cdn/assets/${assetId}/complete`)
    check("cdn complete returns the asset", cdnDone.json?.object === "cdn_asset", cdnDone.json?.error?.code)
    check("asset has a public url", typeof cdnDone.json?.url === "string")

    const bigger = Buffer.from(`/* v3 reference asset, swapped */\nbody{color:#fff;background:#000}\n`)
    const swap = await call("POST", `/cdn/assets/${assetId}/swap`, { size: bigger.length, content_type: "text/css" })
    check("swap returns an upload_url", !!swap.json?.upload_url, swap.json?.error?.code)

    if (swap.json?.upload_url) {
      await putBytes(swap.json.upload_url, bigger, "text/css")
      const swapped = await call("POST", `/cdn/assets/${assetId}/complete`)
      check("swap keeps the same id and url", swapped.json?.id === assetId)
      check("swap updates the size", swapped.json?.size === bigger.length, `${swapped.json?.size} vs ${bigger.length}`)
    }
  }

  section("Cleanup")
  if (fileId) {
    const del = await call("DELETE", `/files/${fileId}`)
    check("file deleted", del.json?.deleted === true, del.json?.error?.code)
    const gone = await call("GET", `/files/${fileId}`)
    check("deleted file is gone", gone.status === 404)
  }
  if (assetId) {
    const del = await call("DELETE", `/cdn/assets/${assetId}`)
    check("cdn asset deleted", del.json?.deleted === true, del.json?.error?.code)
  }

  console.log(`\n${bold("Result")}  ${green(`${passed} passed`)}  ${failed ? red(`${failed} failed`) : dim("0 failed")}\n`)
  process.exit(failed ? 1 : 0)
}

main().catch((err) => {
  console.error(red(`\nScript crashed: ${err.message}`))
  console.error(dim("Is the dev server running?  npm run dev"))
  process.exit(1)
})

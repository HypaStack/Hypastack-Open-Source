#!/usr/bin/env node
// Hypastack v3 reference client. No deps, copy whatever you need.
//   HYPASTACK_API_KEY=hsk_... node v3-reference.mjs
// Point elsewhere with V3_BASE (defaults to production):
//   V3_BASE=http://localhost:3000/api/v3 node v3-reference.mjs

const BASE = process.env.V3_BASE ?? "https://api.hypastack.com/v3"
const KEY = process.env.HYPASTACK_API_KEY

if (!KEY) {
  console.error("Set HYPASTACK_API_KEY first.")
  process.exit(1)
}

// Key goes in the Authorization header, remaining budget comes back on every response.
async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${KEY}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    // switch on error.code, never on message
    const err = new Error(data?.error?.message ?? `HTTP ${res.status}`)
    err.code = data?.error?.code
    err.status = res.status
    err.requestId = data?.error?.request_id
    err.retryAfter = Number(res.headers.get("retry-after")) || null
    throw err
  }

  return {
    data,
    remaining: Number(res.headers.get("x-ratelimit-remaining")),
    limit: Number(res.headers.get("x-ratelimit-limit")),
  }
}

// only these two are ever worth retrying
async function apiWithRetry(method, path, body, attempts = 3) {
  for (let i = 1; ; i++) {
    try {
      return await api(method, path, body)
    } catch (err) {
      const retryable = err.code === "rate_limit_exceeded" || err.code === "server_busy"
      if (!retryable || i >= attempts) throw err
      const wait = (err.retryAfter ?? 2 ** i) * 1000
      console.log(`  ${err.code} — waiting ${wait / 1000}s`)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
}

// same three steps for files and CDN assets: reserve, PUT the bytes, commit
async function upload(resource, bytes, name, contentType, extra = {}) {
  const { data: init } = await apiWithRetry("POST", `/${resource}`, {
    name,
    size: bytes.length,
    content_type: contentType,
    ...extra,
  })

  const put = await fetch(init.upload_url, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: bytes,
  })
  if (!put.ok) throw new Error(`storage rejected the upload: ${put.status}`)

  const { data } = await apiWithRetry("POST", `/${resource}/${init.id}/complete`)
  return data
}

async function main() {
  // files

  const { data: files, remaining, limit } = await api("GET", "/files?limit=10")
  console.log(`Files: ${files.data.length}${files.has_more ? "+" : ""}   budget ${remaining}/${limit}`)

  // cursor, not offset
  let cursor = files.next_cursor
  while (cursor) {
    const { data: page } = await api("GET", `/files?limit=100&cursor=${cursor}`)
    console.log(`  ...another ${page.data.length}`)
    cursor = page.next_cursor
  }

  const file = await upload(
    "files",
    Buffer.from("hello from the v3 reference\n"),
    "hello.txt",
    "text/plain",
    { expires_in: 3600, burn_on_read: false },
  )
  console.log(`Uploaded ${file.name} (${file.size} bytes) -> ${file.url}`)
  console.log(`  expires ${file.expires_at}`)

  const { data: link } = await api("GET", `/files/${file.id}/download`)
  console.log(`Download URL good until ${link.expires_at}`)
  console.log(`  ${(await fetch(link.download_url).then((r) => r.text())).trim()}`)

  // cdn

  const { data: assets } = await api("GET", "/cdn/assets?limit=10")
  console.log(`CDN assets: ${assets.data.length}${assets.has_more ? "+" : ""}`)

  const asset = await upload(
    "cdn/assets",
    Buffer.from("body{color:#000}\n"),
    "styles.css",
    "text/css",
  )
  console.log(`Published ${asset.name} -> ${asset.url}`)

  // swap keeps the id and url, same link now serves the new bytes
  const next = Buffer.from("body{color:#fff;background:#000}\n")
  const { data: swap } = await api("POST", `/cdn/assets/${asset.id}/swap`, {
    size: next.length,
    content_type: "text/css",
  })
  await fetch(swap.upload_url, { method: "PUT", headers: { "content-type": "text/css" }, body: next })
  const swapped = await api("POST", `/cdn/assets/${asset.id}/complete`)
  console.log(`Swapped in place, same URL, now ${swapped.data.size} bytes`)

  // errors

  try {
    await api("GET", "/files/does-not-exist")
  } catch (err) {
    // 404 either way, doesn't exist or isn't yours
    console.log(`Expected failure: ${err.status} ${err.code} (request ${err.requestId})`)
  }

  // cleanup

  await api("DELETE", `/files/${file.id}`)
  await api("DELETE", `/cdn/assets/${asset.id}`)
  console.log("Cleaned up.")
}

main().catch((err) => {
  console.error(`\n${err.status ?? ""} ${err.code ?? "error"}: ${err.message}`)
  if (err.requestId) console.error(`request id: ${err.requestId}`)
  process.exit(1)
})

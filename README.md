<div align="center">
  <h1>Hypastack</h1>
  <p><strong>Private file sharing &amp; global CDN.</strong><br>Files are encrypted in your browser before upload. No email, no ads, no tracking.</p>
  <p>
    <a href="https://hypastack.com">Website</a>
    ·
    <a href="https://hypastack.com/blog">Blog</a>
    ·
    <a href="https://hypastack.com/forum">Forum</a>
  </p>
  <p>
    <a href="https://hypastack.com">
      <img src="https://img.shields.io/website?url=https%3A%2F%2Fhypastack.com&label=hypastack.com&up_message=online&down_message=offline" alt="Website">
    </a>
    <a href="./LICENSE">
      <img src="https://img.shields.io/badge/license-Reference--Only-lightgrey" alt="License: Reference-Only">
    </a>
    <a href="https://github.com/HypaStack/Hypastack-Open-Source/commits/main">
      <img src="https://img.shields.io/github/last-commit/HypaStack/Hypastack-Open-Source" alt="Last commit">
    </a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Next.js_16-000000?logo=nextdotjs&logoColor=white" alt="Next.js 16">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL">
    <img src="https://img.shields.io/badge/Go-00ADD8?logo=go&logoColor=white" alt="Go">
    <img src="https://img.shields.io/badge/Erlang-A90533?logo=erlang&logoColor=white" alt="Erlang">
    <img src="https://img.shields.io/badge/Tauri_v2-24C8D8?logo=tauri&logoColor=white" alt="Tauri v2">
    <img src="https://img.shields.io/badge/Cloudflare_R2-F38020?logo=cloudflare&logoColor=white" alt="Cloudflare R2">
  </p>
  <img src="https://r2.hypastack.com/cdn/8pnp1fg9kk1f/dashboard.png?=4" alt="The Hypastack dashboard">
</div>

Hypastack is a file sharing site that can't read the files it hosts. Everything you upload is locked inside your browser before it leaves your device, and the key never reaches the server. I run the server, and even I can't open your files. That's the entire idea.

I'm [Kiko](https://usekiko.com), a solo developer in Europe. This code is published so you don't have to take that on faith — you can read it and check.

## Why the code is here

A privacy claim you can't inspect is just marketing. Every file sharing tool says "encrypted" on its homepage. This repo is how you tell whether mine means it.

So the source is readable by anyone, for review. It is **not** open source and you can't run it — see [License](#license) below.

## What it does

- **Share files privately.** Drop a file, get a link. The link carries the only key, and whoever you send it to decrypts it in their browser. When the link expires the file is deleted. Paid plans pick any lifetime from a minute to thirty days.
- **Burn on read.** A file can delete itself right after the first download.
- **Accounts without identity.** Your browser rolls a random key and that key *is* your account. No email, no password. Go inactive and everything wipes itself after a window you choose.
- **Host public images.** The CDN side, for things you *want* public. Public files can't be encrypted, so every image is rebuilt on upload and the metadata your camera left behind is thrown away.
- **The Dumpster.** Anonymous text pastes, destroyed after 180 days of nobody looking.
- **A forum.** A small public corner for sharing files openly.
- **A desktop app.** An early Windows build with a tray icon and right-click upload.

## How the private part works

The locking happens on your machine, before anything is sent. A share link looks like this:

```
hypastack.com/d/abc123#the-key-lives-here
```

Everything after the `#` stays in your browser — browsers never send that part of a URL over the network. The key travels inside the link, from you to the person you trust, without touching the server. The server holds scrambled bytes and no way to unscramble them.

A few decisions made early and never changed:

- IP addresses are never stored. Not in the database, not in logs.
- Nicknames are scrambled in your browser before they're sent.
- Filenames are stored scrambled too.
- No analytics, no tracking cookies, no third-party anything.

## The stack

**Web app.** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4. The internal API is Next route handlers under `/api/v2/`; the public developer API lives at `/api/v3/`. `proxy.ts` handles CSP, maintenance mode and short-lived HMAC proxy tokens.

**Data.** PostgreSQL through `pg`, schema created and migrated on startup. Redis in front as an optional cache, with a Postgres fallback when it's unreachable.

**Storage.** Cloudflare R2 (EU bucket) over the S3 SDK. Uploads go browser → R2 through presigned URLs, so file bytes normally never pass through the app server. Files over 50 MB are chunked, parallelised and resumable.

**The edge.** A Cloudflare Worker (`workers/r2-gateway`) guards the storage domain: `/cdn/*` public and immutable, avatars behind HMAC-signed expiring URLs, everything else blocked. CDN images are re-encoded with Sharp, which is what strips EXIF and GPS.

**Three sidecars.** The Node app is self-sufficient; these take over specific jobs when up, and Node does the work in-process when they're not:

- [`services/hypahash`](./services/hypahash) (Go) — access-key hashing. PBKDF2 at 100k iterations is deliberately slow, which is exactly what you don't want on Node's event loop.
- [`services/hypasan`](./services/hypasan) (Go) — input sanitization, mirroring the Node pipeline so the app never loads DOMPurify's jsdom.
- [`services/hypasched`](./services/hypasched) (Erlang/OTP) — file expiry and burn deletion. One BEAM timer per file in an ETS registry instead of an hourly sweep, reloaded from Postgres after a restart.

**Security mechanics.** AES-256-GCM via Web Crypto, key generated in the browser and carried in the URL fragment. Access keys hashed with PBKDF2-HMAC-SHA512 (100k iterations); a separate AES-GCM master key derived client-side encrypts profile data. Filenames encrypted at rest with their own key. Burn-on-read claims the file with an atomic `SELECT ... FOR UPDATE`. Plus Turnstile, CSRF tokens, Zod on every route, upload content-sniffing, and DOMPurify on anything rendered.

**Desktop.** Tauri v2 — Rust shell, native webview, tray, Explorer right-click upload.

## Security reports

Found a hole? That's the point of publishing this. Go through [SECURITY.md](./SECURITY.md) rather than opening a public issue, and read the license section on disclosure — publishing good-faith findings is explicitly permitted and always will be.

## License

**[HypaLabs License (Reference-Only)](./LICENSE)** — © 2025-2026 HypaLabs. All rights reserved.

This is source-available, not open source. You may read, analyse and audit this code, run it locally only as far as an audit requires, and publish whatever you find.

You may not deploy it, host it, self-host it, run it in production, redistribute or sublicense it, modify it beyond what review requires, use it to work around service limits or tiers, or build a competing product or public instance from it — commercial or otherwise.

The full terms are in [LICENSE](./LICENSE). For anything beyond review, ask: github@hypastack.com.

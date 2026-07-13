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
      <img src="https://img.shields.io/github/license/HypaStack/Hypastack-Open-Source" alt="License">
    </a>
    <a href="https://github.com/HypaStack/Hypastack-Open-Source/commits/main">
      <img src="https://img.shields.io/github/last-commit/HypaStack/Hypastack-Open-Source" alt="Last commit">
    </a>
    <a href="https://github.com/HypaStack/Hypastack-Open-Source/stargazers">
      <img src="https://img.shields.io/github/stars/HypaStack/Hypastack-Open-Source?style=flat" alt="Stars">
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

I'm [Kiko](https://usekiko.com), a solo developer in Europe. This repo is the whole thing — the site, the API, two background services, the edge worker and the desktop app — running live at [hypastack.com](https://hypastack.com).

## Why it exists

It started because I needed to send someone a file and every tool I tried felt wrong. They wanted an account. They showed ads. They said "encrypted" in big letters on the homepage while quietly logging everything behind it. I read one too many privacy policies about "trusted third-party partners" and closed the tabs.

Hypastack is what I wanted instead: drop a file, get a link, send it, done. The privacy part happens invisibly, because the best privacy is the kind you never have to think about.

## What it does

- **Share files privately.** Drop a file, get a link. The link carries the only key, and whoever you send it to can download and decrypt the file right in the browser. When the link expires, the file is deleted. Small files last a week by default, bigger ones less; paid plans can pick any lifetime from one minute to thirty days and give the link a custom name.

- **Burn on read.** A file can delete itself right after the first download. For things that should be seen exactly once.

- **Keep a small drive.** There are accounts, but not the usual kind. Your browser rolls a random key and that key *is* your identity — no email, no password, nothing pointing back at you. If you stop logging in, the account and everything in it wipes itself after a period you choose, anywhere from a week to a year. No backups, no recovery. That's not a bug, it's the point.

- **Host public images.** The CDN side. Permanent, fast links for things you *want* public: readme screenshots, avatars, website assets. Public files can't be encrypted — a browser has to display them — so the privacy work happens elsewhere: every image is rebuilt on upload and the hidden metadata your camera left behind (GPS location, device model, timestamps) is thrown away.

- **The Dumpster.** Anonymous text pastes. Not linked to any account, and destroyed after 180 days of nobody looking at them. Stored as plain text, so it says right on the tin not to put secrets there.

- **A forum.** A small public corner where people share files openly. No account needed to download anything.

- **A desktop app.** An early Windows build that wraps the site, sits in the system tray, and adds an upload option when you right click a file in Explorer.

Big files are handled properly too: they get split into pieces and uploaded in parallel, and an interrupted transfer picks up where it stopped instead of starting over.

## How the private part works

The locking happens on your machine, before anything is sent. A share link looks like this:

```
hypastack.com/d/abc123#the-key-lives-here
```

Everything after the `#` stays in your browser — browsers never send that part of a URL over the network. So the key travels inside the link itself, from you to the person you trust, without touching the server in between. The server holds scrambled bytes and has no way to unscramble them. There is nothing readable for me to look at, leak, or hand over.

A few other decisions I made early and never changed:

- IP addresses are never stored. Not in the database, not in logs.
- Your nickname is scrambled in your browser before it's sent, so I can't read that either.
- Filenames are stored scrambled too.
- No analytics scripts, no tracking cookies, no third-party anything watching you.

The exact algorithms and mechanics are below, in the stack section.

## The stack

This is the part where I'm allowed to talk shop.

**Web app.** Next.js 16 (App Router, Turbopack), React 19, TypeScript. Tailwind CSS v4 for styling, Motion for animation, Material Symbols for icons, MDX for the blog. The API is Next route handlers under `/api/v2/`, and it can run same-origin or from a dedicated `api.` host — CORS and cross-origin cookies are already wired for the split. `proxy.ts` handles the CSP, maintenance mode and short-lived HMAC proxy tokens.

**Data.** PostgreSQL through `pg`. The schema is created and migrated on startup, so there is no migration step to run. Redis sits in front as an optional cache; if it's unreachable the app falls back to Postgres on its own. Rate limiting also lives in Postgres, keyed on an HMAC-SHA256 hash of the caller's IP — the raw address is hashed and dropped.

**Storage.** Cloudflare R2 (an EU-jurisdiction bucket) through the S3-compatible SDK. Uploads go straight from the browser to R2 via presigned URLs, so file bytes normally never pass through the app server; a server-side proxy exists as a fallback for networks where that fails. Files over 50 MB are split into 10 MB chunks uploaded ten at a time, and resumable.

**The edge.** A small Cloudflare Worker (`workers/r2-gateway`) guards the public storage domain: `/cdn/*` is public with immutable caching, avatars require an HMAC-signed URL with an expiry, and every other path is blocked outright. CDN images are re-encoded with Sharp on upload, which is what strips the EXIF, GPS and camera metadata.

**Two sidecars.** The Node app is fully self-sufficient; these take over specific jobs when they're up, and Node quietly does the work in-process when they're not:

- [`services/hypahash`](./services/hypahash) (Go) — access-key hashing. PBKDF2 at 100,000 iterations is deliberately slow, which is exactly what you don't want sitting on Node's event loop. The Go service does the deriving over a Unix socket and produces byte-identical hashes to the Node implementation. The PBKDF2 is written out by hand in the file — about thirty lines, zero dependencies.
- [`services/hypasched`](./services/hypasched) (Erlang/OTP) — file expiry and burn deletion. Instead of an hourly "find expired rows" sweep, every file gets its own timer: the app pushes jobs over a Unix socket, the BEAM arms one timer per file in an ETS registry, reloads every pending job from Postgres after a restart, and reconciles against the database every six hours in case a notification ever got lost. It also runs the two cleanups that genuinely are sweeps: abandoned upload sessions and forgotten Dumpster pastes.

**Security mechanics.** File encryption is AES-256-GCM through the Web Crypto API, key generated in the browser and carried in the URL fragment. Access keys are hashed with PBKDF2-HMAC-SHA512 (100k iterations), and the client derives a separate AES-GCM master key from the access key to encrypt profile data like the nickname before it leaves the browser. Filenames are encrypted at rest with their own key, kept apart from file contents. Burn-on-read claims the file with an atomic `SELECT ... FOR UPDATE`, so two simultaneous downloads can't both win, and deletion fires about 90 seconds after first access, with retries. On top of that: Cloudflare Turnstile on anonymous actions, CSRF tokens, Zod validation on every route, upload content-sniffing with `file-type`, and DOMPurify on anything user-written that gets rendered.

**Desktop.** Tauri v2, so the shell is Rust. It wraps the live site in a native webview with a custom titlebar, hides to the tray instead of quitting, and handles the Explorer right-click upload — a second launch from the context menu hands the file to the running instance.

**Tiers.** The hosted version has free and paid plans (storage, upload sizes, link counts — see `constants/tier-limits.ts`); that's what pays the hosting bill. Nothing in the code phones home or checks a license. Self-hosted, you decide who gets which tier.

## Run it yourself

You need Node 20 or newer, PostgreSQL, and an R2 bucket or any S3-compatible storage. Redis is optional. Go and Erlang are only needed for the sidecars, which you can skip entirely — the app does their work itself when they're absent. Rust only if you're building the desktop app.

```bash
npm install
cp .env.example .env
npm run dev
```

`.env.example` documents every variable. The ones you can't skip: the database connection, the R2 credentials, the Turnstile keys, and the three secrets (`JWT_SECRET`, `FILENAME_ENCRYPTION_KEY`, `ENCRYPTION_KEY`). Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The database tables create themselves the first time the app connects. No seed script, no migration CLI.

### Docker

```bash
docker build -t hypastack .
docker run --rm --network host --env-file .env hypastack
```

The build reads `.env` so the `NEXT_PUBLIC_*` values get baked into the client bundle, then strips the file from the final image — no secrets end up in layers. The container listens on `127.0.0.1:3000`, assuming a reverse proxy in front; with `--network host` it also reaches a Postgres and Redis on the host. Bind `0.0.0.0` and publish the port if you'd rather expose it directly.

### Sidecars (optional)

`services/hypahash` and `services/hypasched` each ship their own Dockerfile. They listen on Unix sockets (`HASH_SOCKET_PATH`, `SCHED_SOCKET_PATH`) shared with the app container. If a socket isn't there, the app notices and carries on without it — you can add or remove them at any time.

### Desktop app

```bash
npm run tauri:dev     # run in development
npm run tauri:build   # build a release
```

## Bugs, ideas, security holes

Issues and pull requests are welcome — [CONTRIBUTING.md](./CONTRIBUTING.md) is short, I promise. If you've found a security problem, please go through [SECURITY.md](./SECURITY.md) instead of opening a public issue.

## License

AGPL-3.0 — see [LICENSE](./LICENSE). Use it, fork it, self-host it. If you serve a modified version to other people, the license asks you to publish your changes.

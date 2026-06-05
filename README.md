# Hypastack

Hypastack is an open-source, privacy-first file sharing and CDN asset hosting platform built in Europe. All file transfers are encrypted in the browser using AES-256 before leaving your device. No email, no passwords, no tracking.

Live at **[hypastack.com](https://hypastack.com)** — built by [Kiko](https://usekiko.com).

![Dashboard](https://r2.hypastack.com/cdn/8pnp1fg9kk1f/dashboard.png)

## Features

- **Zero-knowledge encryption** — AES-256-GCM encryption runs entirely in the browser. The server never sees plaintext file contents or decryption keys.
- **Burn on read** — files can be configured to self-destruct after a single download.
- **Auto-expiring share links** — temporary links that expire after a configurable number of days.
- **Permanent CDN hosting** — public asset hosting with automatic EXIF and GPS metadata stripping on upload.
- **Anonymous authentication** — access key based, no email or password required.
- **Multipart uploads** — large files are split into encrypted chunks and uploaded in parallel.
- **Blog** — built-in MDX blog rendered server-side without webpack.
- **Desktop app** — early-stage Tauri wrapper for native Windows access.

## Technical Stack

### Core

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| UI | [React 19](https://react.dev/) |
| Language | [TypeScript 5](https://www.typescriptlang.org/) |
| Desktop | [Tauri v2](https://v2.tauri.app/) |

### Styling and Animation

- **Styling:** Tailwind CSS v4
- **Animations:** [Motion](https://motion.dev/)
- **Icons:** Material Symbols (Rounded)
- **Fonts:** Syne, DM Sans, JetBrains Mono (via `next/font`)

### Backend and Infrastructure

- **Database:** PostgreSQL (via `pg`)
- **Storage:** Cloudflare R2 (S3-compatible, via `@aws-sdk/client-s3`)
- **Payments:** Stripe (credit purchases)
- **Bot protection:** Cloudflare Turnstile
- **Encryption:** Web Crypto API (AES-256-GCM, client-side)
- **Image processing:** Sharp (EXIF stripping, re-encoding)

### Key Libraries

- `next-mdx-remote` — server-side MDX blog rendering
- `JSZip` — client-side archive creation
- `file-type` — server-side MIME validation
- `pdf-lib` — receipt generation
- `motion` — UI animations

## Architecture Overview

```
Browser
  └── AES-256-GCM encryption (Web Crypto API)
        └── Encrypted chunks → Cloudflare R2 (via presigned URLs)

Server (Next.js App Router)
  ├── API routes under /api/v2/
  ├── Rate limiting (PostgreSQL-backed, per IP hash)
  ├── Tier-based access control (free / essential / premium / ultimate)
  └── Cloudflare Turnstile bot protection

Desktop (Tauri v2)
  └── Wraps the web app as a native webview
```

The decryption key is **never sent to the server** — it lives exclusively in the URL fragment (`#key=...`), which browsers do not include in HTTP requests.

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Cloudflare R2 bucket (or any S3-compatible storage)
- Rust toolchain (only required for the Tauri desktop build)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and configure your environment variables (database, R2, Stripe, Turnstile, JWT secret).

3. Start the development server with Turbopack:

```bash
npm run dev
```

### Required Environment Variables

| Variable | Description |
|---|---|
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection |
| `JWT_SECRET` | Secret for auth tokens and IP hashing — **must be set** |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | R2 credentials |
| `R2_BUCKET_NAME`, `R2_CDN_DOMAIN` | R2 bucket and public CDN domain |
| `NEXT_PUBLIC_APP_URL` | Public app URL (e.g. `https://hypastack.com`) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `FILENAME_ENCRYPTION_KEY` | Key for server-side filename encryption |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe payment processing |

## Desktop Application (Tauri)

Run in development mode:

```bash
npm run tauri:dev
```

Build for production:

```bash
npm run tauri:build
```

## Security Model

- IP addresses are never stored. Rate limiting uses an HMAC-SHA256 hash of the IP (keyed with `JWT_SECRET`).
- Filenames are encrypted at rest using a separate `FILENAME_ENCRYPTION_KEY`.
- All CDN image uploads are re-encoded by Sharp to strip EXIF, GPS, and camera metadata before storage.
- Burn-on-read uses an atomic `SELECT ... FOR UPDATE` to prevent race conditions on concurrent downloads.

## License

See [LICENSE](./LICENSE).

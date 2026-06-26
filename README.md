# Hypastack

Hypastack is an open source, privacy first file sharing and CDN platform. Files are encrypted in your browser with AES-256 before they ever leave your device, so the server only ever stores ciphertext. No email, no password, no tracking.

It runs live at [hypastack.com](https://hypastack.com) and is built by [Kiko](https://usekiko.com).

![Dashboard](https://r2.hypastack.com/cdn/8pnp1fg9kk1f/dashboard.png?=2)

## What it does

- Browser side encryption. AES-256-GCM runs entirely in the browser. The decryption key lives in the URL fragment (the part after `#`), which browsers never send to the server, so the server cannot read your files.
- Burn on read. A file can be set to delete itself after a single download.
- Expiring links. Share links expire after a set number of days, scaled to the size of the file.
- Permanent CDN hosting. Public assets have their EXIF and GPS metadata stripped on upload.
- Anonymous accounts. Access is based on a generated key, with no email or password to manage.
- Multipart uploads. Large files are split into encrypted chunks, uploaded in parallel, and can be resumed if a transfer is interrupted.
- Built in blog. MDX posts rendered on the server.
- Desktop app. An early Tauri build that wraps the app for Windows, with a system tray and right click upload.

## Stack

The web app is Next.js 16 (App Router, Turbopack) with React 19 and TypeScript. Styling is Tailwind CSS v4, animations use Motion, icons come from Material Symbols, and the font is SF Pro Display.

On the backend:

- PostgreSQL for data, through the `pg` driver. The schema is created and migrated on startup, so there is no separate migration step to run.
- Redis as an optional cache in front of Postgres. If Redis is unreachable the app falls back to Postgres on its own.
- Cloudflare R2 for object storage, using the S3 compatible AWS SDK with presigned URLs.
- Cloudflare Turnstile for bot protection.
- Sharp for image re-encoding and metadata stripping.

The desktop app is built with Tauri v2 (Rust) and wraps the same web app in a native webview.

## How it fits together

```
Browser
  AES-256-GCM encryption (Web Crypto API)
  Encrypted chunks upload straight to Cloudflare R2 via presigned URLs

Server (Next.js App Router)
  API routes under /api/v2/
  Rate limiting backed by Postgres, keyed on a hashed IP
  Turnstile bot checks

Desktop (Tauri v2)
  Wraps the web app and adds a system tray plus right click upload
```

The decryption key never reaches the server. It stays in the URL fragment (`#key=...`), and browsers do not include the fragment in HTTP requests.

## Running it locally

You will need:

- Node.js 20 or newer
- A PostgreSQL database
- A Cloudflare R2 bucket, or any S3 compatible storage
- Redis, which is optional
- The Rust toolchain, only if you want to build the desktop app

Then:

1. Install dependencies.

```bash
npm install
```

2. Copy the example env file and fill it in.

```bash
cp .env.example .env
```

`.env.example` lists every variable with a short note on what it is for. The ones you cannot skip are the database connection, the R2 credentials, the Turnstile keys, and the three secrets (`JWT_SECRET`, `FILENAME_ENCRYPTION_KEY`, `ENCRYPTION_KEY`). You can generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. Start the dev server.

```bash
npm run dev
```

The database tables are created automatically the first time the app connects, so there is nothing else to set up.

## Desktop app

```bash
npm run tauri:dev     # run in development
npm run tauri:build   # build a release
```

## Security notes

- IP addresses are never stored. Rate limiting uses an HMAC-SHA256 hash of the IP, keyed with `JWT_SECRET`.
- Filenames are encrypted at rest with their own key, kept separate from file contents.
- Every CDN image is re-encoded by Sharp on upload, which drops EXIF, GPS, and camera metadata.
- Burn on read uses an atomic `SELECT ... FOR UPDATE`, so two concurrent downloads cannot both succeed.

## License

See [LICENSE](./LICENSE).

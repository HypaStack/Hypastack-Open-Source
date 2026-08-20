<div align="center">

<img src="https://r2.hypastack.com/cdn/hypaasset/hypastack.webp" width="88" alt="Hypastack" />

# Hypastack

**Share files privately, worldwide.**

Zero-knowledge file sharing and a free global CDN. Encrypted in your browser before it ever leaves your device, no email, no ads, no tracking.

[![License](https://img.shields.io/badge/license-source--available-blue)](./LICENSE)
[![Status](https://img.shields.io/badge/status-status.hypastack.com-3fb950)](https://status.hypastack.com)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/rbzcKSntc)
[![Built with Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![Go](https://img.shields.io/badge/Go-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![Erlang](https://img.shields.io/badge/Erlang-A90533?logo=erlang&logoColor=white)](https://www.erlang.org)
[![Tauri](https://img.shields.io/badge/Tauri-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)

[hypastack.com](https://hypastack.com) · [Docs](https://docs.hypastack.com) · [Pricing](https://hypastack.com/pricing) · [Status](https://status.hypastack.com) · [Discord](https://discord.gg/rbzcKSntc)

</div>

<br />

<div align="center">
  <img src="https://r2.hypastack.com/cdn/wpoxysqdixzy/preview-main.png" alt="Hypastack preview" width="720" />
</div>

<br />

I'm a solo developer, and I built Hypastack because I got tired of "private" file sharing that just means the company promises not to look. I'd rather not be able to look at all.

**v3 just shipped.** New dashboard, a redesigned upload flow, and a proper Developer API. What's actually new is in the [changelog](https://hypastack.com/changelog).

## What it does

- **Secure File Sharing**: encrypted client-side (AES-GCM 256) before upload. The decryption key lives in the URL fragment, which never reaches the server. I genuinely cannot read these files.
- **Permanent CDN Hosting**: public, permanent links for images and static assets. Not encrypted (a browser has to render them), but EXIF/GPS/camera metadata is stripped on upload.
- **Paste**: a short recovery window for anything you delete by accident, before it's gone for good.
- **Requests**: collect one-time file drops from people who don't have (or don't want) an account.
- **Forum**: a public community board with file attachments.
- **Developer API**: plain REST, plain JSON, bearer tokens with scoped keys. No SDK required. See [docs.hypastack.com](https://docs.hypastack.com/api-reference/overview).

No email, no phone number. An account is a random ID plus a passkey, and that's it.

## Is this open source?

No, and I'd rather say that plainly than let the word "public repo" do the lying for me. This is **source-available**: you can read every line, verify the zero-knowledge claims yourself, and publish whatever you find. You can't run it, self-host it, or build a competing service from it. The exact terms are in [LICENSE](./LICENSE), and the reasoning is in there too, it's a short read and worth it before you ask.

## Found a bug, or something worse?

Bug reports are genuinely welcome, [open an issue](https://github.com/hypaware/Hypastack/issues). Security findings even more so, please email me directly at **usekiko@hypamail.me** instead of filing a public issue. Full details, including why I can promise not to come after you for an honest finding, are in [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

## Stack

TypeScript and Next.js for the web app, Go for CPU-heavy hashing, Erlang for background scheduling, Rust (Tauri) for the desktop client. Polyglot because each piece is genuinely better suited to a different language, not because I like maintaining four toolchains.

## Credits

Everyone who's filed a bug, reported a security issue, or otherwise made this thing better than I could alone:

<a href="https://github.com/hypaware/Hypastack/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=hypaware/Hypastack" alt="Contributors" />
</a>

---

<div align="center">

**[HypaLabs License (Reference-Only)](./LICENSE)** - (c) 2025-2026 HypaLabs. All rights reserved.

Questions the license doesn't answer: **usekiko@hypamail.me**

</div>

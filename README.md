# Hypastack

Hypastack is a secure, high-performance file sharing and CDN asset hosting platform.
This repository contains the source code for the web application and the cross-platform
desktop client.

![Dashboard](https://r2.hypastack.com/cdn/8pnp1fg9kk1f/dashboard.png)

## Technical Stack

### Core Technologies

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **UI Library:** [React 19](https://react.dev/)
- **Language:** [TypeScript 5](https://www.typescriptlang.org/)
- **Desktop Wrapper:** [Tauri v2](https://v2.tauri.app/) — early stage, not the primary focus

### Styling and Animation

- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations:** [Motion](https://motion.dev/) (Framer Motion)
- **Icons:** Material Symbols

### Backend and Infrastructure

- **Database:** PostgreSQL (via `pg`)
- **Storage:** S3-compatible object storage (via `@aws-sdk/client-s3`)
- **Validation:** Zod
- **Security:** Cloudflare Turnstile for bot protection, DOMPurify

### Key Utilities

- **Image Processing:** Sharp, React Easy Crop
- **File Processing:** JSZip, pdf-lib, file-type

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- S3-compatible storage bucket
- Rust toolchain (only required for the Tauri desktop build)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file based on `.env.example` and configure your database and S3 endpoints.

3. Start the development server:

```bash
npm run dev
```

## Desktop Application (Tauri)

Run in development mode:

```bash
npm run tauri:dev
```

Build for production:

```bash
npm run tauri:build
```

## Architecture

The application is built entirely as a Next.js web app. Tauri wraps it as a lightweight
webview and exposes native system APIs such as the clipboard manager and native
notifications to the web app. The desktop client is early stage and most active
development happens on the web application.

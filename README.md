# Hypastack Open Source

Hypastack is a secure, high-performance file sharing and permanent CDN asset hosting platform. This repository contains the source code for both the web application and the cross-platform desktop client.

## Technical Stack

### Core Technologies
- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **UI Library:** [React 19](https://react.dev/)
- **Language:** [TypeScript 5](https://www.typescriptlang.org/)
- **Desktop Wrapper:** [Tauri v2](https://v2.tauri.app/) (Rust-based cross-platform framework)

### Styling & Animation
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations:** [Motion](https://motion.dev/) (Framer Motion)
- **Icons:** Material Symbols

### Backend & Infrastructure
- **Database:** PostgreSQL (via `pg`)
- **Storage:** AWS S3 compatible object storage (`@aws-sdk/client-s3`)
- **Validation:** Zod
- **Analytics:** Vercel Analytics
- **Security:** Turnstile (Cloudflare) for bot protection, DOMPurify

### Key Utilities
- **Image Processing:** Sharp, React Easy Crop
- **File Processing:** JSZip, pdf-lib, file-type
- **QR Codes:** qrcode.react

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database
- S3-compatible storage bucket
- Rust (for building the Tauri desktop app)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables by creating a `.env` file based on `.env.example` (or configure your specific S3 and DB endpoints).

3. Run the development server:
```bash
npm run dev
```

### Desktop Application (Tauri)

To run the desktop application in development mode:
```bash
npm run tauri:dev
```

To build the desktop application for production:
```bash
npm run tauri:build
```

## Architecture Notes

- **Web First, Desktop Ready:** The application is built entirely as a Next.js web application. Tauri is used as a lightweight webview wrapper that exposes native system APIs (like the clipboard manager and native notifications) to the web app.

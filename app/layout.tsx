import type { Metadata, Viewport } from "next"
import { safeJsonLd } from "@/lib/seo/jsonLd"
import Script from "next/script"
import { headers } from "next/headers"
import { ConsoleGreeting } from "@/components/console-greeting"
import { DesktopGate } from "@/components/desktop-gate"
import { DesktopGuard } from "@/components/desktop-guard"
import { ContextMenuUploader } from "@/components/context-menu-uploader"
import { TauriTitleBar } from "@/components/tauri-titlebar"

import { AuthProvider } from "@/hooks/useAuth"
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  ICON_URL,
  PREVIEW_URL
} from "@/constants"
import "./globals.css"
import "material-symbols/rounded.css"





export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [
    { name: "Kiko", url: "https://usekiko.com" },
    { name: "Hypastack", url: SITE_URL },
  ],
  creator: "Kiko",
  publisher: "Hypastack",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: PREVIEW_URL,
        width: 1200,
        height: 630,
        alt: "Hypastack - Private File Sharing & Global CDN",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [PREVIEW_URL],
  },
  // Same-origin icons: Google's favicon pipeline does not accept WebP and
  // falls back to /favicon.ico, so both must exist here (see public/).
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-96.png", type: "image/png", sizes: "96x96" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",

  category: "file sharing",
  classification: "Internet Services",
  other: {
    "msapplication-TileColor": "#ffffff",
    "msapplication-config": "/browserconfig.xml",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#000000" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  viewportFit: "cover",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Per-request CSP nonce set by the proxy. We load Cloudflare Turnstile's
  // api.js here (root layout, beforeInteractive) carrying this nonce so it
  // runs before the page bundle, sets window.turnstile, and becomes a
  // nonce-trusted root. react-turnstile then skips its own (un-nonced)
  // injection, and the inline scripts api.js creates inherit trust via
  // 'strict-dynamic'. Loading it per-page from a client component did not get
  // nonced by Next and was blocked by CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined
  return (
    <html lang="en" dir="ltr" className="dark" suppressHydrationWarning style={{ backgroundColor: '#000000' }}>
      <head>
        {process.env.NODE_ENV !== "development" && (
          <Script
            id="cf-turnstile-api"
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="beforeInteractive"
            nonce={nonce}
          />
        )}
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://hypastack.com" />
        <link rel="dns-prefetch" href="https://hypastack.com" />

        {/* Font origin: preconnect + preload the primary SF Pro Display weights
            (Regular → 400/500, Medium → 600/700) so they arrive before first
            paint and avoid the fallback-font flash (FOUC). */}
        <link rel="preconnect" href="https://r2.hypastack.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://r2.hypastack.com" />
        <link rel="preload" as="font" type="font/otf" crossOrigin="anonymous" href="https://r2.hypastack.com/cdn/58kpu13r0tb0/SFPRODISPLAYREGULAR.OTF" />
        <link rel="preload" as="font" type="font/otf" crossOrigin="anonymous" href="https://r2.hypastack.com/cdn/rqid9rynsfmy/SFPRODISPLAYMEDIUM.OTF" />
        
        {/* PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Hypastack" />
        <meta name="application-name" content="Hypastack" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Structured Data - JSON-LD. Facts here must stay consistent with the
            visible site (FAQ, tier limits) — search and answer engines cross-check. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#organization`,
                  name: SITE_NAME,
                  url: SITE_URL,
                  logo: {
                    "@type": "ImageObject",
                    url: ICON_URL,
                    width: 512,
                    height: 512,
                    caption: "Hypastack logo",
                  },
                  founder: {
                    "@type": "Person",
                    name: "Kiko",
                    url: "https://usekiko.com",
                  },
                  sameAs: [
                    "https://github.com/HypaStack",
                    "https://github.com/HypaStack/Hypastack-Open-Source",
                  ],
                  contactPoint: {
                    "@type": "ContactPoint",
                    url: "https://t.me/t_usekiko",
                    contactType: "customer support",
                    availableLanguage: ["English"],
                  },
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  name: SITE_NAME,
                  alternateName: ["hypastack.com", `${SITE_NAME} - ${SITE_TAGLINE}`],
                  url: SITE_URL,
                  description: SITE_DESCRIPTION,
                  publisher: {
                    "@id": `${SITE_URL}/#organization`,
                  },
                  inLanguage: "en-US",
                },
                {
                  "@type": "WebApplication",
                  "@id": `${SITE_URL}/#webapp`,
                  name: SITE_NAME,
                  url: SITE_URL,
                  description: SITE_DESCRIPTION,
                  applicationCategory: "UtilitiesApplication",
                  applicationSubCategory: "File sharing and CDN hosting",
                  operatingSystem: "Any (web browser); Windows (desktop app)",
                  browserRequirements: "Requires JavaScript and the Web Crypto API.",
                  isAccessibleForFree: true,
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "USD",
                    description: "Free plan. Paid plans raise storage and upload limits.",
                  },
                  license: "https://github.com/HypaStack/Hypastack-Open-Source/blob/main/LICENSE",
                  screenshot: PREVIEW_URL,
                  featureList: [
                    "Files are encrypted in the browser with AES-256-GCM before upload; the decryption key stays in the URL fragment and never reaches the server",
                    "Share links that expire automatically",
                    "Burn after reading: files that delete themselves after the first download",
                    "Free global CDN for public assets with EXIF, GPS and camera metadata stripped on upload",
                    "Anonymous accounts: no email, no password, no personal data",
                    "No ads, no tracking, and IP addresses are never stored",
                    "Anonymous text pastes",
                    "Resumable parallel uploads for large files",
                    "EU-based storage",
                    "Windows desktop app with system tray upload",
                    "Source available for public review under a reference-only licence",
                  ],
                  publisher: {
                    "@id": `${SITE_URL}/#organization`,
                  },
                },
                {
                  "@type": "SoftwareSourceCode",
                  "@id": `${SITE_URL}/#sourcecode`,
                  name: "Hypastack source code",
                  codeRepository: "https://github.com/HypaStack/Hypastack-Open-Source",
                  programmingLanguage: ["TypeScript", "Go", "Erlang", "Rust"],
                  license: "https://github.com/HypaStack/Hypastack-Open-Source/blob/main/LICENSE",
                  about: {
                    "@id": `${SITE_URL}/#webapp`,
                  },
                },
              ],
            }),
          }}
        />
        
        {/* Tauri detection for pure black background */}
        <Script id="tauri-detect" strategy="afterInteractive">{`
          if (window.__TAURI_INTERNALS__) document.documentElement.classList.add('is-tauri');
          if (window.location.pathname.startsWith('/manage')) document.documentElement.classList.add('is-dashboard');
          else document.documentElement.classList.add('is-public');
        `}</Script>
      </head>
      <body className={`font-sans antialiased`}>
        <TauriTitleBar />

        <div id="app-content-wrapper">
          <AuthProvider>
            <DesktopGate>
              {children}
            </DesktopGate>
            <ConsoleGreeting />
            <DesktopGuard />
            <ContextMenuUploader />
          </AuthProvider>
        </div>
      </body>
    </html>
  )
}

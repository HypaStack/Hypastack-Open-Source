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
import { HypaNotifProvider } from "@/components/ui/hypa-notif"
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
    default: `${SITE_NAME} (${SITE_TAGLINE})`,
    template: `%s (${SITE_NAME})`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [
    { name: "Kiko", url: "https://usekiko.com" },
    { name: "Hypastack", url: SITE_URL },
  ],
  creator: "Kiko",
  publisher: "Hypastack",
  // Set GOOGLE_SITE_VERIFICATION / BING_SITE_VERIFICATION once you have real
  // codes from Search Console / Bing Webmaster Tools. No-op until then.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
  // Safety net: any non-production build (a staging/preview instance) never gets indexed.
  robots: {
    index: process.env.NODE_ENV === "production",
    follow: process.env.NODE_ENV === "production",
    nocache: false,
    googleBot: {
      index: process.env.NODE_ENV === "production",
      follow: process.env.NODE_ENV === "production",
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
    title: `${SITE_NAME} (${SITE_TAGLINE})`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: PREVIEW_URL,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} (${SITE_TAGLINE})`,
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} (${SITE_TAGLINE})`,
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
    { media: "(prefers-color-scheme: light)", color: "#08090a" },
    { media: "(prefers-color-scheme: dark)", color: "#08090a" },
  ],
  viewportFit: "cover",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Turnstile's api.js loads here with the CSP nonce, per-page client loading wasn't nonced.
  const nonce = (await headers()).get("x-nonce") ?? undefined
  return (
    <html lang="en" dir="ltr" className="dark" suppressHydrationWarning style={{ backgroundColor: '#08090a' }}>
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

        {/* Preconnect + preload the font so it arrives before first paint, avoids FOUC. */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" href="https://fonts.gstatic.com/s/instrumentsans/v4/pxiTypc9vsFDm051Uf6KVwgkfoSxQ0GsQv8ToedPibnr0SZe1ZuWi3g.woff2" />
        
        {/* PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Hypastack" />
        <meta name="application-name" content="Hypastack" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* JSON-LD facts must stay consistent with the visible site, search engines cross-check. */}
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
                    email: "usekiko@hypamail.me",
                    contactType: "customer support",
                    availableLanguage: ["English"],
                  },
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  name: SITE_NAME,
                  alternateName: ["hypastack.com", `${SITE_NAME} (${SITE_TAGLINE})`],
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
                    "Any file you upload is E2E Encrypted",
                    "Links expire themselves",
                    "With Burn after Download on, the link you shared and the file get deleted as soon as the person downloads the file.",
                    "a Free Content Delivery Network, with Higher limits on paid plans.",
                    "No emails or phone number, all you have is a passkey automatically generated for u.",
                    "No ads or tracking, IP's are Hashed, non-readable",
                    "A Better Pastebin alternative",
                    "Large file uploads (Up to 100 GB)",
                    "RESTful Developer API (It is not Encrypted)",
                    "EU-based server (but Cloudflare may use a server closer to you which might be outside of the EU, 'EU-based server' means that the server this website runs on is Located in Europe",
                    "Source-available, meaning the code is Auditable, but NOT self-hostable, Unless the owner (Kiko) permits you to.",
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
                {
                  "@type": "APIReference",
                  "@id": "https://docs.hypastack.com/api-reference/overview#apireference",
                  name: "Hypastack Developer API",
                  headline: "Hypastack Developer API (v3)",
                  url: "https://docs.hypastack.com/api-reference/overview",
                  description:
                    "REST API for driving Hypastack files and CDN assets from your own code. Bearer-token auth with scoped keys, plain JSON, no SDK. Files uploaded through the API are not end-to-end encrypted (there is no browser to hold the key) and are readable by the operator; CDN assets are public by design. The zero-knowledge guarantee applies only to uploads made through the website.",
                  targetPlatform: "https://api.hypastack.com/v3",
                  programmingModel: "REST",
                  assemblyVersion: "v3",
                  inLanguage: "en-US",
                  isPartOf: {
                    "@id": `${SITE_URL}/#webapp`,
                  },
                  publisher: {
                    "@id": `${SITE_URL}/#organization`,
                  },
                },
              ],
            }),
          }}
        />
        
        {/* Tauri detection for pure black background */}
        <Script id="tauri-detect" strategy="afterInteractive">{`
          if (window.__TAURI_INTERNALS__) document.documentElement.classList.add('is-tauri');
          if (window.location.pathname.startsWith('/me')) document.documentElement.classList.add('is-dashboard');
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
            <HypaNotifProvider />
          </AuthProvider>
        </div>
      </body>
    </html>
  )
}

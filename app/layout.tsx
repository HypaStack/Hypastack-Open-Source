import type { Metadata, Viewport } from "next"
import Script from "next/script"
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
  FAVICON_URL,
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

  alternates: {
    canonical: SITE_URL,
    languages: {
      "en-US": SITE_URL,
      "en": SITE_URL,
    },
  },
  icons: {
    icon: [
      { url: FAVICON_URL, type: "image/webp", sizes: "96x96" },
      { url: FAVICON_URL, type: "image/webp", sizes: "32x32" },
      { url: FAVICON_URL, type: "image/webp", sizes: "16x16" },
    ],
    apple: [
      { url: FAVICON_URL, sizes: "180x180", type: "image/webp" },
      { url: FAVICON_URL, sizes: "152x152", type: "image/webp" },
      { url: FAVICON_URL, sizes: "120x120", type: "image/webp" },
    ],
    shortcut: FAVICON_URL,
    other: [
      {
        rel: "mask-icon",
        url: FAVICON_URL,
        color: "#ffffff",
      },
    ],
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
  maximumScale: 1,
  userScalable: false,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#000000" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" dir="ltr" className="dark" suppressHydrationWarning style={{ backgroundColor: '#000000' }}>
      <head>
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://hypastack.com" />
        <link rel="dns-prefetch" href="https://hypastack.com" />
        
        {/* Alternate language versions */}
        <link rel="alternate" hrefLang="en" href="https://hypastack.com" />
        <link rel="alternate" hrefLang="x-default" href="https://hypastack.com" />
        
        {/* PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Hypastack" />
        <meta name="application-name" content="Hypastack" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Structured Data - JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  name: SITE_NAME,
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
                  applicationCategory: "FileSharingApplication",
                  operatingSystem: "Any",
                  browserRequirements: "Requires JavaScript. Requires HTML5.",
                  softwareVersion: "1.0",
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "USD",
                    priceValidUntil: "2030-01-01",
                  },
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: "4.8",
                    ratingCount: "1250",
                    bestRating: "5",
                    worstRating: "1",
                  },
                  featureList: [
                    "No tracking or logs",
                    "No personal data collected",
                    "EU-based servers",
                    "Auto-expiring share links",
                    "Burn after reading",
                    "Permanent CDN asset hosting",
                    "No account or email required",
                    "100% open source",
                    "Ad-free",
                    "Free to use",
                    "Dropbox alternative",
                    "WeTransfer alternative",
                  ],
                },
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
                    caption: "hypastack.com Logo",
                  },
                  image: `${SITE_URL}/images/hypastack-logo-and-text.webp`,
                  sameAs: [
                    "https://usekiko.com",
                    "https://noinfo.bio",
                    "https://github.com/hypastack",
                  ],
                  contactPoint: {
                    "@type": "ContactPoint",
                    url: "https://t.me/t_usekiko",
                    contactType: "customer support",
                    availableLanguage: ["English"],
                  },
                },
                {
                  "@type": "Service",
                  "@id": `${SITE_URL}/#service`,
                  serviceType: "File Sharing Service",
                  provider: {
                    "@id": `${SITE_URL}/#organization`,
                  },
                  areaServed: "Worldwide",
                  hasOfferCatalog: {
                    "@type": "OfferCatalog",
                    name: "File Sharing Services",
                    itemListElement: [
                      {
                        "@type": "Offer",
                        itemOffered: {
                          "@type": "Service",
                          name: "Secure File Upload",
                        },
                      },
                      {
                        "@type": "Offer",
                        itemOffered: {
                          "@type": "Service",
                          name: "Temporary File Hosting",
                        },
                      },
                    ],
                  },
                },
                {
                  "@type": "FAQPage",
                  "@id": `${SITE_URL}/#faq`,
                  mainEntity: [
                    {
                      "@type": "Question",
                      name: "Is Hypastack free to use?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Yes, Hypastack is completely free to use. Creating an account is free and no payment is required.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "How long do files stay available?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Files are automatically deleted after 3 to 7 days, depending on your selection. You can also enable 'Burn after reading' for one-time downloads.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "What is the maximum file size?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Upload files up to 500MB in size after creating a free account.",
                      },
                    },
                    {
                      "@type": "Question",
                      name: "Is my data secure?",
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: "Yes, all file transfers use TLS/SSL encryption. Files are stored encrypted and automatically deleted after expiration. We don't access or analyze your file contents.",
                      },
                    },
                  ],
                },
              ],
            }),
          }}
        />
        
        {/* Breadcrumb structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: SITE_URL,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Dashboard",
                  item: `${SITE_URL}/manage`,
                },
              ],
            }),
          }}
        />
        {/* Atlas Grotesk fonts loaded via @font-face in globals.css */}
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

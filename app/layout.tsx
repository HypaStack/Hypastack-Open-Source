import type { Metadata, Viewport } from "next"
import { JetBrains_Mono, Syne, DM_Sans } from "next/font/google"
import { DemoBanner } from "@/components/demo-banner"
import { ConsoleGreeting } from "@/components/console-greeting"
import { DesktopGate } from "@/components/desktop-gate"
import { DesktopGuard } from "@/components/desktop-guard"
import { ContextMenuUploader } from "@/components/context-menu-uploader"
import { TauriTitleBar } from "@/components/tauri-titlebar"

import { AuthProvider } from "@/hooks/useAuth"
import "./globals.css"
import "material-symbols/rounded.css"



const jetbrains = JetBrains_Mono({ 
  subsets: ["latin"], 
  variable: "--font-jetbrains",
  display: "swap",
  preload: true,
})

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  preload: true,
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  preload: true,
})

const siteUrl = "https://hypastack.com"
const siteName = "Hypastack"
const tagline = "Zero-Knowledge Encrypted File Sharing & CDN"
const description = "Privacy-first file sharing with AES-256 browser-side encryption and a permanent CDN for public assets. No emails, no passwords, no tracking. Open source. Built in Europe by Kiko."
const keywords = "encrypted file sharing, zero knowledge file hosting, private file transfer, secure file upload, temporary file sharing, burn after reading, CDN hosting, privacy file sharing, AES-256 encryption, anonymous file sharing, open source file sharing, Hypastack, no tracking file sharing, EXIF metadata stripping, European file hosting"
const iconUrl = "https://r2.hypastack.com/cdn/u1y77k752jdm/icon.webp"
const previewUrl = "https://r2.hypastack.com/cdn/wpoxysqdixzy/preview-main.png"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} - ${tagline}`,
    template: `%s | ${siteName}`,
  },
  description,
  keywords,
  authors: [
    { name: "Kiko", url: "https://usekiko.com" },
    { name: "Hypastack", url: siteUrl },
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
    url: siteUrl,
    siteName,
    title: `${siteName} - ${tagline}`,
    description,
    images: [
      {
        url: previewUrl,
        width: 1200,
        height: 630,
        alt: "Hypastack - Zero-Knowledge Encrypted File Sharing & CDN",
        type: "image/png",
      },
    ],
  },

  alternates: {
    canonical: siteUrl,
    languages: {
      "en-US": siteUrl,
      "en": siteUrl,
    },
  },
  icons: {
    icon: [
      { url: iconUrl, type: "image/webp", sizes: "32x32" },
      { url: iconUrl, type: "image/webp", sizes: "16x16" },
    ],
    apple: [
      { url: iconUrl, sizes: "180x180", type: "image/webp" },
      { url: iconUrl, sizes: "152x152", type: "image/webp" },
      { url: iconUrl, sizes: "120x120", type: "image/webp" },
    ],
    shortcut: iconUrl,
    other: [
      {
        rel: "mask-icon",
        url: iconUrl,
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
    "theme-color": "#ffffff",
  },
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: "light",
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" dir="ltr" className="dark" suppressHydrationWarning>
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
                  "@id": `${siteUrl}/#website`,
                  name: siteName,
                  url: siteUrl,
                  description,
                  publisher: {
                    "@id": `${siteUrl}/#organization`,
                  },
                  inLanguage: "en-US",
                },
                {
                  "@type": "WebApplication",
                  "@id": `${siteUrl}/#webapp`,
                  name: siteName,
                  url: siteUrl,
                  description,
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
                    "AES-256 browser-side encryption",
                    "Zero-knowledge architecture",
                    "Auto-expiring share links",
                    "Burn after reading",
                    "Permanent CDN asset hosting",
                    "EXIF and GPS metadata stripping",
                    "No email or password required",
                    "Open source",
                    "No tracking or analytics",
                  ],
                },
                {
                  "@type": "Organization",
                  "@id": `${siteUrl}/#organization`,
                  name: siteName,
                  url: siteUrl,
                  logo: {
                    "@type": "ImageObject",
                    url: iconUrl,
                    width: 512,
                    height: 512,
                    caption: "hypastack.com Logo",
                  },
                  image: `${siteUrl}/images/hypastack-logo-and-text.webp`,
                  sameAs: [
                    "https://usekiko.com",
                    "https://noinfo.bio",
                    "https://github.com/hypastack",
                  ],
                  contactPoint: {
                    "@type": "ContactPoint",
                    email: "legal@hypastack.com",
                    contactType: "customer support",
                    availableLanguage: ["English"],
                  },
                },
                {
                  "@type": "Service",
                  "@id": `${siteUrl}/#service`,
                  serviceType: "File Sharing Service",
                  provider: {
                    "@id": `${siteUrl}/#organization`,
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
                  "@id": `${siteUrl}/#faq`,
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
                  item: siteUrl,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Dashboard",
                  item: `${siteUrl}/manage`,
                },
              ],
            }),
          }}
        />
        {/* Atlas Grotesk fonts loaded via @font-face in globals.css */}
        {/* Tauri detection for pure black background */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (window.__TAURI_INTERNALS__) document.documentElement.classList.add('is-tauri');
              if (window.location.pathname.startsWith('/manage')) document.documentElement.classList.add('is-dashboard');
              else document.documentElement.classList.add('is-public');
            `
          }}
        />
      </head>
      <body className={`${jetbrains.variable} ${syne.variable} ${dmSans.variable} font-sans antialiased`}>
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

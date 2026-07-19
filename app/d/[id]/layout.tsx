import type { Metadata } from "next"
import { SITE_NAME } from "@/constants"

// The page itself is a client component, so the share-card tags live here.
// A static image, so a pasted link never triggers a per-crawler render.
const DOWNLOAD_OG_IMAGE = "https://r2.hypastack.com/cdn/download-og-img/og-img.webp"

const title = `Download a file on ${SITE_NAME}`
const description = "Someone shared an end-to-end encrypted file with you."

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title,
    description,
    images: [
      {
        url: DOWNLOAD_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `Download a file on ${SITE_NAME}`,
        type: "image/webp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [DOWNLOAD_OG_IMAGE],
  },
}

export default function DownloadLayout({ children }: { children: React.ReactNode }) {
  return children
}

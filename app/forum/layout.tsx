import type { Metadata } from "next"
import { PREVIEW_URL } from "@/constants"

const description = "Browse and share public files on the Hypastack community forum. No account required to download."

export const metadata: Metadata = {
  title: "Forum",
  description,
  alternates: {
    canonical: "https://hypastack.com/forum",
  },
  openGraph: {
    title: "Forum (Hypastack)",
    description,
    type: "website",
    url: "https://hypastack.com/forum",
    images: [PREVIEW_URL],
  },
  twitter: {
    card: "summary_large_image",
    title: "Forum (Hypastack)",
    description,
    images: [PREVIEW_URL],
  },
}

export default function ForumLayout({ children }: { children: React.ReactNode }) {
  return children
}

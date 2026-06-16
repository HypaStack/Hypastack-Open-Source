import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Forum",
  description: "Browse and share public files on the Hypastack forum. Search by tags and keywords, download freely.",
}

export default function ForumLayout({ children }: { children: React.ReactNode }) {
  return children
}

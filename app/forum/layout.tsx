import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Forum",
  description: "Browse and share public files on the Hypastack community forum. No account required to download.",
}

export default function ForumLayout({ children }: { children: React.ReactNode }) {
  return children
}

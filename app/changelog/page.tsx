import type { Metadata } from "next"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { ChangelogList } from "@/components/changelog-list"
import { PREVIEW_URL } from "@/constants"

const description = "Everything new, improved, and fixed at Hypastack."

export const metadata: Metadata = {
  title: "Changelog",
  description,
  alternates: {
    canonical: "https://hypastack.com/changelog",
  },
  openGraph: {
    title: "Changelog (Hypastack)",
    description,
    type: "website",
    url: "https://hypastack.com/changelog",
    images: [PREVIEW_URL],
  },
  twitter: {
    card: "summary_large_image",
    title: "Changelog (Hypastack)",
    description,
    images: [PREVIEW_URL],
  },
}

export default function ChangelogPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <section className="flex-1 pt-32 pb-40 px-6">
        {/* Padding on the section, not the div, keeps this a true 880px like the navbar. */}
        <div className="mx-auto max-w-[880px]">
          <ChangelogList />
        </div>
      </section>
      <Footer />
    </main>
  )
}

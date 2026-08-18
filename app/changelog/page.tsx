import type { Metadata } from "next"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { ChangelogList } from "@/components/changelog-list"

export const metadata: Metadata = {
  title: "Changelog — Hypastack",
  description: "Everything new, improved, and fixed at Hypastack.",
  alternates: {
    canonical: "https://hypastack.com/changelog",
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

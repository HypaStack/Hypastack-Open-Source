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
      <section className="flex-1 pt-32 pb-40">
        <div className="mx-auto max-w-[880px] px-6">
          <ChangelogList />
        </div>
      </section>
      <Footer />
    </main>
  )
}

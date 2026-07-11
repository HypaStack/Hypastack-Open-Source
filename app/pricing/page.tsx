import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { PricingCards } from "@/components/pricing-cards"
import { PricingComparison } from "@/components/pricing-comparison"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pricing — Hypastack",
  description:
    "Choose the Hypastack plan that fits how you share. Free forever, or upgrade for more storage, larger uploads, custom links and funnels.",
  alternates: {
    canonical: "https://hypastack.com/pricing",
  },
}

const HEADING_FONT = { fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }

export default function Pricing() {
  return (
    <main className="flex min-h-screen flex-col bg-[#08090a]">
      <Navbar />

      <section className="flex-1 pt-32 pb-40">
        <div className="mx-auto max-w-[1440px] px-6 sm:px-16">
          <div className="relative text-center mb-12">
            {/* soft spotlight behind the title */}
            <div className="pointer-events-none absolute left-1/2 -top-32 -translate-x-1/2 w-[440px] max-w-[85vw] h-[260px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.09),transparent_70%)] blur-2xl" />
            <h1 className="relative text-[clamp(40px,4.6vw,58px)] font-bold tracking-tight text-[#f7f8f8]" style={HEADING_FONT}>
              Pricing
            </h1>
            <p className="relative mt-3 text-[15px] text-[#898e97]">
              Choose the plan that fits how you share.
            </p>
          </div>

          <PricingCards />

          <PricingComparison />

          <p className="mt-16 text-center text-[14px] text-[#898e97]">
            Need more capabilities?{" "}
            <a href="https://t.me/hypastack" target="_blank" rel="noopener noreferrer" className="text-[#f7f8f8] hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </section>

      <Footer />
    </main>
  )
}

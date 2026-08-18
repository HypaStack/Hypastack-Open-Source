import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { PricingCards } from "@/components/pricing-cards"
import { PricingComparison } from "@/components/pricing-comparison"
import { Typography, Link } from "@heroui/react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pricing — Hypastack",
  description:
    "Choose the Hypastack plan that fits how you share. Free forever, or upgrade for more storage, larger uploads, custom links and funnels.",
  alternates: {
    canonical: "https://hypastack.com/pricing",
  },
}

export default function Pricing() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <section className="flex-1 pt-32 pb-40">
        <div className="mx-auto max-w-[1440px] px-6 sm:px-16">
          <div className="relative text-center mb-12">
            <Typography type="h1" className="relative text-[clamp(40px,4.6vw,58px)] text-foreground">
              Pricing
            </Typography>
            <Typography type="body" color="muted" className="relative mt-3">
              Choose the plan that fits how you share.
            </Typography>
          </div>

          <PricingCards />

          <PricingComparison />

          <Typography type="body-sm" color="muted" className="mt-16 text-center">
            Need more capabilities?{" "}
            <Link href="https://t.me/hypastack" target="_blank" rel="noopener noreferrer" className="text-foreground">
              Contact us
            </Link>
          </Typography>
        </div>
      </section>

      <Footer />
    </main>
  )
}

import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";

import { HowItWorks } from "@/components/how-it-works";
import { Faq } from "@/components/faq";
import { CtaSection } from "@/components/cta-section";
import { Footer } from "@/components/footer";

import { SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION } from "@/constants";

const siteUrl = SITE_URL;
const siteName = SITE_NAME;
const tagline = "Encrypted file sharing and permanent CDN hosting";
const description =
  "Zero-knowledge file sharing with AES-256 browser-side encryption and a fast, permanent CDN for public assets. No accounts, no tracking, no compromises. Open source and built in Europe.";

export const metadata: Metadata = {
  title: `${siteName} - ${tagline}`,
  description,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName,
    title: `${siteName} - ${tagline}`,
    description,
    images: [
      {
        url: "https://r2.hypastack.com/cdn/wpoxysqdixzy/preview-main.png",
        width: 1200,
        height: 630,
        alt: "Hypastack - Encrypted file sharing and permanent CDN hosting",
      },
    ],
  },

  alternates: {
    canonical: siteUrl,
  },
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="relative min-h-screen bg-[#08090a] text-foreground w-full overflow-hidden">
        <Hero />
        <div className="flex flex-col gap-[150px] sm:gap-[250px] lg:gap-[350px] pb-[200px]">
          <HowItWorks />
          <Faq />
          <CtaSection />
          <Footer />
        </div>
      </main>
    </>
  );
}

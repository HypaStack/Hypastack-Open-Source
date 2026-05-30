import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";

import { HowItWorks } from "@/components/how-it-works";
import { Faq } from "@/components/faq";
import { CtaSection } from "@/components/cta-section";
import { Footer } from "@/components/footer";

const siteUrl = "https://hypastack.com";
const siteName = "hypastack.com";
const tagline = "Secure file sharing & permanent CDN asset hosting";
const description =
  "Share files up to 1GB with auto-expiring links. Host permanent CDN assets securely. Simple anonymous authentication. Free to start.";

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
        url: "/images/hypastack-dark-logo.png",
        width: 512,
        height: 512,
        alt: "hypastack.com - Simple File Sharing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} - ${tagline}`,
    description,
    images: ["/images/PREVIEW.png"],
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="theme-marketing relative min-h-screen bg-background text-foreground w-full overflow-x-hidden">
      <Hero />

      <div className="relative">
        <HowItWorks />
        <Faq />
        <CtaSection />
      </div>
      <Footer />
      </main>
    </>
  );
}

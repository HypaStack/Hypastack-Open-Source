import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";

import { HowItWorks } from "@/components/how-it-works";
import { Faq } from "@/components/faq";
import { CtaSection } from "@/components/cta-section";
import { Footer } from "@/components/footer";
import { faqs } from "@/components/faq-data";

import { SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION, PREVIEW_URL } from "@/constants";

export const metadata: Metadata = {
  title: `${SITE_NAME} - ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: PREVIEW_URL,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - ${SITE_TAGLINE}`,
      },
    ],
  },

  alternates: {
    canonical: SITE_URL,
  },
};

export default function Home() {
  return (
    <>
      {/* FAQ rich results + answer engines read this; content mirrors the visible FAQ below */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "@id": `${SITE_URL}/#faq`,
            mainEntity: faqs.map(({ q, a }) => ({
              "@type": "Question",
              name: q,
              acceptedAnswer: { "@type": "Answer", text: a },
            })),
          }),
        }}
      />
      <Navbar />
      <main className="relative min-h-screen bg-[#08090a] text-foreground w-full overflow-hidden">
        <Hero />
        <div className="flex flex-col gap-[80px] sm:gap-[120px] lg:gap-[180px] pb-[100px] sm:pb-[150px]">
          <HowItWorks />
          <Faq />
          <CtaSection />
        </div>
        <Footer />
      </main>
    </>
  );
}

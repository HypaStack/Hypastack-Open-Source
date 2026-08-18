import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@heroui/react";
import { Navbar } from "@/components/navbar";
import { StatusBanner } from "@/components/status-banner";
import { Hero } from "@/components/hero";
import { Footer } from "@/components/footer";

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
      <Navbar />
      <div className="relative min-h-screen">
        {/* Purely decorative — sits behind all real content, never intercepts
            clicks. `absolute` inside this relative wrapper so it stretches to
            the full scrollable page height, not just one fixed viewport. */}
        <div className="absolute inset-2 sm:inset-3 z-0 pointer-events-none" aria-hidden="true">
          <Card variant="transparent" className="!p-0 h-full w-full rounded-[16px] border-none bg-accent">{null}</Card>
        </div>
        <main className="relative z-10 min-h-screen text-foreground w-full overflow-hidden flex flex-col">
          <Suspense fallback={null}>
            <StatusBanner />
          </Suspense>
          <Hero />
          <Footer />
        </main>
      </div>
    </>
  );
}

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
      <div className="min-h-screen bg-background p-2 sm:p-3">
        <Card
          variant="transparent"
          className="relative !p-0 min-h-[calc(100vh-1rem)] sm:min-h-[calc(100vh-1.5rem)] w-full flex flex-col overflow-hidden rounded-[16px] border-none bg-overlay text-foreground"
        >
          <main className="relative w-full flex-1 flex flex-col overflow-hidden">
            <Suspense fallback={null}>
              <StatusBanner />
            </Suspense>
            <Hero />
            <Footer />
          </main>
        </Card>
      </div>
    </>
  );
}

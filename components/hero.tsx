"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { MIcon } from "@/components/ui/material-icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function Hero() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [pendingNav, setPendingNav] = useState(false);

  // Navigate once auth resolves after button was clicked
  useEffect(() => {
    if (pendingNav && !isLoading) {
      setPendingNav(false);
      router.push(isAuthenticated ? "/manage/files" : "/signin");
    }
  }, [pendingNav, isLoading, isAuthenticated, router]);

  function handleLoginClick(e: React.MouseEvent) {
    e.preventDefault();
    if (isLoading) {
      // Auth not settled yet, wait for it
      setPendingNav(true);
      return;
    }
    router.push(isAuthenticated ? "/manage/files" : "/signin");
  }
  return (
    <section className="relative min-h-screen pb-32">
      <div className="w-full h-[65vh] md:h-[60vh] relative overflow-visible flex flex-col items-center justify-center bg-[#08090a]">
        <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" aria-hidden="true" style={{ zIndex: 0, overflow: 'visible' }}>
        </svg>

        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(16px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-start px-6 sm:px-16 w-full max-w-[1440px] relative z-10 pt-16 sm:pt-24"
        >
          <h1
            className="text-left text-[clamp(32px,5.5vw,68px)] leading-[1.1] tracking-[-0.03em] text-[#f7f8f8] pb-1 font-medium"
            style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
          >
            The frictionless way to distribute sensitive assets to anyone, anywhere.
          </h1>
          <p className="mt-4 text-[14px] sm:text-[16px] font-light tracking-wide leading-relaxed text-[#898e97] text-left max-w-full sm:whitespace-nowrap">
            The simplest way to host, share, and deliver files without the extra overhead
          </p>
        </motion.div>
        
        
      </div>
    </section>
  );
}

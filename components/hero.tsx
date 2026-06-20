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
    <section className="relative w-full">
      <link rel="preload" as="image" href="https://r2.hypastack.com/cdn/byhhdj097uf6/hero.jpg" fetchPriority="high" />
      <div className="w-full relative overflow-visible flex flex-col items-center justify-start bg-[#08090a] pt-[10vh] sm:pt-[15vh]">
        <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" aria-hidden="true" style={{ zIndex: 0, overflow: 'visible' }}>
        </svg>

        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(16px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-start px-6 sm:px-16 w-full max-w-[1440px] relative z-10 pt-16 sm:pt-24"
        >
          <h1
            className="text-left text-[clamp(28px,4.5vw,56px)] leading-[1.1] tracking-[-0.03em] text-[#f7f8f8] pb-1 font-medium"
            style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
          >
            The frictionless way <span className="text-[#898e97]">to distribute sensitive assets to anyone, anywhere.</span>
          </h1>
          <div className="w-full mt-16 sm:mt-24 lg:mt-32">
            <img 
              src="https://r2.hypastack.com/cdn/byhhdj097uf6/hero.jpg" 
              alt="Hypastack Platform Preview" 
              fetchPriority="high"
              loading="eager"
              className="w-full h-auto object-contain rounded-md"
            />
          </div>
        </motion.div>
        
      </div>
    </section>
  );
}

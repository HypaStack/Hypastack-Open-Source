"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { motion, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { ShineButton } from "@/components/ui/shine-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { useAuth } from "@/hooks/useAuth";

// One-time bouncy blur-in on mount. Driven by a useSpring MotionValue (0 -> 1)
// rather than motion's animate/initial props, which don't tween in this setup.
function PopIn({ children, delay, fromY, className }: { children: ReactNode; delay: number; fromY: number; className?: string }) {
  const p = useSpring(0, { stiffness: 55, damping: 11, mass: 1.1 });
  useEffect(() => {
    const t = setTimeout(() => p.set(1), delay);
    return () => clearTimeout(t);
  }, [p, delay]);
  const opacity = useTransform(p, [0, 0.5], [0, 1]);
  const y = useTransform(p, [0, 1], [fromY, 0]);
  // Drop the filter to "none" once settled — leaving blur(0px) keeps a GPU
  // filter layer that flashes white when the browser re-rasterizes on scroll.
  const filter = useTransform(p, (v) => (v >= 0.999 ? "none" : `blur(${(1 - v) * 16}px)`));
  return (
    <motion.div className={className} style={{ opacity, y, filter }}>
      {children}
    </motion.div>
  );
}

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
      <div className="w-full relative overflow-visible flex flex-col items-center justify-start bg-[#08090a] pt-[20vh] sm:pt-[15vh]">
        <div className="flex flex-col items-start px-6 sm:px-6 w-full max-w-[1200px] relative z-10 pt-6 sm:pt-10">
          <PopIn delay={150} fromY={28} className="w-full">
            <h1
              className="text-left text-[clamp(28px,4.5vw,56px)] leading-[1.1] tracking-[-0.03em] text-[#f7f8f8] pb-1 font-normal"
              style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
            >
              Private file sharing, <span className="text-[#898e97]">encrypted in your browser. Plus a free CDN for everything public.</span>
            </h1>
          </PopIn>
          <PopIn delay={230} fromY={20} className="mt-4 sm:mt-5">
            <div className="flex flex-wrap items-center gap-3">
              <ShineButton size="lg" onClick={handleLoginClick}>
                Get started
              </ShineButton>
              <SecondaryButton href="/pricing" as={Link} size="lg">
                View pricing
              </SecondaryButton>
            </div>
          </PopIn>
        </div>
        
      </div>
    </section>
  );
}

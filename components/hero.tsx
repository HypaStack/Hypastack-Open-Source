"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { motion, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { Button, Chip } from "@heroui/react";
import { ButtonLink } from "@/components/ui/button-link";
import { toPressHandler } from "@/components/ui/button-press";
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
      router.push(isAuthenticated ? "/me/files" : "/signin");
    }
  }, [pendingNav, isLoading, isAuthenticated, router]);

  function handleLoginClick(e: React.MouseEvent) {
    e.preventDefault();
    if (isLoading) {
      // Auth not settled yet, wait for it
      setPendingNav(true);
      return;
    }
    router.push(isAuthenticated ? "/me/files" : "/signin");
  }
  return (
    <section className="relative w-full flex-1 flex">
      <div className="w-full relative overflow-visible flex flex-col items-center justify-center bg-black">
        <div className="flex flex-col items-center px-6 sm:px-6 w-full max-w-[1200px] relative z-10 pt-6 sm:pt-10">
          <PopIn delay={80} fromY={16} className="mb-4">
            <Chip size="sm" variant="soft">V3 | New update | See what&rsquo;s new</Chip>
          </PopIn>
          <PopIn delay={150} fromY={28} className="w-full">
            <h1
              className="text-center text-[clamp(26px,4vw,48px)] leading-[1.1] tracking-[-0.03em] text-[#f7f8f8] pb-1 font-normal"
              style={{ fontFamily: "'Instrument Sans', var(--font-syne), 'Syne', sans-serif" }}
            >
              I&rsquo;m one developer who thinks{" "}
              <span className="inline-flex items-center align-middle isolate">
                <img
                  src="https://r2.hypastack.com/cdn/ycnwp0rcsund/dropbox-logo.png"
                  alt="Dropbox"
                  className="inline-block rounded-full object-cover select-none pointer-events-none relative"
                  style={{ width: "0.85em", height: "0.85em", transform: "rotate(-9deg)", zIndex: 1 }}
                  draggable={false}
                />
                <img
                  src="https://r2.hypastack.com/cdn/i9tog2bv4rtq/google-logo.png"
                  alt="Google"
                  className="inline-block rounded-full object-cover select-none pointer-events-none relative"
                  style={{ width: "0.85em", height: "0.85em", marginLeft: "-0.25em", transform: "rotate(7deg)", zIndex: 2 }}
                  draggable={false}
                />
                <img
                  src="https://r2.hypastack.com/cdn/kghokwn73xbl/microslop-logo.png"
                  alt="Microsoft"
                  className="inline-block rounded-full object-cover select-none pointer-events-none relative"
                  style={{ width: "0.85em", height: "0.85em", marginLeft: "-0.25em", transform: "rotate(-5deg)", zIndex: 3 }}
                  draggable={false}
                />
              </span>
              <br />
              is <em className="italic" style={{ fontStyle: "italic" }}>waaaay</em> too creepy.
            </h1>
          </PopIn>
          <PopIn delay={230} fromY={20} className="mt-4 sm:mt-5">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="primary" size="md" onPress={toPressHandler(handleLoginClick)}>
                Get started
              </Button>
              <ButtonLink href="/pricing" as={Link} variant="tertiary" size="md">
                View pricing
              </ButtonLink>
            </div>
          </PopIn>
        </div>
      </div>
    </section>
  );
}

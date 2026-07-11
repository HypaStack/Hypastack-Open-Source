"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { motion, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { AlertMessage } from "@/components/ui/alert-message";
import { Loader } from "@/components/ui/loader";
import { ShineButton } from "@/components/ui/shine-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { SideRays } from "@/components/ui/side-rays";
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
  const [videoReady, setVideoReady] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  // Navigate once auth resolves after button was clicked
  useEffect(() => {
    if (pendingNav && !isLoading) {
      setPendingNav(false);
      router.push(isAuthenticated ? "/manage/files" : "/signin");
    }
  }, [pendingNav, isLoading, isAuthenticated, router]);

  // Don't ship the heavy video to phones — render a note instead.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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
      <link rel="preload" as="video" href="https://r2.hypastack.com/cdn/heroassets/hero.mp4" />
      <div className="w-full relative overflow-visible flex flex-col items-center justify-start bg-[#08090a] pt-[10vh] sm:pt-[15vh]">
        <div className="hidden md:block absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <SideRays
            speed={3.4}
            rayColor1="#eab308"
            rayColor2="#96c8ff"
            intensity={1.8}
            spread={3}
            origin="top-left"
            tilt={0}
            saturation={0.45}
            blend={1}
            falloff={1.6}
            opacity={0.28}
          />
        </div>
        <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" aria-hidden="true" style={{ zIndex: 0, overflow: 'visible' }}>
        </svg>

        <div className="flex flex-col items-start px-6 sm:px-6 w-full max-w-[1200px] relative z-10 pt-6 sm:pt-10">
          <PopIn delay={80} fromY={18} className="mb-5">
            <a href="https://streamduck.site/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <AlertMessage
                rgb="79, 70, 229"
                animate={false}
                icon={null}
                style={{ display: "inline-flex", alignItems: "flex-start", marginBottom: 0, fontSize: 13, lineHeight: "18px", cursor: "pointer", color: "#c7d2fe" }}
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">Check out Streamduck!</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider leading-none px-1.5 py-[2px] rounded-[2px] bg-[rgba(99,102,241,0.35)]">Partnership</span>
                </span>
                <span className="block text-[11px] opacity-70 mt-0.5">Free Movie Streaming Forever</span>
              </AlertMessage>
            </a>
          </PopIn>
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
          <PopIn delay={320} fromY={44} className="w-full mt-28 sm:mt-40">
            <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
              {/* Ambient glow: a blurred copy of the video bleeding its own colours
                  around the card edges, so the glow always matches and blends. */}
              {isMobile === false && videoReady && (
                <video
                  src="https://r2.hypastack.com/cdn/heroassets/hero.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  aria-hidden="true"
                  tabIndex={-1}
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                  style={{ filter: "blur(55px) saturate(1.7) brightness(1.5)", transform: "scale(1.08)", opacity: 0.6, zIndex: 0 }}
                />
              )}
              <div className="absolute inset-0 z-10 rounded-[14px] overflow-hidden bg-[#0e0f10]">
                {isMobile === true ? (
                  <div className="absolute inset-0 flex items-center justify-center text-center px-8">
                    <p className="text-[14px] leading-relaxed text-[#898e97] max-w-[320px]">
                      You're on mobile so we couldn't load this video for you to ensure a smooth experience
                    </p>
                  </div>
                ) : (
                  <>
                    {!videoReady && (
                      <div className="absolute inset-0 flex items-center justify-center text-[#898e97]">
                        <Loader size={34} />
                      </div>
                    )}
                    {isMobile === false && (
                      <video
                        src="https://r2.hypastack.com/cdn/heroassets/hero.mp4"
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        onCanPlay={() => setVideoReady(true)}
                        aria-label="Hypastack dashboard with encrypted file sharing and CDN asset hosting"
                        className="w-full h-full object-cover select-none pointer-events-none"
                        style={{ opacity: videoReady ? 1 : 0, transition: "opacity 0.6s ease-out" }}
                        draggable={false}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </PopIn>
        </div>
        
      </div>
    </section>
  );
}

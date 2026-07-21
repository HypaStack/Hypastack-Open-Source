"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import { motion, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { Loader } from "@/components/ui/loader";
import { MIcon } from "@/components/ui/material-icon";
import { ShineButton } from "@/components/ui/shine-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { useAuth } from "@/hooks/useAuth";
import { GRAIN_TEXTURE } from "@/constants";

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
  // Mobile opt-in: user tapped "Load regardless" to pull the heavy video anyway.
  const [forceLoad, setForceLoad] = useState(false);
  const showVideo = isMobile === false || forceLoad;

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
      <div className="w-full relative overflow-visible flex flex-col items-center justify-start bg-[#0d0e10] pt-[20vh] sm:pt-[15vh]">
        <div className="flex flex-col items-start px-6 sm:px-6 w-full max-w-[1200px] relative z-10 pt-6 sm:pt-10">
          <PopIn delay={80} fromY={18} className="mb-5">
            <Link
              href="https://github.com/HypaStack/Hypastack-Open-Source/commits/main"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] transition-colors py-1 pl-1 pr-3 no-underline"
            >
              {/* Mirrors ShineButton's primary gloss — a span rather than the
                  component itself, since a nested <a>/<button> is invalid here. */}
              <span
                className="inline-flex items-center gap-1 rounded-full text-white"
                style={{
                  height: 22,
                  padding: "0 9px",
                  fontSize: 11,
                  fontWeight: 500,
                  backgroundColor: "#2680bf",
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.12), rgba(255,255,255,0))",
                  borderTop: "1px solid rgba(255,255,255,0.6)",
                  boxShadow:
                    "rgba(0,0,0,0.05) 0px 1px 0px 0px, rgba(0,0,0,0.1) 0px 4px 4px 0px, rgba(0,0,0,0.15) 0px 10px 10px 0px, rgba(0,0,0,0.4) 0px -2px 0px 0px inset",
                }}
              >
                <MIcon name="celebration" size={12} />
                NEW
              </span>
              <span className="text-[13px] text-[#c9ced6]">Read our changelog</span>
            </Link>
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
              <ShineButton size="md" onClick={handleLoginClick}>
                Get started
              </ShineButton>
              <SecondaryButton href="/pricing" as={Link} size="md">
                View pricing
              </SecondaryButton>
            </div>
          </PopIn>
          <PopIn delay={320} fromY={44} className="w-full mt-28 sm:mt-40">
            <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
              {/* Ambient glow: a blurred copy of the video bleeding its own colours
                  around the card edges, so the glow always matches and blends. */}
              {showVideo && videoReady && (
                <video
                  src="https://r2.hypastack.com/cdn/heroassets/hero.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  aria-hidden="true"
                  tabIndex={-1}
                  draggable={false}
                  className="pointer-events-none select-none absolute inset-0 h-full w-full object-cover"
                  style={{ filter: "blur(40px) saturate(1.7) brightness(1.5)", transform: "scale(1.03)", opacity: 0.6, zIndex: 0 }}
                />
              )}
              <div className="absolute inset-0 z-10 rounded-[14px] overflow-hidden bg-[#0e0f10]">
                {isMobile === true && !forceLoad ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-4 px-8">
                    <p className="text-[14px] leading-relaxed text-[#898e97] max-w-[320px]">
                      You're on mobile so we couldn't load this video for you to ensure a smooth experience
                    </p>
                    <SecondaryButton size="sm" onClick={() => setForceLoad(true)}>
                      Load regardless
                    </SecondaryButton>
                  </div>
                ) : (
                  <>
                    {!videoReady && (
                      <div className="absolute inset-0 flex items-center justify-center text-[#898e97]">
                        <Loader size={34} />
                      </div>
                    )}
                    {showVideo && (
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
              {showVideo && videoReady && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-20 rounded-[14px]"
                  style={{
                    backgroundImage: GRAIN_TEXTURE,
                    backgroundRepeat: "repeat",
                    backgroundSize: "160px 160px",
                    mixBlendMode: "soft-light",
                    opacity: 0.5,
                  }}
                />
              )}
            </div>
          </PopIn>
        </div>
        
      </div>
    </section>
  );
}

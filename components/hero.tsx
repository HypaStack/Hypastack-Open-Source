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
      <div className="w-full h-[65vh] md:h-[60vh] relative overflow-visible flex flex-col items-center justify-center bg-[#08090a] border-b border-[rgba(255,255,255,0.05)]">
        <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" aria-hidden="true" style={{ zIndex: 0, overflow: 'visible' }}>
          <defs>
            <radialGradient id="grid-fade" cx="50%" cy="50%" r="50%">
              <stop offset="20%" stopColor="white" />
              <stop offset="100%" stopColor="black" />
            </radialGradient>
            <mask id="grid-mask">
              <rect width="100%" height="100%" fill="url(#grid-fade)" />
            </mask>
            <linearGradient id="line-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" />
              <stop offset="60%" stopColor="white" />
              <stop offset="100%" stopColor="black" />
            </linearGradient>
            <mask id="extended-line-mask">
              <rect x="-50vw" y="0" width="200vw" height="400vh" fill="url(#line-fade)" />
            </mask>
            <pattern id="hero-small-grid" width="60" height="60" patternUnits="userSpaceOnUse" x="50%">
              <rect width="60" height="60" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="1" shapeRendering="crispEdges" />
            </pattern>
            <pattern id="hero-large-grid" width="360" height="360" patternUnits="userSpaceOnUse" x="50%">
              <rect width="360" height="360" fill="url(#hero-small-grid)" />
              <rect x="60" y="60" width="60" height="60" fill="rgba(0,0,0,0.03)" />
              <rect x="240" y="120" width="60" height="60" fill="rgba(0,0,0,0.03)" />
              <rect x="120" y="240" width="60" height="60" fill="rgba(0,0,0,0.03)" />
              <rect x="300" y="0" width="60" height="60" fill="rgba(0,0,0,0.03)" />
              <rect x="0" y="180" width="60" height="60" fill="rgba(0,0,0,0.03)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-large-grid)" mask="url(#grid-mask)" />
        </svg>
        <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" aria-hidden="true" style={{ zIndex: 50, overflow: 'visible' }}>
          <defs>
            <linearGradient id="rail-fade-up" x1="0" y1="30%" x2="0" y2="100%" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
            </linearGradient>
            <linearGradient id="mask-fade-up" x1="0" y1="30%" x2="0" y2="100%" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(255,255,255,1)" />
            </linearGradient>
            <mask id="fade-mask">
              <rect width="100%" height="100%" fill="url(#mask-fade-up)" />
            </mask>
            <pattern id="dot-pattern" width="15" height="15" patternUnits="userSpaceOnUse" x="50%">
              <circle cx="7.5" cy="7.5" r="1.5" fill="rgba(0,0,0,0.1)" />
            </pattern>
          </defs>
          <line x1="calc(50% - 600px)" y1="30%" x2="calc(50% - 600px)" y2="100%" stroke="url(#rail-fade-up)" strokeWidth="1" shapeRendering="crispEdges" />
          <line x1="calc(50% + 600px)" y1="30%" x2="calc(50% + 600px)" y2="100%" stroke="url(#rail-fade-up)" strokeWidth="1" shapeRendering="crispEdges" />
          <line x1="calc(50% - 600px)" y1="100%" x2="calc(50% - 600px)" y2="99999px" stroke="rgba(0,0,0,0.08)" strokeWidth="1" shapeRendering="crispEdges" />
          <line x1="calc(50% + 600px)" y1="100%" x2="calc(50% + 600px)" y2="99999px" stroke="rgba(0,0,0,0.08)" strokeWidth="1" shapeRendering="crispEdges" />
        </svg>

        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(16px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center px-4 relative z-10"
        >
          <a
            href="https://t.me/hypastack"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 inline-flex items-center gap-2 hover:bg-[#f5f5f5] active:scale-[0.97] transition-all duration-75"
            style={{ height: 30, paddingLeft: 16, paddingRight: 20, borderRadius: 15, fontSize: 13, fontWeight: 500, color: '#171717', backgroundColor: '#ffffff', border: '1px solid #e5e5e5' }}
          >
            <MIcon name="chat" size={14} style={{ color: '#666' }} />
            <div className="w-[1px] h-3.5 bg-[#e5e5e5]" />
            <span>Join our Telegram channel</span>
          </a>
          <h1
            className="text-center text-[clamp(24px,4vw,46px)] leading-[1.1] tracking-[-0.03em] whitespace-nowrap text-[#000] pb-1 font-medium"
            style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
          >
            Private sharing made simple
          </h1>
          <p className="mt-3 text-[15px] sm:text-[18px] font-light tracking-wide leading-relaxed text-[#525252] text-center">
            A secure CDN and file-sharing tool for when you need to get stuff from <br />point A to point B without any extra hoops to jump through.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mt-8 sm:mt-10 w-full sm:w-auto px-4 sm:px-0">
            <Button href="/signin" onClick={handleLoginClick} variant="primary" size="md" className="w-full sm:w-[140px]">
              Start for free
            </Button>
            <Button href="#features" variant="secondary" size="md" className="w-full sm:w-[140px]">
              Learn more
            </Button>
          </div>
        </motion.div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          className="hidden md:block"
          style={{ position: 'absolute', bottom: -48, left: 0, width: '100%', height: 48, zIndex: 1 }}
          aria-hidden="true"
        >
          <path
            d="M 0 0 L 480 0 C 495 0 512 44 528 44 L 912 44 C 928 44 945 0 960 0 L 1440 0 Z"
            fill="#ffffff"
          />
          <path
            d="M 480 0 C 495 0 512 44 528 44 L 912 44 C 928 44 945 0 960 0"
            fill="none"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="absolute left-0 right-0 flex flex-wrap justify-center items-center gap-2 z-20 px-4 bottom-6 md:bottom-auto md:top-[calc(100%+2px)]"
        >
          <a
            href="https://github.com/HypaStack/Hypastack-Open-Source"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:bg-[#f0f1f5] active:scale-[0.97] transition-all duration-75"
            style={{ height: 32, paddingLeft: 11, paddingRight: 11, borderRadius: 9, fontSize: 13, fontWeight: 500, color: '#171717', backgroundColor: '#ffffff', border: '1px solid #e5e5e5', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}
          >
            <img src="https://r2.hypastack.com/cdn/tniuzl9r383i/GitHub_Invertocat_Black.svg" alt="" className="w-[14px] h-[14px] select-none" draggable={false} />
            <span>We're open source</span>
          </a>
          <a
            href="https://hypastack.com/d/987vw0zy#key=9OU2rAIyA3j3Eye90DrxYoimxWbNCcycuyT6LNn7_BA"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:bg-[#e8e9ee] active:scale-[0.97] transition-all duration-75"
            style={{ height: 32, paddingLeft: 11, paddingRight: 11, borderRadius: 9, fontSize: 13, fontWeight: 500, color: '#171717', backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}
          >
            <MIcon name="desktop_windows" size={13} style={{ color: '#171717' }} />
            <span>Download for Windows</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import { MIcon } from "@/components/ui/material-icon";

export function Hero() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <section className="relative min-h-screen pb-32">

      {/* Outer vertical rails moved into the SVG below to share the fade up effect */}

      {/* Dot pattern fill between inner rail (±600px) and outer rail (±720px) moved into SVG below */}

      {/* ── Panel (in normal flow, stays at top) ── */}
      <div className="w-full h-[65vh] md:h-[60vh] relative overflow-visible flex flex-col items-center justify-center bg-[#ffffff] border-b border-[rgba(0,0,0,0.1)]">
        {/* Subtle Grid Background */}
        {/* Subtle Grid Background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" aria-hidden="true" style={{ zIndex: 0, overflow: 'visible' }}>
          <defs>
            <radialGradient id="grid-fade" cx="50%" cy="50%" r="50%">
              <stop offset="20%" stopColor="white" />
              <stop offset="100%" stopColor="black" />
            </radialGradient>
            <mask id="grid-mask">
              <rect width="100%" height="100%" fill="url(#grid-fade)" />
            </mask>
            
            {/* Linear gradient mask for the extended vertical lines so they fade cleanly at the bottom */}
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

        {/* Top-level overlay SVG for vertical rails to ensure they sit above white card backgrounds */}
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
          
          {/* Fading portion inside the hero */}
          <line x1="calc(50% - 600px)" y1="30%" x2="calc(50% - 600px)" y2="100%" stroke="url(#rail-fade-up)" strokeWidth="1" shapeRendering="crispEdges" />
          <line x1="calc(50% + 600px)" y1="30%" x2="calc(50% + 600px)" y2="100%" stroke="url(#rail-fade-up)" strokeWidth="1" shapeRendering="crispEdges" />
          
          {/* Solid portion extending downwards */}
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
            href="https://discord.gg/CFD7G4SK"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 inline-flex items-center gap-2 hover:bg-[#f5f5f5] active:scale-[0.97] transition-all duration-75"
            style={{ height: 30, paddingLeft: 16, paddingRight: 20, borderRadius: 15, fontSize: 13, fontWeight: 500, color: '#171717', backgroundColor: '#ffffff', border: '1px solid #e5e5e5' }}
          >
            <MIcon name="terminal_2" size={14} style={{ color: '#666' }} />
            <div className="w-[1px] h-3.5 bg-[#e5e5e5]" />
            <span>Join our insider program</span>
          </a>

          <h1
            className="text-center text-[clamp(24px,4vw,46px)] leading-[1.1] tracking-[-0.03em] whitespace-nowrap text-[#000] pb-1 font-medium"
            style={{ 
              fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif"
            }}
          >
            Privacy, the way it should be.
          </h1>
          <p className="mt-3 text-[15px] sm:text-[18px] font-light tracking-wide leading-relaxed text-[#525252] text-center">
            Hypastack is the modern CDN and File Sharing platform<br/>for developers, creators, and more.
          </p>

          {/* CTA buttons — directly below description */}
          {!isLoading && (
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mt-8 sm:mt-10 w-full sm:w-auto px-4 sm:px-0">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/manage/dashboard"
                    className="flex items-center justify-center hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75 w-full sm:w-[130px]"
                    style={{ height: 40, borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#ffffff', backgroundColor: '#030303' }}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/manage/files"
                    className="flex items-center justify-center hover:bg-[#f0f1f5] active:scale-[0.97] transition-all duration-75 w-full sm:w-[130px]"
                    style={{ height: 40, borderRadius: 10, fontSize: 14, fontWeight: 500, color: '#171717', backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.1)' }}
                  >
                    Share
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/new"
                    className="flex items-center justify-center hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75 w-full sm:w-[140px]"
                    style={{ height: 40, borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#ffffff', backgroundColor: '#030303' }}
                  >
                    Start for free
                  </Link>
                  <Link
                    href="/signin"
                    className="flex items-center justify-center hover:bg-[#f0f1f5] active:scale-[0.97] transition-all duration-75 w-full sm:w-[140px]"
                    style={{ height: 40, borderRadius: 10, fontSize: 14, fontWeight: 500, color: '#171717', backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.1)' }}
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* Seamless SVG notch at panel bottom */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          className="hidden md:block"
          style={{ position: 'absolute', bottom: -48, left: 0, width: '100%', height: 48, zIndex: 1 }}
          aria-hidden="true"
        >
          {/* Fill */}
          <path
            d="M 0 0 L 480 0 C 495 0 512 44 528 44 L 912 44 C 928 44 945 0 960 0 L 1440 0 Z"
            fill="#ffffff"
          />
          {/* Border — only the notch curves + flat bottom */}
          <path
            d="M 480 0 C 495 0 512 44 528 44 L 912 44 C 928 44 945 0 960 0"
            fill="none"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* ── Notch buttons ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="absolute left-0 right-0 flex flex-wrap justify-center items-center gap-2 z-20 px-4 bottom-6 md:bottom-auto md:top-[calc(100%+2px)]"
        >
          {/* We're opensource */}
          <a
            href="https://github.com/HypaStack/Hypastack-Open-Source"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:bg-[#f0f1f5] active:scale-[0.97] transition-all duration-75"
            style={{ height: 32, paddingLeft: 11, paddingRight: 11, borderRadius: 9, fontSize: 13, fontWeight: 500, color: '#171717', backgroundColor: '#ffffff', border: '1px solid #e5e5e5', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}
          >
            <MIcon name="bug_report" size={14} style={{ color: '#171717' }} />
            <span>We&apos;re open source</span>
          </a>

          {/* Download for Windows */}
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

          {/* Learn more */}
          {(!isLoading && !isAuthenticated) && (
            <a
              href="#features"
              className="inline-flex items-center justify-center hover:bg-[#e8e9ee] active:scale-[0.97] transition-all duration-75"
              style={{ height: 32, paddingLeft: 13, paddingRight: 13, borderRadius: 9, fontSize: 13, fontWeight: 500, color: '#171717', backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}
            >
              Learn more
            </a>
          )}
        </motion.div>
      </div>

    </section>
  );
}

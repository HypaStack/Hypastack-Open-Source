"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import { MIcon } from "@/components/ui/material-icon";

export function Hero() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <section className="relative min-h-screen pb-32">

      {/* Outer vertical rails — 2 grid cells (120px) outside the hero rails, starting at hero bottom */}
      <div className="hidden md:block absolute pointer-events-none" style={{ left: 'calc(50% - 720px)', top: '60vh', width: 1, height: 10000, backgroundColor: 'rgba(0,0,0,0.08)' }} />
      <div className="hidden md:block absolute pointer-events-none" style={{ left: 'calc(50% + 720px)', top: '60vh', width: 1, height: 10000, backgroundColor: 'rgba(0,0,0,0.08)' }} />

      {/* Dot pattern fill between inner rail (±600px) and outer rail (±720px) */}
      <div className="hidden md:block absolute pointer-events-none" style={{ left: 'calc(50% - 720px)', top: '60vh', width: 120, height: 10000, backgroundImage: 'radial-gradient(rgba(0,0,0,0.1) 1.5px, transparent 1.5px)', backgroundSize: '15px 15px', backgroundPosition: '0 0' }} />
      <div className="hidden md:block absolute pointer-events-none" style={{ left: 'calc(50% + 600px)', top: '60vh', width: 120, height: 10000, backgroundImage: 'radial-gradient(rgba(0,0,0,0.1) 1.5px, transparent 1.5px)', backgroundSize: '15px 15px', backgroundPosition: '0 0' }} />

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
              <rect width="60" height="60" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1" shapeRendering="crispEdges" />
            </pattern>
            <pattern id="hero-large-grid" width="360" height="360" patternUnits="userSpaceOnUse" x="50%">
              <rect width="360" height="360" fill="url(#hero-small-grid)" />
              <rect x="60" y="60" width="60" height="60" fill="rgba(0,0,0,0.07)" />
              <rect x="240" y="120" width="60" height="60" fill="rgba(0,0,0,0.07)" />
              <rect x="120" y="240" width="60" height="60" fill="rgba(0,0,0,0.07)" />
              <rect x="300" y="0" width="60" height="60" fill="rgba(0,0,0,0.07)" />
              <rect x="0" y="180" width="60" height="60" fill="rgba(0,0,0,0.07)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-large-grid)" mask="url(#grid-mask)" />

        </svg>

        {/* Top-level overlay SVG for vertical rails to ensure they sit above white card backgrounds */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" aria-hidden="true" style={{ zIndex: 50, overflow: 'visible' }}>
          <line x1="calc(50% - 600px)" y1="100%" x2="calc(50% - 600px)" y2="99999px" stroke="rgba(0,0,0,0.08)" strokeWidth="1" shapeRendering="crispEdges" />
          <line x1="calc(50% + 600px)" y1="100%" x2="calc(50% + 600px)" y2="99999px" stroke="rgba(0,0,0,0.08)" strokeWidth="1" shapeRendering="crispEdges" />
        </svg>

        {/* Headline + description + CTA centred inside panel */}
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(16px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center px-4 relative z-10"
        >
          <h1
            className="text-center text-[clamp(26px,4.5vw,52px)] leading-[1.1] tracking-[-0.03em] whitespace-nowrap text-transparent bg-clip-text pb-1"
            style={{ 
              fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", 
              fontWeight: 700,
              backgroundImage: 'linear-gradient(to bottom, #737373 0%, #000000 100%)',
              backgroundSize: '100% 1.3em'
            }}
          >
            Privacy, the way it should be.
          </h1>
          <p className="mt-3 text-[15px] sm:text-[16px] leading-relaxed text-[#525252] text-center">
            Encrypted sharing and permanent CDN hosting — no tracking, no data collection.
          </p>

          {/* CTA buttons — directly below description */}
          {!isLoading && (
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mt-8 sm:mt-10 w-full sm:w-auto px-4 sm:px-0">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/manage/dashboard"
                    className="flex items-center justify-center hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75 w-full sm:w-[160px]"
                    style={{ height: 46, borderRadius: 12, fontSize: 15, fontWeight: 600, color: '#ffffff', backgroundColor: '#030303' }}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/manage/files"
                    className="flex items-center justify-center hover:bg-[#f0f1f5] active:scale-[0.97] transition-all duration-75 w-full sm:w-[160px]"
                    style={{ height: 46, borderRadius: 12, fontSize: 15, fontWeight: 500, color: '#171717', backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.1)' }}
                  >
                    Share
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/new"
                    className="flex items-center justify-center hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75 w-full sm:w-[180px]"
                    style={{ height: 46, borderRadius: 12, fontSize: 15, fontWeight: 600, color: '#ffffff', backgroundColor: '#030303' }}
                  >
                    Start for free
                  </Link>
                  <Link
                    href="/signin"
                    className="flex items-center justify-center hover:bg-[#f0f1f5] active:scale-[0.97] transition-all duration-75 w-full sm:w-[180px]"
                    style={{ height: 46, borderRadius: 12, fontSize: 15, fontWeight: 500, color: '#171717', backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.1)' }}
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12c0-5.523-4.477-10-10-10z" />
            </svg>
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

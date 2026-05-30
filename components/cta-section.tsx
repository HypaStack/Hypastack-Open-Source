"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import { MIcon } from "@/components/ui/material-icon";

export function CtaSection() {
  const { user, isAuthenticated } = useAuth();

  return (
    <section className="mt-32 sm:mt-48 lg:mt-64 relative flex flex-col items-center overflow-visible">

      {/* The Block */}
      <div className="relative w-full max-w-[1200px] flex flex-col bg-[#ffffff] z-[60] border-y border-r border-[rgba(0,0,0,0.15)] border-r-[rgba(0,0,0,0.08)]">
        {/* Horizontal extending lines */}
        <div className="absolute top-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
        <div className="absolute top-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
        <div className="absolute bottom-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
        <div className="absolute bottom-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />

        {/* Corner dots */}
        <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, zIndex: 200, top: -5, left: -5 }} />
        <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, zIndex: 200, top: -5, right: -5 }} />
        <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, zIndex: 200, bottom: -5, left: -5 }} />
        <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, zIndex: 200, bottom: -5, right: -5 }} />
        {/* Outer rail dots */}
        <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 2, zIndex: 200, top: -5, left: -125 }} />
        <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 2, zIndex: 200, top: -5, right: -125 }} />
        <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 2, zIndex: 200, bottom: -5, left: -125 }} />
        <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 2, zIndex: 200, bottom: -5, right: -125 }} />



        {/* Subtle corner gradients inside the block */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div 
            className="absolute top-0 left-0 w-[500px] sm:w-[800px] h-[300px] sm:h-[400px]"
            style={{
              background: 'radial-gradient(100% 100% at 0% 0%, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)',
              filter: 'blur(60px)'
            }}
          />
          <div 
            className="absolute bottom-0 right-0 w-[500px] sm:w-[800px] h-[300px] sm:h-[400px]"
            style={{
              background: 'radial-gradient(100% 100% at 100% 100%, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)',
              filter: 'blur(60px)'
            }}
          />
        </div>

        <div className="w-full px-8 sm:px-16 pt-16 pb-16 text-left relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl"
          >
            {isAuthenticated && user ? (
              <>
                <h2
                  className="text-[clamp(32px,5vw,52px)] tracking-[-0.03em] leading-[1.05] text-transparent bg-clip-text pb-1 flex items-center gap-3 sm:gap-4"
                  style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", fontWeight: 700, backgroundImage: 'linear-gradient(to bottom, #737373 0%, #000000 100%)' }}
                >
                  <MIcon name="verified" size="1em" className="tracking-normal shrink-0 text-[#171717]" />
                  <div className="flex-1 min-w-0 truncate">
                    <span>Welcome back, </span>
                    <span className="text-[#171717] underline decoration-[rgba(0,0,0,0.2)] underline-offset-[0.1em]">{user.nickname}</span>
                    <span className="text-[#a3a3a3]">.</span>
                  </div>
                </h2>
                <p className="mt-4 text-[16px] sm:text-[18px] leading-relaxed text-[#525252]">
                  Everything&apos;s where you left it. Upload something, check your links, or just look around.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Link
                    href="/manage/dashboard"
                    className="hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75 flex justify-center items-center text-center"
                    style={{ height: 44, paddingLeft: 24, paddingRight: 24, borderRadius: 12, fontSize: 15, fontWeight: 600, color: '#ffffff', backgroundColor: '#030303' }}
                  >
                    Go to Dashboard
                  </Link>
                  <Link
                    href="/manage/files"
                    className="inline-flex justify-center items-center hover:bg-[#f0f1f5] active:scale-[0.97] transition-all duration-75 text-center"
                    style={{ height: 44, paddingLeft: 20, paddingRight: 20, borderRadius: 12, fontSize: 15, fontWeight: 500, color: '#171717', backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.15)' }}
                  >
                    My Files
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h2
                  className="text-[clamp(32px,5vw,52px)] tracking-[-0.03em] leading-[1.05] text-transparent bg-clip-text pb-1 whitespace-nowrap"
                  style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", fontWeight: 700, backgroundImage: 'linear-gradient(to bottom, #737373 0%, #000000 100%)' }}
                >
                  Secure sharing. Zero tracking.
                </h2>
                <p className="mt-4 text-[16px] sm:text-[18px] leading-relaxed text-[#525252]">
                  Set up an account in seconds. Share files securely and host CDNs indefinitely.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Link
                    href="/new"
                    className="hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75 flex justify-center items-center text-center"
                    style={{ height: 44, paddingLeft: 24, paddingRight: 24, borderRadius: 12, fontSize: 15, fontWeight: 600, color: '#ffffff', backgroundColor: '#030303' }}
                  >
                    Register
                  </Link>
                  <Link
                    href="/signin"
                    className="inline-flex justify-center items-center hover:bg-[#f0f1f5] active:scale-[0.97] transition-all duration-75 text-center"
                    style={{ height: 44, paddingLeft: 20, paddingRight: 20, borderRadius: 12, fontSize: 15, fontWeight: 500, color: '#171717', backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.15)' }}
                  >
                    Sign in
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-24 sm:h-32 w-full" />
    </section>
  );
}

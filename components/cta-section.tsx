"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import { MIcon } from "@/components/ui/material-icon";

export function CtaSection() {
  const { user, isAuthenticated } = useAuth();

  return (
    <section className="mt-32 sm:mt-48 lg:mt-64 relative flex flex-col items-center overflow-visible">

      <div className="relative w-full max-w-[1200px]">
      {/* The Block */}
      <div className="relative w-full flex flex-col bg-[#ffffff] z-[60] border-y border-r border-[rgba(0,0,0,0.15)] border-r-[rgba(0,0,0,0.08)]">
        {/* Horizontal extending lines */}
        <div className="absolute top-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
        <div className="absolute top-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
        <div className="absolute bottom-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
        <div className="absolute bottom-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />

        {/* Corner dots moved to wrapper level */}






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
                  className="text-[clamp(32px,5vw,52px)] tracking-[-0.03em] leading-[1.05] text-[#000] pb-1 flex items-center gap-3 sm:gap-4 font-medium"
                  style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
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
                  className="text-[clamp(32px,5vw,52px)] tracking-[-0.03em] leading-[1.05] text-[#000] pb-1 whitespace-nowrap font-medium"
                  style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
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
      {/* All 4 corner dots AFTER block — siblings in same stacking context, z-300 > z-60 */}
      <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, zIndex: 300, top: -5, left: -5 }} />
      <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, zIndex: 300, top: -5, right: -5 }} />
      <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, zIndex: 300, bottom: -5, left: -5 }} />
      <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, zIndex: 300, bottom: -5, right: -5 }} />
      </div>
    </section>
  );
}

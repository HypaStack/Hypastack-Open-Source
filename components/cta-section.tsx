"use client";

import { motion } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import { MIcon } from "@/components/ui/material-icon";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="mt-32 sm:mt-48 lg:mt-64 relative flex flex-col items-center overflow-visible">

      <div className="relative w-full max-w-[1200px]">
      <div className="relative w-full flex flex-col bg-[#08090a] z-[60] border-y border-r border-[rgba(0,0,0,0.08)] border-r-[rgba(0,0,0,0.08)]">
        <div className="hidden md:block">
          <div className="absolute top-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
          <div className="absolute top-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
          <div className="absolute bottom-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
          <div className="absolute bottom-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
        </div>

        <div className="w-full px-8 sm:px-16 pt-16 pb-16 text-left relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl"
          >
            {isAuthenticated ? (
              <>
                <h2
                  className="text-[clamp(32px,5vw,52px)] tracking-[-0.03em] leading-[1.05] text-[#f7f8f8] pb-1 flex items-center gap-3 sm:gap-4 font-medium"
                  style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
                >
                  <MIcon name="verified" size="1em" className="tracking-normal shrink-0 text-[#171717]" />
                  <div className="flex-1 min-w-0 truncate">
                    <span>Welcome back!</span>
                  </div>
                </h2>
                <p className="mt-4 text-[16px] sm:text-[18px] leading-relaxed text-[#898e97]">
                  We kept everything exactly where you left it, Probably. You should probably click the Dashboard button to check.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Button href="/manage" variant="primary" size="lg">
                    Go to Dashboard
                  </Button>
                  <Button href="/manage/files" variant="secondary" size="lg">
                    My Files
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2
                  className="text-[clamp(32px,5vw,52px)] tracking-[-0.03em] leading-[1.05] text-[#f7f8f8] pb-1 whitespace-nowrap font-medium"
                  style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
                >
                  Wanna check it out?
                </h2>
                <p className="mt-4 text-[16px] sm:text-[18px] leading-relaxed text-[#898e97]">
                  Set up an account in seconds, Share files securely and host CDNs indefinitely.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Button href="/new" variant="primary" size="lg">
                    Register
                  </Button>
                  <Button href="/signin" variant="secondary" size="lg">
                    Sign in
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
      <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#08090a', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, zIndex: 300, top: -5, left: -5 }} />
      <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#08090a', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, zIndex: 300, top: -5, right: -5 }} />
      <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#08090a', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, zIndex: 300, bottom: -5, left: -5 }} />
      <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#08090a', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, zIndex: 300, bottom: -5, right: -5 }} />
      </div>
    </section>
  );
}

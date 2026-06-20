"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

// static dotted bg
function StaticDots() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    >
      <defs>
        <pattern id="static-dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="8" cy="8" r="1" fill="rgba(0,0,0,0.12)" />
        </pattern>
        <radialGradient id="dots-fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="white" stopOpacity="1" />
        </radialGradient>
        <mask id="dots-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect width="100%" height="100%" fill="url(#dots-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#static-dots)" mask="url(#dots-mask)" />
    </svg>
  );
}

// top lines only
function BlockLinesTop() {
  return (
    <div className="hidden md:block">
      <div className="absolute top-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
      <div className="absolute top-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
      <div className="absolute bottom-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
      <div className="absolute bottom-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
    </div>
  );
}

// bottom lines only
function BlockLinesBottom() {
  return (
    <div className="hidden md:block">
      <div className="absolute bottom-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
      <div className="absolute bottom-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
    </div>
  );
}

// all 4 corners
function CornerDots() {
  const s = { width: 10, height: 10, backgroundColor: '#08090a', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, zIndex: 200, position: 'absolute' as const };
  const base = "hidden md:block pointer-events-none";
  return (
    <>
      <div className={base} style={{ ...s, top: -5, left: -5 }} />
      <div className={base} style={{ ...s, top: -5, right: -5 }} />
      <div className={base} style={{ ...s, bottom: -5, left: -5 }} />
      <div className={base} style={{ ...s, bottom: -5, right: -5 }} />
    </>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative flex flex-col items-center">
      <div className="mt-0 relative w-full max-w-[1200px] flex flex-col bg-[#08090a] z-[60] border-y border-r border-[rgba(0,0,0,0.08)]">
        <BlockLinesTop />
        <CornerDots />
        <div className="w-full px-6 sm:px-16 pt-12 sm:pt-16 pb-12 sm:pb-14 text-left relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-xl relative z-10"
          >
            <h2
              className="text-[clamp(24px,4vw,40px)] leading-[1.1] tracking-[-0.03em] text-[#f7f8f8] pb-1 font-medium"
              style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
            >
              A simple way to share files.
            </h2>
            <p className="mt-4 text-[15px] sm:text-[17px] leading-relaxed text-[#898e97]">
              Get an encrypted link for whatever you're sending. You don't need to sign up, and the person on the other end just needs the link.
            </p>
            <Button href="/new" variant="primary" size="lg" className="mt-8">
              Try it now
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="relative w-full max-w-[1200px] mt-12 sm:mt-24">
        <div className="relative w-full flex flex-col bg-[#08090a] z-[60] border-y border-r border-[rgba(0,0,0,0.08)]">
          <BlockLinesTop />
          <BlockLinesBottom />

          <div className="w-full px-6 sm:px-16 pt-12 sm:pt-16 pb-12 sm:pb-14 text-left relative overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-xl relative z-10"
            >
              <h2
                className="text-[clamp(24px,4vw,40px)] leading-[1.1] tracking-[-0.03em] text-[#f7f8f8] pb-1 font-medium"
                style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
              >
                Trust the code not the company.
              </h2>
              <p className="mt-4 text-[15px] sm:text-[17px] leading-relaxed text-[#898e97]">
                Every line of our code is public. Inspect our architecture, audit our security, or host it yourself. We believe trust is earned through complete transparency.
              </p>
              <Button href="https://github.com/hypastack" target="_blank" rel="noopener noreferrer" variant="primary" size="lg" className="mt-8">
                Source code
              </Button>
            </motion.div>
          </div>
        </div>
        <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#08090a', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, zIndex: 300, top: -5, left: -5 }} />
        <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#08090a', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, zIndex: 300, top: -5, right: -5 }} />
        <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#08090a', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, zIndex: 300, bottom: -5, left: -5 }} />
        <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#08090a', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, zIndex: 300, bottom: -5, right: -5 }} />
      </div>
      <div className="relative w-full max-w-[1200px] mt-12 sm:mt-24">
        <div className="relative w-full flex flex-col bg-[#08090a] z-[60] border-y border-r border-[rgba(0,0,0,0.08)]">
          <StaticDots />
          <div className="w-full px-6 sm:px-16 py-12 sm:py-20 relative z-10">
            <div className="flex flex-col lg:flex-row gap-10 lg:gap-24 items-start lg:items-center">
              <div className="text-left flex-1">
                <h2
                  className="text-[clamp(20px,2.8vw,32px)] leading-[1.4] tracking-[-0.02em] text-[#f7f8f8]"
                  style={{
                    fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif",
                    fontWeight: 500,
                  }}
                >
                  "Hypastack's encrypted delivery network is flawlessly reliable, we've been routing our core assets through their permanent CDN, pushing massive payloads with zero tracking and near-instant request speeds."
                </h2>
              </div>
              <div className="hidden sm:flex flex-col items-end text-right shrink-0">
                <div className="flex flex-col gap-0.5 mb-3">
                  <span
                    className="text-[17px] font-semibold text-[#f7f8f8]"
                  >
                    Someone
                  </span>
                  <span className="text-[#898e97] text-[14px] font-medium">User</span>
                </div>
                <div className="w-[32px] h-[32px] rounded-full overflow-hidden border border-[rgba(0,0,0,0.08)] shadow-sm bg-[#08090a]">
                  <img src="/user/no-profile.png" alt="Someone" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}

"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform, useMotionTemplate, type MotionValue } from "motion/react";
import { ShineButton } from "@/components/ui/shine-button";
import { ShineCard } from "@/components/ui/shine-card";

const TESTIMONIAL =
  "\"We switched to Hypastack for hosting our files and haven't looked back. It delivers huge files near-instantly with zero overhead and absolute privacy.\"";

const QUOTE_WORDS = TESTIMONIAL.split(" ");

// A single word whose reveal (color, blur, lift) is driven by a slice of the
// shared scroll progress, so it un-blurs as that slice scrolls past.
function QuoteWord({ children, progress, start, end }: { children: string; progress: MotionValue<number>; start: number; end: number }) {
  const opacity = useTransform(progress, [start, end], [0.25, 1]);
  const blur = useTransform(progress, [start, end], [5, 0]);
  const y = useTransform(progress, [start, end], [14, 0]);
  const color = useTransform(progress, [start, end], ["#6b7280", "#f7f8f8"]);
  const filter = useMotionTemplate`blur(${blur}px)`;
  return (
    <motion.span className="inline-block" style={{ opacity, y, color, filter, marginRight: "0.28em" }}>
      {children}
    </motion.span>
  );
}

export function HowItWorks() {
  const quoteRef = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({ target: quoteRef, offset: ["start 0.85", "end 0.55"] });
  const quoteProgress = useSpring(scrollYProgress, { stiffness: 160, damping: 9, mass: 0.8 });
  return (
    <section id="how-it-works" className="relative flex flex-col items-center">
      <div className="mt-[100px] sm:mt-[150px] lg:mt-[200px] relative w-full max-w-[1200px] flex flex-col bg-[#08090a] z-[60]">
        <div className="w-full px-6 sm:px-6 pt-12 sm:pt-16 pb-12 sm:pb-14 text-left relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full relative z-10"
          >
            <h2
              className="text-[clamp(28px,4.5vw,56px)] leading-[1.1] tracking-[-0.03em] text-[#f7f8f8] pb-1 font-normal"
              style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
            >
              A simple, secure network <span className="text-[#898e97]">designed to host and share your files seamlessly.</span>
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[#898e97] font-light max-w-[560px]">
              No setup and no clutter. Just fast private hosting that stays out of your way.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 sm:mt-10">
              <ShineCard className="h-full p-8">
                <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Built for purpose</h3>
                <p className="text-[15px] leading-relaxed text-[#898e97]">Shaped by what creators actually need. Tools that just work.</p>
              </ShineCard>

              <ShineCard className="h-full p-8">
                <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Powered by Cloudflare</h3>
                <p className="text-[15px] leading-relaxed text-[#898e97]">A secure spot to pass encrypted files plus a fast CDN that strips tracking automatically.</p>
              </ShineCard>

              <ShineCard className="h-full p-8">
                <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Designed for speed</h3>
                <p className="text-[15px] leading-relaxed text-[#898e97]">A lightweight network that stays out of your way and serves files near-instantly.</p>
              </ShineCard>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="relative w-full max-w-[1200px] mt-[80px] sm:mt-[120px] lg:mt-[180px]">
        <div className="relative w-full flex flex-col bg-[#08090a] z-[60]">

          <div className="w-full px-6 sm:px-6 pt-12 sm:pt-16 pb-12 sm:pb-14 text-left relative overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="w-full relative z-10"
            >
              <div>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 md:gap-16">
                  <h2
                    className="text-[clamp(28px,4.5vw,56px)] leading-[1.1] tracking-[-0.03em] text-[#f7f8f8] pb-1 font-normal"
                    style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
                  >
                    Privacy is a <span className="text-[#898e97]">human right.</span>
                  </h2>
                <ShineButton href="https://github.com/hypastack" target="_blank" rel="noopener noreferrer" size="lg" className="shrink-0" style={{ gap: 10 }}>
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-[#f7f8f8]">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span>Source code</span>
                </ShineButton>
                </div>
                <p className="mt-4 text-[15px] leading-relaxed text-[#898e97] font-light max-w-[560px]">
                  Source available, so you never have to take our word for it.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 sm:mt-8">
                <ShineCard className="h-full p-8">
                  <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Hidden Telemetry</h3>
                  <p className="text-[15px] leading-relaxed text-[#898e97]">Other platforms quietly log what you do. We can't, our source is public.</p>
                </ShineCard>
                <ShineCard className="h-full p-8">
                  <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Data Harvesting</h3>
                  <p className="text-[15px] leading-relaxed text-[#898e97]">Read the code and see exactly how your files are handled. No blind faith needed.</p>
                </ShineCard>
                <ShineCard className="h-full p-8">
                  <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Vendor Lock-in</h3>
                  <p className="text-[15px] leading-relaxed text-[#898e97]">If we ever change or shut down, you can just self-host the whole stack.</p>
                </ShineCard>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <div className="relative w-full max-w-[1200px] mt-[80px] sm:mt-[120px] lg:mt-[180px]">
        <div className="relative w-full flex flex-col bg-[#08090a] z-[60]">
          <div className="w-full px-6 sm:px-6 py-12 sm:py-20 relative z-10">
            <div className="flex flex-col lg:flex-row gap-10 lg:gap-24 items-start lg:items-center">
              <div className="text-left flex-1 w-full max-w-none">
                <h2
                  ref={quoteRef}
                  className="text-[clamp(28px,4.5vw,56px)] leading-[1.1] tracking-[-0.03em]"
                  style={{
                    fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif",
                    fontWeight: 400,
                  }}
                >
                  {QUOTE_WORDS.map((word, i) => {
                    const start = (i / QUOTE_WORDS.length) * 0.9;
                    return (
                      <QuoteWord key={i} progress={quoteProgress} start={start} end={Math.min(start + 0.14, 1)}>
                        {word}
                      </QuoteWord>
                    );
                  })}
                </h2>

                <p className="mt-5 text-[15px] leading-relaxed text-[#898e97] font-light">
                  From someone who just wanted their files to load fast.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}

"use client";

import { motion } from "motion/react";



// Reusable block chrome
function BlockLines() {
  return (
    <>
      <div className="absolute top-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
      <div className="absolute top-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
      <div className="absolute bottom-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
      <div className="absolute bottom-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
    </>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="pt-8 sm:pt-16 lg:pt-24 relative flex flex-col items-center">

      {/* ── BLOCK 1: Short Links ── */}
      <div className="mt-0 relative w-full max-w-[1200px] flex flex-col bg-[#ffffff] z-10 border-y border-[rgba(0,0,0,0.15)]">
        <BlockLines />

        <div className="w-full px-8 sm:px-16 pt-16 pb-14 text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-xl"
          >
            <h2
              className="text-[clamp(28px,4vw,40px)] leading-[1.1] tracking-[-0.03em] text-[#171717]"
              style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", fontWeight: 600 }}
            >
              It starts with a link.
            </h2>
            <p className="mt-4 text-[16px] sm:text-[17px] leading-relaxed text-[#525252]">
              Create branded short links with built-in superpowers: QR codes, deep links, device targeting, and detailed analytics. Track everything, safely.
            </p>
            <a
              href="#learn-more"
              className="inline-flex items-center justify-center mt-8 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
              style={{ height: 44, paddingLeft: 24, paddingRight: 24, borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#ffffff', backgroundColor: '#030303' }}
            >
              Learn more
            </a>
          </motion.div>
        </div>

        {/* Video Preview */}
        <div className="w-full h-[320px] sm:h-[400px] md:h-[480px] border-t border-[rgba(0,0,0,0.15)] overflow-hidden bg-[#fafafa]">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center"
          >
            <source src="https://r2.hypastack.com/cdn/fb5fb22kgltb/preview.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      {/* ── BLOCK 2: Open Source ── */}
      <div className="mt-24 sm:mt-32 relative w-full max-w-[1200px] flex flex-col bg-[#ffffff] z-10 border-y border-[rgba(0,0,0,0.15)]">
        <BlockLines />

        {/* Dots on sides */}
        <div
          className="absolute top-0 bottom-0 left-[-50vw] right-[100%] pointer-events-none -z-10"
          style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.12) 1.5px, transparent 1.5px)', backgroundSize: '14px 14px', backgroundPosition: 'center' }}
        />
        <div
          className="absolute top-0 bottom-0 left-[100%] right-[-50vw] pointer-events-none -z-10"
          style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.12) 1.5px, transparent 1.5px)', backgroundSize: '14px 14px', backgroundPosition: 'center' }}
        />

        <div className="w-full px-8 sm:px-16 pt-16 pb-14 text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-xl"
          >
            <h2
              className="text-[clamp(28px,4vw,40px)] leading-[1.1] tracking-[-0.03em] text-[#171717]"
              style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", fontWeight: 600 }}
            >
              We aren&apos;t hiding anything. Go take a look yourself.
            </h2>
            <p className="mt-4 text-[16px] sm:text-[17px] leading-relaxed text-[#525252]">
              Every line of our code is public. Inspect our architecture, audit our security, or host it yourself. We believe trust is earned through complete transparency.
            </p>
            <a
              href="https://github.com/hypastack"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center mt-8 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
              style={{ height: 44, paddingLeft: 24, paddingRight: 24, borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#ffffff', backgroundColor: '#030303' }}
            >
              View on GitHub
            </a>
          </motion.div>
        </div>

        {/* Image Preview */}
        <div className="w-full border-t border-[rgba(0,0,0,0.15)] overflow-hidden bg-[#f4f1f2]" style={{ height: '480px' }}>
          <img
            src="https://r2.hypastack.com/cdn/w31ae0dz0311/opensource.png"
            alt="Platform Preview"
            className="w-full h-full object-cover"
            style={{ objectPosition: "top center" }}
          />
        </div>
      </div>

      {/* ── BLOCK 3: Quote ── */}
      <div className="mt-24 sm:mt-32 relative w-full max-w-[1200px] flex flex-col bg-[#ffffff] z-10 border-y border-[rgba(0,0,0,0.15)]">
        <BlockLines />

        {/* Dotted bg visible */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.15) 1.5px, transparent 1.5px)', backgroundSize: '16px 16px', backgroundPosition: 'center' }}
        />

        <div className="w-full px-8 sm:px-16 py-24 sm:py-32 flex flex-col items-center text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl"
          >
            <h2
              className="text-[clamp(24px,3.5vw,40px)] leading-[1.3] tracking-[-0.02em] text-[#171717]"
              style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", fontWeight: 500 }}
            >
              &ldquo;Hypastack&apos;s encrypted delivery network is flawlessly reliable — we&apos;ve been routing our core assets through their permanent CDN, pushing massive payloads with zero tracking and near-instant request speeds.&rdquo;
            </h2>
          </motion.div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-24 sm:h-32 w-full" />
    </section>
  );
}

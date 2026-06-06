"use client";

import { motion } from "motion/react";



// Block chrome — top lines only (for first block or standalone)
function BlockLinesTop() {
  return (
    <div className="hidden md:block">
      <div className="absolute top-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
      <div className="absolute top-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
      <div className="absolute bottom-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
      <div className="absolute bottom-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
    </div>
  );
}

// Block chrome — bottom lines only (for connected middle/last blocks)
function BlockLinesBottom() {
  return (
    <div className="hidden md:block">
      <div className="absolute bottom-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
      <div className="absolute bottom-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
    </div>
  );
}

// Corner dots — all 4 corners (first block or standalone)
function CornerDots() {
  const s = { width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, zIndex: 200, position: 'absolute' as const };
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

// Corner dots — bottom only (for connected middle/last blocks — no top dots to avoid doubling)
function CornerDotsBottom() {
  const s = { width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, zIndex: 200, position: 'absolute' as const };
  const base = "hidden md:block pointer-events-none";
  return (
    <>
      <div className={base} style={{ ...s, bottom: -5, left: -5 }} />
      <div className={base} style={{ ...s, bottom: -5, right: -5 }} />
    </>
  );
}



export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative flex flex-col items-center">

      {/* Seamless perfectly blended colorful background wash above the section - clipped at 1200px vertical lines */}
      <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[800px] overflow-hidden pointer-events-none z-0">
        <div 
          className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-[1500px] h-[800px] opacity-[0.15]"
          style={{
            backgroundImage: 'linear-gradient(90deg, #00C9FF 0%, #92FE9D 25%, #F89B29 50%, #FF0F7B 75%, #A767E5 100%)',
            maskImage: 'radial-gradient(50% 50% at 50% 50%, black 0%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(50% 50% at 50% 50%, black 0%, transparent 100%)'
          }}
        />
      </div>

      {/* ── BLOCK 1: Drop a file ── */}
      <div className="mt-0 relative w-full max-w-[1200px] flex flex-col bg-[#ffffff] z-[60] border-y border-r border-[rgba(0,0,0,0.15)]">
        <BlockLinesTop />
        <CornerDots />

        <div className="w-full px-8 sm:px-16 pt-16 pb-14 text-left relative overflow-hidden">




          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-xl relative z-10"
          >
            <h2
              className="text-[clamp(28px,4vw,40px)] leading-[1.1] tracking-[-0.03em] text-[#000] pb-1 font-medium"
              style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
            >
              Drop a file. Get a link.
            </h2>
            <p className="mt-4 text-[16px] sm:text-[17px] leading-relaxed text-[#525252]">
              Upload anything and instantly get an encrypted, shareable link. No accounts required on the receiving end — just a link and the key.
            </p>
            <a
              href="/new"
              className="inline-flex items-center justify-center mt-8 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
              style={{ height: 44, paddingLeft: 24, paddingRight: 24, borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#ffffff', backgroundColor: '#030303' }}
            >
              Try it now
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
            <source src="https://r2.hypastack.com/cdn/r55e3ypdrahl/vid.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      {/* ── BLOCK 2: Open Source ── wrapper has no z-index so dots can escape stacking context */}
      <div className="relative w-full max-w-[1200px]">
        <div className="relative w-full flex flex-col bg-[#ffffff] z-[60] border-b border-r border-[rgba(0,0,0,0.15)]">
          <BlockLinesBottom />



          <div className="w-full px-8 sm:px-16 pt-16 pb-14 text-left relative overflow-hidden">


            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-xl relative z-10"
            >
              <h2
                className="text-[clamp(28px,4vw,40px)] leading-[1.1] tracking-[-0.03em] text-[#000] pb-1 font-medium"
                style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
              >
                Trust the code, not the company.
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
          <div className="w-full h-[140px] sm:h-[200px] md:h-[240px] border-t border-[rgba(0,0,0,0.15)] overflow-hidden bg-[#f4f1f2]">
            <img
              src="https://r2.hypastack.com/cdn/5ar5ltt7hsf4/github_logo.png"
              alt="GitHub Logo"
              className="w-full h-full object-cover"
              style={{ objectPosition: "top center" }}
            />
          </div>
        </div>
        {/* Dots AFTER block — siblings in same stacking context, z-300 > z-60 */}
        <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, zIndex: 300, bottom: -5, left: -5 }} />
        <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, zIndex: 300, bottom: -5, right: -5 }} />
      </div>

      {/* ── BLOCK 3: Quote — wrapper has no z-index so dots can escape stacking context */}
      <div className="relative w-full max-w-[1200px]">
        <div className="relative w-full flex flex-col bg-[#ffffff] z-[60] border-b border-r border-[rgba(0,0,0,0.15)]">
          <BlockLinesBottom />


          {/* Dotted bg visible */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.15) 1.5px, transparent 1.5px)', backgroundSize: '16px 16px', backgroundPosition: 'center' }}
          />



          <div className="w-full px-8 sm:px-16 py-16 sm:py-20 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-16 lg:gap-24 items-center">
              {/* Left side: Quote */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-left"
              >
                <h2
                  className="text-[clamp(22px,2.8vw,32px)] leading-[1.3] tracking-[-0.02em] text-transparent bg-clip-text pr-4 relative"
                  style={{ 
                    fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", 
                    fontWeight: 500,
                    backgroundImage: 'linear-gradient(to bottom, #737373 0%, #000000 100%)',
                    backgroundSize: '100% 100%'
                  }}
                >
                  &ldquo;Hypastack&apos;s encrypted delivery network is flawlessly reliable — we&apos;ve been routing our core assets through their{' '}
                  <span className="whitespace-nowrap" style={{ backgroundImage: 'linear-gradient(to right, #444444 0%, #c26929 55%, #fb923c 70%, #fb923c 80%, #c26929 90%, #444444 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    permanent{' '}
                    <span className="relative inline-block mx-[0.1em]" style={{ WebkitBackgroundClip: 'initial', WebkitTextFillColor: 'initial' }}>
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[60px] pointer-events-none -z-10" style={{ background: 'radial-gradient(ellipse at center, rgba(251,146,60,0.12) 0%, transparent 70%)', filter: 'blur(10px)' }} />
                      <img src="https://r2.hypastack.com/cdn/jbiff24w91u3/one.png" alt="" className="w-[0.95em] h-[0.95em] inline-block align-middle translate-y-[-0.08em] -rotate-[12deg] object-contain drop-shadow-sm" />
                    </span>
                    CDN
                  </span>
                  {', '}pushing massive payloads with zero tracking and near-instant request speeds.&rdquo;
                </h2>
              </motion.div>

              {/* Right side: Attribution */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="flex flex-col items-end text-right"
              >
                {/* Whop Logo */}
                <div className="mb-2">
                  <img src="https://r2.hypastack.com/cdn/45ws4hiosnrm/Whop_logo.svg" alt="Whop Logo" className="h-[48px] w-auto" />
                </div>

                {/* Name & Title */}
                <div className="flex flex-col gap-0.5 mb-5">
                  <span 
                    className="text-[19px] font-semibold text-transparent bg-clip-text"
                    style={{ 
                      backgroundImage: 'linear-gradient(to bottom, #737373 0%, #000000 100%)',
                    }}
                  >
                    Maybe you
                  </span>
                  <span className="text-[#000000] text-[15px] font-medium">User</span>
                </div>

                {/* PFP Avatar */}
                <div className="w-[48px] h-[48px] rounded-full overflow-hidden border border-[rgba(0,0,0,0.08)] shadow-sm bg-white">
                  <img src="/user/no-profile.png" alt="Maybe you" className="w-full h-full object-cover" />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
        {/* Dots AFTER block — siblings in same stacking context, z-300 > z-60 */}
        <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, zIndex: 300, bottom: -5, left: -5 }} />
        <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, zIndex: 300, bottom: -5, right: -5 }} />
      </div>


    </section>
  );
}

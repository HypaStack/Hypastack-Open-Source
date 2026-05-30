"use client";

import { motion } from "motion/react";



// Reusable block chrome
function BlockLines() {
  return (
    <div className="hidden md:block">
      <div className="absolute top-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
      <div className="absolute top-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
      <div className="absolute bottom-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
      <div className="absolute bottom-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
    </div>
  );
}

// Corner intersection dots
function CornerDots() {
  const s = { width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, zIndex: 200, position: 'absolute' as const };
  const o = { width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 2, zIndex: 200, position: 'absolute' as const };
  const base = "hidden md:block pointer-events-none";
  return (
    <>
      {/* Inner corner dots (at section edge = ±600px) */}
      <div className={base} style={{ ...s, top: -5, left: -5 }} />
      <div className={base} style={{ ...s, top: -5, right: -5 }} />
      <div className={base} style={{ ...s, bottom: -5, left: -5 }} />
      <div className={base} style={{ ...s, bottom: -5, right: -5 }} />
      {/* Outer rail dots (at ±720px = 120px outside section edge) */}
      <div className={base} style={{ ...o, top: -5, left: -125 }} />
      <div className={base} style={{ ...o, top: -5, right: -125 }} />
      <div className={base} style={{ ...o, bottom: -5, left: -125 }} />
      <div className={base} style={{ ...o, bottom: -5, right: -125 }} />
    </>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="pt-16 sm:pt-24 lg:pt-32 relative flex flex-col items-center">

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
      <div className="mt-0 relative w-full max-w-[1200px] flex flex-col bg-[#ffffff] z-[60] border-y border-r border-[rgba(0,0,0,0.15)] border-r-[rgba(0,0,0,0.08)]">
        <BlockLines />
        <CornerDots />

        <div className="w-full px-8 sm:px-16 pt-16 pb-14 text-left relative overflow-hidden">
          {/* Subtle top-left gray-to-black gradient inside the white area */}
          <div 
            className="absolute top-0 left-0 w-[500px] sm:w-[800px] h-[300px] sm:h-[400px] pointer-events-none z-0"
            style={{
              background: 'radial-gradient(100% 100% at 0% 0%, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)',
              filter: 'blur(60px)'
            }}
          />
          {/* Subtle bottom-right gray-to-black gradient inside the white area */}
          <div 
            className="absolute bottom-0 right-0 w-[500px] sm:w-[800px] h-[300px] sm:h-[400px] pointer-events-none z-0"
            style={{
              background: 'radial-gradient(100% 100% at 100% 100%, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)',
              filter: 'blur(60px)'
            }}
          />

          {/* Vertical Tiled Wave of Dots */}
          <div className="absolute top-0 bottom-0 right-[8%] w-[120px] pointer-events-none z-0 hidden lg:block opacity-80 -rotate-12 scale-110">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="dot-wave" x="0" y="0" width="120" height="240" patternUnits="userSpaceOnUse">
                  {Array.from({ length: 24 }).map((_, i) => (
                    Array.from({ length: 6 }).map((_, j) => {
                      const y = i * 10 + 5;
                      const offset = Math.sin((i / 24) * Math.PI * 2) * 20;
                      const x = Number((j * 10 + 35 + offset).toFixed(3));
                      return <circle key={`wave-${i}-${j}`} cx={x} cy={y} r="1.5" fill="rgba(0,0,0,0.25)" />
                    })
                  ))}
                </pattern>
              </defs>
              <rect x="0" y="0" width="100%" height="100%" fill="url(#dot-wave)" />
            </svg>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-xl relative z-10"
          >
            <h2
              className="text-[clamp(28px,4vw,40px)] leading-[1.1] tracking-[-0.03em] text-transparent bg-clip-text pb-1"
              style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", fontWeight: 600, backgroundImage: 'linear-gradient(to bottom, #737373 0%, #000000 100%)', backgroundSize: '100% 1.1em' }}
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
            <source src="https://r2.hypastack.com/cdn/yi6pzcoo7evo/dub-conversions.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      {/* ── BLOCK 2: Open Source ── */}
      <div className="mt-32 sm:mt-48 lg:mt-64 relative w-full max-w-[1200px] flex flex-col bg-[#ffffff] z-[60] border-y border-r border-[rgba(0,0,0,0.15)] border-r-[rgba(0,0,0,0.08)]">
        <BlockLines />
        <CornerDots />



        <div className="w-full px-8 sm:px-16 pt-16 pb-14 text-left relative overflow-hidden">
          {/* Subtle top-right gray-to-black gradient inside the white area */}
          <div 
            className="absolute top-0 right-0 w-[500px] sm:w-[800px] h-[300px] sm:h-[400px] pointer-events-none z-0"
            style={{
              background: 'radial-gradient(100% 100% at 100% 0%, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)',
              filter: 'blur(60px)'
            }}
          />
          {/* Subtle bottom-left gray-to-black gradient inside the white area */}
          <div 
            className="absolute bottom-0 left-0 w-[500px] sm:w-[800px] h-[300px] sm:h-[400px] pointer-events-none z-0"
            style={{
              background: 'radial-gradient(100% 100% at 0% 100%, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.05) 50%, transparent 100%)',
              filter: 'blur(60px)'
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-xl relative z-10"
          >
            <h2
              className="text-[clamp(28px,4vw,40px)] leading-[1.1] tracking-[-0.03em] text-transparent bg-clip-text pb-1"
              style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", fontWeight: 600, backgroundImage: 'linear-gradient(to bottom, #737373 0%, #000000 100%)', backgroundSize: '100% 1.1em' }}
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
        <div className="w-full h-[140px] sm:h-[200px] md:h-[240px] border-t border-[rgba(0,0,0,0.15)] overflow-hidden bg-[#f4f1f2]">
          <img
            src="https://r2.hypastack.com/cdn/5ar5ltt7hsf4/github_logo.png"
            alt="GitHub Logo"
            className="w-full h-full object-cover"
            style={{ objectPosition: "top center" }}
          />
        </div>
      </div>

      {/* ── BLOCK 3: Quote ── */}
      <div className="mt-32 sm:mt-48 lg:mt-64 relative w-full max-w-[1200px] flex flex-col bg-[#ffffff] z-[60] border-y border-r border-[rgba(0,0,0,0.15)] border-r-[rgba(0,0,0,0.08)]">
        <BlockLines />
        <CornerDots />



        {/* Dotted bg visible */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.15) 1.5px, transparent 1.5px)', backgroundSize: '16px 16px', backgroundPosition: 'center' }}
        />

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

        <div className="w-full px-8 sm:px-16 py-24 sm:py-32 relative z-10">
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
                className="text-[clamp(24px,3vw,36px)] leading-[1.3] tracking-[-0.02em] text-transparent bg-clip-text pr-4"
                style={{ 
                  fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", 
                  fontWeight: 500,
                  backgroundImage: 'linear-gradient(to bottom, #737373 0%, #000000 100%)',
                  backgroundSize: '100% 1.3em'
                }}
              >
                &ldquo;Hypastack&apos;s encrypted delivery network is flawlessly reliable — we&apos;ve been routing our core assets through their permanent CDN, pushing massive payloads with zero tracking and near-instant request speeds.&rdquo;
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
                <img src="https://r2.hypastack.com/cdn/45ws4hiosnrm/Whop_logo.svg" alt="Whop Logo" className="h-[56px] w-auto" />
              </div>

              {/* Name & Title */}
              <div className="flex flex-col gap-0.5 mb-5">
                <span 
                  className="text-[19px] font-semibold text-transparent bg-clip-text"
                  style={{ 
                    backgroundImage: 'linear-gradient(to bottom, #737373 0%, #000000 100%)',
                  }}
                >
                  Jack Sharkey
                </span>
                <span className="text-[#000000] text-[15px] font-medium">CTO at Whop</span>
              </div>

              {/* PFP Avatar */}
              <div className="w-[52px] h-[52px] rounded-full overflow-hidden border border-[rgba(0,0,0,0.08)] shadow-sm bg-white">
                <img src="/user/no-profile.png" alt="Jack Sharkey" className="w-full h-full object-cover" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-24 sm:h-32 w-full" />
    </section>
  );
}

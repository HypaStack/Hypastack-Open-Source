"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";


export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative flex flex-col items-center">
      <div className="mt-[100px] sm:mt-[150px] lg:mt-[200px] relative w-full max-w-[1440px] flex flex-col bg-[#08090a] z-[60]">
        <div className="w-full px-6 sm:px-16 pt-12 sm:pt-16 pb-12 sm:pb-14 text-left relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full relative z-10"
          >
            <h2
              className="text-[clamp(28px,4.5vw,56px)] leading-[1.1] tracking-[-0.03em] text-[#f7f8f8] pb-1 font-medium"
              style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
            >
              A simple, secure network <span className="text-[#898e97]">designed to host and share your files seamlessly.</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 sm:mt-24">
              <div className="relative overflow-hidden rounded-md p-[1px]">
                <div className="absolute inset-0 bg-[rgba(255,255,255,0.08)] z-0" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_40%,rgba(247,248,248,0.1)_70%,rgba(247,248,248,0.6)_100%)] blur-md z-0" />
                <div className="relative z-10 bg-[#0a0b0c] h-full w-full rounded-[5px] p-8 flex flex-col items-start">
                  <img src="https://r2.hypastack.com/cdn/s422hnlic6gc/feature-1.svg" alt="Built for purpose" className="w-20 h-20 sm:w-28 sm:h-28 mb-8 select-none pointer-events-none" draggable={false} />
                  <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Built for purpose</h3>
                  <p className="text-[15px] leading-relaxed text-[#898e97]">Built the way software should be. Shaped by the everyday needs of creators who just want tools that work instantly.</p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-md p-[1px]">
                <div className="absolute inset-0 bg-[rgba(255,255,255,0.08)] z-0" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_40%,rgba(247,248,248,0.1)_70%,rgba(247,248,248,0.6)_100%)] blur-md z-0" style={{ animationDelay: '-1.33s' }} />
                <div className="relative z-10 bg-[#0a0b0c] h-full w-full rounded-[5px] p-8 flex flex-col items-start">
                  <img src="https://r2.hypastack.com/cdn/5mjl7qamo25p/feature-2.svg" alt="Powered by Cloudflare" className="w-20 h-20 sm:w-28 sm:h-28 mb-8 select-none pointer-events-none" draggable={false} />
                  <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Powered by Cloudflare</h3>
                  <p className="text-[15px] leading-relaxed text-[#898e97]">A secure workspace to pass encrypted files, paired with a blazing-fast CDN that strips tracking and metadata automatically.</p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-md p-[1px]">
                <div className="absolute inset-0 bg-[rgba(255,255,255,0.08)] z-0" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_40%,rgba(247,248,248,0.1)_70%,rgba(247,248,248,0.6)_100%)] blur-md z-0" style={{ animationDelay: '-2.66s' }} />
                <div className="relative z-10 bg-[#0a0b0c] h-full w-full rounded-[5px] p-8 flex flex-col items-start">
                  <img src="https://r2.hypastack.com/cdn/rid8jnqs5p6n/feature-3.svg" alt="Designed for speed" className="w-20 h-20 sm:w-28 sm:h-28 mb-8 select-none pointer-events-none" draggable={false} />
                  <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Designed for speed</h3>
                  <p className="text-[15px] leading-relaxed text-[#898e97]">Built to move at your pace. A lightweight network that gets out of your way and serves files with near-instant request speeds.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="relative w-full max-w-[1440px] mt-[80px] sm:mt-[120px] lg:mt-[180px]">
        <div className="relative w-full flex flex-col bg-[#08090a] z-[60]">

          <div className="w-full px-6 sm:px-16 pt-12 sm:pt-16 pb-12 sm:pb-14 text-left relative overflow-hidden">
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
                    className="text-[clamp(28px,4.5vw,56px)] leading-[1.1] tracking-[-0.03em] text-[#f7f8f8] pb-1 font-medium"
                    style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
                  >
                    Privacy is a <span className="text-[#898e97]">fundamental human right.</span>
                  </h2>
                <Button href="https://github.com/hypastack" target="_blank" rel="noopener noreferrer" variant="landing-primary" size="lg" className="shrink-0">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-[#f7f8f8]">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span>Source code</span>
                </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 sm:mt-12">
                <div className="bg-[#0a0b0c] border border-[rgba(255,255,255,0.08)] rounded-md p-8 flex flex-col items-start">
                  <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Hidden Telemetry</h3>
                  <p className="text-[15px] leading-relaxed text-[#898e97]">Proprietary platforms sneak background analytics and trackers into your workflows, silently logging your activity. We can't, because our source is exposed.</p>
                </div>
                <div className="bg-[#0a0b0c] border border-[rgba(255,255,255,0.08)] rounded-md p-8 flex flex-col items-start">
                  <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Data Harvesting</h3>
                  <p className="text-[15px] leading-relaxed text-[#898e97]">If you can't read the code, you're just guessing. Open source means you can verify exactly how your files are handled, zero blind faith required.</p>
                </div>
                <div className="bg-[#0a0b0c] border border-[rgba(255,255,255,0.08)] rounded-md p-8 flex flex-col items-start">
                  <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Vendor Lock-in</h3>
                  <p className="text-[15px] leading-relaxed text-[#898e97]">Closed architectures are built to trap your data. If we ever change direction or pull the plug, you can just self-host the stack yourself.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <div className="relative w-full max-w-[1440px] mt-[80px] sm:mt-[120px] lg:mt-[180px]">
        <div className="relative w-full flex flex-col bg-[#08090a] z-[60]">
          <div className="w-full px-6 sm:px-16 py-12 sm:py-20 relative z-10">
            <div className="flex flex-col lg:flex-row gap-10 lg:gap-24 items-start lg:items-center">
              <div className="text-left flex-1 w-full max-w-none">
                <h2
                  className="text-[clamp(28px,4.5vw,56px)] leading-[1.1] tracking-[-0.03em] text-[#f7f8f8]"
                  style={{
                    fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif",
                    fontWeight: 500,
                  }}
                >
                  "We switched to Hypastack for hosting our files and haven't looked back. <span className="text-[#898e97]">It delivers huge files near-instantly with zero overhead and absolute privacy."</span>
                </h2>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}

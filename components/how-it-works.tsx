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
                  <img src="https://r2.hypastack.com/cdn/s422hnlic6gc/feature-1.svg" alt="Built for purpose" className="w-16 h-16 sm:w-20 sm:h-20 mb-8" />
                  <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Built for purpose</h3>
                  <p className="text-[15px] leading-relaxed text-[#898e97]">Built the way software should be. Shaped by the everyday needs of creators who just want tools that work instantly.</p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-md p-[1px]">
                <div className="absolute inset-0 bg-[rgba(255,255,255,0.08)] z-0" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_40%,rgba(247,248,248,0.1)_70%,rgba(247,248,248,0.6)_100%)] blur-md z-0" style={{ animationDelay: '-1.33s' }} />
                <div className="relative z-10 bg-[#0a0b0c] h-full w-full rounded-[5px] p-8 flex flex-col items-start">
                  <img src="https://r2.hypastack.com/cdn/5mjl7qamo25p/feature-2.svg" alt="Powered by Cloudflare" className="w-16 h-16 sm:w-20 sm:h-20 mb-8" />
                  <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Powered by Cloudflare</h3>
                  <p className="text-[15px] leading-relaxed text-[#898e97]">A secure workspace to pass encrypted files, paired with a blazing-fast CDN that strips tracking and metadata automatically.</p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-md p-[1px]">
                <div className="absolute inset-0 bg-[rgba(255,255,255,0.08)] z-0" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_40%,rgba(247,248,248,0.1)_70%,rgba(247,248,248,0.6)_100%)] blur-md z-0" style={{ animationDelay: '-2.66s' }} />
                <div className="relative z-10 bg-[#0a0b0c] h-full w-full rounded-[5px] p-8 flex flex-col items-start">
                  <img src="https://r2.hypastack.com/cdn/rid8jnqs5p6n/feature-3.svg" alt="Designed for speed" className="w-16 h-16 sm:w-20 sm:h-20 mb-8" />
                  <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Designed for speed</h3>
                  <p className="text-[15px] leading-relaxed text-[#898e97]">Built to move at your pace. A lightweight network that gets out of your way and serves files with near-instant request speeds.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="relative w-full max-w-[1440px] mt-[150px] sm:mt-[250px] lg:mt-[350px]">
        <div className="relative w-full flex flex-col bg-[#08090a] z-[60]">

          <div className="w-full px-6 sm:px-16 pt-12 sm:pt-16 pb-12 sm:pb-14 text-left relative overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="w-full relative z-10"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 md:gap-16">
                <h2
                  className="text-[clamp(28px,4.5vw,56px)] leading-[1.1] tracking-[-0.03em] text-[#f7f8f8] pb-1 font-medium"
                  style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
                >
                  Trust the code <span className="text-[#898e97]">not the company.</span>
                </h2>
                <Button href="https://github.com/hypastack" target="_blank" rel="noopener noreferrer" variant="landing-primary" size="lg" className="shrink-0">
                  Source code
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 sm:mt-24">
                <div className="bg-[#0a0b0c] border border-[rgba(255,255,255,0.08)] rounded-md p-8 flex flex-col items-start">
                  <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Hidden Telemetry</h3>
                  <p className="text-[15px] leading-relaxed text-[#898e97]">Proprietary platforms routinely inject analytics and tracking into your workflows, silently mapping your usage data without consent.</p>
                </div>
                <div className="bg-[#0a0b0c] border border-[rgba(255,255,255,0.08)] rounded-md p-8 flex flex-col items-start">
                  <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Data Harvesting</h3>
                  <p className="text-[15px] leading-relaxed text-[#898e97]">If you can't verify the source code, you can never be entirely certain your sensitive assets aren't being scanned or monetized.</p>
                </div>
                <div className="bg-[#0a0b0c] border border-[rgba(255,255,255,0.08)] rounded-md p-8 flex flex-col items-start">
                  <h3 className="text-[18px] font-medium text-[#f7f8f8] mb-3 tracking-wide">Vendor Lock-in</h3>
                  <p className="text-[15px] leading-relaxed text-[#898e97]">Closed systems are intentionally designed to trap you. When a company abruptly pivots or shuts down, your infrastructure is paralyzed.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <div className="relative w-full max-w-[1440px] mt-[150px] sm:mt-[250px] lg:mt-[350px]">
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

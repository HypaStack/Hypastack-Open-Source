"use client";

import { motion } from "motion/react";
import { Button } from "@/components/ui/button";


export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative flex flex-col items-center">
      <div className="mt-0 relative w-full max-w-[1440px] flex flex-col bg-[#08090a] z-[60]">
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
            <Button href="/new" variant="landing-primary" size="lg" className="mt-8">
              Try it now
            </Button>
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
              <Button href="https://github.com/hypastack" target="_blank" rel="noopener noreferrer" variant="landing-primary" size="lg" className="mt-8">
                Source code
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
      <div className="relative w-full max-w-[1440px] mt-[150px] sm:mt-[250px] lg:mt-[350px]">
        <div className="relative w-full flex flex-col bg-[#08090a] z-[60]">
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

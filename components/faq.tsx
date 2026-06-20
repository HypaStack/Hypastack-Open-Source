"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

const faqs = [
  {
    q: "What is Hypastack?",
    a: "Think of it as a dead-simple way to share files that doesn't creep on your data. We handle the E2EE encryption, you just share your stuff. Just a heads up: the CDN isn't encrypted, but we do strip the EXIF metadata so you aren't accidentally leaking your location.",
  },
  {
    q: "How big can my files be?",
    a: "Free users can share up to 100MB and upload 20MB to the CDN (with a 5GB total limit). If you go Ultimate, you're looking at 2.5GB shares (per upload), a 1GB CDN Asset (per upload) limit, and a massive 1.1TB Total Storage.",
  },
  {
    q: "How long do these links last?",
    a: "Depends on how heavy the file is, Small stuff stays up for 7 days, massive files get a shorter window, down to 24 hours. Paid plans get way more time. CDN files? They're yours until you delete them.",
  },
  {
    q: "How does the login work?",
    a: "You pick a nickname, we give you a key, No emails no passwords, no 'Sign in with Google' nonsense. If you lose that key, your account is cooked, we don't even know who you are since your nickname is just a hash.",
  },
  {
    q: "Is my stuff actually safe?",
    a: "We encrypt your filenames with AES-256 before they go anywhere. Your files get random IDs on Cloudflare R2, we strip out EXIF/GPS junk from images, and you can even set shares to burn-on-download if you're feeling paranoid.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative flex flex-col items-center overflow-visible">

      <div className="relative w-full max-w-[1440px] mt-0">
      <div className="relative w-full flex flex-col bg-[#08090a] z-[60]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="w-full px-8 sm:px-16 pt-16 pb-14 relative z-10 pointer-events-none"
        >
          <h2
            className="text-[clamp(28px,4.5vw,56px)] leading-[1.1] tracking-[-0.03em] text-[#f7f8f8] pb-1 font-medium"
            style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
          >
            Frequently Asked <span className="text-[#898e97]">Questions</span>
          </h2>
        </motion.div>

        <div className="w-full px-8 sm:px-16 pb-16">
          {faqs.map((item, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={item.q}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="border border-[rgba(255,255,255,0.08)] rounded-md mb-3 bg-[#0a0b0c] hover:bg-[#0e0f10] transition-colors duration-150 relative z-10 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-6 px-6 sm:px-8 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span
                    className="text-[15px] sm:text-[16px] text-[#f7f8f8] leading-[1.4]"
                    style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", fontWeight: 600 }}
                  >
                    {item.q}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="shrink-0 text-[#aaaaaa] transition-transform duration-200"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <path d="M3 6L8 11L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <p className="px-6 sm:px-8 pb-6 text-[14px] leading-relaxed text-[#898e97] max-w-3xl">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
      </div>
    </section>
  );
}

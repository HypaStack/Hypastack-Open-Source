"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

const faqs = [
  {
    q: "What is Hypastack?",
    a: "Secure file sharing with temporary links that expire, combined with a permanent CDN for hosting persistent assets. Use either or both under a single anonymous key.",
  },
  {
    q: "What are the file size limits?",
    a: "Free accounts can share files up to 100MB and upload 20MB to the CDN with 5GB total CDN storage. Paid plans go higher — up to 2.5GB shares and 1.1TB CDN storage on Ultimate.",
  },
  {
    q: "How long do shared files stay up?",
    a: "Depends on size. Small files (under 25MB) last 7 days. Bigger files get shorter windows — down to 24 hours for the largest. Paid plans multiply those times. CDN files stay forever until you delete them.",
  },
  {
    q: "How do I log in?",
    a: "You pick a nickname, we give you an access key. That's it. No email, no password, no OAuth. Lose the key and the account is gone — we store your nickname as a hash, never in plain text.",
  },
  {
    q: "How are files protected?",
    a: "Filenames are encrypted with AES-256 before storage. Files live under random IDs on Cloudflare R2. Images get EXIF/GPS data stripped automatically. You can also enable burn-on-read shares.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="relative flex flex-col items-center overflow-visible">

      <div className="relative w-full max-w-[1200px] mt-16 sm:mt-24">
      {/* The Block */}
      <div className="relative w-full flex flex-col bg-[#ffffff] z-[60] border-y border-r border-[rgba(0,0,0,0.08)]">
        {/* Horizontal extending lines — top and bottom */}
        <div className="hidden md:block">
          <div className="absolute top-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
          <div className="absolute top-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
          <div className="absolute bottom-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
          <div className="absolute bottom-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.08)] pointer-events-none" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="w-full px-8 sm:px-16 pt-16 pb-14 relative z-10 pointer-events-none"
        >
          <h2
            className="text-[clamp(28px,3.5vw,40px)] tracking-[-0.03em] leading-[1.1] text-[#000] pb-1 font-medium"
            style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}
          >
            Things you might ask.
          </h2>
          <p className="mt-3 text-[16px] sm:text-[17px] leading-relaxed text-[#525252] max-w-lg">
            Straight answers. If something isn&apos;t here, reach out.
          </p>
        </motion.div>

        {/* FAQ rows — full-width, inside the block, separated by border-t */}
        {faqs.map((item, i) => {
          const isOpen = open === i;
          return (
            <motion.div
              key={item.q}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="border-t border-[rgba(0,0,0,0.08)] relative z-10"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-6 px-8 sm:px-16 py-6 text-left hover:bg-[#fafafa] transition-colors duration-150"
                aria-expanded={isOpen}
              >
                <span
                  className="text-[15px] sm:text-[16px] text-[#171717] leading-[1.4]"
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
                    <p className="px-8 sm:px-16 pb-7 text-[14px] leading-relaxed text-[#525252] max-w-2xl">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
      {/* Dots AFTER block — siblings in same stacking context, z-300 > z-60 */}
      <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, zIndex: 300, top: -5, left: -5 }} />
      <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, zIndex: 300, top: -5, right: -5 }} />
      <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, zIndex: 300, bottom: -5, left: -5 }} />
      <div className="hidden md:block pointer-events-none" style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, zIndex: 300, bottom: -5, right: -5 }} />
      </div>
    </section>
  );
}

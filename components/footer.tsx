"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MIcon } from "@/components/ui/material-icon";

import { FOOTER_COLUMNS as columns } from "@/constants/footer";

function FooterPopover({ category }: { category: typeof columns[0] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative flex justify-end" ref={ref}>
      <motion.button
        type="button"
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        className="group flex items-center gap-2 px-4 py-2 rounded-md hover:bg-[rgba(255,255,255,0.08)] transition-colors text-white text-[15px] font-medium"
      >
        {category.title}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="flex items-center justify-center text-[#a3a3a3] group-hover:text-white transition-colors"
        >
          <MIcon name="expand_more" size={18} />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            className="absolute bottom-[calc(100%+8px)] right-0 w-[240px] z-[100] bg-white rounded-md border border-[#e5e5e5] py-2"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          >
            <div className="px-1.5 space-y-0.5">
              {category.links.map((link) => (
                link.href.startsWith("http") ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium text-[#333] hover:bg-[#007AFF]/10 hover:text-[#007AFF] transition-colors"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="group w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium text-[#333] hover:bg-[#007AFF]/10 hover:text-[#007AFF] transition-colors"
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Footer() {
  return (
    <>
      <div className="w-full max-w-[1440px] mx-auto flex flex-col relative z-[60]">
        <footer className="w-full bg-[#08090a] text-[#a3a3a3] pt-6 pb-8 px-8 md:px-16 lg:px-20 font-sans relative">
          <div className="w-full mx-auto relative z-20">
            <div className="flex items-start justify-between mb-4 mt-2">
              {/* Left Column: Image and Text */}
              <div className="flex flex-col gap-6">
                <img src="https://r2.hypastack.com/cdn/lvko6iovrtq7/footer.webp" alt="Hypastack" className="w-[52px] h-auto object-contain select-none pointer-events-none" draggable={false} />
                
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-normal text-[#888888]">Wanna reach out to us?</span>
                  <a href="https://t.me/hypastack" target="_blank" rel="noopener noreferrer" className="text-[#a3a3a3] hover:text-white active:scale-95 transition-all" aria-label="Telegram">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[20px] h-[20px]">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.888-.662 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                  </a>
                </div>
              </div>

              {/* Right Column: Popover Buttons */}
              <div className="flex flex-col items-end gap-2">
                {columns.map((col) => (
                  <FooterPopover key={col.title} category={col} />
                ))}
              </div>
            </div>

            {/* Bottom Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-[12px] text-[#666666] pt-4 mt-6 border-t border-[rgba(255,255,255,0.05)]">
              <div>
                Licensed under AGPL-3.0 | Hypastack &copy; 2025-2026
              </div>
              <div className="text-right md:text-left">
                This is the primary Hypastack project. This project is entirely my own work. Code available on GitHub, <a href="https://usekiko.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#a3a3a3] transition-colors">learn more</a>.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

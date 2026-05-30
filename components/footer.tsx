"use client";

import Link from "next/link";
import { motion } from "motion/react";

const columns = [
  {
    title: "Tools",
    links: [
      { label: "Secure file sharing", href: "/new" },
      { label: "Permanent CDN hosting", href: "/manage/cdn" },
      { label: "Desktop application", href: "https://hypastack.com/d/987vw0zy#key=9OU2rAIyA3j3Eye90DrxYoimxWbNCcycuyT6LNn7_BA", external: true },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "What is Hypastack?", href: "/about" },
      { label: "Our goal", href: "/goal" },
      { label: "Control panel", href: "/manage/dashboard" },
      { label: "Active shares", href: "/manage/files" },
      { label: "Network status", href: "/status" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "Privacy standards", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
      { label: "Acceptable use", href: "/acceptable-use" },
      { label: "COPPA & GDPR", href: "/coppa-gdpr" },
    ],
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-24 sm:mt-32 pb-24 sm:pb-32 relative flex flex-col items-center overflow-visible">
      
      {/* The Block */}
      <div className="relative w-full max-w-[1200px] flex flex-col bg-[#ffffff] z-10 border-y border-[rgba(0,0,0,0.15)]">
        
        {/* Horizontal extending lines */}
        <div className="absolute top-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
        <div className="absolute top-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
        <div className="absolute bottom-[-1px] left-[-50vw] right-[100%] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />
        <div className="absolute bottom-[-1px] left-[100%] right-[-50vw] h-[1px] bg-[rgba(0,0,0,0.15)] pointer-events-none" />

        <div className="w-full px-8 sm:px-16 pt-16 pb-12">
          
          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 lg:gap-12 mb-20">
            
            {/* Brand Column */}
            <div className="lg:col-span-2 flex flex-col items-start">
              <h2 
                className="text-[clamp(24px,3vw,32px)] tracking-[-0.02em] text-[#171717] leading-[1.1] max-w-sm"
                style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", fontWeight: 700 }}
              >
                Privacy shouldn&apos;t be complicated.
              </h2>
              <p className="mt-4 text-[15px] text-[#525252] max-w-sm leading-relaxed">
                Zero-knowledge file sharing and permanent CDN hosting built for the privacy-conscious.
              </p>
            </div>

            {/* Links Columns */}
            <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-8">
              {columns.map((col) => (
                <div key={col.title} className="flex flex-col gap-4">
                  <h3 
                    className="text-[14px] text-[#171717]"
                    style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif", fontWeight: 600 }}
                  >
                    {col.title}
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        {link.external ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[14px] text-[#888] hover:text-[#171717] transition-colors"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link
                            href={link.href}
                            className="text-[14px] text-[#888] hover:text-[#171717] transition-colors"
                          >
                            {link.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-[rgba(0,0,0,0.1)]">
            <p className="text-[13px] text-[#888]">
              © {currentYear} Hypastack. All rights reserved.
            </p>
            <p className="text-[13px] text-[#888]">
              Designed &amp; crafted by{" "}
              <a
                href="https://usekiko.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#525252] hover:text-[#171717] transition-colors"
              >
                expertkiko
              </a>
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}

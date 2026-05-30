"use client";

import Link from "next/link";

const columns = [
  {
    title: "Platform",
    links: [
      { label: "Upload a file", href: "/new" },
      { label: "CDN Hosting", href: "/manage/cdn" },
      { label: "Dashboard", href: "/manage" },
      { label: "System status", href: "/status" },
      { label: "Desktop app", href: "https://hypastack.com/d/987vw0zy#key=9OU2rAIyA3j3Eye90DrxYoimxWbNCcycuyT6LNn7_BA" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Our goal", href: "/goal" },
      { label: "Insider program", href: "/insider-program" },
      { label: "Waitlist", href: "/waitlist" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of service", href: "/terms" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Acceptable use", href: "/acceptable-use" },
      { label: "DMCA", href: "/dmca" },
      { label: "Child safety", href: "/child-safety" },
      { label: "COPPA & GDPR", href: "/coppa-gdpr" },
      { label: "Vulnerability disclosure", href: "/vulnerability-disclosure" },
    ],
  },
];

export function Footer() {
  return (
    <div className="w-full mt-40 flex flex-col">
      {/* 
        Inverted black SVG notch: 
        This draws a black rectangle with a transparent "bite" taken out of the top center.
        It sits directly above the main black footer, allowing the dotted page background to show through the notch organically.
      */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 48"
        preserveAspectRatio="none"
        className="w-full h-[48px] block"
        aria-hidden="true"
      >
        <path
          d="M 0 0 L 480 0 C 495 0 512 44 528 44 L 912 44 C 928 44 945 0 960 0 L 1440 0 L 1440 48 L 0 48 Z"
          fill="#000000"
        />
      </svg>

      <footer className="w-full bg-[#000000] text-[#a3a3a3] pt-12 pb-16 px-6 md:px-12 lg:px-24 font-sans relative">
        <div className="max-w-[1400px] mx-auto relative z-20">
        
        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-16 mb-24">
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-6">
              <h3 className="text-white text-[15px] font-semibold tracking-wide">
                {col.title}
              </h3>
              <ul className="flex flex-col gap-3.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("http") ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[14px] hover:text-white transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-[14px] hover:text-white transition-colors"
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

        {/* Bottom Section */}
        <div className="flex flex-col items-start gap-10 border-t border-white/10 pt-10">
          
          {/* Socials */}
          <div className="flex items-center gap-5 text-white">
            <a href="#" className="hover:opacity-70 transition-opacity" aria-label="X (Twitter)">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="#" className="hover:opacity-70 transition-opacity" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
            </a>
            <a href="#" className="hover:opacity-70 transition-opacity" aria-label="YouTube">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
                <path d="M21.582 6.186a2.6 2.6 0 0 0-1.838-1.85C18.125 3.9 12 3.9 12 3.9s-6.125 0-7.744.436a2.6 2.6 0 0 0-1.838 1.85C2 7.822 2 12 2 12s0 4.178.418 5.814a2.6 2.6 0 0 0 1.838 1.85C5.875 20.1 12 20.1 12 20.1s6.125 0 7.744-.436a2.6 2.6 0 0 0 1.838-1.85C22 16.178 22 12 22 12s0-4.178-.418-5.814zM9.8 15.5v-7l6.3 3.5-6.3 3.5z" />
              </svg>
            </a>
          </div>

          <div className="w-8 h-[1px] bg-white/20" />

          {/* Language Selector */}
          <button className="flex items-center gap-2 text-[14px] text-white hover:underline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            English (United States)
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 ml-1">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

        </div>
      </div>
    </footer>
    </div>
  );
}

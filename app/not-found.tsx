"use client"

import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { MIcon } from "@/components/ui/material-icon"
import { motion } from "motion/react"

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <section className="relative flex flex-1 flex-col items-center justify-center px-4 sm:px-6 pt-32 pb-24 min-h-[70vh]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          <div style={{ borderRadius: 6, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: 6, padding: 24 }}>
              <div className="flex items-center gap-3 mb-3">
                <MIcon name="error" className="text-red-500" size={28} />
                <h2 className="text-[20px] font-semibold text-[#171717] tracking-tight" style={{ fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }}>
                  404 Not Found
                </h2>
              </div>
              <p className="text-[13px] text-[#666666] mb-6 leading-relaxed text-left">
                The page you're looking for doesn't exist or has been moved.
              </p>
              <div className="flex gap-2">
                <Link
                  href="/manage/files"
                  className="hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75 flex items-center justify-center"
                  style={{ height: 38, paddingLeft: 16, paddingRight: 16, borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#ffffff', backgroundColor: '#030303' }}
                >
                  Upload a file
                </Link>
                <Link
                  href="/"
                  className="hover:bg-[rgba(0,0,0,0.04)] active:scale-[0.97] transition-all duration-75 flex items-center justify-center"
                  style={{ height: 38, paddingLeft: 16, paddingRight: 16, borderRadius: 6, fontSize: 13, fontWeight: 500, color: '#171717', backgroundColor: 'transparent', border: '1px solid rgba(0,0,0,0.15)' }}
                >
                  Home
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </main>
  )
}

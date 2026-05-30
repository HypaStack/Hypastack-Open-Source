"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MIcon } from "@/components/ui/material-icon"

export default function ExperimentalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isIndex = pathname === "/experimental"

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#e3e3e3]">
      {!isIndex && (
        <header className="sticky top-0 z-40 flex items-center gap-3 px-5 py-3 bg-[#0f0f0f]/80 backdrop-blur-md">
          <Link
            href="/experimental"
            className="flex items-center gap-2 text-[13px] text-[#888] hover:text-white transition-colors"
          >
            <MIcon name="arrow_back" size={16} />
            Experiments
          </Link>
          <span className="text-[13px] text-[#333]">/</span>
          <span className="text-[13px] text-[#666] font-medium">
            {pathname.split("/").pop()}
          </span>
        </header>
      )}
      {children}
    </div>
  )
}

"use client"

import { MIcon } from "@/components/ui/material-icon"

export default function PeerlinePage() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-6">
        <h1 className="text-[28px] font-medium tracking-tight text-[#171717] dark:text-[#e3e3e3] flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
          <span className="text-[#333] dark:text-[#ccc]">Peerline</span>
        </h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 px-6 py-20">
        <div className="w-14 h-14 rounded-2xl bg-[#f0f0f0] dark:bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
          <MIcon name="swap_horiz" size={28} className="text-[#666] dark:text-[#898e97]" />
        </div>
        <h2 className="text-[22px] font-semibold tracking-tight text-[#171717] dark:text-[#f7f8f8]">
          We&apos;re working on it
        </h2>
        <p className="text-[15px] leading-relaxed text-[#666] dark:text-[#898e97] max-w-[440px]">
          Peerline is coming soon. It&apos;s a peer to peer file transfer that sends files straight from your device to theirs, so nothing ever touches our servers.
        </p>
      </div>
    </div>
  )
}

"use client"

import { MIcon } from "@/components/ui/material-icon"

export default function DriveRecentPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-[#666] dark:text-[#888]">
      <MIcon name="schedule" size={48} className="mb-4 text-[#ccc] dark:text-[#444]" />
      <h2 className="text-lg font-semibold text-[#171717] dark:text-[#e3e3e3] mb-1">Recent</h2>
      <p className="text-sm">Recently accessed files coming soon.</p>
    </div>
  )
}

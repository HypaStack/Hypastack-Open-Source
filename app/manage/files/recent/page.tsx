"use client"

import { MIcon } from "@/components/ui/material-icon"

export default function DriveRecentPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-[#666]">
      <MIcon name="schedule" size={48} className="mb-4 text-[#ccc]" />
      <h2 className="text-lg font-semibold text-[#171717] mb-1">Recent</h2>
      <p className="text-sm">Recently accessed files coming soon.</p>
    </div>
  )
}

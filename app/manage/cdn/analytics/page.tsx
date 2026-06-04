"use client"

import { MIcon } from "@/components/ui/material-icon"

export default function CdnAnalyticsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-[#666]">
      <MIcon name="bar_chart" size={48} className="mb-4 text-[#ccc]" />
      <h2 className="text-lg font-semibold text-[#171717] mb-1">Analytics</h2>
      <p className="text-sm">CDN analytics coming soon.</p>
    </div>
  )
}

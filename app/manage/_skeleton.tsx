"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { SIDEBAR_WIDTH } from "@/constants"
import { ListSkeleton } from "./files/_list-skeleton"
import { GridSkeleton } from "./cdn/_grid-skeleton"

// Mirrors ManageLayout's shell: icon rail, sidebar card, main card. The layout
// returns null until the user loads, so the skeleton has to live here — a page
// level one never mounts.
export function ManageSkeleton({ pathname }: { pathname: string }) {
  const isCdn = pathname.startsWith("/manage/cdn")
  const isFiles = pathname.startsWith("/manage/files")

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f0f0f0] dark:bg-[#08090a] animate-in fade-in duration-200">
      {/* Icon rail */}
      <aside className="hidden lg:flex w-16 shrink-0 flex-col items-center pt-6 pb-2">
        <Skeleton className="h-8 w-8" style={{ borderRadius: 8 }} />
        <div className="flex flex-col items-center gap-2 mt-8 flex-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-12" style={{ borderRadius: 14 }} />
          ))}
        </div>
        <Skeleton className="h-12 w-12 mb-2" style={{ borderRadius: 14 }} />
      </aside>

      {/* Sidebar card */}
      <aside
        className="hidden lg:flex shrink-0 flex-col sticky top-0 h-[calc(100vh-16px)] my-2 mr-1 rounded-[12px] bg-white dark:bg-[#0a0b0c] overflow-hidden"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div className="flex items-center pt-5 pb-4 shrink-0" style={{ paddingLeft: 24 }}>
          <Skeleton className="h-[24px] w-[96px]" />
        </div>
        <nav className="flex-1 min-h-0 pt-1 pb-2" style={{ padding: "0.25rem 0.75rem" }}>
          <div className="space-y-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" style={{ borderRadius: 8 }} />
            ))}
          </div>
        </nav>
        <div className="px-3 pb-4 pt-3 shrink-0 border-t border-[#ebebeb] dark:border-[#2a2a2a]">
          <Skeleton className="h-3 w-[44px] mb-3" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <Skeleton className="h-[14px] w-[86px]" />
                  <Skeleton className="h-[14px] w-[36px]" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-full mt-4" style={{ borderRadius: 12 }} />
        </div>
      </aside>

      {/* Main card */}
      <div className="flex flex-1 min-w-0 flex-col h-[calc(100vh-16px)] my-2 ml-1 mr-2 rounded-[12px] bg-white dark:bg-[#0a0b0c] overflow-hidden">
        <div className="flex-1 overflow-hidden px-3 sm:px-5 lg:px-6 pt-4 pb-6 flex flex-col">
          {/* Page header: title + action buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6">
            <Skeleton className="h-[28px] w-[120px]" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-[124px]" style={{ borderRadius: 12 }} />
              <Skeleton className="h-10 w-[124px]" style={{ borderRadius: 12 }} />
            </div>
          </div>

          {isCdn ? <GridSkeleton /> : isFiles ? <ListSkeleton /> : null}
        </div>
      </div>
    </div>
  )
}

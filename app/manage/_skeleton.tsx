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
    <div className="flex h-screen w-full overflow-hidden bg-[#f0f0f0] dark:bg-[#151515] animate-in fade-in duration-200">
      {/* Sidebar */}
      <aside
        className="hidden lg:flex shrink-0 flex-col sticky top-0 h-[calc(100vh-16px)] my-2 ml-2 mr-1"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div className="flex items-center gap-2.5 shrink-0 pt-4 pb-6 px-2">
          <Skeleton className="h-[30px] w-[30px]" style={{ borderRadius: 8 }} />
          <Skeleton className="h-[17px] w-[86px]" />
        </div>
        <nav className="flex-1 min-h-0 px-2">
          <div className="space-y-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" style={{ borderRadius: 8 }} />
            ))}
          </div>
        </nav>
        <div className="px-2 pt-3 pb-3 shrink-0">
          <div className="rounded-[10px] bg-[#f7f7f8] dark:bg-[rgba(255,255,255,0.035)] px-3 py-3">
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
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 pb-3 shrink-0">
          <Skeleton className="h-10 w-10 shrink-0" style={{ borderRadius: 12 }} />
          <Skeleton className="h-10 flex-1" style={{ borderRadius: 12 }} />
        </div>
      </aside>

      {/* Main card */}
      <div className="flex flex-1 min-w-0 flex-col h-[calc(100vh-16px)] my-2 ml-1 mr-2 rounded-[12px] bg-white dark:bg-[#1e1e20] overflow-hidden">
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

"use client"

import { Skeleton } from "@heroui/react"
import { SIDEBAR_WIDTH } from "@/constants"
import { ListSkeleton } from "./storage/_list-skeleton"
import { GridSkeleton } from "./hosting/_grid-skeleton"

// Every wrapper below is copied verbatim from ManageLayout, only the leaves are
// swapped for Skeletons sized to the element they stand in for, so the real UI
// drops in without anything shifting. The layout returns null until the user
// loads, so this shell has to live here, a page level skeleton never mounts.
/** Fast loads never show a skeleton at all, a flash of one reads worse than a beat of nothing. */
export const SKELETON_DELAY_MS = 1000

/** Seconds, motion's unit. Long enough to read as a crossfade over the real dashboard. */
export const SKELETON_FADE_SECONDS = 0.35

export function ManageSkeleton({ pathname }: { pathname: string }) {
  const isHosting = pathname.startsWith("/me/hosting")
  const isStorage = pathname.startsWith("/me/storage")

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f0f0f0] dark:bg-black text-[#171717] dark:text-[#e3e3e3] animate-in fade-in duration-200">
      <aside
        className="hidden lg:flex shrink-0 flex-col sticky top-0 z-10 h-[calc(100vh-16px)] my-2 ml-2 mr-1"
        style={{ width: SIDEBAR_WIDTH }}
      >
        {/* account switcher (flex-1, h38, rounded-3xl) + 38px dock button */}
        <div className="relative z-20 shrink-0 flex items-center gap-2 px-0 pt-2" style={{ width: SIDEBAR_WIDTH }}>
          <Skeleton className="min-w-0 flex-1 rounded-3xl" style={{ height: 38 }} />
          <Skeleton className="shrink-0 rounded-3xl" style={{ height: 38, width: 38 }} />
        </div>

        {/* NavRow is 35px tall and rounded-3xl, four sections (five for an owner) */}
        <nav className="flex-1 min-h-0 px-0 pt-4 overflow-hidden">
          <div className="space-y-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-full rounded-3xl" style={{ height: 35 }} />
            ))}
          </div>
        </nav>

        {/* "Storage" label + percentage above a ProgressBar (h-2 track) */}
        <div className="px-0 pt-3 shrink-0">
          <div className="mb-0.5 flex items-center justify-between text-[12px]">
            <Skeleton className="h-[18px] w-[52px] rounded-md" />
            <Skeleton className="h-[21px] w-[40px] rounded-md" />
          </div>
          <Skeleton className="h-2 w-full rounded-sm" />
        </div>

        {/* account menu trigger, same 38px pill as the switcher */}
        <div className="relative z-20 shrink-0 px-0 pt-3 pb-2">
          <Skeleton className="rounded-3xl" style={{ width: SIDEBAR_WIDTH, height: 38 }} />
        </div>

        {/* Upgrade plan, a full-width md Button */}
        <div className="px-0 pb-3 shrink-0">
          <Skeleton className="h-10 w-full rounded-3xl md:h-9" />
        </div>
      </aside>

      <div className="hidden lg:block shrink-0 w-px my-4 ml-1 bg-white/10" />

      <div className="flex flex-1 min-w-0 flex-col h-[calc(100vh-16px)] my-2 ml-1 mr-2 rounded-[18px] bg-white dark:bg-transparent shadow-none overflow-hidden relative">
        {/* mobile header: hamburger in a 40px circle over a hairline border */}
        <header
          className="flex shrink-0 items-center gap-2 px-3 pt-1.5 pb-1.5 bg-white dark:bg-black lg:hidden safe-area-top relative z-10 border-b border-[#f0f0f0] dark:border-white/[0.08]"
        >
          <Skeleton className="rounded-full" style={{ width: 40, height: 40, marginLeft: -4 }} />
        </header>

        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 overflow-y-auto">
            <div className="h-full flex flex-col px-3 sm:px-5 lg:px-6 pt-2 pb-6">
              <div className="flex-1 flex flex-col">
                {/* page header: 28px headline on the sm:h-10 row, then actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-3 sm:h-10 mb-2">
                  <Skeleton className="h-[34px] w-[132px] shrink-0 rounded-md" />
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                    <Skeleton className="h-10 w-[112px] rounded-3xl md:h-9" />
                    <Skeleton className="h-10 w-[112px] rounded-3xl md:h-9" />
                  </div>
                </div>

                {isHosting ? <GridSkeleton /> : isStorage ? <ListSkeleton /> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

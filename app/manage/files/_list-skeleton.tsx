import { Skeleton } from "@/components/ui/skeleton"

// Mirrors ListView's box exactly — same wrapper, same grid columns, same px/py —
// so the real rows drop straight into these slots with no layout shift.
const COLS = "grid grid-cols-[44px_1fr_44px] md:grid-cols-[44px_1fr_240px_140px_44px] items-center gap-2 md:gap-4 px-3"

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      className="bg-[#f4f4f4] dark:bg-[rgba(255,255,255,0.04)] border border-[rgba(0,0,0,0.07)] dark:border-[rgba(255,255,255,0.06)] rounded-[14px]"
      style={{ padding: 1, boxShadow: "none" }}
    >
      <div className={`${COLS} py-2`}>
        <Skeleton className="h-[18px] w-[18px] rounded-[5px]" />
        <Skeleton className="h-[14px] w-[52px]" />
        <div className="hidden md:block"><Skeleton className="h-[14px] w-[64px]" /></div>
        <div className="hidden md:block"><Skeleton className="h-[14px] w-[36px]" /></div>
        <span />
      </div>

      <div className="bg-white dark:bg-[#121212]" style={{ borderRadius: 12, overflow: "hidden" }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`${COLS} py-3`}>
            <Skeleton className="h-[18px] w-[18px] rounded-[5px]" />

            <div className="flex items-center gap-3.5 min-w-0">
              <Skeleton className="h-8 w-8 rounded-md shrink-0" />
              <div className="flex flex-col min-w-0 flex-1 gap-1">
                <Skeleton className="h-[14px]" style={{ width: `${[68, 45, 82, 54, 73, 38][i % 6]}%`, maxWidth: 320 }} />
                {/* The list shows size · date under the name below md, so mirror that too. */}
                <Skeleton className="h-[12px] w-[110px] md:hidden" />
              </div>
            </div>

            <span className="hidden md:block"><Skeleton className="h-[13px] w-[132px]" /></span>
            <span className="hidden md:block"><Skeleton className="h-[13px] w-[48px]" /></span>
            <span />
          </div>
        ))}
      </div>
    </div>
  )
}

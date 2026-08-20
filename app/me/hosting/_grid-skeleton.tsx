import { Skeleton } from "@/components/ui/skeleton"

// Mirrors CdnAssetTile: same grid, same aspect-square tile, same caption block
// (name line + type · size line), so real tiles land exactly where these sat.
export function GridSkeleton({ tiles = 12 }: { tiles?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
      {Array.from({ length: tiles }).map((_, i) => (
        <div key={i}>
          <Skeleton className="w-full aspect-square" style={{ borderRadius: 12 }} />
          <div className="mt-2 px-1.5 pb-1 flex flex-col gap-1.5">
            <Skeleton className="h-[12px]" style={{ width: `${[72, 54, 86, 61][i % 4]}%` }} />
            <Skeleton className="h-[11px] w-[64px]" />
          </div>
        </div>
      ))}
    </div>
  )
}

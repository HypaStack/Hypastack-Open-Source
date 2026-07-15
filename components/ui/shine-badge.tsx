import type { ReactNode } from "react"

/**
 * Non-interactive badge that borrows the ShineButton look: subtle/gray by
 * default, primary gloss when `primary`. A <span> (not ShineButton) so it can
 * sit inside other clickable elements without nesting buttons.
 */
export function ShineBadge({ children, primary = false }: { children: ReactNode; primary?: boolean }) {
  if (primary) {
    return (
      <span
        className="inline-flex items-center h-[22px] px-2.5 rounded-[7px] text-[11px] font-medium text-white select-none shrink-0"
        style={{
          backgroundColor: "#2680bf",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.12), rgba(255,255,255,0))",
          borderTop: "1px solid rgba(255,255,255,0.6)",
          boxShadow:
            "rgba(0,0,0,0.05) 0px 1px 0px 0px, rgba(0,0,0,0.1) 0px 2px 2px 0px, #195a87 0px -1px 0px 0px inset",
        }}
      >
        {children}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center h-[22px] px-2.5 rounded-[7px] text-[11px] font-medium select-none shrink-0 bg-black/[0.05] text-[#171717] dark:bg-white/[0.06] dark:text-[#f7f8f8]">
      {children}
    </span>
  )
}

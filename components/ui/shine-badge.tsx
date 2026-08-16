import type { ReactNode } from "react"
import { Chip } from "@heroui/react"

/**
 * Non-interactive badge that borrows the primary button's look: subtle/gray by
 * default, primary gloss when `primary`. Built on HeroUI's Chip so it sits
 * inside other clickable elements without nesting buttons.
 */
export function ShineBadge({ children, primary = false }: { children: ReactNode; primary?: boolean }) {
  if (primary) {
    return (
      <Chip
        size="sm"
        className="h-[22px] rounded-[7px] text-[11px] font-medium text-white border-t border-t-white/60
          shadow-[rgba(0,0,0,0.05)_0px_1px_0px_0px,rgba(0,0,0,0.1)_0px_2px_2px_0px,#195a87_0px_-1px_0px_0px_inset]"
        style={{
          backgroundColor: "#2680bf",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.12), rgba(255,255,255,0))",
        }}
      >
        {children}
      </Chip>
    )
  }
  return (
    <Chip size="sm" variant="soft" className="h-[22px] rounded-[7px] text-[11px] font-medium">
      {children}
    </Chip>
  )
}

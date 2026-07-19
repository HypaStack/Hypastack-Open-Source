/** Shared tokens for the docs pages, matching the marketing pages' language. */

export const HEADING_FONT = { fontFamily: "'SF Pro Display', var(--font-syne), 'Syne', sans-serif" }

/** The frosted panel every docs surface sits on, same material as ShineCard. */
export const PANEL = {
  background: "rgba(38,38,38,0.3)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderTop: "1px solid rgba(255,255,255,0.14)",
  backdropFilter: "blur(12px)",
} as const

export const PROSE = "text-[15px] text-[#898e97] leading-[1.75] mb-4 max-w-[62ch]"

"use client"

import { useRef, useState, type CSSProperties, type ReactNode, type MouseEvent as ReactMouseEvent } from "react"

interface ShineCardProps {
  children: ReactNode
  /** Card fill. Defaults to the neutral frosted glass. */
  bg?: string
  /** Adds the top-down sheen + hairline top edge (used to lift a featured card). */
  highlight?: boolean
  radius?: number
  /** Max tilt in degrees; 0 disables the 3D tilt. */
  tilt?: number
  className?: string
  /** Merged last, so it can override any inline style. */
  style?: CSSProperties
}

/**
 * Frosted-glass card with a cursor-following gradient border and radial glow,
 * plus a subtle 3D tilt that eases back on mouse leave.
 *
 * Portable: all essential styling is inline and the pointer effects are handled
 * in JS, so no global CSS or Tailwind is required.
 */
export function ShineCard({
  children,
  bg = "rgba(38,38,38,0.3)",
  highlight = false,
  radius = 24,
  tilt = 3,
  className,
  style,
}: ShineCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [fx, setFx] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, angle: 120, hover: false })

  const onMove = (e: ReactMouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    setFx({
      ry: (px - 0.5) * tilt,
      rx: (0.5 - py) * tilt,
      gx: px * 100,
      gy: py * 100,
      angle: (Math.atan2(py - 0.5, px - 0.5) * 180) / Math.PI + 90,
      hover: true,
    })
  }
  const onLeave = () => setFx((f) => ({ ...f, rx: 0, ry: 0, hover: false }))

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setFx((f) => ({ ...f, hover: true }))}
      onMouseLeave={onLeave}
      className={className}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
        borderRadius: radius,
        backgroundColor: bg,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        ...(highlight
          ? {
              backgroundImage: "linear-gradient(rgba(255,255,255,0.03), rgba(255,255,255,0))",
              borderTop: "0.7px solid rgba(255,255,255,0.2)",
            }
          : {}),
        transform: `perspective(1000px) rotateX(${fx.rx}deg) rotateY(${fx.ry}deg)`,
        transition: "transform 0.8s cubic-bezier(0.2,0.8,0.2,1)",
        ...style,
      }}
    >
      {/* cursor-following gradient border */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          borderRadius: radius,
          padding: 1,
          background: `linear-gradient(${fx.angle}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.25) 50%, rgba(0,0,0,0) 100%)`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          opacity: fx.hover ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
        }}
      />
      {/* cursor-following radial glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `radial-gradient(circle at ${fx.gx}% ${fx.gy}%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)`,
          opacity: fx.hover ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
          filter: "blur(10px)",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flex: 1, flexDirection: "column" }}>
        {children}
      </div>
    </div>
  )
}

"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"

export default function PopoverExperiment() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [open])

  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-48px)] px-4">
      <div className="relative" ref={ref}>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
              className="absolute bottom-full left-0 mb-1.5 origin-bottom-left"
              style={{
                width: 230,
                padding: 4,
                borderRadius: 20,
                backgroundColor: '#1f1f1f',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.22)',
              }}
            >
              <Group>
                <Item icon="upload" label="Upload files" />
                <Item icon="hard_drive" label="Add from CDN" />
                <MoreItem />
              </Group>
              <div style={{ height: 1, margin: '2px 6px', backgroundColor: 'rgba(255,255,255,0.07)' }} />
              <Group>
                <Item icon="folder_open" label="Browse files" />
                <Item icon="article" label="File manager" />
              </Group>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex items-center justify-center bg-transparent hover:bg-[#1e1f20] active:bg-[#1f1f1f] transition-colors duration-100"
          style={{ width: 32, height: 32, borderRadius: 16 }}
        >
          <motion.div
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="flex items-center justify-center"
          >
            <MIcon name="add" size={18} style={{ color: 'rgba(255,255,255,0.6)' }} />
          </motion.div>
        </button>
      </div>
    </main>
  )
}

function Group({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '2px 0' }}>{children}</div>
}

/* ── "More uploads" with hover sub-menu ── */
function MoreItem() {
  const [hover, setHover] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setHover(true)
  }

  const leave = () => {
    timeoutRef.current = setTimeout(() => setHover(false), 150)
  }

  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      {/* Trigger row — hover only, not clickable */}
      <div
        className="bg-transparent hover:bg-[#313131] transition-colors duration-75 select-none"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          height: 34,
          paddingLeft: 12,
          paddingRight: 12,
          borderRadius: 16,
          cursor: 'default',
        }}
      >
        <MIcon name="more_horiz" size={15} style={{ color: 'rgba(255,255,255,0.6)' }} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 400, color: '#e3e3e3', lineHeight: 1 }}>
          More uploads
        </span>
        <MIcon name="chevron_right" size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </div>

      {/* Sub-popover */}
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
            className="absolute top-0 z-50"
            style={{
              left: 'calc(100% + 14px)',
              width: 200,
              padding: 4,
              borderRadius: 16,
              backgroundColor: '#1f1f1f',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.22)',
            }}
          >
            {/* Arrow pointing left */}
            <div
              style={{
                position: 'absolute',
                left: -8,
                top: 12,
                width: 0,
                height: 0,
                borderTop: '7px solid transparent',
                borderBottom: '7px solid transparent',
                borderRight: '8px solid #1f1f1f',
              }}
            />
            <Item icon="link" label="From URL" />
            <Item icon="image" label="From clipboard" />
            <Item icon="archive" label="Import archive" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Item({
  icon,
  label,
}: {
  icon: string
  label: string
}) {
  return (
    <button
      type="button"
      className="bg-transparent hover:bg-[#313131] active:bg-[#313131] active:scale-[0.97] transition-all duration-75"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        height: 34,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 16,
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <MIcon name={icon} size={15} style={{ color: 'rgba(255,255,255,0.6)' }} />
      <span style={{ flex: 1, fontSize: 14, fontWeight: 400, color: '#e3e3e3', lineHeight: 1 }}>
        {label}
      </span>
    </button>
  )
}

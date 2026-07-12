"use client"

import { useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { MenuItem } from "@/components/ui/menu-item"
import { useTheme } from "@/hooks/useTheme"
import { useLanguage } from "@/hooks/useLanguage"

export function GeneralTab() {
  const { theme, setTheme } = useTheme()
  const { language, languages, setLanguage } = useLanguage()
  const [langOpen, setLangOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]" style={{ borderRadius: 12, padding: '14px 16px' }}>
        <p className="text-[12px] font-medium text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] mb-3">Appearance</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-[520px]">
          <ThemeTile variant="system" label="System" active={theme === "system"} onClick={() => setTheme("system")} />
          <ThemeTile variant="light" label="Light" active={theme === "light"} onClick={() => setTheme("light")} />
          <ThemeTile variant="dark" label="Dark" active={theme === "dark"} onClick={() => setTheme("dark")} />
        </div>
      </div>

      <div
        className="flex items-center justify-between cursor-pointer hover:bg-[#f0f0f0] dark:hover:bg-[rgba(255,255,255,0.04)] transition-all duration-75 bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]"
        style={{ height: 38, paddingLeft: 12, paddingRight: 10, borderRadius: 12 }}
        onClick={() => setLangOpen((o) => !o)}
      >
        <span className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa]">Language</span>
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]">
          {language.label} <span className="text-[#999] dark:text-[#898e97] dark:text-[#a1a1aa]">({language.native})</span>
          <MIcon
            name="expand_more"
            size={15}
            className={`text-[#aaa] transition-transform ${langOpen ? "rotate-180" : ""}`}
          />
        </span>
      </div>
      {langOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setLangOpen(false)} />
          <div
            className="relative z-[110] -mt-2 w-full max-h-[280px] overflow-y-auto bg-[#ffffff] dark:bg-[#0e0f10] border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)]"
            style={{ padding: 4, borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
          >
            {languages.map((l) => {
              const selected = l.code === language.code
              return (
                <MenuItem
                  key={l.code}
                  onClick={() => {
                    setLanguage(l.code)
                    setLangOpen(false)
                  }}
                  trailing={selected ? <MIcon name="check" size={15} /> : undefined}
                  style={{ height: 34, fontSize: 13, ...(selected ? { fontWeight: 600 } : {}) }}
                >
                  {l.label} <span className="text-[#aaa]">({l.native})</span>
                </MenuItem>
              )
            })}
          </div>
        </>
      )}

      <a
        href="/help"
        className="flex items-center justify-between hover:bg-[#f0f0f0] dark:hover:bg-[rgba(255,255,255,0.04)] transition-all duration-75 bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]"
        style={{ height: 38, paddingLeft: 12, paddingRight: 12, borderRadius: 12 }}
      >
        <span className="text-[13px] text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa]">Support</span>
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-[#333] dark:text-[#f7f8f8] dark:text-[#ccc]">t.me/hypastack <MIcon name="open_in_new" size={14} /></span>
      </a>
    </div>
  )
}

function ThemeTile({
  variant,
  label,
  active,
  onClick,
}: {
  variant: "system" | "light" | "dark"
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        className={`relative w-full aspect-[5/3] rounded-[8px] overflow-hidden transition-all ${
          active
            ? "ring-2 ring-[#111] dark:ring-[#e3e3e3] ring-offset-0"
            : "border border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] hover:border-[#ccc] dark:hover:border-[rgba(255,255,255,0.15)]"
        }`}
      >
        {variant === "system" && (
          <div className="absolute inset-0 grid grid-cols-2">
            <ThemeMock dark={false} />
            <ThemeMock dark />
          </div>
        )}
        {variant === "light" && <ThemeMock dark={false} />}
        {variant === "dark" && <ThemeMock dark />}
      </button>
      <span className={`text-[13px] ${active ? "font-medium text-[#111] dark:text-white dark:text-[#f0f0f0]" : "font-normal text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa]"}`}>
        {label}
      </span>
    </div>
  )
}

function ThemeMock({ dark }: { dark: boolean }) {
  const bg = dark ? "#08090a" : "#f5f5f5"
  const sidebar = dark ? "#151616" : "#e8e8e8"
  const block = dark ? "#2c2c30" : "#dcdcdc"
  return (
    <div className="h-full w-full flex" style={{ backgroundColor: bg }}>
      <div className="w-[28%] py-2 px-1.5 flex flex-col gap-1" style={{ backgroundColor: sidebar }}>
        <div className="h-1 rounded-full" style={{ backgroundColor: block, width: "70%" }} />
        <div className="h-1 rounded-full" style={{ backgroundColor: block, width: "55%" }} />
        <div className="h-1 rounded-full" style={{ backgroundColor: block, width: "65%" }} />
      </div>
      <div className="flex-1 p-2 flex flex-col gap-1.5">
        <div className="h-1 rounded-full" style={{ backgroundColor: block, width: "30%" }} />
        <div className="h-2 rounded-sm mt-1" style={{ backgroundColor: block }} />
        <div className="h-2 rounded-sm" style={{ backgroundColor: block, width: "75%" }} />
      </div>
    </div>
  )
}

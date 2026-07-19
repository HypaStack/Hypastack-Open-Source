"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { SecondaryButton } from "@/components/ui/secondary-button"
import { type PreferencesTab, type PreferencesUser, type PreferencesStorage } from "./preferences/shared"
import { GeneralTab } from "./preferences/general-tab"
import { AccountTab } from "./preferences/account-tab"
import { PlansTab } from "./preferences/plans-tab"
import { IntegrationsTab } from "./preferences/integrations-tab"
import { SecurityTab } from "./preferences/security-tab"

// Modal shell — each tab lives in components/preferences/.
export type { PreferencesTab, PreferencesUser, PreferencesStorage } from "./preferences/shared"

interface Props {
  open: boolean
  initialTab?: PreferencesTab
  onClose: () => void
  user: PreferencesUser
  storage: PreferencesStorage | null
}

export function PreferencesModal({ open, initialTab = "general", onClose, user, storage }: Props) {
  const [active, setActive] = useState<PreferencesTab>(initialTab)

  useEffect(() => {
    if (open) setActive(initialTab)
  }, [open, initialTab])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-md"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative w-full h-full sm:w-full sm:max-w-[1060px] sm:h-[720px] sm:max-h-[92vh] flex flex-col pointer-events-auto bg-[#f0f0f0] dark:bg-[#0d0d0d] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.08)] rounded-none sm:rounded-[20px]"
              style={{
                boxShadow: '0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08)',
                padding: 4,
              }}
            >
              <div className="flex flex-col sm:flex-row w-full h-full gap-[3px] overflow-hidden">
              <div className="sm:hidden shrink-0 bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-transparent dark:border-[rgba(255,255,255,0.06)] pt-3 pb-1 rounded-md flex flex-col">
                <div className="flex items-center justify-between px-4 pb-3 pt-1">
                  <span className="text-[17px] font-semibold text-[#111] dark:text-white dark:text-[#f0f0f0]">Settings</span>
                  <SecondaryButton
                    iconOnly
                    size="sm"
                    onClick={onClose}
                    aria-label="Close"
                    style={{ width: 32, height: 32, borderRadius: 9999 }}
                  >
                    <MIcon name="close" size={18} />
                  </SecondaryButton>
                </div>
                <div className="flex gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
                  <TabButton active={active === "general"} onClick={() => setActive("general")} label="General" />
                  <TabButton active={active === "account"} onClick={() => setActive("account")} label="Account" />
                  <TabButton active={active === "plans"} onClick={() => setActive("plans")} label="Plans" />
                  <TabButton active={active === "billing"} onClick={() => setActive("billing")} label="Billing" />
                  <TabButton active={active === "integrations"} onClick={() => setActive("integrations")} label="Integrations" />
                  <TabButton active={active === "security"} onClick={() => setActive("security")} label="Security" />
                </div>
              </div>

              <div className="hidden sm:flex w-[210px] shrink-0 border-r border-[#e5e5e5] dark:border-[rgba(255,255,255,0.08)] px-3 pt-6 pb-4 flex-col">
                <div className="space-y-0.5">
                  <TabButton active={active === "general"} onClick={() => setActive("general")} label="General" fullWidth />
                  <TabButton active={active === "account"} onClick={() => setActive("account")} label="Account" fullWidth />
                  <TabButton active={active === "plans"} onClick={() => setActive("plans")} label="Plans" fullWidth />
                  <TabButton active={active === "billing"} onClick={() => setActive("billing")} label="Billing" fullWidth />
                  <TabButton active={active === "integrations"} onClick={() => setActive("integrations")} label="Integrations" fullWidth />
                  <TabButton active={active === "security"} onClick={() => setActive("security")} label="Security" fullWidth />
                </div>
              </div>

              <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-white dark:bg-[#121212] rounded-[16px] overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 sm:px-7 py-4 sm:py-6">
                  {active === "general" && <GeneralTab />}
                  {active === "account" && <AccountTab user={user} storage={storage} onSwitchTab={setActive} />}
                  {active === "plans" && <PlansTab user={user} onSwitchTab={setActive} />}
                  {active === "billing" && <BillingTab user={user} />}
                  {active === "integrations" && <IntegrationsTab />}
                  {active === "security" && <SecurityTab user={user} />}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
  )
}

function TabButton({ active, onClick, label, fullWidth = false }: { active: boolean; onClick: () => void; label: string; fullWidth?: boolean }) {
  return (
    <SecondaryButton
      variant={active ? "solid" : "ghost"}
      size="md"
      fullWidth={fullWidth}
      onClick={onClick}
      style={{ justifyContent: "flex-start" }}
    >
      {label}
    </SecondaryButton>
  )
}

function BillingTab({ } : { user: PreferencesUser }) {
  return (
    <div className="space-y-4">
      <div className="bg-[#f5f5f5] dark:bg-[rgba(255,255,255,0.02)] border border-[#ebebeb] dark:border-[rgba(255,255,255,0.06)]" style={{ borderRadius: 12, padding: '16px 16px' }}>
        <p className="text-[15px] font-normal text-[#111] dark:text-white dark:text-[#f0f0f0] mb-1.5">We're working on it.</p>
        <p className="text-[13px] font-normal text-[#888] dark:text-[#898e97] dark:text-[#a1a1aa] leading-relaxed max-w-md">
          Billing not expected until next month, If you want to upgrade your plan, contact Kiko on Telegram: t_usekiko
          <br /><br />
          All donations appreciated, this project is self funded.
        </p>
      </div>
    </div>
  )
}

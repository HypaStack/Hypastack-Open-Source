"use client"

import { useEffect, useState } from "react"
import { MIcon } from "@/components/ui/material-icon"
import { Button, Modal } from "@heroui/react"
import { type PreferencesTab, type PreferencesUser, type PreferencesStorage } from "./preferences/shared"
import { AccountTab } from "./preferences/account-tab"
import { PlansTab } from "./preferences/plans-tab"
import { BillingTab } from "./preferences/billing-tab"
import { IntegrationsTab } from "./preferences/integrations-tab"
import { SecurityTab } from "./preferences/security-tab"
import { DeveloperTab } from "./preferences/developer-tab"
import { useDeveloperMode } from "@/hooks/useDeveloperMode"

// Modal shell, each tab lives in components/preferences/.
export type { PreferencesTab, PreferencesUser, PreferencesStorage } from "./preferences/shared"

interface Props {
  open: boolean
  initialTab?: PreferencesTab
  onClose: () => void
  user: PreferencesUser
  storage: PreferencesStorage | null
}

export function PreferencesModal({ open, initialTab = "account", onClose, user, storage }: Props) {
  const [active, setActive] = useState<PreferencesTab>(initialTab)
  const { developerMode } = useDeveloperMode()

  useEffect(() => {
    if (open) setActive(initialTab)
  }, [open, initialTab])

  // Tab title reflects the modal while it's open, restored to whatever it was on close.
  useEffect(() => {
    if (!open) return
    const previousTitle = document.title
    document.title = `${user.nickname} (Preferences)`
    return () => { document.title = previousTitle }
  }, [open, user.nickname])

  // Turning developer mode off while sitting on its tab would leave the modal
  // on a tab with no way back to it.
  useEffect(() => {
    if (!developerMode && active === "developer") setActive("account")
  }, [developerMode, active])

  return (
    <Modal isOpen={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <Modal.Backdrop isDismissable variant="blur">
        <Modal.Container placement="center" size="cover" className="sm:w-full sm:max-w-[1060px]">
          <Modal.Dialog className="h-full w-full p-1 sm:h-[720px] sm:max-h-[92vh] sm:min-h-0">
              <div className="flex flex-col sm:flex-row w-full h-full gap-[3px] overflow-hidden">
                  <div className="sm:hidden shrink-0 bg-surface border border-separator pt-3 pb-1 rounded-md flex flex-col">
                    <div className="flex items-center justify-between px-4 pb-3 pt-1">
                      <span className="text-[17px] font-semibold text-foreground">Settings</span>
                      <Button
                        variant="tertiary"
                        isIconOnly
                        size="sm"
                        onPress={onClose}
                        aria-label="Close"
                        style={{ width: 32, height: 32, borderRadius: 9999 }}
                      >
                        <MIcon name="close" size={18} />
                      </Button>
                    </div>
                    <div className="flex gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
                      <TabButton active={active === "account"} onClick={() => setActive("account")} label="Account" />
                      <TabButton active={active === "plans"} onClick={() => setActive("plans")} label="Plans" />
                      <TabButton active={active === "billing"} onClick={() => setActive("billing")} label="Billing" />
                      <TabButton active={active === "integrations"} onClick={() => setActive("integrations")} label="Integrations" />
                      <TabButton active={active === "security"} onClick={() => setActive("security")} label="Security" />
                      {developerMode && <TabButton active={active === "developer"} onClick={() => setActive("developer")} label="Developer" />}
                    </div>
                  </div>

                  <div className="hidden sm:flex w-[210px] shrink-0 border-r border-separator px-3 pt-6 pb-4 flex-col">
                    <div className="space-y-0.5">
                      <TabButton active={active === "account"} onClick={() => setActive("account")} label="Account" fullWidth />
                      <TabButton active={active === "plans"} onClick={() => setActive("plans")} label="Plans" fullWidth />
                      <TabButton active={active === "billing"} onClick={() => setActive("billing")} label="Billing" fullWidth />
                      <TabButton active={active === "integrations"} onClick={() => setActive("integrations")} label="Integrations" fullWidth />
                      <TabButton active={active === "security"} onClick={() => setActive("security")} label="Security" fullWidth />
                      {developerMode && <TabButton active={active === "developer"} onClick={() => setActive("developer")} label="Developer" fullWidth />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 min-h-0 flex flex-col rounded-[16px] overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-4 sm:px-7 py-4 sm:py-6">
                      {active === "account" && <AccountTab user={user} storage={storage} onSwitchTab={setActive} />}
                      {active === "plans" && <PlansTab user={user} onSwitchTab={setActive} />}
                      {active === "billing" && <BillingTab user={user} />}
                      {active === "integrations" && <IntegrationsTab />}
                      {active === "security" && <SecurityTab user={user} />}
                      {active === "developer" && <DeveloperTab user={user} onSwitchTab={setActive} />}
                    </div>
                  </div>
              </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

function TabButton({ active, onClick, label, fullWidth = false }: { active: boolean; onClick: () => void; label: string; fullWidth?: boolean }) {
  return (
    <Button
      variant={active ? "tertiary" : "ghost"}
      size="md"
      fullWidth={fullWidth}
      onPress={onClick}
      style={{ justifyContent: "flex-start" }}
    >
      {label}
    </Button>
  )
}

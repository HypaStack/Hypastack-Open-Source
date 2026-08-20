"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Spinner, Tabs, Typography } from "@heroui/react"
import { useManage } from "@/hooks/useManage"
import { AdminDataProvider } from "./_data"
import { InviteCodesPanel } from "./_invite-codes"
import { AccountsPanel } from "./_accounts"
import { BlacklistPanel } from "./_blacklist"

// Server-side routes are the real gate (withAuth ownerOnly re-checks is_owner
// on every request), this redirect just keeps a non-owner from ever seeing
// the panel render before the first API call would 403 anyway.
export default function AdminPage() {
  const { user, isLoading } = useManage()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && !user.isOwner) {
      router.replace("/me/files")
    }
  }, [isLoading, user, router])

  if (isLoading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user.isOwner) return null

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pb-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          {/* same heading as Drive, Edge and Funnel */}
          <Typography type="h2" className="text-[28px] font-medium text-[#171717] dark:text-[#e3e3e3]">Admin</Typography>
          <Typography type="body-sm" color="muted">
            Invite codes, accounts and the IP blacklist.
          </Typography>
        </div>

        <AdminDataProvider>
          <Tabs defaultSelectedKey="invites">
            <Tabs.ListContainer className="w-full max-w-xl">
              <Tabs.List aria-label="Admin sections" className="w-full">
                <Tabs.Tab id="invites" className="flex-1 whitespace-nowrap">
                  <Tabs.Indicator />Invite codes
                </Tabs.Tab>
                <Tabs.Tab id="accounts" className="flex-1 whitespace-nowrap">
                  <Tabs.Indicator />Accounts
                </Tabs.Tab>
                <Tabs.Tab id="blacklist" className="flex-1 whitespace-nowrap">
                  <Tabs.Indicator />Blacklist
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>

            <Tabs.Panel id="invites" className="p-0"><InviteCodesPanel /></Tabs.Panel>
            <Tabs.Panel id="accounts" className="p-0"><AccountsPanel /></Tabs.Panel>
            <Tabs.Panel id="blacklist" className="p-0"><BlacklistPanel /></Tabs.Panel>
          </Tabs>
        </AdminDataProvider>
      </div>
    </div>
  )
}

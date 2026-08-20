"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useManage } from "@/hooks/useManage"
import { LoadingSvg } from "@/components/ui/loading-svg"
import { InviteCodesPanel } from "./_invite-codes"
import { AccountsPanel } from "./_accounts"

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
        <LoadingSvg />
      </div>
    )
  }

  if (!user.isOwner) return null

  return (
    <div className="flex-1 flex flex-col gap-8">
      <h1 className="text-[28px] font-medium tracking-tight text-[#171717] dark:text-[#e3e3e3]">Admin</h1>
      <InviteCodesPanel />
      <AccountsPanel />
    </div>
  )
}

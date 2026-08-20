import type { Metadata } from "next"
import { headers } from "next/headers"
import { NextRequest } from "next/server"
import { Typography } from "@heroui/react"
import { AlertMessage } from "@/components/ui/alert-message"
import { ButtonLink } from "@/components/ui/button-link"
import { isAppealEligible } from "@/lib/security/appealGate"
import { AppealForm, AppealCard } from "./_form"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Appeal",
  description: "Appeal a suspended account or a blocked connection on Hypastack.",
  robots: { index: false, follow: false },
}

export default async function AppealPage() {
  // The gate reads the client IP and cookies, both of which live in the request
  // headers, so the same NextRequest-based check the API uses works here too.
  const requestHeaders = await headers()
  const eligible = await isAppealEligible(
    new NextRequest("https://hypastack.com/appeal", { headers: requestHeaders })
  )

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans bg-black">
      {eligible ? (
        <AppealCard>
          <Typography type="body-sm" color="muted" className="mb-4 block">
            Tell us what happened and we'll take another look. One appeal an hour.
          </Typography>
          <AppealForm />
        </AppealCard>
      ) : (
        <div className="w-full max-w-[440px] flex flex-col gap-4">
          <AlertMessage tone="info" style={{ marginBottom: 0 }}>
            Nothing on this connection is blocked, so there's nothing to appeal. If you're locked out,
            open this page from the device and network you were blocked on.
          </AlertMessage>
          <ButtonLink href="/" variant="secondary" size="md" fullWidth>
            Back to Hypastack
          </ButtonLink>
        </div>
      )}
    </main>
  )
}

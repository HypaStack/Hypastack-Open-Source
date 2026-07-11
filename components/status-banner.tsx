import { AlertMessage } from "@/components/ui/alert-message"
import { getSiteStatus, type SiteState } from "@/lib/status/betterstack"

// Default copy per state; a status-page announcement, when set, overrides it.
const COPY: Record<Exclude<SiteState, "operational">, { tone: "error" | "warning"; text: string }> = {
  maintenance: { tone: "warning", text: "Scheduled maintenance is underway. Some features may be briefly unavailable." },
  downtime: { tone: "error", text: "We're having a major outage and are working to fix it." },
  degraded: { tone: "warning", text: "Some services are running slow right now. We're on it." },
}

export async function StatusBanner() {
  const status = await getSiteStatus()
  if (!status || status.state === "operational") return null

  const copy = COPY[status.state]
  return (
    <div className="fixed inset-x-0 top-[72px] z-[80] flex justify-center px-4">
      <a href="https://status.hypastack.com" className="w-full max-w-[880px] no-underline">
        <AlertMessage tone={copy.tone} style={{ marginBottom: 0, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", cursor: "pointer" }}>
          {status.announcement ?? copy.text}
        </AlertMessage>
      </a>
    </div>
  )
}

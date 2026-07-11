// Reads the public status-page JSON feed (any status page URL + /index.json).
// No token needed — the feed is public. Set STATUS_PAGE_URL to the page's base URL.
export type SiteState = "operational" | "degraded" | "downtime" | "maintenance"

export type SiteStatus = {
  state: SiteState
  announcement: string | null
}

const STATES: SiteState[] = ["operational", "degraded", "downtime", "maintenance"]

export async function getSiteStatus(): Promise<SiteStatus | null> {
  const base = process.env.STATUS_PAGE_URL
  if (!base) return null

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/index.json`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null

    const attr = (await res.json())?.data?.attributes
    const state = attr?.aggregate_state
    if (!STATES.includes(state)) return null

    const announcement =
      typeof attr?.announcement === "string" && attr.announcement.trim()
        ? attr.announcement.trim()
        : null

    return { state, announcement }
  } catch {
    return null
  }
}

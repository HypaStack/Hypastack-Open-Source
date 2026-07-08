import { withAuth } from "@/lib/http/route"
import { handleFunnelList } from "./_get"
import { handleFunnelCreate } from "./_post"

export const dynamic = "force-dynamic"

export const GET = withAuth(handleFunnelList, { label: "Funnel GET" })
export const POST = withAuth(handleFunnelCreate, { rateLimit: true, label: "Funnel POST" })

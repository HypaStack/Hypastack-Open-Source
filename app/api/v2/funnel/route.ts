import { withAuth } from "@/lib/http/route"
import { handleRequestList } from "./_get"
import { handleRequestCreate } from "./_post"

export const dynamic = "force-dynamic"

export const GET = withAuth(handleRequestList, { label: "Request GET" })
export const POST = withAuth(handleRequestCreate, { rateLimit: true, label: "Request POST" })

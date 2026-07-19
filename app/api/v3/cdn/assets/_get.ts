import { withApiKey } from "@/lib/http/v3/withApiKey"
import { v3Ok, v3Error } from "@/lib/http/v3/respond"
import { V3_CODES } from "@/lib/http/v3/codes"
import { buildPage, decodeCursor, parseLimit } from "@/lib/http/v3/cursor"
import { toV3CdnAsset } from "@/lib/http/v3/serialize"
import { getCdnAssetsPage } from "@/lib/models/cdnModel"

export const GET = withApiKey(async ({ request, requestId, userId, rate }) => {
  const params = request.nextUrl.searchParams
  const limit = parseLimit(params.get("limit"))

  const rawCursor = params.get("cursor")
  const cursor = rawCursor ? decodeCursor(rawCursor) : null
  if (rawCursor && !cursor) {
    return v3Error(V3_CODES.INVALID_REQUEST, requestId, {
      message: "That cursor is not valid. Use the next_cursor value from a previous page.",
      param: "cursor",
      rate,
    })
  }

  const rows = await getCdnAssetsPage(userId, limit, cursor)
  const page = buildPage(rows, limit, (row) => ({
    ts: new Date(row.created_at).getTime(),
    id: row.id,
  }))

  return v3Ok({ ...page, data: page.data.map(toV3CdnAsset) }, requestId, rate)
}, { scope: "cdn.read", label: "cdn list" })

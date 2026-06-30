import { NextResponse } from 'next/server'
import { withAuth } from "@/lib/http/route"
import { getCdnAssetsByUserId, getUserCdnStats } from '@/lib/models/cdnModel'

export const GET = withAuth(async ({ user }) => {
    const assets = await getCdnAssetsByUserId(user.userId)
    const stats = await getUserCdnStats(user.userId)

    return NextResponse.json({
      assets: assets.map(a => ({
        id: a.id,
        name: a.original_name,
        size: a.file_size,
        contentType: a.content_type,
        cdnUrl: a.cdn_url,
        createdAt: a.created_at,
      })),
      stats,
    })
}, { label: "CDN List" })

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getCdnAssetsByUserId, getUserCdnStats } from '@/lib/cdn-model'
import { API_ERRORS } from "@/constants"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${'Authentication required'}`);
      return NextResponse.json({ error: API_ERRORS.UNAUTHORIZED }, { status: 401 })
    }

    const assets = await getCdnAssetsByUserId(currentUser.userId)
    const stats = await getUserCdnStats(currentUser.userId)

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
  } catch (error: any) {
    console.error('[CDN] List error:', error)
    console.error(`[API Error] 500 Internal Server Error: ${'Failed to load assets'}`);
    return NextResponse.json({ error: API_ERRORS.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}

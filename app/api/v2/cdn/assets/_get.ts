import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getCdnAssetsByUserId, getUserCdnStats } from '@/lib/cdn-model'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
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
    return NextResponse.json({ error: 'Failed to load assets' }, { status: 500 })
  }
}

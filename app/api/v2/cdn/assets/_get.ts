import { NextRequest, NextResponse } from 'next/server'
import { apiError } from "@/lib/api-error"
import { getCurrentUser } from '@/lib/auth'
import { getCdnAssetsByUserId, getUserCdnStats } from '@/lib/cdn-model'
import { API_ERRORS } from "@/constants"

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        return apiError(401, API_ERRORS.UNAUTHORIZED, 'Authentication required')
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
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, 'Failed to load assets')
  }
}

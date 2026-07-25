import { NextRequest } from 'next/server'
import { apiError } from "@/lib/http/apiError"
import { getCurrentUser } from '@/lib/security/auth'
import { getCdnAssetsByIds, deleteCdnAssetsByIds } from '@/lib/models/cdnModel'
import { deleteObjectsBatch } from '@/lib/storage/r2'
import { getUserTier } from "@/lib/models/userModel"
import { getTierDelayMs } from "@/constants/tier-limits"
import { API_ERRORS } from "@/constants"

/** Objects per R2 batch-delete call. Small enough that progress moves visibly. */
const DELETE_CHUNK = 50

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        return apiError(401, API_ERRORS.UNAUTHORIZED, 'Authentication required')
    }

    const body = await request.json()
    const { assetId, assetIds } = body

    let idsToDelete: string[] = []
    if (assetIds && Array.isArray(assetIds)) {
      idsToDelete = assetIds
    } else if (assetId) {
      idsToDelete = [assetId]
    }

    if (idsToDelete.length === 0) {
        return apiError(400, API_ERRORS.BAD_REQUEST, 'Asset ID(s) required')
    }

    // Tier delay only applies when > 1 asset for free-tier throttling UX.
    const userTier = await getUserTier(currentUser.userId)
    const delayMs = getTierDelayMs(userTier)
    if (idsToDelete.length > 1 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    // Batch-fetch all records (single DB query, ownership-filtered)
    const ownedAssets = await getCdnAssetsByIds(idsToDelete, currentUser.userId)
    const ownedById = new Map(ownedAssets.map(a => [a.id, a]))

    // Delete in chunks and report after each one, so the client's progress
    // tracks real work instead of arriving in a single burst at the end.
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let index = 0
        const emit = (id: string, success: boolean, name: string) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify({
              index: ++index,
              total: idsToDelete.length,
              id,
              success,
              name,
            }) + "\n"))
          } catch { /* client disconnected */ }
        }

        // Ids the caller asked for but doesn't own resolve immediately.
        const unowned = idsToDelete.filter(id => !ownedById.has(id))
        for (const id of unowned) emit(id, false, "Unknown")

        for (let i = 0; i < ownedAssets.length; i += DELETE_CHUNK) {
          const chunk = ownedAssets.slice(i, i + DELETE_CHUNK)
          let failed = new Set<string>()
          try {
            failed = new Set(await deleteObjectsBatch(chunk.map(a => a.r2_key)))
          } catch (r2Err) {
            console.error('[CDN] R2 batch delete error:', r2Err)
            failed = new Set(chunk.map(a => a.r2_key))
          }

          const okIds = chunk.filter(a => !failed.has(a.r2_key)).map(a => a.id)
          if (okIds.length > 0) {
            try {
              await deleteCdnAssetsByIds(okIds, currentUser.userId)
            } catch (dbErr) {
              console.error('[CDN] row delete error:', dbErr)
            }
          }

          for (const a of chunk) emit(a.id, !failed.has(a.r2_key), a.original_name)
        }

        try { controller.close() } catch { /* ignore */ }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error("[CDN] bulk delete error:", error)
    return apiError(500, API_ERRORS.INTERNAL_SERVER_ERROR, "Failed to delete assets")
  }
}

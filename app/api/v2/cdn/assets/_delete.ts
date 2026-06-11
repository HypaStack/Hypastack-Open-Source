import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getCdnAssetsByIds, deleteCdnAssetsByIds } from '@/lib/cdn-model'
import { deleteObjectsBatch } from '@/lib/r2'
import { getUserTier } from "@/lib/user-model"
import { getTierDelayMs } from "@/constants/tier-limits"
import { logOperation } from "@/lib/credits"

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser) {
        console.error(`[API Error] 401 Unauthorized: ${'Authentication required'}`);
      return NextResponse.json({ error: "401 Unauthorized" }, { status: 401 })
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
        console.error(`[API Error] 400 Bad Request: ${'Asset ID(s) required'}`);
      return NextResponse.json({ error: "400 Bad Request" }, { status: 400 })
    }

    // Tier delay only applies when > 1 asset for free-tier throttling UX.
    const userTier = await getUserTier(currentUser.userId)
    const delayMs = getTierDelayMs(userTier)
    if (idsToDelete.length > 1 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    // 1. Batch-fetch all records (single DB query, ownership-filtered)
    const ownedAssets = await getCdnAssetsByIds(idsToDelete, currentUser.userId)
    const ownedById = new Map(ownedAssets.map(a => [a.id, a]))

    // 2. Batch-delete from R2 in one HTTP call (up to 1000 keys)
    const r2Keys = ownedAssets.map(a => a.r2_key)
    let failedR2Keys = new Set<string>()
    if (r2Keys.length > 0) {
      try {
        const failed = await deleteObjectsBatch(r2Keys)
        failedR2Keys = new Set(failed)
      } catch (r2Err) {
        console.error('[CDN] R2 batch delete error:', r2Err)
      }
    }

    // 3. Batch-delete from DB in one query (only assets where R2 succeeded)
    const idsWithR2Ok = ownedAssets
      .filter(a => !failedR2Keys.has(a.r2_key))
      .map(a => a.id)

    if (idsWithR2Ok.length > 0) {
      await deleteCdnAssetsByIds(idsWithR2Ok, currentUser.userId)
    }

    // Track Class A operations (one per deleted asset, fire-and-forget)
    for (const _id of idsWithR2Ok) {
      logOperation(currentUser.userId, 'A', 'cdn_delete', true).catch(() => {})
    }

    // 4. Stream results back (all at once, preserving existing frontend contract)
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        idsToDelete.forEach((id, i) => {
          const asset = ownedById.get(id)
          const r2Failed = asset ? failedR2Keys.has(asset.r2_key) : false
          const success = !!asset && !r2Failed

          try {
            controller.enqueue(encoder.encode(JSON.stringify({
              index: i + 1,
              total: idsToDelete.length,
              id,
              success,
              name: asset?.original_name ?? "Unknown",
            }) + "\n"))
          } catch { /* client disconnected */ }
        })
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
    console.error(`[API Error] 500 Internal Server Error: ${"Failed to delete assets"}`);
    return NextResponse.json({ error: "500 Internal Server Error" }, { status: 500 })
  }
}

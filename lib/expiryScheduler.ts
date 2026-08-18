import { deleteByKey } from '@/lib/storage/r2'
import { bustCache } from '@/lib/data/cache'
import { bustRouteCache } from '@/lib/http/routeCache'
import { errorMessage } from "@/lib/errors"

// Exact in-process timers for files expiring within the hour, since the hourly
// sweep alone is too coarse for a 1-minute custom expiration. In-process only;
// scheduleUpcomingExpiries re-arms them after a restart.

const IMMEDIATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

const timers = new Map<string, NodeJS.Timeout>()

async function deleteExpiredNow(fileId: string, r2Key: string, userId: string | null): Promise<void> {
  timers.delete(fileId)
  try {
    await deleteByKey(r2Key)
  } catch { /* r2 deletion best-effort; hourly sweep is the backstop */ }
  try {
    const { deleteFileRecord } = await import('@/lib/models/fileModel')
    await deleteFileRecord(fileId)
  } catch (e) {
    console.error(`[Expiry] Failed to delete expired file ${fileId}:`, errorMessage(e))
  }
  if (userId) {
    await bustCache(`user:${userId}:files`, `user:${userId}:file-stats`, `user:${userId}:storage`)
    await bustRouteCache(userId, 'files:list')
  }
}

/**
 * Arm a precise deletion timer for a file. Prefers handing the job to the
 * hypasched sidecar (which owns any horizon and survives restarts); when the
 * sidecar is unreachable, falls back to the legacy in-process timer for
 * files expiring within the next hour (the hourly sweep backstops the rest).
 */
export function scheduleFileExpiry(
  fileId: string,
  r2Key: string,
  userId: string | null,
  expiresAt: Date | string
): void {
  import('@/lib/schedService')
    .then(({ schedFileExpiry }) => schedFileExpiry(fileId, r2Key, userId, expiresAt))
    .catch(() => scheduleLocalExpiry(fileId, r2Key, userId, expiresAt))
}

function scheduleLocalExpiry(
  fileId: string,
  r2Key: string,
  userId: string | null,
  expiresAt: Date | string
): void {
  const delay = new Date(expiresAt).getTime() - Date.now()
  if (Number.isNaN(delay) || delay > IMMEDIATE_WINDOW_MS) return

  const existing = timers.get(fileId)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(() => {
    deleteExpiredNow(fileId, r2Key, userId).catch(console.error)
  }, Math.max(0, delay))
  timer.unref?.()
  timers.set(fileId, timer)
}

/**
 * Arm precise LOCAL timers for every committed file expiring within the next
 * hour. Fallback path only: runs when the hypasched sidecar is unreachable,
 * on startup and each hourly cleanup tick, to recover timers lost to a
 * restart and to catch files that have since entered the one-hour window.
 */
export async function scheduleUpcomingExpiries(): Promise<void> {
  try {
    const { getFilesExpiringWithinHour } = await import('@/lib/models/fileModel')
    const rows = await getFilesExpiringWithinHour()
    for (const row of rows) {
      scheduleLocalExpiry(row.id, row.r2_key, row.user_id ?? null, row.expires_at)
    }
  } catch (e) {
    console.error('[Expiry] Failed to schedule upcoming expiries:', errorMessage(e))
  }
}

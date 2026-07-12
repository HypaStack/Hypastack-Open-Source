import { getExpiredFiles, deleteFileRecord, cleanupExpiredStaging } from '@/lib/models/fileModel'
import { deleteByKey } from '@/lib/storage/r2'
import { getClient } from '@/lib/data/db'
import { scheduleUpcomingExpiries } from '@/lib/expiryScheduler'
import { errorMessage } from "@/lib/errors"

export async function cleanupExpiredFiles(): Promise<{
  cleaned: number
  errors: string[]
}> {
  const errors: string[] = []
  let cleaned = 0

  try {
    const MAX_BATCHES = 3 // max 1500 files per run
    let batches = 0

    // Process in batches of 500 until no expired files remain (or limit hit)
    while (batches < MAX_BATCHES) {
      const expiredFiles = await getExpiredFiles(500)

      if (expiredFiles.length === 0) break
      batches++

      for (const file of expiredFiles) {
        try {
          await deleteByKey(file.r2_key)
          await deleteFileRecord(file.id)
          cleaned++
        } catch (error) {
          const errorMsg = `Failed to delete ${file.id}: ${errorMessage(error)}`
          console.error(`[Cleanup] ${errorMsg}`)
          errors.push(errorMsg)
        }
      }
    }

    if (cleaned > 0 || errors.length > 0) {
      console.log(`[Cleanup] Expired files: cleaned=${cleaned}, errors=${errors.length}`)
    }
  } catch (error) {
    console.error('[Cleanup] Fatal error in cleanupExpiredFiles:', error)
    errors.push(`Fatal error: ${errorMessage(error)}`)
  }

  return { cleaned, errors }
}

export function startCleanupScheduler(): NodeJS.Timeout {
  // The hypasched sidecar owns expiry deletion and the periodic sweeps. This
  // hourly tick only runs the legacy in-process cleanup as a total fallback
  // when the sidecar is unreachable.
  const tick = async () => {
    const { schedHealthy } = await import('@/lib/schedService')
    if (await schedHealthy()) return
    console.warn('[Cleanup] sched service unreachable, running legacy sweep')
    await cleanupExpiredFiles()
    await cleanupStaging()
    await cleanupDumpsterPastes()
    await cleanupUnusedFunnels()
    await cleanupFunnelStaging()
    await scheduleUpcomingExpiries()
  }

  tick().catch(console.error)
  return setInterval(() => {
    tick().catch(console.error)
  }, 60 * 60 * 1000)
}

export async function cleanupStaging(): Promise<{
  cleaned: number
  errors: string[]
}> {
  // cleanupExpiredStaging already batches 500 at a time internally
  const result = await cleanupExpiredStaging()
  if (result.cleaned > 0 || result.errors.length > 0) {
    console.log(`[Cleanup] Staging: cleaned=${result.cleaned}, errors=${result.errors.length}`)
  }
  return result
}

// Delete unused funnel links older than 7 days (never dropped into). There's no
// R2 object for an unused link — just the row and its keypair. Consumed funnels
// are kept so their received file stays decryptable.
async function cleanupUnusedFunnels(): Promise<{ cleaned: number; errors: string[] }> {
  const errors: string[] = []
  let cleaned = 0
  const client = await getClient()

  try {
    const result = await client.query(
      `DELETE FROM funnels WHERE status = 'active' AND created_at < NOW() - INTERVAL '7 days'`
    )
    cleaned = result.rowCount ?? 0
    if (cleaned > 0) console.log(`[Cleanup] Unused funnels: cleaned=${cleaned}`)
  } catch (error) {
    console.error('[Cleanup] Fatal error in cleanupUnusedFunnels:', error)
    errors.push(`Fatal error: ${errorMessage(error)}`)
  } finally {
    client.release()
  }

  return { cleaned, errors }
}

// Sweep abandoned funnel drops (init wrote a funnel_staging row, complete never
// cleared it). Rows past 2 hours never completed: delete the orphaned R2 object
// and the row. Ids that became a live funnel_files row are skipped (object kept)
// and their stale markers just dropped.
async function cleanupFunnelStaging(): Promise<{ cleaned: number; errors: string[] }> {
  const errors: string[] = []
  let cleaned = 0
  const client = await getClient()

  try {
    await client.query(`
      DELETE FROM funnel_staging s
      WHERE s.created_at < NOW() - INTERVAL '2 hours'
        AND EXISTS (SELECT 1 FROM funnel_files f WHERE f.id = s.id)
    `)

    const { rows } = await client.query(`
      SELECT id, r2_key FROM funnel_staging s
      WHERE s.created_at < NOW() - INTERVAL '2 hours'
        AND NOT EXISTS (SELECT 1 FROM funnel_files f WHERE f.id = s.id)
      LIMIT 500
    `)

    for (const row of rows) {
      try {
        await deleteByKey(row.r2_key)
        await client.query(`DELETE FROM funnel_staging WHERE id = $1`, [row.id])
        cleaned++
      } catch (error) {
        const errorMsg = `Failed to delete funnel staging ${row.id}: ${errorMessage(error)}`
        console.error(`[Cleanup] ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    if (cleaned > 0) console.log(`[Cleanup] Funnel staging: cleaned=${cleaned}`)
  } catch (error) {
    console.error('[Cleanup] Fatal error in cleanupFunnelStaging:', error)
    errors.push(`Fatal error: ${errorMessage(error)}`)
  } finally {
    client.release()
  }

  return { cleaned, errors }
}

export async function cleanupDumpsterPastes(): Promise<{ cleaned: number; errors: string[] }> {
  const errors: string[] = []
  let cleaned = 0
  const client = await getClient()

  try {
    const { rows } = await client.query(`
      SELECT id, r2_key FROM dumpster_pastes 
      WHERE last_accessed_at < NOW() - INTERVAL '180 days'
      LIMIT 100
    `)

    for (const paste of rows) {
      try {
        await deleteByKey(paste.r2_key)
        await client.query(`DELETE FROM dumpster_pastes WHERE id = $1`, [paste.id])
        cleaned++
      } catch (error) {
        const errorMsg = `Failed to delete paste ${paste.id}: ${errorMessage(error)}`
        console.error(`[Cleanup] ${errorMsg}`)
        errors.push(errorMsg)
      }
    }
    
    if (cleaned > 0 || errors.length > 0) {
      console.log(`[Cleanup] Dumpster pastes: cleaned=${cleaned}, errors=${errors.length}`)
    }
  } catch (error) {
    console.error('[Cleanup] Fatal error in cleanupDumpsterPastes:', error)
    errors.push(`Fatal error: ${errorMessage(error)}`)
  } finally {
    client.release()
  }

  return { cleaned, errors }
}

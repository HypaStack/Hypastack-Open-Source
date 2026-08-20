import { getExpiredFiles, deleteFileRecord, cleanupExpiredStaging } from '@/lib/models/fileModel'
import { deleteByKey } from '@/lib/storage/r2'
import { getClient } from '@/lib/data/db'
import { scheduleUpcomingExpiries } from '@/lib/expiryScheduler'
import { errorMessage } from "@/lib/errors"
import { CLEANUP_BATCH_SIZE, CLEANUP_MAX_BATCHES } from "@/constants"

export async function cleanupExpiredFiles(): Promise<{
  cleaned: number
  errors: string[]
}> {
  const errors: string[] = []
  let cleaned = 0

  try {
    let batches = 0

    while (batches < CLEANUP_MAX_BATCHES) {
      const expiredFiles = await getExpiredFiles(CLEANUP_BATCH_SIZE)

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
    await cleanupUnusedRequests()
    await cleanupRequestStaging()
    await cleanupCdnStaging()
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

// Delete unused fileRequest links older than 7 days (never dropped into). There's no
// R2 object for an unused link, just the row and its keypair. Consumed funnels
// are kept so their received file stays decryptable.
async function cleanupUnusedRequests(): Promise<{ cleaned: number; errors: string[] }> {
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
    console.error('[Cleanup] Fatal error in cleanupUnusedRequests:', error)
    errors.push(`Fatal error: ${errorMessage(error)}`)
  } finally {
    client.release()
  }

  return { cleaned, errors }
}

// Sweep funnel_staging rows past 2 hours whose init never completed, deleting
// the orphaned R2 object. Rows that became a live funnel_files row are skipped.
async function cleanupRequestStaging(): Promise<{ cleaned: number; errors: string[] }> {
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
      LIMIT ${CLEANUP_BATCH_SIZE}
    `)

    for (const row of rows) {
      try {
        await deleteByKey(row.r2_key)
        await client.query(`DELETE FROM funnel_staging WHERE id = $1`, [row.id])
        cleaned++
      } catch (error) {
        const errorMsg = `Failed to delete fileRequest staging ${row.id}: ${errorMessage(error)}`
        console.error(`[Cleanup] ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    if (cleaned > 0) console.log(`[Cleanup] Request staging: cleaned=${cleaned}`)
  } catch (error) {
    console.error('[Cleanup] Fatal error in cleanupRequestStaging:', error)
    errors.push(`Fatal error: ${errorMessage(error)}`)
  } finally {
    client.release()
  }

  return { cleaned, errors }
}

// Sweep cdn_staging rows past 2 hours whose init never completed. Matches on
// r2_key not id, two racing inits for the same slug can share a key, and
// matching on id would let the loser's sweep delete the winner's live object.
async function cleanupCdnStaging(): Promise<{ cleaned: number; errors: string[] }> {
  const errors: string[] = []
  let cleaned = 0
  const client = await getClient()

  try {
    await client.query(`
      DELETE FROM cdn_staging s
      WHERE s.created_at < NOW() - INTERVAL '2 hours'
        AND EXISTS (SELECT 1 FROM cdn_assets a WHERE a.r2_key = s.r2_key)
    `)

    const { rows } = await client.query(`
      SELECT id, r2_key FROM cdn_staging s
      WHERE s.created_at < NOW() - INTERVAL '2 hours'
        AND NOT EXISTS (SELECT 1 FROM cdn_assets a WHERE a.r2_key = s.r2_key)
      LIMIT ${CLEANUP_BATCH_SIZE}
    `)

    for (const row of rows) {
      try {
        await deleteByKey(row.r2_key)
        await client.query(`DELETE FROM cdn_staging WHERE id = $1`, [row.id])
        cleaned++
      } catch (error) {
        const errorMsg = `Failed to delete cdn staging ${row.id}: ${errorMessage(error)}`
        console.error(`[Cleanup] ${errorMsg}`)
        errors.push(errorMsg)
      }
    }

    if (cleaned > 0) console.log(`[Cleanup] CDN staging: cleaned=${cleaned}`)
  } catch (error) {
    console.error('[Cleanup] Fatal error in cleanupCdnStaging:', error)
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

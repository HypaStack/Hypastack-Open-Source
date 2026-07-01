import { getExpiredFiles, deleteFileRecord, cleanupExpiredStaging } from '@/lib/models/fileModel'
import { deleteByKey } from '@/lib/storage/r2'
import { getClient } from '@/lib/data/db'
import { scheduleUpcomingExpiries } from '@/lib/expiryScheduler'

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
        } catch (error: any) {
          const errorMsg = `Failed to delete ${file.id}: ${error.message}`
          console.error(`[Cleanup] ${errorMsg}`)
          errors.push(errorMsg)
        }
      }
    }

    if (cleaned > 0 || errors.length > 0) {
      console.log(`[Cleanup] Expired files: cleaned=${cleaned}, errors=${errors.length}`)
    }
  } catch (error: any) {
    console.error('[Cleanup] Fatal error in cleanupExpiredFiles:', error)
    errors.push(`Fatal error: ${error.message}`)
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

export function stopCleanupScheduler(timer: NodeJS.Timeout): void {
  clearInterval(timer)
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
      } catch (error: any) {
        const errorMsg = `Failed to delete paste ${paste.id}: ${error.message}`
        console.error(`[Cleanup] ${errorMsg}`)
        errors.push(errorMsg)
      }
    }
    
    if (cleaned > 0 || errors.length > 0) {
      console.log(`[Cleanup] Dumpster pastes: cleaned=${cleaned}, errors=${errors.length}`)
    }
  } catch (error: any) {
    console.error('[Cleanup] Fatal error in cleanupDumpsterPastes:', error)
    errors.push(`Fatal error: ${error.message}`)
  } finally {
    client.release()
  }

  return { cleaned, errors }
}

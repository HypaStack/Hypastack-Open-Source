let cleanupTimer: NodeJS.Timeout | null = null

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { initDatabase } = await import('./lib/db')
      const { startCleanupScheduler } = await import('./lib/cleanup')

      await initDatabase()
      cleanupTimer = startCleanupScheduler()
    } catch (error) {
      console.error('[Startup] Failed to initialize:', error)
    }

    // BetterStack heartbeat — runs every 5 minutes, no external cron needed
    const HEARTBEAT_URL = process.env.BETTERSTACK_HEARTBEAT_URL
    if (HEARTBEAT_URL) {
      const beat = async () => {
        let ok = false
        try {
          const { getPool } = await import('./lib/db')
          await getPool().query('SELECT 1')
          ok = true
        } catch (err: any) {
          console.error('[Heartbeat] DB check failed:', err?.message)
        }
        const url = ok ? HEARTBEAT_URL : `${HEARTBEAT_URL}/fail`
        fetch(url, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(5000) })
          .catch((err: any) => console.error('[Heartbeat] Ping failed:', err?.message))
      }
      beat() // immediate ping on startup
      setInterval(beat, 5 * 60 * 1000)
    }

    process.on('SIGINT', () => { if (cleanupTimer) clearInterval(cleanupTimer); process.exit(0) })
    process.on('SIGTERM', () => { if (cleanupTimer) clearInterval(cleanupTimer); process.exit(0) })
  }
}

export const config = {
  runtime: 'nodejs',
}

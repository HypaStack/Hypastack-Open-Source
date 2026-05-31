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

    process.on('SIGINT', () => { if (cleanupTimer) clearInterval(cleanupTimer); process.exit(0) })
    process.on('SIGTERM', () => { if (cleanupTimer) clearInterval(cleanupTimer); process.exit(0) })
  }
}

export const config = {
  runtime: 'nodejs',
}

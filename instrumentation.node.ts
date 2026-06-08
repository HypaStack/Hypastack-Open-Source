import crypto from 'crypto'

let cleanupTimer: NodeJS.Timeout | null = null
async function ping(url: string | undefined, ok: boolean) {
  if (!url) return
  const target = ok ? url : `${url}/fail`
  fetch(target, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(5000) })
    .catch((err: any) => console.error(`[Heartbeat] Ping failed (${target}):`, err?.message))
}async function checkDb(): Promise<boolean> {
  try {
    const { getPool } = await import('./lib/db')
    await getPool().query('SELECT 1')
    return true
  } catch (err: any) {
    console.error('[Heartbeat] DB check failed:', err?.message)
    return false
  }
}async function checkAuth(): Promise<boolean> {
  try {
    const { generateToken, verifyToken } = await import('./lib/auth')
    const token = generateToken({ userId: 'heartbeat-probe' })
    const result = verifyToken(token)
    return result?.userId === 'heartbeat-probe'
  } catch (err: any) {
    console.error('[Heartbeat] Auth check failed:', err?.message)
    return false
  }
}async function checkCsrf(): Promise<boolean> {
  try {
    const { generateCsrfToken } = await import('./lib/security')
    const token = generateCsrfToken()
    const a = Buffer.from(token, 'utf8')
    const b = Buffer.from(token, 'utf8')
    return crypto.timingSafeEqual(a, b)
  } catch (err: any) {
    console.error('[Heartbeat] CSRF check failed:', err?.message)
    return false
  }
}async function checkR2(): Promise<boolean> {
  try {
    const res = await fetch('https://r2.hypastack.com/cdn/zvo7jefzshuu/logo-main.webp', {
      method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(6000),
    })
    return res.ok
  } catch (err: any) {
    console.error('[Heartbeat] R2 check failed:', err?.message)
    return false
  }
}async function checkMainPage(): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return true
  try {
    const res = await fetch(appUrl, {
      method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch (err: any) {
    console.error('[Heartbeat] Main page check failed:', err?.message)
    return false
  }
}

function startHeartbeats() {
  const INTERVAL = 30_000

  const run = async () => {
    const [dbOk, authOk, csrfOk, r2Ok, mainOk] = await Promise.all([
      checkDb(),
      checkAuth(),
      checkCsrf(),
      checkR2(),
      checkMainPage(),
    ])
    await Promise.all([
      ping(process.env.BETTERSTACK_DB_HEALTH,      dbOk),
      ping(process.env.BETTERSTACK_AUTH_HEARTBEAT, authOk),
      ping(process.env.BETTERSTACK_CSRF,           csrfOk),
      ping(process.env.BETTERSTACK_R2_RESPONSE,    r2Ok),
      ping(process.env.BETTERSTACK_MAIN_PAGE,      mainOk),
    ])
  }

  run()
  setInterval(run, INTERVAL)
}
async function init() {
  try {
    const { initDatabase } = await import('./lib/db')
    const { startCleanupScheduler } = await import('./lib/cleanup')
    await initDatabase()
    cleanupTimer = startCleanupScheduler()
  } catch (error) {
    console.error('[Startup] Failed to initialize:', error)
  }

  startHeartbeats()

  process.on('SIGINT', () => { if (cleanupTimer) clearInterval(cleanupTimer); process.exit(0) })
  process.on('SIGTERM', () => { if (cleanupTimer) clearInterval(cleanupTimer); process.exit(0) })
}

init()

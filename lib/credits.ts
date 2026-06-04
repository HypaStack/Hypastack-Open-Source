import { getPool } from './db'

// Constants
export const FREE_UNITS_PER_MONTH = 5000
export const UNITS_PER_CREDIT = 1000
export const CLASS_A_COST = 4  // op-units per Class A operation
export const CLASS_B_COST = 1  // op-units per Class B operation
export const CREDIT_EXPIRY_MONTHS = 6
export const CREDIT_PRICE_EUR = 0.50

// Types
export interface MonthlyUsage {
  userId: string
  month: string
  opUnitsUsed: number
  freeUnitsUsed: number
  creditUnitsUsed: number
}

export interface CreditBalance {
  balance: number
  balanceEur: number
  monthlyUsage: MonthlyUsage
}

function getCurrentMonth(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export async function getOrCreateMonthlyUsage(userId: string): Promise<MonthlyUsage> {
  const pool = getPool()
  const month = getCurrentMonth()

  const { rows } = await pool.query(
    `INSERT INTO monthly_usage (user_id, month, op_units_used, free_units_used, credit_units_used)
     VALUES ($1, $2, 0, 0, 0)
     ON CONFLICT (user_id, month) DO NOTHING
     RETURNING *`,
    [userId, month]
  )

  if (rows.length > 0) {
    return mapUsageRow(rows[0])
  }

  const existing = await pool.query(
    `SELECT * FROM monthly_usage WHERE user_id = $1 AND month = $2`,
    [userId, month]
  )
  return mapUsageRow(existing.rows[0])
}

export async function logOperation(
  userId: string,
  opClass: 'A' | 'B',
  action: string,
  isCdnOperation: boolean
): Promise<{ allowed: boolean; reason?: string }> {
  const pool = getPool()
  const client = await pool.connect()
  const opUnits = opClass === 'A' ? CLASS_A_COST : CLASS_B_COST
  const month = getCurrentMonth()

  try {
    await client.query('BEGIN')

    // Log the operation
    await client.query(
      `INSERT INTO operation_logs (user_id, op_class, action, op_units, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, opClass, action, opUnits]
    )

    // Upsert monthly usage
    await client.query(
      `INSERT INTO monthly_usage (user_id, month, op_units_used, free_units_used, credit_units_used)
       VALUES ($1, $2, $3, 0, 0)
       ON CONFLICT (user_id, month)
       DO UPDATE SET op_units_used = monthly_usage.op_units_used + $3`,
      [userId, month, opUnits]
    )

    // Get current usage to determine billing
    const { rows } = await client.query(
      `SELECT free_units_used, credit_units_used FROM monthly_usage
       WHERE user_id = $1 AND month = $2`,
      [userId, month]
    )
    const freeUsed = rows[0].free_units_used
    const freeRemaining = Math.max(0, FREE_UNITS_PER_MONTH - freeUsed)

    if (freeRemaining >= opUnits) {
      // Covered by free tier
      await client.query(
        `UPDATE monthly_usage SET free_units_used = free_units_used + $3
         WHERE user_id = $1 AND month = $2`,
        [userId, month, opUnits]
      )
      await client.query('COMMIT')
      return { allowed: true }
    }

    // Partially or fully credit-funded
    const freePartial = freeRemaining
    const creditNeeded = opUnits - freePartial

    if (freePartial > 0) {
      await client.query(
        `UPDATE monthly_usage SET free_units_used = free_units_used + $3
         WHERE user_id = $1 AND month = $2`,
        [userId, month, freePartial]
      )
    }

    const creditsConsumed = await consumeCreditsWithClient(client, userId, creditNeeded)

    if (!creditsConsumed) {
      if (isCdnOperation) {
        await client.query('ROLLBACK')
        return { allowed: false, reason: 'No credits remaining. Purchase credits to continue using CDN operations.' }
      }
      // Non-CDN ops are always allowed (overage tracking)
      await client.query(
        `UPDATE monthly_usage SET credit_units_used = credit_units_used + $3
         WHERE user_id = $1 AND month = $2`,
        [userId, month, creditNeeded]
      )
      await client.query('COMMIT')
      return { allowed: true }
    }

    await client.query(
      `UPDATE monthly_usage SET credit_units_used = credit_units_used + $3
       WHERE user_id = $1 AND month = $2`,
      [userId, month, creditNeeded]
    )

    await client.query('COMMIT')
    return { allowed: true }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// FIFO credit consumption within an existing transaction
async function consumeCreditsWithClient(
  client: import('pg').PoolClient,
  userId: string,
  units: number
): Promise<boolean> {
  const { rows: purchases } = await client.query(
    `SELECT id, remaining FROM credit_purchases
     WHERE user_id = $1 AND status = 'completed' AND remaining > 0 AND expires_at > NOW()
     ORDER BY created_at ASC
     FOR UPDATE`,
    [userId]
  )

  let remaining = units
  for (const purchase of purchases) {
    if (remaining <= 0) break

    const deduct = Math.min(remaining, purchase.remaining)
    await client.query(
      `UPDATE credit_purchases SET remaining = remaining - $1 WHERE id = $2`,
      [deduct, purchase.id]
    )
    remaining -= deduct
  }

  if (remaining > 0) return false

  // Sync user balance
  const { rows } = await client.query(
    `SELECT COALESCE(SUM(remaining), 0) as total FROM credit_purchases
     WHERE user_id = $1 AND status = 'completed' AND remaining > 0 AND expires_at > NOW()`,
    [userId]
  )
  await client.query(
    `UPDATE users SET credits_balance = $1 WHERE id = $2`,
    [rows[0].total, userId]
  )

  return true
}

async function consumeCredits(userId: string, units: number): Promise<boolean> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await consumeCreditsWithClient(client, userId, units)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getUserCredits(userId: string): Promise<CreditBalance> {
  const pool = getPool()

  const { rows: userRows } = await pool.query(
    `SELECT COALESCE(credits_balance, 0) as credits_balance FROM users WHERE id = $1`,
    [userId]
  )
  const balance = userRows.length > 0 ? Number(userRows[0].credits_balance) : 0
  const monthlyUsage = await getOrCreateMonthlyUsage(userId)

  return {
    balance,
    balanceEur: balance * CREDIT_PRICE_EUR,
    monthlyUsage,
  }
}

export async function canPerformCdnOperation(userId: string): Promise<boolean> {
  const pool = getPool()
  const month = getCurrentMonth()

  const { rows } = await pool.query(
    `SELECT COALESCE(free_units_used, 0) as free_units_used FROM monthly_usage
     WHERE user_id = $1 AND month = $2`,
    [userId, month]
  )

  const freeUsed = rows.length > 0 ? Number(rows[0].free_units_used) : 0
  if (freeUsed < FREE_UNITS_PER_MONTH) return true

  // Check credit balance
  const { rows: userRows } = await pool.query(
    `SELECT COALESCE(credits_balance, 0) as credits_balance FROM users WHERE id = $1`,
    [userId]
  )
  return userRows.length > 0 && Number(userRows[0].credits_balance) > 0
}

export async function addCredits(
  userId: string,
  purchaseId: string,
  credits: number,
  amountEur: number,
  stripeSessionId: string
): Promise<void> {
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + CREDIT_EXPIRY_MONTHS)

    await client.query(
      `UPDATE credit_purchases
       SET status = 'completed', stripe_session_id = $1, remaining = $4, expires_at = $2
       WHERE id = $3`,
      [stripeSessionId, expiresAt, purchaseId, credits]
    )

    await client.query(
      `UPDATE users SET credits_balance = COALESCE(credits_balance, 0) + $1 WHERE id = $2`,
      [credits, userId]
    )

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function expireOldCredits(): Promise<number> {
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { rows: expired } = await client.query(
      `UPDATE credit_purchases
       SET status = 'expired', updated_at = NOW()
       WHERE expires_at < NOW() AND status = 'completed' AND remaining > 0
       RETURNING user_id, remaining`
    )

    // Subtract expired remaining from each user's balance
    for (const row of expired) {
      await client.query(
        `UPDATE users SET credits_balance = GREATEST(0, COALESCE(credits_balance, 0) - $1) WHERE id = $2`,
        [row.remaining, row.user_id]
      )
    }

    await client.query('COMMIT')
    return expired.length
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

function mapUsageRow(row: any): MonthlyUsage {
  return {
    userId: row.user_id,
    month: row.month,
    opUnitsUsed: Number(row.op_units_used),
    freeUnitsUsed: Number(row.free_units_used),
    creditUnitsUsed: Number(row.credit_units_used),
  }
}

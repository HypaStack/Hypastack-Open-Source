import { Pool, PoolClient, QueryResult } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var __basedropDbPool: Pool | undefined
  // eslint-disable-next-line no-var
  var __basedropDbInitialized: boolean | undefined
}

export function getPool(): Pool {
  if (!globalThis.__basedropDbPool) {
    console.log('[DB] Creating new PostgreSQL connection pool')
    console.log('[DB] Host:', process.env.DB_HOST || 'localhost')
    console.log('[DB] User:', process.env.DB_USER)
    console.log('[DB] Database:', process.env.DB_NAME)

    globalThis.__basedropDbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      max: 40,
      min: 20,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    })

    globalThis.__basedropDbPool
      .connect()
      .then((client) => {
        console.log('[DB] PostgreSQL connection successful')
        client.release()
      })
      .catch((err) => {
        console.error('[DB] PostgreSQL connection failed:', err.message)
      })
  }
  return globalThis.__basedropDbPool
}

export async function initDatabase(): Promise<void> {
  if (globalThis.__basedropDbInitialized) {
    return
  }

  console.log('[DB] Initializing PostgreSQL database...')

  const pool = getPool()
  const client = await pool.connect()

  try {
    console.log('[DB] Got connection, creating tables...')

    // Create users table — zero-knowledge schema
    //   nickname_encrypted  → AES-256-GCM encrypted nickname (client-side E2EE)
    //   password_hash       → PBKDF2 hash of access key (hpsk_...)
    //   No email, no IP, no OAuth, no PII
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        nickname_encrypted TEXT NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500),
        premium BOOLEAN DEFAULT FALSE,
        tier TEXT NOT NULL DEFAULT 'free',
        last_acknowledged_tier TEXT NOT NULL DEFAULT 'free',
        inactivity_purge_days INTEGER NOT NULL DEFAULT 7,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        last_login TIMESTAMPTZ,
        onboarding_data JSONB,
        is_insider SMALLINT DEFAULT 0
      )
    `)

    // Create folders table (zero-knowledge folder names)
    await client.query(`
      CREATE TABLE IF NOT EXISTS basedrop_folders (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        name_encrypted TEXT NOT NULL,
        parent_id VARCHAR(36) DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_basedrop_folders_user_id ON basedrop_folders(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_basedrop_folders_parent_id ON basedrop_folders(parent_id)`)


    // Create files table
    await client.query(`
      CREATE TABLE IF NOT EXISTS basedrop_files (
        id VARCHAR(36) PRIMARY KEY,
        r2_key VARCHAR(500) NOT NULL,
        original_name VARCHAR(500) NOT NULL,
        file_size BIGINT NOT NULL,
        content_type VARCHAR(200) NOT NULL,
        upload_date TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        pin VARCHAR(6),
        burn_on_read SMALLINT DEFAULT 0,
        upload_completed BOOLEAN DEFAULT TRUE,
        upload_started_at TIMESTAMPTZ DEFAULT NOW(),
        file_hash VARCHAR(64),
        custom_filename VARCHAR(500),
        note VARCHAR(100),
        user_id VARCHAR(36),
        encryption_iv VARCHAR(32),
        encryption_auth_tag VARCHAR(32),
        starred BOOLEAN DEFAULT FALSE,
        burned_at TIMESTAMPTZ,
        encryption_chunk_size INTEGER,
        encryption_total_parts INTEGER
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_basedrop_files_expires_at ON basedrop_files(expires_at)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_basedrop_files_user_id ON basedrop_files(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_basedrop_files_user_upload_date ON basedrop_files(user_id, upload_date DESC)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_basedrop_files_upload_incomplete ON basedrop_files(upload_completed) WHERE upload_completed = FALSE`)

    // Rate limiting table — account_id stores the user's ID or identifier
    // Migration: drop legacy table if it doesn't have account_id
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name='rate_limits') AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name='rate_limits' AND column_name='account_id') THEN
          DROP TABLE rate_limits CASCADE;
        END IF;
      END $$;
    `)
    await client.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id SERIAL PRIMARY KEY,
        account_id VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL DEFAULT 'upload',
        attempt_count INTEGER DEFAULT 1,
        first_attempt TIMESTAMPTZ DEFAULT NOW(),
        last_attempt TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(account_id, action)
      )
    `)
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM pg_constraint WHERE conname = 'rate_limits_account_id_key') THEN
          ALTER TABLE rate_limits DROP CONSTRAINT rate_limits_account_id_key;
        END IF;
      END $$;
    `)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'rate_limits_account_id_action_key') THEN
          ALTER TABLE rate_limits ADD CONSTRAINT rate_limits_account_id_action_key UNIQUE (account_id, action);
        END IF;
      END $$;
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_rate_limits_first_attempt ON rate_limits(first_attempt)`)



    // Upload staging table
    await client.query(`
      CREATE TABLE IF NOT EXISTS upload_staging (
        id VARCHAR(36) PRIMARY KEY,
        r2_key VARCHAR(500) NOT NULL,
        original_name VARCHAR(200) NOT NULL,
        file_size BIGINT NOT NULL,
        content_type VARCHAR(200) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        pin VARCHAR(6),
        burn_on_read BOOLEAN DEFAULT FALSE,
        share_url VARCHAR(500) NOT NULL,
        custom_filename VARCHAR(500),
        note VARCHAR(100),
        user_id VARCHAR(36),
        encryption_chunk_size INTEGER,
        encryption_total_parts INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_upload_staging_created_at ON upload_staging(created_at)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_upload_staging_expires_at ON upload_staging(expires_at)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_upload_staging_user_id ON upload_staging(user_id)`)



    // User sessions — zero-knowledge: no user_agent, no IP
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_active_at TIMESTAMPTZ DEFAULT NOW(),
        revoked BOOLEAN DEFAULT FALSE
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked ON user_sessions(revoked)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(id) WHERE revoked = FALSE`)

    // Create CDN assets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cdn_assets (
        id VARCHAR(12) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        r2_key VARCHAR(500) NOT NULL,
        original_name VARCHAR(500) NOT NULL,
        file_size BIGINT NOT NULL,
        content_type VARCHAR(200) NOT NULL,
        cdn_url VARCHAR(500) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cdn_assets_user_id ON cdn_assets(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cdn_assets_created_at ON cdn_assets(created_at)`)

    // CDN folders (plaintext names — CDN assets are public, no encryption needed)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cdn_folders (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        name VARCHAR(200) NOT NULL,
        parent_id VARCHAR(36) DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cdn_folders_user_id ON cdn_folders(user_id)`)

    // Add folder_id to cdn_assets if it doesn't exist yet
    await client.query(`ALTER TABLE cdn_assets ADD COLUMN IF NOT EXISTS folder_id VARCHAR(36) DEFAULT NULL`)


    // Monero payment invoices
    await client.query(`
      CREATE TABLE IF NOT EXISTS xmr_payments (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        tier TEXT NOT NULL,
        amount_atomic BIGINT NOT NULL,
        amount_xmr NUMERIC(20,12) NOT NULL,
        subaddress TEXT NOT NULL,
        subaddress_index INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        txid TEXT,
        confirmations INTEGER DEFAULT 0,
        paid_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_xmr_payments_user_id ON xmr_payments(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_xmr_payments_status ON xmr_payments(status)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_xmr_payments_subaddress_index ON xmr_payments(subaddress_index)`)

    // Add paid_until column to users table (for subscription expiry tracking)
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS paid_until TIMESTAMPTZ`)
      await client.query(`ALTER TABLE xmr_payments ADD COLUMN IF NOT EXISTS receipt_base64 TEXT`)
    } catch {
      // Column may already exist
    }

    // Migration: add inactivity_purge_days to existing users tables
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS inactivity_purge_days INTEGER NOT NULL DEFAULT 7`)
    } catch {
      // Column may already exist
    }

    // Migration: add is_insider to existing users tables
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_insider SMALLINT DEFAULT 0`)
    } catch {
      // Column may already exist
    }

    // Migration: add canvas_data JSONB column for per-user canvas persistence
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS canvas_data JSONB`)
    } catch {
      // Column may already exist
    }

    // Migration: add encryption chunk metadata columns
    try {
      await client.query(`ALTER TABLE basedrop_files ADD COLUMN IF NOT EXISTS encryption_chunk_size INTEGER`)
      await client.query(`ALTER TABLE basedrop_files ADD COLUMN IF NOT EXISTS encryption_total_parts INTEGER`)
      await client.query(`ALTER TABLE upload_staging ADD COLUMN IF NOT EXISTS encryption_chunk_size INTEGER`)
      await client.query(`ALTER TABLE upload_staging ADD COLUMN IF NOT EXISTS encryption_total_parts INTEGER`)
    } catch {
      // Columns may already exist
    }

    // Migration: add folder_id to files and staging
    try {
      await client.query(`ALTER TABLE basedrop_files ADD COLUMN IF NOT EXISTS folder_id VARCHAR(36)`)
      await client.query(`ALTER TABLE upload_staging ADD COLUMN IF NOT EXISTS folder_id VARCHAR(36)`)
    } catch {
      // Columns may already exist
    }

    // Migration: remove nickname_hash (E2E encryption drops uniqueness constraint)
    try {
      await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS nickname_hash`)
    } catch {
      // Ignore
    }

    // Migration: drop legacy unused zero-knowledge and activity tables
    try {
      await client.query(`DROP TABLE IF EXISTS user_activity CASCADE`)
      await client.query(`DROP TABLE IF EXISTS pin_verifications CASCADE`)
      await client.query(`DROP TABLE IF EXISTS email_verifications CASCADE`)
      await client.query(`DROP TABLE IF EXISTS password_reset_codes CASCADE`)
    } catch {
      // Ignore
    }

    // Migration: strip user_agent from sessions (zero-knowledge)
    try {
      await client.query(`ALTER TABLE user_sessions DROP COLUMN IF EXISTS user_agent`)
    } catch {
      // Ignore
    }

    globalThis.__basedropDbInitialized = true
    console.log('[DB] PostgreSQL database initialized successfully')
  } catch (error: any) {
    console.error('[DB] Failed to initialize database:', error.message)
    throw error
  } finally {
    client.release()
  }
}

export async function ensureDatabase(): Promise<void> {
  if (!globalThis.__basedropDbInitialized) {
    await initDatabase()
  }
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool()
  return pool.connect()
}

export type { QueryResult, PoolClient }

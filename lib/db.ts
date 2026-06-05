import { Pool, PoolClient, QueryResult } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var __basedropDbPool: Pool | undefined
  // eslint-disable-next-line no-var
  var __basedropDbInitialized: boolean | undefined
}

export function getPool(): Pool {
  if (!globalThis.__basedropDbPool) {
    const databaseUrl = process.env.DATABASE_URL

    if (databaseUrl) {
      const cleanUrl = databaseUrl.replace(/([?&])sslmode=[^&]*/i, '$1').replace(/([?&])uselibpqcompat=[^&]*/i, '$1').replace(/[?&]$/, '')
      console.log('[DB] Creating PostgreSQL pool via DATABASE_URL (SSL required)')
      globalThis.__basedropDbPool = new Pool({
        connectionString: cleanUrl,
        ssl: { rejectUnauthorized: false },
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      })
    } else {
      console.log('[DB] Creating PostgreSQL pool via individual env vars')
      console.log('[DB] Host:', process.env.DB_HOST || 'localhost')
      console.log('[DB] User:', process.env.DB_USER)
      console.log('[DB] Database:', process.env.DB_NAME)

      globalThis.__basedropDbPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      })
    }

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

    // Credits system tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_purchases (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        credits INTEGER NOT NULL,
        remaining INTEGER NOT NULL,
        amount_eur NUMERIC(10,2) NOT NULL,
        stripe_session_id VARCHAR(255),
        stripe_payment_intent VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_credit_purchases_user ON credit_purchases(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_credit_purchases_active ON credit_purchases(user_id, status) WHERE status = 'completed'`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS operation_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        op_class CHAR(1) NOT NULL,
        action VARCHAR(30) NOT NULL,
        op_units INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_operation_logs_user_month ON operation_logs(user_id, created_at)`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_usage (
        user_id VARCHAR(36) NOT NULL,
        month CHAR(7) NOT NULL,
        op_units_used INTEGER DEFAULT 0,
        free_units_used INTEGER DEFAULT 0,
        credit_units_used INTEGER DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, month)
      )
    `)

    // Migration: add credits_balance to users
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 0`)
    } catch {
      // Column may already exist
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

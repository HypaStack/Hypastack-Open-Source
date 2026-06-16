import { Pool, PoolClient, QueryResult } from 'pg'

declare global {
  var __basedropDbPool: Pool | undefined
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
        refresh_token_hash TEXT UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        last_active_at TIMESTAMPTZ DEFAULT NOW(),
        revoked BOOLEAN DEFAULT FALSE
      )
    `)
    // Migrate existing tables first — columns must exist before indexes are created
    await client.query(`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT UNIQUE`)
    await client.query(`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked ON user_sessions(revoked)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(id) WHERE revoked = FALSE`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh ON user_sessions(refresh_token_hash) WHERE revoked = FALSE`)

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

    await client.query(`ALTER TABLE cdn_assets ADD COLUMN IF NOT EXISTS folder_id VARCHAR(36) DEFAULT NULL`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS dumpster_pastes (
        id VARCHAR(36) PRIMARY KEY,
        r2_key VARCHAR(500) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_accessed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dumpster_pastes_last_accessed ON dumpster_pastes(last_accessed_at)`)


    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS inactivity_purge_days INTEGER NOT NULL DEFAULT 7`)
    } catch {}

    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_insider SMALLINT DEFAULT 0`)
    } catch {}

    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS canvas_data JSONB`)
    } catch {}

    try {
      await client.query(`ALTER TABLE basedrop_files ADD COLUMN IF NOT EXISTS encryption_chunk_size INTEGER`)
      await client.query(`ALTER TABLE basedrop_files ADD COLUMN IF NOT EXISTS encryption_total_parts INTEGER`)
      await client.query(`ALTER TABLE upload_staging ADD COLUMN IF NOT EXISTS encryption_chunk_size INTEGER`)
      await client.query(`ALTER TABLE upload_staging ADD COLUMN IF NOT EXISTS encryption_total_parts INTEGER`)
    } catch {}

    try {
      await client.query(`ALTER TABLE basedrop_files ADD COLUMN IF NOT EXISTS folder_id VARCHAR(36)`)
      await client.query(`ALTER TABLE upload_staging ADD COLUMN IF NOT EXISTS folder_id VARCHAR(36)`)
    } catch {}

    try {
      await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS nickname_hash`)
    } catch {}

    try {
      await client.query(`DROP TABLE IF EXISTS user_activity CASCADE`)
      await client.query(`DROP TABLE IF EXISTS pin_verifications CASCADE`)
      await client.query(`DROP TABLE IF EXISTS email_verifications CASCADE`)
      await client.query(`DROP TABLE IF EXISTS password_reset_codes CASCADE`)
    } catch {}

    try {
      await client.query(`ALTER TABLE user_sessions DROP COLUMN IF EXISTS user_agent`)
    } catch {}


    // ── Forum tables ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS forum_posts (
        id            VARCHAR(12)   PRIMARY KEY,
        user_id       VARCHAR(36)   NOT NULL,
        slug          VARCHAR(250)  NOT NULL UNIQUE,
        title         VARCHAR(200)  NOT NULL,
        description   TEXT,
        tags          TEXT[]        DEFAULT '{}',
        views         INTEGER       DEFAULT 0,
        created_at    TIMESTAMPTZ   DEFAULT NOW(),
        updated_at    TIMESTAMPTZ   DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id    ON forum_posts(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(created_at DESC)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_forum_posts_slug       ON forum_posts(slug)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_forum_posts_tags       ON forum_posts USING GIN(tags)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_forum_posts_fts        ON forum_posts USING GIN(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')))`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS forum_files (
        id            VARCHAR(12)   PRIMARY KEY,
        post_id       VARCHAR(12)   NOT NULL,
        user_id       VARCHAR(36)   NOT NULL,
        r2_key        VARCHAR(500)  NOT NULL,
        original_name VARCHAR(500)  NOT NULL,
        file_size     BIGINT        NOT NULL,
        content_type  VARCHAR(200)  NOT NULL,
        public_url    VARCHAR(500)  NOT NULL,
        created_at    TIMESTAMPTZ   DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_forum_files_post_id ON forum_files(post_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_forum_files_user_id ON forum_files(user_id)`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS forum_comments (
        id            SERIAL        PRIMARY KEY,
        post_id       VARCHAR(12)   NOT NULL,
        user_id       VARCHAR(36)   NOT NULL,
        parent_id     INTEGER       DEFAULT NULL,
        body          TEXT          NOT NULL,
        created_at    TIMESTAMPTZ   DEFAULT NOW(),
        updated_at    TIMESTAMPTZ   DEFAULT NOW(),
        deleted       BOOLEAN       DEFAULT FALSE
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_forum_comments_post_id   ON forum_comments(post_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_forum_comments_parent_id ON forum_comments(parent_id)`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS forum_reports (
        id          SERIAL        PRIMARY KEY,
        post_id     VARCHAR(12)   NOT NULL,
        reporter_ip TEXT,
        reason      TEXT,
        created_at  TIMESTAMPTZ   DEFAULT NOW()
      )
    `)

    globalThis.__basedropDbInitialized = true
    console.log('[DB] PostgreSQL database initialized successfully')
  } catch (error: any) {
    _initFailed = true
    console.error('[DB] Failed to initialize database:', error.message)
    throw error
  } finally {
    client.release()
  }
}

let _initFailed = false

export async function ensureDatabase(): Promise<void> {
  if (globalThis.__basedropDbInitialized) return
  if (_initFailed) return // Don't retry on every request after a failed init
  await initDatabase()
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool()
  return pool.connect()
}

export type { QueryResult, PoolClient }

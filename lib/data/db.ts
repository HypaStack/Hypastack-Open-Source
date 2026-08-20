import { Pool, PoolClient } from 'pg'
import { readFileSync } from 'fs'
import { errorMessage } from "@/lib/errors"

declare global {
  var __basedropDbPool: Pool | undefined
  var __basedropDbInitialized: boolean | undefined
}

type DbSsl = { ca: string; rejectUnauthorized: true; servername?: string } | { rejectUnauthorized: false }

// If a CA is pinned (DB_CA_CERT/_PATH), TLS is enforced against it; DB_TLS_SERVERNAME
// overrides the SAN hostname check (e.g. connecting by IP to a cert issued for a hostname).
// No CA pinned → falls back to encrypted-but-unauthenticated, for existing deployments.
function getDbSsl(): DbSsl {
  const caInline = process.env.DB_CA_CERT
  const caPath = process.env.DB_CA_CERT_PATH
  let ca: string | undefined
  if (caInline) ca = caInline.replace(/\\n/g, '\n')
  else if (caPath) ca = readFileSync(caPath, 'utf8')

  if (ca) {
    const servername = process.env.DB_TLS_SERVERNAME
    return { ca, rejectUnauthorized: true, ...(servername ? { servername } : {}) }
  }
  return { rejectUnauthorized: false }
}

export function getPool(): Pool {
  if (!globalThis.__basedropDbPool) {
    const databaseUrl = process.env.DATABASE_URL

    if (databaseUrl) {
      const cleanUrl = databaseUrl.replace(/([?&])sslmode=[^&]*/i, '$1').replace(/([?&])uselibpqcompat=[^&]*/i, '$1').replace(/[?&]$/, '')
      console.log('[DB] Creating PostgreSQL pool via DATABASE_URL (SSL required)')
      globalThis.__basedropDbPool = new Pool({
        connectionString: cleanUrl,
        ssl: getDbSsl(),
        max: 40,
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
        max: 40,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ssl: process.env.DB_SSL === 'true' ? getDbSsl() : undefined,
      })
    }

    // An idle client dropping (db restart, network blip) emits 'error' on the
    // pool; without a listener that's an uncaught exception that kills the
    // process. The pool discards the client and recovers on its own.
    globalThis.__basedropDbPool.on('error', (err) => {
      console.error('[DB] Idle client error (pool will recover):', err.message)
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        nickname_encrypted TEXT NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500),
        banner_url VARCHAR(500),
        display_name VARCHAR(64),
        display_name_changed_at TIMESTAMPTZ,
        nickname_changed_at TIMESTAMPTZ,
        storage_token VARCHAR(32),
        verified BOOLEAN NOT NULL DEFAULT FALSE,
        premium BOOLEAN DEFAULT FALSE,
        tier TEXT NOT NULL DEFAULT 'free',
        last_acknowledged_tier TEXT NOT NULL DEFAULT 'free',
        inactivity_purge_days INTEGER NOT NULL DEFAULT 7,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        last_login TIMESTAMPTZ,
        onboarding_data JSONB
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
        burn_on_read SMALLINT DEFAULT 0,
        upload_completed BOOLEAN DEFAULT TRUE,
        upload_started_at TIMESTAMPTZ DEFAULT NOW(),
        file_hash VARCHAR(64),
        custom_filename VARCHAR(500),
        note VARCHAR(100),
        user_id VARCHAR(36),
        encryption_iv VARCHAR(32),
        encryption_auth_tag VARCHAR(32),
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
    // Migrate existing tables first, columns must exist before indexes are created
    await client.query(`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT UNIQUE`)
    await client.query(`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked ON user_sessions(revoked)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(id) WHERE revoked = FALSE`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh ON user_sessions(refresh_token_hash) WHERE revoked = FALSE`)

    // v3 public API keys. Only the SHA-256 lookup is stored, the key itself is
    // shown once at creation and never again.
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id VARCHAR(16) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        name VARCHAR(60) NOT NULL,
        key_lookup TEXT NOT NULL UNIQUE,
        hint VARCHAR(16) NOT NULL,
        scopes TEXT[] NOT NULL,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ
      )
    `)
    // In-flight v3 CDN uploads. v2 lets the browser hand back the r2 key at
    // completion because the session already proves who is asking; a public API
    // must not trust that, so the init→owner binding is persisted here and the
    // completing key is checked against it.
    await client.query(`
      CREATE TABLE IF NOT EXISTS cdn_staging (
        id VARCHAR(12) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        r2_key VARCHAR(500) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        content_type VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cdn_staging_created ON cdn_staging(created_at)`)

    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_lookup ON api_keys(key_lookup) WHERE revoked = FALSE`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id, created_at) WHERE revoked = FALSE`)

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
        tags          JSONB         DEFAULT '[]'::jsonb,
        views         INTEGER       DEFAULT 0,
        created_at    TIMESTAMPTZ   DEFAULT NOW(),
        updated_at    TIMESTAMPTZ   DEFAULT NOW()
      )
    `)
    try {
      await client.query(`ALTER TABLE forum_posts ALTER COLUMN tags TYPE JSONB USING to_jsonb(tags)`)
      await client.query(`ALTER TABLE forum_posts ALTER COLUMN tags SET DEFAULT '[]'::jsonb`)
    } catch {}

    await client.query(`CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id    ON forum_posts(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(created_at DESC)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_forum_posts_slug       ON forum_posts(slug)`)
    
    // Drop the old text array index if it exists, before creating the JSONB one
    try { await client.query(`DROP INDEX IF EXISTS idx_forum_posts_tags`) } catch {}
    await client.query(`CREATE INDEX IF NOT EXISTS idx_forum_posts_tags       ON forum_posts USING GIN(tags jsonb_path_ops)`)
    
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

    // ── Schema migration tracking ───────────────────────────────────────────
    // Everything above is the idempotent baseline schema. Going forward, add
    // discrete ordered migrations to INCREMENTAL_MIGRATIONS below instead of
    // appending more ad-hoc ALTERs above, each runs exactly once, in order, and
    // is recorded so it won't re-run on the next cold start.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await client.query(`INSERT INTO schema_migrations (version) VALUES ('baseline') ON CONFLICT DO NOTHING`)

    const INCREMENTAL_MIGRATIONS: { version: string; sql: string }[] = [
      // { version: '2026-07-01-example', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS example TEXT` },
      { version: '2026-06-30-file-slug-files', sql: `ALTER TABLE basedrop_files ADD COLUMN IF NOT EXISTS slug VARCHAR(64)` },
      { version: '2026-06-30-file-slug-staging', sql: `ALTER TABLE upload_staging ADD COLUMN IF NOT EXISTS slug VARCHAR(64)` },
      { version: '2026-06-30-file-slug-files-uniq', sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_basedrop_files_slug ON basedrop_files(slug) WHERE slug IS NOT NULL` },
      { version: '2026-06-30-file-slug-staging-uniq', sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_upload_staging_slug ON upload_staging(slug) WHERE slug IS NOT NULL` },
      { version: '2026-06-30-drop-pin-files', sql: `ALTER TABLE basedrop_files DROP COLUMN IF EXISTS pin` },
      { version: '2026-06-30-drop-pin-staging', sql: `ALTER TABLE upload_staging DROP COLUMN IF EXISTS pin` },
      { version: '2026-06-30-cdn-slug', sql: `ALTER TABLE cdn_assets ADD COLUMN IF NOT EXISTS slug VARCHAR(64)` },
      { version: '2026-06-30-cdn-slug-uniq', sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_cdn_assets_slug ON cdn_assets(slug) WHERE slug IS NOT NULL` },
      // Deterministic login lookup for prefix-only identifiers (cid_...) that
      // don't embed the user id. Legacy hpsk_ keys are resolved via the id
      // embedded in the key and get backfilled here on next login.
      { version: '2026-07-01-user-key-lookup', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS key_lookup TEXT` },
      { version: '2026-07-01-user-key-lookup-uniq', sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_key_lookup ON users(key_lookup) WHERE key_lookup IS NOT NULL` },
      // Download-page profile branding (paid plans): banner image + public display name.
      { version: '2026-07-03-user-banner-url', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url VARCHAR(500)` },
      { version: '2026-07-03-user-display-name', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(64)` },
      // Opaque per-user namespace for profile objects (avatar/banner) so their
      // public URLs never expose the internal account id.
      { version: '2026-07-03-user-storage-token', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_token VARCHAR(32)` },
      { version: '2026-07-03-user-storage-token-backfill', sql: `UPDATE users SET storage_token = md5(random()::text || id::text || clock_timestamp()::text) WHERE storage_token IS NULL` },
      { version: '2026-07-03-user-storage-token-uniq', sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_storage_token ON users(storage_token) WHERE storage_token IS NOT NULL` },
      // Manual verification flag for the download-page "Verified" badge.
      { version: '2026-07-03-user-verified', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE` },
      // Name-change cooldown timestamps (nickname + public display name).
      { version: '2026-07-03-user-nickname-changed-at', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname_changed_at TIMESTAMPTZ` },
      { version: '2026-07-03-user-display-name-changed-at', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name_changed_at TIMESTAMPTZ` },
      // Null out any pre-existing duplicate display names (keep the earliest) so the
      // unique index below can be created.
      { version: '2026-07-03-display-name-dedupe', sql: `UPDATE users u SET display_name = NULL, display_name_changed_at = NULL WHERE display_name IS NOT NULL AND EXISTS (SELECT 1 FROM users u2 WHERE lower(u2.display_name) = lower(u.display_name) AND u2.created_at < u.created_at)` },
      { version: '2026-07-03-display-name-uniq', sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_display_name_lower ON users(lower(display_name)) WHERE display_name IS NOT NULL` },
      // Released display names are held (locked for everyone) for a period so they
      // can't be instantly re-registered; hypasched deletes rows once expired.
      { version: '2026-07-03-display-name-holds', sql: `CREATE TABLE IF NOT EXISTS display_name_holds (name_lower VARCHAR(64) PRIMARY KEY, released_by VARCHAR(36), expires_at TIMESTAMPTZ NOT NULL)` },
      // Requests: one-time inbound file-drop links. The keypair persists after the
      // link is consumed so the received file stays decryptable by the owner; the
      // private key is stored already-wrapped by the owner's master key.
      { version: '2026-07-08-funnels', sql: `CREATE TABLE IF NOT EXISTS funnels (
        id                  VARCHAR(12)  PRIMARY KEY,
        slug                VARCHAR(64)  NOT NULL UNIQUE,
        user_id             VARCHAR(36)  NOT NULL,
        public_key          TEXT         NOT NULL,
        private_key_wrapped TEXT         NOT NULL,
        status              TEXT         NOT NULL DEFAULT 'active',
        created_at          TIMESTAMPTZ  DEFAULT NOW(),
        consumed_at         TIMESTAMPTZ
      )` },
      { version: '2026-07-08-funnels-user-idx', sql: `CREATE INDEX IF NOT EXISTS idx_funnels_user_id ON funnels(user_id)` },
      { version: '2026-07-08-funnels-slug-idx', sql: `CREATE INDEX IF NOT EXISTS idx_funnels_slug ON funnels(slug)` },
      { version: '2026-07-08-fileRequest-files', sql: `CREATE TABLE IF NOT EXISTS funnel_files (
        id                      VARCHAR(12)  PRIMARY KEY,
        funnel_id               VARCHAR(12)  NOT NULL,
        user_id                 VARCHAR(36)  NOT NULL,
        r2_key                  VARCHAR(500) NOT NULL,
        name_encrypted          TEXT         NOT NULL,
        file_size               BIGINT       NOT NULL,
        content_type            VARCHAR(200) NOT NULL,
        wrapped_key             TEXT         NOT NULL,
        encryption_chunk_size   INTEGER,
        encryption_total_parts  INTEGER,
        created_at              TIMESTAMPTZ  DEFAULT NOW()
      )` },
      { version: '2026-07-08-fileRequest-files-user-idx', sql: `CREATE INDEX IF NOT EXISTS idx_funnel_files_user_id ON funnel_files(user_id)` },
      { version: '2026-07-08-fileRequest-files-fileRequest-idx', sql: `CREATE INDEX IF NOT EXISTS idx_funnel_files_funnel_id ON funnel_files(funnel_id)` },
      // Tracks in-flight drops (id = the pending file id) so an abandoned upload's
      // R2 object gets swept, mirroring upload_staging. A row is written at init
      // and cleared on complete; hypasched deletes the object for rows that never
      // completed. The sweep skips ids that became a funnel_files row.
      { version: '2026-07-08-fileRequest-staging', sql: `CREATE TABLE IF NOT EXISTS funnel_staging (
        id         VARCHAR(12)  PRIMARY KEY,
        funnel_id  VARCHAR(12)  NOT NULL,
        r2_key     VARCHAR(500) NOT NULL,
        created_at TIMESTAMPTZ  DEFAULT NOW()
      )` },
      { version: '2026-07-08-fileRequest-staging-created-idx', sql: `CREATE INDEX IF NOT EXISTS idx_funnel_staging_created_at ON funnel_staging(created_at)` },
      // Paid tier lasts 1 month, then hypasched flips it back to 'free' (files keep
      // their own expiry). Trigger stamps tier_expires_at on upgrade, clears on downgrade.
      { version: '2026-07-16-user-tier-expiry', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS tier_expires_at TIMESTAMPTZ` },
      { version: '2026-07-16-tier-expiry-trigger', sql: `
CREATE OR REPLACE FUNCTION set_tier_expiry() RETURNS trigger AS $fn$
BEGIN
  IF NEW.tier IS DISTINCT FROM OLD.tier THEN
    IF NEW.tier IN ('essential','premium','ultimate','advanced') THEN
      IF NEW.tier_expires_at IS NOT DISTINCT FROM OLD.tier_expires_at THEN
        NEW.tier_expires_at := NOW() + INTERVAL '1 month';
      END IF;
    ELSE
      NEW.tier_expires_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_set_tier_expiry ON users;
CREATE TRIGGER trg_set_tier_expiry BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_tier_expiry();
` },
      // v2 CDN uploads stage the same way v3 does, and a v2 init can carry a
      // custom slug, so the staging row has to remember it for completion.
      { version: '2026-07-25-cdn-staging-slug', sql: `ALTER TABLE cdn_staging ADD COLUMN IF NOT EXISTS slug VARCHAR(64)` },
      // Registration is invite-only: a code is claimed atomically alongside the
      // account it creates, so used_by always points at a real account.
      { version: '2026-08-20-invite-codes', sql: `CREATE TABLE IF NOT EXISTS invite_codes (
        code       VARCHAR(64)  PRIMARY KEY,
        used_by    VARCHAR(36),
        used_at    TIMESTAMPTZ,
        created_at TIMESTAMPTZ  DEFAULT NOW()
      )` },
      { version: '2026-08-20-invite-codes-used-by-idx', sql: `CREATE INDEX IF NOT EXISTS idx_invite_codes_used_by ON invite_codes(used_by)` },
      // Owner flag for the admin panel. Never settable through any API, the
      // only way this is ever true is a direct UPDATE run by hand.
      { version: '2026-08-20-user-is-owner', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT FALSE` },
      // Suspension blocks login outright, checked at auth time, not just hidden in the UI.
      { version: '2026-08-20-user-suspended', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT FALSE` },
      { version: '2026-08-20-user-suspended-at', sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ` },
      { version: '2026-08-20-users-created-at-idx', sql: `CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)` },
      // Hashed IPs only, same HMAC as rate limiting, so a blacklist entry
      // never holds a raw IP at rest. Blocks both login and registration.
      { version: '2026-08-20-blacklisted-ips', sql: `CREATE TABLE IF NOT EXISTS blacklisted_ips (
        ip_hash    VARCHAR(32) PRIMARY KEY,
        reason     TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )` },
      // Codes can now be redeemed more than once (max_uses), so "who used it"
      // is a one-to-many relation, not a single used_by column.
      { version: '2026-08-21-invite-codes-max-uses', sql: `ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS max_uses INTEGER NOT NULL DEFAULT 1` },
      { version: '2026-08-21-invite-codes-uses-count', sql: `ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS uses_count INTEGER NOT NULL DEFAULT 0` },
      { version: '2026-08-21-invite-codes-backfill-uses', sql: `UPDATE invite_codes SET uses_count = 1 WHERE used_by IS NOT NULL AND uses_count = 0` },
      { version: '2026-08-21-invite-code-redemptions', sql: `CREATE TABLE IF NOT EXISTS invite_code_redemptions (
        id         SERIAL       PRIMARY KEY,
        code       VARCHAR(64)  NOT NULL,
        user_id    VARCHAR(36)  NOT NULL,
        used_at    TIMESTAMPTZ  DEFAULT NOW()
      )` },
      { version: '2026-08-21-invite-code-redemptions-code-idx', sql: `CREATE INDEX IF NOT EXISTS idx_invite_code_redemptions_code ON invite_code_redemptions(code)` },
      { version: '2026-08-21-invite-code-redemptions-backfill', sql: `INSERT INTO invite_code_redemptions (code, user_id, used_at) SELECT code, used_by, used_at FROM invite_codes WHERE used_by IS NOT NULL` },
      // Tier ids now match what the UI calls them: essential -> plus, premium -> pro,
      // ultimate -> max. Existing rows move over so nobody loses their plan.
      { version: '2026-08-21-tier-rename', sql: `
UPDATE users SET tier = CASE tier
  WHEN 'essential' THEN 'plus'
  WHEN 'advanced'  THEN 'plus'
  WHEN 'premium'   THEN 'pro'
  WHEN 'ultimate'  THEN 'max'
  ELSE tier END
WHERE tier IN ('essential','advanced','premium','ultimate');
UPDATE users SET last_acknowledged_tier = CASE last_acknowledged_tier
  WHEN 'essential' THEN 'plus'
  WHEN 'advanced'  THEN 'plus'
  WHEN 'premium'   THEN 'pro'
  WHEN 'ultimate'  THEN 'max'
  ELSE last_acknowledged_tier END
WHERE last_acknowledged_tier IN ('essential','advanced','premium','ultimate');
` },
      // trigger has to know the new names or an upgrade stops stamping an expiry
      { version: '2026-08-21-tier-expiry-trigger-rename', sql: `
CREATE OR REPLACE FUNCTION set_tier_expiry() RETURNS trigger AS $fn$
BEGIN
  IF NEW.tier IS DISTINCT FROM OLD.tier THEN
    IF NEW.tier IN ('plus','pro','max') THEN
      IF NEW.tier_expires_at IS NOT DISTINCT FROM OLD.tier_expires_at THEN
        NEW.tier_expires_at := NOW() + INTERVAL '1 month';
      END IF;
    ELSE
      NEW.tier_expires_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;
` },
    ]
    for (const migration of INCREMENTAL_MIGRATIONS) {
      const done = await client.query(`SELECT 1 FROM schema_migrations WHERE version = $1`, [migration.version])
      if (done.rows.length > 0) continue
      await client.query(migration.sql)
      await client.query(`INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING`, [migration.version])
      console.log(`[DB] Applied migration: ${migration.version}`)
    }

    globalThis.__basedropDbInitialized = true
    console.log('[DB] PostgreSQL database initialized successfully')
  } catch (error) {
    _initFailed = true
    console.error('[DB] Failed to initialize database:', errorMessage(error))
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

export type { PoolClient }

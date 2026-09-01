import { app } from "./app.js";
import { pool, query } from "./config/database.js";
import { env } from "./config/env.js";
import { verifyRuntimeSchema } from "./config/runtimeSchema.js";
import { closeAllSseClients } from "./services/realtimeService.js";
import fs from 'fs';

const LOG_FILE = './server_error.log';
function logError(msg) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error.message);
  logError(`UNCAUGHT EXCEPTION: ${error.message}\n${error.stack || ''}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'Reason:', reason);
  logError(`UNHANDLED REJECTION: ${reason}\nPromise: ${promise}`);
});

async function handleShutdown(signal) {
  console.log(signal + " diterima, menutup server...");
  
  try {
    await pool.end();
  } catch (error) {
    console.error("Gagal menutup pool database:", error.message);
  }
  
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

try {
  // Coba koneksi sebelum menjalankan server
  await query('SELECT 1');
  await query(`
    CREATE TABLE IF NOT EXISTS log_riwayat_aset (
      id            SERIAL PRIMARY KEY,
      id_aset       INTEGER NOT NULL,
      label_aset    VARCHAR(100),
      aksi          VARCHAR(50) NOT NULL,
      perubahan     TEXT,
      oleh_pengguna VARCHAR(150) NOT NULL DEFAULT 'Sistem',
      dibuat_pada   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_log_riwayat_aset_id ON log_riwayat_aset(id_aset, dibuat_pada DESC);
    ALTER TABLE riwayat_pemakaian_aset ALTER COLUMN nik_pemegang DROP NOT NULL;
    ALTER TABLE komentar_tiket ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);
    ALTER TABLE aset_ti ALTER COLUMN hostname DROP NOT NULL;
    ALTER TABLE aset_ti ALTER COLUMN serial_number DROP NOT NULL;
    ALTER TABLE log_audit_login ADD COLUMN IF NOT EXISTS status_login VARCHAR(50) DEFAULT 'LOGIN_SUCCESS';
  `);
  // Create backup tables if they don't exist yet
  await query(`
    CREATE TABLE IF NOT EXISTS backup_metadata (
      id              SERIAL PRIMARY KEY,
      filename        VARCHAR(255) NOT NULL,
      filepath        TEXT NOT NULL,
      file_size       BIGINT NOT NULL DEFAULT 0,
      database_name   VARCHAR(100) NOT NULL,
      backup_type     VARCHAR(50) NOT NULL DEFAULT 'manual',
      status          VARCHAR(50) NOT NULL DEFAULT 'success',
      checksum        VARCHAR(128),
      created_by      INTEGER NOT NULL,
      created_by_name VARCHAR(150),
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_backup_created_at ON backup_metadata(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_backup_status ON backup_metadata(status);
    CREATE INDEX IF NOT EXISTS idx_backup_type ON backup_metadata(backup_type);
    CREATE TABLE IF NOT EXISTS backup_audit_log (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER NOT NULL,
      user_name       VARCHAR(150),
      operation       VARCHAR(50) NOT NULL,
      target_database VARCHAR(100) NOT NULL,
      backup_id       INTEGER,
      status          VARCHAR(50) NOT NULL DEFAULT 'success',
      error_summary   TEXT,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_backup_audit_created ON backup_audit_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_backup_audit_operation ON backup_audit_log(operation);
    CREATE INDEX IF NOT EXISTS idx_backup_audit_user ON backup_audit_log(user_id);
    CREATE TABLE IF NOT EXISTS password_reset_otps (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email           VARCHAR(150) NOT NULL,
      otp_hash        TEXT NOT NULL,
      reset_token     VARCHAR(255) NULL,
      attempts        INTEGER NOT NULL DEFAULT 0,
      max_attempts    INTEGER NOT NULL DEFAULT 5,
      expires_at      TIMESTAMPTZ NOT NULL,
      used_at         TIMESTAMPTZ NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_reset_otps_email ON password_reset_otps(email, expires_at);
    CREATE INDEX IF NOT EXISTS idx_reset_token ON password_reset_otps(reset_token);
    CREATE TABLE IF NOT EXISTS faq (
      id          SERIAL PRIMARY KEY,
      question    VARCHAR(500) NOT NULL,
      answer      TEXT NOT NULL,
      category    VARCHAR(100) NOT NULL,
      status      VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_faq_status CHECK (status IN ('DRAFT', 'PUBLISHED'))
    );
    CREATE INDEX IF NOT EXISTS idx_faq_status ON faq(status);
    CREATE TABLE IF NOT EXISTS cases (
      id              SERIAL PRIMARY KEY,
      title           VARCHAR(300) NOT NULL,
      category        VARCHAR(100) NOT NULL,
      severity        VARCHAR(20) NOT NULL DEFAULT 'medium',
      tags            JSONB NOT NULL DEFAULT '[]'::jsonb,
      summary         TEXT,
      problem_context TEXT,
            content_html    TEXT,
            action_steps    JSONB NOT NULL DEFAULT '[]'::jsonb,
      dos             JSONB NOT NULL DEFAULT '[]'::jsonb,
      donts           JSONB NOT NULL DEFAULT '[]'::jsonb,
      snippets        JSONB NOT NULL DEFAULT '[]'::jsonb,
      status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
      is_custom       BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order      INTEGER NOT NULL DEFAULT 0,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_cases_status CHECK (status IN ('DRAFT', 'PUBLISHED')),
      CONSTRAINT chk_cases_severity CHECK (severity IN ('low', 'medium', 'high'))
    );
    CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
        ALTER TABLE cases ADD COLUMN IF NOT EXISTS content_html TEXT;
    -- KB enhancements: rich content FAQ + kategori dinamis + search logs + bookmarks
    ALTER TABLE faq ADD COLUMN IF NOT EXISTS steps JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE faq ADD COLUMN IF NOT EXISTS code_snippet TEXT;
    ALTER TABLE faq ADD COLUMN IF NOT EXISTS action_text VARCHAR(150);
    ALTER TABLE faq ADD COLUMN IF NOT EXISTS action_link TEXT;
    ALTER TABLE faq ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE faq ADD COLUMN IF NOT EXISTS emergency_title VARCHAR(200);
    ALTER TABLE faq ADD COLUMN IF NOT EXISTS emergency_text TEXT;
    CREATE TABLE IF NOT EXISTS kb_categories (
      id              SERIAL PRIMARY KEY,
      key             VARCHAR(50) NOT NULL UNIQUE,
      title           VARCHAR(150) NOT NULL,
      description     TEXT,
      icon            VARCHAR(50),
      is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order      INTEGER NOT NULL DEFAULT 0,
      status          VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_kb_categories_status CHECK (status IN ('DRAFT', 'PUBLISHED'))
    );
    CREATE INDEX IF NOT EXISTS idx_kb_categories_status ON kb_categories(status, sort_order);
    CREATE TABLE IF NOT EXISTS kb_search_logs (
      id              BIGSERIAL PRIMARY KEY,
      query           VARCHAR(300) NOT NULL,
      results_count   INTEGER NOT NULL DEFAULT 0,
      user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_kb_search_logs_query ON kb_search_logs(query);
    CREATE INDEX IF NOT EXISTS idx_kb_search_logs_created ON kb_search_logs(created_at DESC);
    CREATE TABLE IF NOT EXISTS case_bookmarks (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      case_id         INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_case_bookmarks UNIQUE (user_id, case_id)
    );
    CREATE INDEX IF NOT EXISTS idx_case_bookmarks_user ON case_bookmarks(user_id, created_at DESC);
      `);
  await verifyRuntimeSchema(pool);
} catch (error) {
  console.error("Database belum siap digunakan:", error.message);
  process.exit(1);
}

console.log("API berjalan di http://0.0.0.0:" + env.port);
const server = app.listen(env.port, "0.0.0.0");
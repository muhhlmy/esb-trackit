-- =====================================================================
-- MIGRATION 005: Knowledge Base Enhancements
-- ---------------------------------------------------------------------
-- 1. Tabel kb_categories : Topic cards "Browse Topics" di Help Center
--                          (sebelumnya hardcoded di HomeView.vue).
-- 2. ALTER tabel faq     : Kolom rich content (steps, code snippet,
--                          action link, emergency block) agar sesuai
--                          dengan tampilan FAQ accordion di HomeView.
-- 3. Tabel kb_search_logs: Analitik pencarian Help Center — mendukung
--                          "Popular searches" dinamis & halaman KB Analytics.
-- 4. Tabel case_bookmarks: Bookmark dokumen SOP per user (persisten di
--                          server, menggantikan localStorage).
-- Seluruh statement idempotent (IF NOT EXISTS / seed anti-duplikat).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABEL: kb_categories
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kb_categories (
    id              SERIAL          PRIMARY KEY,
    key             VARCHAR(50)     NOT NULL UNIQUE,
    title           VARCHAR(150)    NOT NULL,
    description     TEXT,
    icon            VARCHAR(50),
    is_featured     BOOLEAN         NOT NULL DEFAULT FALSE,
    sort_order      INTEGER         NOT NULL DEFAULT 0,
    status          VARCHAR(20)     NOT NULL DEFAULT 'PUBLISHED',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_kb_categories_status
        CHECK (status IN ('DRAFT', 'PUBLISHED'))
);

CREATE INDEX IF NOT EXISTS idx_kb_categories_status
    ON kb_categories(status, sort_order);

-- Seed: 3 topic cards (IT, HR, GA) sesuai mockup HomeView (idempotent)
INSERT INTO kb_categories (key, title, description, icon, is_featured, sort_order, status)
SELECT 'it-support', 'IT Support',
       'Learn the basics of setting up your IT profile, laptop requests, software, and connecting network tools.',
       'Laptop', FALSE, 1, 'PUBLISHED'
WHERE NOT EXISTS (SELECT 1 FROM kb_categories WHERE key = 'it-support');

INSERT INTO kb_categories (key, title, description, icon, is_featured, sort_order, status)
SELECT 'hr-people', 'Human Resources (HR)',
       'Customize your experience with account settings, Google Workspace, onboarding, 2SV, and permissions.',
       'ShieldCheck', TRUE, 2, 'PUBLISHED'
WHERE NOT EXISTS (SELECT 1 FROM kb_categories WHERE key = 'hr-people');

INSERT INTO kb_categories (key, title, description, icon, is_featured, sort_order, status)
SELECT 'general-affairs', 'General Affairs (GA)',
       'Office facility management, physical asset requests, building maintenance, and operational tools.',
       'Building2', FALSE, 3, 'PUBLISHED'
WHERE NOT EXISTS (SELECT 1 FROM kb_categories WHERE key = 'general-affairs');

-- ---------------------------------------------------------------------
-- 2. ALTER TABEL: faq — rich content untuk accordion HomeView
-- ---------------------------------------------------------------------
ALTER TABLE faq
    ADD COLUMN IF NOT EXISTS steps           JSONB         NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS code_snippet    TEXT,
    ADD COLUMN IF NOT EXISTS action_text     VARCHAR(150),
    ADD COLUMN IF NOT EXISTS action_link     TEXT,
    ADD COLUMN IF NOT EXISTS is_emergency    BOOLEAN       NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS emergency_title VARCHAR(200),
    ADD COLUMN IF NOT EXISTS emergency_text  TEXT;

-- ---------------------------------------------------------------------
-- 3. TABEL: kb_search_logs — analitik pencarian Help Center
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kb_search_logs (
    id              BIGSERIAL       PRIMARY KEY,
    query           VARCHAR(300)    NOT NULL,
    results_count   INTEGER         NOT NULL DEFAULT 0,
    user_id         INTEGER         REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_search_logs_query
    ON kb_search_logs(query);
CREATE INDEX IF NOT EXISTS idx_kb_search_logs_created
    ON kb_search_logs(created_at DESC);

-- ---------------------------------------------------------------------
-- 4. TABEL: case_bookmarks — bookmark SOP per user (server-side)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_bookmarks (
    id              SERIAL          PRIMARY KEY,
    user_id         INTEGER         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_id         INTEGER         NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_case_bookmarks UNIQUE (user_id, case_id)
);

CREATE INDEX IF NOT EXISTS idx_case_bookmarks_user
    ON case_bookmarks(user_id, created_at DESC);

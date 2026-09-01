-- =====================================================================
-- TABEL: cases (Help Center SOP / Case CMS)
-- Cases & SOPs ditampilkan dinamis di Help Center. Hanya status PUBLISHED
-- yang tampil di publik; DRAFT hanya terlihat via CMS admin.
-- =====================================================================
CREATE TABLE IF NOT EXISTS cases (
    id              SERIAL          PRIMARY KEY,
    title           VARCHAR(300)    NOT NULL,
    category        VARCHAR(100)    NOT NULL,
    severity        VARCHAR(20)     NOT NULL DEFAULT 'medium',
    tags            JSONB           NOT NULL DEFAULT '[]'::jsonb,
    summary         TEXT,
    problem_context TEXT,
    content_html    TEXT,
    action_steps    JSONB           NOT NULL DEFAULT '[]'::jsonb,
    dos             JSONB           NOT NULL DEFAULT '[]'::jsonb,
    donts           JSONB           NOT NULL DEFAULT '[]'::jsonb,
    snippets        JSONB           NOT NULL DEFAULT '[]'::jsonb,
    status          VARCHAR(20)     NOT NULL DEFAULT 'DRAFT',
    is_custom       BOOLEAN         NOT NULL DEFAULT FALSE,
    sort_order      INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_cases_status
        CHECK (status IN ('DRAFT', 'PUBLISHED')),
    CONSTRAINT chk_cases_severity
        CHECK (severity IN ('low', 'medium', 'high'))
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);

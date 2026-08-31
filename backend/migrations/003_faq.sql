-- =====================================================================
-- TABEL: faq (Help Center FAQ CMS)
-- FAQ ditampilkan dinamis di Help Center publik. Hanya FAQ berstatus
-- PUBLISHED yang tampil di publik; DRAFT hanya terlihat di CMS admin.
-- =====================================================================
CREATE TABLE IF NOT EXISTS faq (
    id          SERIAL          PRIMARY KEY,
    question    VARCHAR(500)    NOT NULL,
    answer      TEXT            NOT NULL,
    category    VARCHAR(100)    NOT NULL,
    status      VARCHAR(20)     NOT NULL DEFAULT 'DRAFT',
    sort_order  INTEGER         NOT NULL DEFAULT 0,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_faq_status
        CHECK (status IN ('DRAFT', 'PUBLISHED'))
);

CREATE INDEX IF NOT EXISTS idx_faq_status ON faq(status);

-- Seed: SATU FAQ test (idempotent — tidak duplikat bila dijalankan ulang)
INSERT INTO faq (question, answer, category, status, sort_order)
SELECT
    'Bagaimana cara melakukan reset password akun Google Workspace?',
    'Untuk melakukan reset password akun Google Workspace, silakan hubungi tim IT atau ikuti prosedur reset password yang telah ditetapkan perusahaan.',
    'Account & Access',
    'PUBLISHED',
    1
WHERE NOT EXISTS (
    SELECT 1 FROM faq
    WHERE question = 'Bagaimana cara melakukan reset password akun Google Workspace?'
);

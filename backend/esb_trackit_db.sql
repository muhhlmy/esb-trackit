-- =====================================================================
-- SKEMA DATABASE (PostgreSQL): ESB TRACKIT / IT MONITORING ASSETS
-- Canonical Master Schema with CHECK Constraints & Data Validation
-- =====================================================================

-- Drop existing tables/views (reverse dependency order)
DROP VIEW IF EXISTS v_employee_asset_summary CASCADE;
DROP VIEW IF EXISTS v_ticket_stats_per_queue CASCADE;
DROP VIEW IF EXISTS daftar_aset_ti_lengkap CASCADE;

DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS faq CASCADE;
DROP TABLE IF EXISTS backup_audit_log CASCADE;
DROP TABLE IF EXISTS backup_metadata CASCADE;
DROP TABLE IF EXISTS password_reset_otps CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS account_security_state CASCADE;
DROP TABLE IF EXISTS log_audit_login CASCADE;
DROP TABLE IF EXISTS riwayat_pemakaian_aset CASCADE;
DROP TABLE IF EXISTS log_riwayat_aset CASCADE;
DROP TABLE IF EXISTS log_riwayat_tiket CASCADE;
DROP TABLE IF EXISTS user_ticket_queues CASCADE;
DROP TABLE IF EXISTS ticket_casp_ratings CASCADE;
DROP TABLE IF EXISTS komentar_tiket CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS ticket_queues CASCADE;
DROP TABLE IF EXISTS aset_ops CASCADE;
DROP TABLE IF EXISTS aset_ga CASCADE;
DROP TABLE IF EXISTS aset_ti CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS karyawan CASCADE;

-- =====================================================================
-- TABEL 1: Karyawan (Employee Master)
-- =====================================================================
CREATE TABLE karyawan (
    id                          SERIAL          PRIMARY KEY,
    nik                         VARCHAR(20)     NOT NULL UNIQUE,
    nama_karyawan               VARCHAR(150)    NOT NULL,
    status                      VARCHAR(20)     NOT NULL DEFAULT 'Active',
    title                       VARCHAR(150)    NOT NULL,
    job_level                   VARCHAR(10)     NOT NULL,
    departemen                  VARCHAR(100)    NOT NULL,
    directorate                 VARCHAR(100)    NOT NULL,
    tanggal_mulai_bekerja       DATE            NOT NULL,
    employeement_status         VARCHAR(20)     NOT NULL DEFAULT 'Permanent',
    nik_atasan_langsung         VARCHAR(20),
    email_kantor                VARCHAR(150)    NOT NULL UNIQUE,
    lokasi_kerja                VARCHAR(100),
    
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraint: Status karyawan
    CONSTRAINT chk_karyawan_status
        CHECK (status IN ('Active', 'Outsource', 'Resigned')),

    -- Constraint: Employeement Status
    CONSTRAINT chk_karyawan_employeement_status
        CHECK (employeement_status IN ('Permanent', 'Contract', 'Freelance', 'Intern')),

    -- Self reference: NIK Atasan Langsung merujuk ke NIK karyawan lain
    CONSTRAINT fk_karyawan_atasan
        FOREIGN KEY (nik_atasan_langsung) REFERENCES karyawan (nik) ON DELETE SET NULL
);

-- Index untuk performa
CREATE INDEX idx_karyawan_departemen ON karyawan(departemen);
CREATE INDEX idx_karyawan_email ON karyawan(email_kantor);
CREATE INDEX idx_karyawan_nik_atasan ON karyawan(nik_atasan_langsung);

-- =====================================================================
-- TABEL 2: Users (Application Authentication)
-- =====================================================================
CREATE TABLE users (
    id                          SERIAL          PRIMARY KEY,
    nama                        VARCHAR(150)    NOT NULL,
    email                       VARCHAR(150)    NOT NULL UNIQUE,
    password_hash               TEXT            NOT NULL,
    role                        VARCHAR(50)     NOT NULL DEFAULT 'user',
    permissions                 JSONB           NOT NULL DEFAULT '{}',
    is_active                   BOOLEAN         NOT NULL DEFAULT TRUE,
    deleted_at                  TIMESTAMP,
    deleted_by_id               INTEGER,
    deletion_reason             TEXT,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_users_role 
        CHECK (role IN ('user', 'admin', 'superadmin', 'super admin')),

    CONSTRAINT fk_users_deleted_by 
        FOREIGN KEY (deleted_by_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Index
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;

-- Seed Default Superadmin (Password: admin123 - bcrypt hash)
INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
VALUES (
    'Super Admin',
    'superadmin@admin.com',
    '$2b$10$KUuuaQWHvErN2WNcqrJOXeRC1Ym6GRyxcIzwpmRboOSkDpOPxE/Cu',
    'superadmin',
    '{"dashboard":"full","assets":"full","tickets":"full"}'::jsonb,
    true
) ON CONFLICT (email) DO NOTHING;

-- =====================================================================
-- TABEL 2B: User Sessions (Server-Side Session Store for JWT Revocation)
-- =====================================================================
CREATE TABLE user_sessions (
    id                          SERIAL          PRIMARY KEY,
    session_id                  UUID            NOT NULL UNIQUE,
    user_id                     INTEGER         NOT NULL,
    issued_at                   TIMESTAMP       NOT NULL,
    expires_at                  TIMESTAMP       NOT NULL,
    revoked_at                  TIMESTAMP       NULL,
    last_seen_at                TIMESTAMP       NULL,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_sessions_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_user_sessions_sid ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_revoked ON user_sessions(revoked_at) WHERE revoked_at IS NOT NULL;

-- =====================================================================
-- TABEL 2C: Account Security State (Brute-Force & Lockout Tracking)
-- =====================================================================
CREATE TABLE account_security_state (
    account_key                 VARCHAR(255)    PRIMARY KEY,
    failed_attempt_count        INTEGER         NOT NULL DEFAULT 0,
    first_failed_at             TIMESTAMPTZ,
    last_failed_at              TIMESTAMPTZ,
    locked_until                TIMESTAMPTZ,
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_account_security_locked_until ON account_security_state(locked_until) WHERE locked_until IS NOT NULL;

-- =====================================================================
-- TABEL 2D: Password Reset OTPs (Secure Password Reset Flow)
-- =====================================================================
CREATE TABLE password_reset_otps (
    id                          SERIAL          PRIMARY KEY,
    user_id                     INTEGER         NOT NULL,
    email                       VARCHAR(150)    NOT NULL,
    otp_hash                    TEXT            NOT NULL,
    reset_token                 VARCHAR(255),
    attempts                    INTEGER         NOT NULL DEFAULT 0,
    max_attempts                INTEGER         NOT NULL DEFAULT 5,
    expires_at                  TIMESTAMPTZ     NOT NULL,
    used_at                     TIMESTAMPTZ,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_reset_otps_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_password_reset_otps_user ON password_reset_otps(user_id);
CREATE INDEX idx_password_reset_otps_email ON password_reset_otps(email);
CREATE INDEX idx_password_reset_otps_token ON password_reset_otps(reset_token);

-- =====================================================================
-- TABEL 3: Asset (Master Data Aset IT)
-- =====================================================================
CREATE TABLE aset_ti (
    id                          SERIAL          PRIMARY KEY,
    hostname                    VARCHAR(50),
    serial_number               VARCHAR(50),
    spesifikasi                 TEXT,
    nik_pemegang_asset           VARCHAR(20),
    nama_karyawan_pemegang_asset VARCHAR(150),
    departemen_pemegang_asset    VARCHAR(100),
    lokasi_asset                VARCHAR(100),
    tipe_perangkat              VARCHAR(50),
    brand_merek                 VARCHAR(50),
    model                       VARCHAR(100),
    status                      VARCHAR(20)     NOT NULL DEFAULT 'In Use',
    kondisi                     VARCHAR(20)     NOT NULL DEFAULT 'Normal',
    note_asset                  VARCHAR(255),
    deleted_at                  TIMESTAMP,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraint: Status & Kondisi Asset
    CONSTRAINT chk_asset_status
        CHECK (status IN ('In Use', 'Stock', 'Damaged', 'In Service', 'Disposal')),

    CONSTRAINT chk_asset_kondisi
        CHECK (kondisi IN ('Baru', 'Normal', 'Rusak Ringan', 'Rusak Sedang', 'Rusak Berat')),

    -- Relasi ke tabel karyawan (pemegang asset)
    CONSTRAINT fk_asset_pemegang
        FOREIGN KEY (nik_pemegang_asset) REFERENCES karyawan (nik) ON DELETE SET NULL
);

-- Index untuk performa
CREATE INDEX idx_aset_hostname ON aset_ti(hostname);
CREATE INDEX idx_aset_serial_number ON aset_ti(serial_number);
CREATE INDEX idx_aset_status ON aset_ti(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_aset_kondisi ON aset_ti(kondisi);
CREATE INDEX idx_aset_nik_pemegang ON aset_ti(nik_pemegang_asset);

-- =====================================================================
-- TABEL 3B: Asset GA (General Affair Assets)
-- =====================================================================
CREATE TABLE aset_ga (
    id                          SERIAL          PRIMARY KEY,
    hostname                    VARCHAR(50)     NOT NULL UNIQUE,
    quantity                    INTEGER         NOT NULL DEFAULT 1,
    tipe_fasilitas              VARCHAR(50)     NOT NULL,
    nama_asset                  VARCHAR(150)    NOT NULL,
    ukuran                      VARCHAR(100),
    detail                      TEXT,
    lokasi                      VARCHAR(100)    NOT NULL,
    lokasi_detail               VARCHAR(150),
    kondisi                     VARCHAR(20)     NOT NULL DEFAULT 'Baik',
    deleted_at                  TIMESTAMP,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_aset_ga_quantity CHECK (quantity > 0),
    CONSTRAINT chk_aset_ga_kondisi CHECK (kondisi IN ('Baik', 'Rusak Ringan', 'Rusak Sedang', 'Rusak Berat'))
);

CREATE INDEX idx_aset_ga_hostname ON aset_ga(hostname);
CREATE INDEX idx_aset_ga_lokasi ON aset_ga(lokasi);
CREATE INDEX idx_aset_ga_kondisi ON aset_ga(kondisi);

-- Seed Data Aset GA
INSERT INTO aset_ga (hostname, quantity, tipe_fasilitas, nama_asset, ukuran, detail, lokasi, lokasi_detail, kondisi) VALUES
    ('GA-PL-001', 10, 'Meja', 'Meja Kerja', '100x100x75 cm', 'Warna Cream, Kayu Jati', 'Pluit', 'Ruang Bubur Ayam', 'Baik'),
    ('GA-GS-002', 5, 'AC', 'AC Split 2 PK', '2 PK', 'Daikin Inverter', 'Gading Serpong', 'Lantai 2', 'Baik')
ON CONFLICT (hostname) DO NOTHING;

-- =====================================================================
-- TABEL 3C: Asset OPS (Operational Assets)
-- =====================================================================
CREATE TABLE aset_ops (
    id                          SERIAL          PRIMARY KEY,
    hostname                    VARCHAR(50)     NOT NULL UNIQUE,
    nama_asset                  VARCHAR(150)    NOT NULL,
    kategori                    VARCHAR(50)     NOT NULL,
    lokasi                      VARCHAR(100)    NOT NULL,
    pic                         VARCHAR(150),
    tanggal_beli                DATE,
    total_asset_amount          NUMERIC(15,2)   DEFAULT 0,
    kondisi                     VARCHAR(20)     NOT NULL DEFAULT 'Baik',
    status                      VARCHAR(20)     NOT NULL DEFAULT 'Aktif',
    deleted_at                  TIMESTAMP,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_aset_ops_amount CHECK (total_asset_amount >= 0),
    CONSTRAINT chk_aset_ops_kondisi CHECK (kondisi IN ('Baik', 'Rusak Ringan', 'Rusak Sedang', 'Rusak Berat')),
    CONSTRAINT chk_aset_ops_status CHECK (status IN ('Aktif', 'Tidak Aktif', 'Maintenance', 'Rusak', 'Disposed'))
);

CREATE INDEX idx_aset_ops_hostname ON aset_ops(hostname);
CREATE INDEX idx_aset_ops_lokasi ON aset_ops(lokasi);
CREATE INDEX idx_aset_ops_status ON aset_ops(status) WHERE deleted_at IS NULL;

-- Seed Data Aset OPS
INSERT INTO aset_ops (hostname, nama_asset, kategori, lokasi, pic, tanggal_beli, total_asset_amount, kondisi, status) VALUES
    ('OPS-PL-001', 'KIOSK', 'Self Service', 'Pluit', 'Store Manager', '2026-08-01', 15000000.00, 'Baik', 'Aktif'),
    ('OPS-GS-002', 'POS Terminal', 'Point of Sales', 'Gading Serpong', 'Supervisor', '2026-06-15', 8500000.00, 'Baik', 'Aktif')
ON CONFLICT (hostname) DO NOTHING;

-- =====================================================================
-- TABEL 4: Ticket Queue (Helpdesk Categories/Teams)
-- =====================================================================
CREATE TABLE ticket_queues (
    id                          SERIAL          PRIMARY KEY,
    kode                        VARCHAR(50)     NOT NULL UNIQUE,
    nama                        VARCHAR(150)    NOT NULL,
    deskripsi                   TEXT,
    is_active                   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default queues
INSERT INTO ticket_queues (kode, nama, deskripsi) VALUES
    ('IT', 'IT Support', 'IT support & services'),
    ('HR', 'HR Support', 'Human Resources support & services'),
    ('GA', 'GA Support', 'General Affairs support & facilities')
ON CONFLICT (kode) DO NOTHING;

-- =====================================================================
-- TABEL 5: Tickets (Helpdesk System)
-- =====================================================================
CREATE TABLE tickets (
    id                          SERIAL          PRIMARY KEY,
    nomor_tiket                 VARCHAR(20)     NOT NULL UNIQUE,
    judul                       VARCHAR(255)    NOT NULL,
    deskripsi                   TEXT,
    kategori                    VARCHAR(100),
    prioritas                   VARCHAR(50)     NOT NULL DEFAULT 'Medium',
    status_tiket                VARCHAR(50)     NOT NULL DEFAULT 'Open',
    queue_id                    INTEGER,
    assigned_to_user_id         INTEGER,
    pelapor_user_id             INTEGER         NOT NULL,
    attachment_count            INT             DEFAULT 0,
    resolved_at                 TIMESTAMP,
    resolved_by_user_id         INTEGER,
    deleted_at                  TIMESTAMP,
    deleted_by_user_id          INTEGER,
    deletion_reason             TEXT,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints for status & priority
    CONSTRAINT chk_tickets_prioritas
        CHECK (prioritas IN ('Low', 'Medium', 'High', 'Critical')),
    
    CONSTRAINT chk_tickets_status
        CHECK (status_tiket IN ('Open', 'In Progress', 'Pending', 'Resolved', 'Closed', 'Cancelled')),

    -- Foreign keys
    CONSTRAINT fk_tickets_queue
        FOREIGN KEY (queue_id) REFERENCES ticket_queues(id) ON DELETE SET NULL,
    
    CONSTRAINT fk_tickets_assignee
        FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    CONSTRAINT fk_tickets_reporter
        FOREIGN KEY (pelapor_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    
    CONSTRAINT fk_tickets_resolved_by
        FOREIGN KEY (resolved_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    CONSTRAINT fk_tickets_deleted_by
        FOREIGN KEY (deleted_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_tickets_queue_status ON tickets(queue_id, status_tiket) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_assigned_status ON tickets(assigned_to_user_id, status_tiket) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_reporter_created ON tickets(pelapor_user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_tickets_status ON tickets(status_tiket) WHERE deleted_at IS NULL;

-- =====================================================================
-- TABEL 6: Ticket Comments
-- =====================================================================
CREATE TABLE komentar_tiket (
    id                          SERIAL          PRIMARY KEY,
    id_tiket                    INTEGER         NOT NULL,
    pesan                       TEXT            NOT NULL,
    attachment_data             TEXT,
    attachment_name             VARCHAR(255),
    user_id                     INTEGER         NOT NULL,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_komentar_tiket
        FOREIGN KEY (id_tiket) REFERENCES tickets(id) ON DELETE CASCADE,
    
    CONSTRAINT fk_komentar_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index
CREATE INDEX idx_komentar_tiket_id ON komentar_tiket(id_tiket, created_at ASC);

-- =====================================================================
-- TABEL 7: CASP Rating (CSAT - Customer Satisfaction)
-- =====================================================================
CREATE TABLE ticket_casp_ratings (
    id                          SERIAL          PRIMARY KEY,
    id_tiket                    INTEGER         NOT NULL UNIQUE,
    reporter_user_id            INTEGER         NOT NULL,
    assignee_user_id            INTEGER,
    rating_score                INT             NOT NULL,
    feedback                    TEXT,
    submitted_at                TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_casp_tiket
        FOREIGN KEY (id_tiket) REFERENCES tickets(id) ON DELETE CASCADE,
    
    CONSTRAINT fk_casp_reporter
        FOREIGN KEY (reporter_user_id) REFERENCES users(id),
    
    CONSTRAINT fk_casp_assignee
        FOREIGN KEY (assignee_user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    CONSTRAINT chk_casp_rating
        CHECK (rating_score BETWEEN 1 AND 5)
);

-- =====================================================================
-- TABEL 8: User-Ticket Queue Assignment
-- =====================================================================
CREATE TABLE user_ticket_queues (
    id                          SERIAL          PRIMARY KEY,
    user_id                     INTEGER         NOT NULL,
    queue_id                    INTEGER         NOT NULL,
    is_primary                  BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_utq_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    CONSTRAINT fk_utq_queue
        FOREIGN KEY (queue_id) REFERENCES ticket_queues(id) ON DELETE CASCADE,
    
    UNIQUE(user_id, queue_id)
);

-- =====================================================================
-- TABEL 9: Ticket History Log (Audit Trail)
-- =====================================================================
CREATE TABLE log_riwayat_tiket (
    id                          SERIAL          PRIMARY KEY,
    id_tiket                    INTEGER         NOT NULL,
    action                      VARCHAR(50)     NOT NULL,
    old_value                   JSONB,
    new_value                   JSONB,
    actor_name                  VARCHAR(200)    NOT NULL,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_log_tiket
        FOREIGN KEY (id_tiket) REFERENCES tickets(id) ON DELETE CASCADE
);

-- Index
CREATE INDEX idx_log_riwayat_tiket_id ON log_riwayat_tiket(id_tiket, created_at DESC);

-- =====================================================================
-- TABEL 9B: Asset History Log (Audit Trail Aset IT)
-- =====================================================================
CREATE TABLE log_riwayat_aset (
    id                          SERIAL          PRIMARY KEY,
    id_aset                     INTEGER         NOT NULL,
    label_aset                  VARCHAR(100),
    aksi                        VARCHAR(50)     NOT NULL,
    perubahan                   TEXT,
    oleh_pengguna               VARCHAR(150)    NOT NULL DEFAULT 'Sistem',
    dibuat_pada                 TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_log_aset
        FOREIGN KEY (id_aset) REFERENCES aset_ti(id) ON DELETE CASCADE
);

-- Index
CREATE INDEX idx_log_riwayat_aset_id ON log_riwayat_aset(id_aset, dibuat_pada DESC);

-- =====================================================================
-- TABEL 10: Asset Usage History
-- =====================================================================
CREATE TABLE riwayat_pemakaian_aset (
    id                          SERIAL          PRIMARY KEY,
    id_aset                     INTEGER         NOT NULL,
    nik_pemegang                 VARCHAR(20),
    tanggal_mulai               TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tanggal_selesai             TIMESTAMP,
    catatan                     TEXT,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rpa_aset
        FOREIGN KEY (id_aset) REFERENCES aset_ti(id) ON DELETE CASCADE,
    
    CONSTRAINT fk_rpa_nik
        FOREIGN KEY (nik_pemegang) REFERENCES karyawan(nik) ON DELETE SET NULL
);

-- Index
CREATE INDEX idx_rpa_active ON riwayat_pemakaian_aset(id_aset) WHERE tanggal_selesai IS NULL;

-- =====================================================================
-- TABEL 11: Login Audit Log
-- =====================================================================
CREATE TABLE log_audit_login (
    id                          SERIAL          PRIMARY KEY,
    user_id                     INTEGER,
    email                       VARCHAR(150),
    login_time                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address                  VARCHAR(45),
    user_agent                  TEXT,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_login_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Index
CREATE INDEX idx_log_audit_login_time ON log_audit_login(login_time DESC);
CREATE INDEX idx_log_audit_login_email ON log_audit_login(email);

-- =====================================================================
-- TABEL 12: Backup Metadata (Backup & Restore Database)
-- =====================================================================
CREATE TABLE backup_metadata (
    id                          SERIAL          PRIMARY KEY,
    filename                    VARCHAR(255)    NOT NULL,
    filepath                    TEXT            NOT NULL,
    file_size                   BIGINT          NOT NULL DEFAULT 0,
    database_name               VARCHAR(100)    NOT NULL,
    backup_type                 VARCHAR(50)     NOT NULL DEFAULT 'manual',
    status                      VARCHAR(50)     NOT NULL DEFAULT 'success',
    checksum                    VARCHAR(128),
    created_by                  INTEGER,
    created_by_name             VARCHAR(150),
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_backup_type
        CHECK (backup_type IN ('manual', 'pre_restore', 'scheduled')),

    CONSTRAINT chk_backup_status
        CHECK (status IN ('success', 'failed', 'in_progress')),

    CONSTRAINT fk_backup_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_backup_created_at ON backup_metadata(created_at DESC);
CREATE INDEX idx_backup_status ON backup_metadata(status);
CREATE INDEX idx_backup_type ON backup_metadata(backup_type);

-- =====================================================================
-- TABEL 13: Backup Audit Log (Audit Trail Backup & Restore)
-- =====================================================================
CREATE TABLE backup_audit_log (
    id                          SERIAL          PRIMARY KEY,
    user_id                     INTEGER,
    user_name                   VARCHAR(150),
    operation                   VARCHAR(50)     NOT NULL,
    target_database             VARCHAR(100)    NOT NULL,
    backup_id                   INTEGER,
    status                      VARCHAR(50)     NOT NULL DEFAULT 'success',
    error_summary               TEXT,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_audit_operation
        CHECK (operation IN (
            'BACKUP_STARTED',
            'BACKUP_SUCCESS',
            'BACKUP_FAILED',
            'RESTORE_STARTED',
            'RESTORE_VALIDATED',
            'PRE_RESTORE_BACKUP_STARTED',
            'PRE_RESTORE_BACKUP_SUCCESS',
            'PRE_RESTORE_BACKUP_FAILED',
            'RESTORE_SUCCESS',
            'RESTORE_FAILED',
            'BACKUP_DELETED',
            'BACKUP_DOWNLOADED'
        )),

    CONSTRAINT chk_audit_status
        CHECK (status IN ('success', 'failed', 'in_progress')),

    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT fk_audit_backup
        FOREIGN KEY (backup_id) REFERENCES backup_metadata(id) ON DELETE SET NULL
);

CREATE INDEX idx_backup_audit_created ON backup_audit_log(created_at DESC);
CREATE INDEX idx_backup_audit_operation ON backup_audit_log(operation);
CREATE INDEX idx_backup_audit_user ON backup_audit_log(user_id);

-- =====================================================================
-- TABEL 14: FAQ (Help Center FAQ CMS)
-- =====================================================================
CREATE TABLE faq (
    id                          SERIAL          PRIMARY KEY,
    question                    VARCHAR(500)    NOT NULL,
    answer                      TEXT            NOT NULL,
    category                    VARCHAR(100)    NOT NULL,
    status                      VARCHAR(20)     NOT NULL DEFAULT 'DRAFT',
    sort_order                  INTEGER         NOT NULL DEFAULT 0,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_faq_status
        CHECK (status IN ('DRAFT', 'PUBLISHED'))
);

CREATE INDEX idx_faq_status ON faq(status);

-- Seed FAQ
INSERT INTO faq (question, answer, category, status, sort_order)
VALUES (
    'Bagaimana cara melakukan reset password akun Google Workspace?',
    'Untuk melakukan reset password akun Google Workspace, silakan hubungi tim IT atau ikuti prosedur reset password yang telah ditetapkan perusahaan.',
    'Account & Access',
    'PUBLISHED',
    1
);

-- =====================================================================
-- TABEL 15: Cases (Help Center SOP / Case CMS)
-- =====================================================================
CREATE TABLE cases (
    id                          SERIAL          PRIMARY KEY,
    title                       VARCHAR(300)    NOT NULL,
    category                    VARCHAR(100)    NOT NULL,
    severity                    VARCHAR(20)     NOT NULL DEFAULT 'medium',
    tags                        JSONB           NOT NULL DEFAULT '[]'::jsonb,
    summary                     TEXT,
    problem_context             TEXT,
    content_html                TEXT,
    action_steps                JSONB           NOT NULL DEFAULT '[]'::jsonb,
    dos                         JSONB           NOT NULL DEFAULT '[]'::jsonb,
    donts                       JSONB           NOT NULL DEFAULT '[]'::jsonb,
    snippets                    JSONB           NOT NULL DEFAULT '[]'::jsonb,
    status                      VARCHAR(20)     NOT NULL DEFAULT 'DRAFT',
    is_custom                   BOOLEAN         NOT NULL DEFAULT FALSE,
    sort_order                  INTEGER         NOT NULL DEFAULT 0,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_cases_status
        CHECK (status IN ('DRAFT', 'PUBLISHED')),
    CONSTRAINT chk_cases_severity
        CHECK (severity IN ('low', 'medium', 'high'))
);

CREATE INDEX idx_cases_status ON cases(status);

-- =====================================================================
-- HELPFUL VIEWS
-- =====================================================================

-- View untuk List Aset Lengkap (untuk query kompleks di backend)
CREATE VIEW daftar_aset_ti_lengkap AS
SELECT 
    a.id,
    a.hostname,
    a.serial_number,
    a.spesifikasi,
    k.nik AS nik_pemegang,
    k.nama_karyawan AS nama_karyawan_pemegang,
    k.departemen AS departemen_pemegang,
    k.lokasi_kerja AS lokasi_karyawan,
    a.lokasi_asset,
    a.tipe_perangkat,
    a.brand_merek,
    a.model,
    a.status,
    a.kondisi,
    a.note_asset
FROM aset_ti a
LEFT JOIN karyawan k ON a.nik_pemegang_asset = k.nik
WHERE a.deleted_at IS NULL;

-- View stats tiket per queue
CREATE VIEW v_ticket_stats_per_queue AS
SELECT 
    q.id AS queue_id,
    q.kode AS queue_kode,
    q.nama AS queue_nama,
    COUNT(CASE WHEN t.status_tiket = 'Open' THEN 1 END) AS open_count,
    COUNT(CASE WHEN t.status_tiket IN ('Resolved', 'Closed') THEN 1 END) AS closed_count,
    COUNT(*) FILTER (WHERE t.status_tiket = 'Open') AS total_open,
    COUNT(*) FILTER (WHERE t.status_tiket != 'Open') AS total_closed
FROM ticket_queues q
LEFT JOIN tickets t ON q.id = t.queue_id AND t.deleted_at IS NULL
GROUP BY q.id, q.kode, q.nama;

-- View employee asset summary
CREATE VIEW v_employee_asset_summary AS
SELECT 
    k.id AS karyawan_id,
    k.nik,
    k.nama_karyawan,
    k.departemen,
    COUNT(a.id) AS total_assets,
    COUNT(a.id) FILTER (WHERE a.status = 'In Use') AS active_assets,
    COUNT(a.id) FILTER (WHERE a.status = 'Stock') AS stock_assets
FROM karyawan k
LEFT JOIN aset_ti a ON k.nik = a.nik_pemegang_asset AND a.deleted_at IS NULL
GROUP BY k.id, k.nik, k.nama_karyawan, k.departemen;

-- =====================================================================
-- AUTO UPDATE TRIGGERS (Timestamp management)
-- =====================================================================

CREATE OR REPLACE FUNCTION auto_update_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_auto_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();
CREATE TRIGGER trg_karyawan_auto_updated_at BEFORE UPDATE ON karyawan FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();
CREATE TRIGGER trg_aset_ti_auto_updated_at BEFORE UPDATE ON aset_ti FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();
CREATE TRIGGER trg_tickets_auto_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();
CREATE TRIGGER trg_ticket_queues_auto_updated_at BEFORE UPDATE ON ticket_queues FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();
CREATE TRIGGER trg_riwayat_pemakaian_auto_updated_at BEFORE UPDATE ON riwayat_pemakaian_aset FOR EACH ROW EXECUTE FUNCTION auto_update_timestamp();

-- =====================================================================
-- HARD DELETE PREVENTION TRIGGERS
-- =====================================================================

CREATE OR REPLACE FUNCTION prevent_hard_delete() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Hard delete prohibited for %. Use soft delete by setting deleted_at.', TG_TABLE_NAME USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_prevent_hard_delete BEFORE DELETE ON users FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER trg_aset_ti_prevent_hard_delete BEFORE DELETE ON aset_ti FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER trg_tickets_prevent_hard_delete BEFORE DELETE ON tickets FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();

-- =====================================================================
-- COMPLETED: Full Schema Master Ready for Production & Local Setup
-- =====================================================================

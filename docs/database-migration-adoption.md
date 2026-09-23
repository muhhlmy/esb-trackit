# Prosedur Operasional Adopsi Migrasi Database Existing (Runbook)

Dokumen ini mendefinisikan runbook operasional standar untuk mengadopsi sistem migrasi kanonik (`app_schema_migrations`) pada database PostgreSQL existing (seperti database legacy production) yang sudah memiliki tabel aplikasi tetapi belum memiliki ledger migrasi.

---

## 1. Latar Belakang & Filosofi Keamanan

Sistem migrasi TrackIT secara ketat menolak database yang sudah memiliki tabel aplikasi jika tabel ledger `app_schema_migrations` belum terbentuk:
```text
Database existing tanpa ledger ditolak. Relations: ... Buat migration adoption yang direview; baseline otomatis tidak diizinkan.
```
Prinsip fail-closed ini dirancang untuk mencegah mutasi otomatis yang tidak disengaja pada database legacy production. Untuk menyinkronkan database existing dengan lifecycle migrasi versioned, operator wajib mengikuti prosedur adopsi resmi di bawah ini.

---

## 2. Parameter Environment & Variabel Kontrak

Sebelum menjalankan migrasi atau adopsi, pastikan seluruh environment variable berikut dikonfigurasi secara eksplisit:

| Variabel | Tipe / Format | Keterangan |
|---|---|---|
| `MIGRATION_MODE` | `'fresh'` \| `'existing'` | Wajib `'existing'` untuk database yang telah memiliki data/tabel. |
| `MIGRATION_EXPECTED_HOST` | String (Host / IP) | Host database target yang harus cocok persis dengan konfigurasi `DB_HOST`. |
| `MIGRATION_EXPECTED_DATABASE` | String | Nama database target yang harus cocok persis dengan konfigurasi `DB_NAME`. |
| `ALLOW_DB_MIGRATIONS` | `'true'` \| `'false'` | Safety guard. Wajib bernilai `'true'` untuk mengizinkan eksekusi mutasi/adopsi. |
| `MIGRATION_RECOVERY_PROOF_ID` | String (min. 8 char) | ID / tiket bukti verifikasi restore backup (contoh: `rec-proof-2026-09-09-pgdump`). |
| `MIGRATION_CHANGE_ID` | String (min. 3 char) | Nomor tiket Change Management resmi (wajib untuk production, contoh: `CR-TRACKIT-2026-09-01`). |
| `REQUIRE_NON_SUPERUSER` | `'true'` \| `'false'` | Mengunci agar migrasi dijalankan oleh database user non-superuser. |

---

## 3. Langkah-Langkah Operasional Adopsi (11 Tahap)

### Tahap 1: Full Backup Production Database
Buat salinan penuh database production menggunakan `pg_dump` dengan format custom binary:
```bash
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -Fc -b -v -f "backup_pre_adoption_$(date +%Y%m%d_%H%M%S).dump"
```
Hitung checksum SHA-256 berkas backup sebagai bukti integritas data:
```bash
sha256sum backup_pre_adoption_*.dump > backup_checksum.sha256
```

### Tahap 2: Restore Verification (Uji Pemulihan pada Lingkungan Terisolasi)
Pulihkan berkas backup ke instance PostgreSQL uji/sementara untuk memverifikasi keabsahan data:
```bash
createdb -h localhost -U postgres verify_restore_test
pg_restore -h localhost -U postgres -d verify_restore_test -v "backup_pre_adoption_*.dump"
```
Setelah pemulihan terbukti sukses, terbitkan bukti verifikasi:
```text
MIGRATION_RECOVERY_PROOF_ID=rec-proof-2026-09-09-prod-dump-verified
```

### Tahap 3: Inspeksi Skema Saat Ini (Current Schema Inspection)
Periksa tabel apa saja yang sudah ada di dalam database production:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```
Pastikan tabel aplikasi inti seperti `karyawan`, `users`, `aset_ti`, `tickets`, dll. telah terdata.

### Tahap 4: Validasi Baseline Migrasi
Bandingkan kondisi skema existing dengan definisi migrasi pada `backend/migrations/versioned/`:
- `0001_core_schema.sql`: Berisi skema dasar seluruh tabel inti (`karyawan`, `users`, `aset_ti`, `tickets`, `komentar_tiket`, dsb.).
- `0002_runtime_extensions.sql`: Berisi ekstensi runtime (`log_riwayat_aset`, `backup_metadata`, `password_reset_otps`, `faq`, `cases`, `kb_categories`, `asset_shipments`, dsb.).

Jika database existing Anda dibuat dari bootstrap awal dan telah memiliki seluruh tabel inti, maka baseline migrasi Anda adalah **Versi 1** (`0001_core_schema.sql`).

### Tahap 5: Reviewed Adoption Strategy
Diskusikan dan sahkan rencana adopsi dengan tim DBA/Tech Lead:
1. Catat bahwa `0001_core_schema.sql` telah diimplementasikan sebelumnya.
2. Migrasi baru (`0002_runtime_extensions.sql` atau seterusnya) akan diterapkan secara aman melalui migration runner kanonik.
3. Tetapkan jadwal maintenance window (downtime minimal).

### Tahap 6: Establish Migration Ledger (Inisialisasi Tabel Ledger)
Jalankan skrip pembentukan ledger dan pencatatan baseline migration. Anda dapat menggunakan skrip otomatis:
```bash
cd backend
ALLOW_DB_MIGRATIONS=true \
MIGRATION_MODE=existing \
MIGRATION_EXPECTED_HOST=localhost \
MIGRATION_EXPECTED_DATABASE=assets_monitoring \
MIGRATION_RECOVERY_PROOF_ID=rec-proof-2026-09-09-prod-dump-verified \
MIGRATION_CHANGE_ID=CR-TRACKIT-2026-09-01 \
npm run db:migrate:adopt -- --baseline=1
```
Atau secara manual mengeksekusi SQL berikut:
```sql
BEGIN;

-- 1. Bentuk tabel ledger jika belum ada
CREATE TABLE IF NOT EXISTS app_schema_migrations (
  version           INTEGER PRIMARY KEY,
  name              VARCHAR(160) NOT NULL UNIQUE,
  checksum_sha256   CHAR(64) NOT NULL,
  applied_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_by        VARCHAR(150) NOT NULL,
  recovery_proof_id VARCHAR(160) NOT NULL,
  change_id         VARCHAR(160),
  execution_ms      INTEGER NOT NULL CHECK (execution_ms >= 0)
);

-- 2. Catat adopsi baseline 0001_core_schema.sql dengan checksum resmi
INSERT INTO app_schema_migrations
  (version, name, checksum_sha256, applied_by, recovery_proof_id, change_id, execution_ms)
VALUES
  (1, '0001_core_schema.sql', '6283b9398a1f112045f6788fe7f4eb2e7acece80da8baf2fd4fc8212f117c0de', current_user, 'rec-proof-2026-09-09-prod-dump-verified', 'CR-TRACKIT-2026-09-01', 0)
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

### Tahap 7: Migration Dry-Run (Rencana Migrasi)
Verifikasi bahwa runner mengenali baseline dan hanya merencanakan migrasi yang belum diterapkan:
```bash
MIGRATION_MODE=existing \
MIGRATION_EXPECTED_HOST=localhost \
MIGRATION_EXPECTED_DATABASE=assets_monitoring \
npm run db:migrate:plan
```
Output yang diharapkan:
```text
Migration pending: 0002_runtime_extensions.sql
```

### Tahap 8: Staging Migration (Uji Coba di Lingkungan Staging)
Uji coba proses `apply` pada clone database staging sebelum melakukan perubahan pada database production:
```bash
ALLOW_DB_MIGRATIONS=true \
MIGRATION_MODE=existing \
MIGRATION_EXPECTED_HOST=staging-db \
MIGRATION_EXPECTED_DATABASE=assets_monitoring_staging \
MIGRATION_RECOVERY_PROOF_ID=rec-proof-staging \
MIGRATION_CHANGE_ID=CR-TRACKIT-2026-09-01 \
npm run db:migrate:apply
```
Pastikan seluruh batch migrasi pending selesai tanpa error.

### Tahap 9: Runtime Schema Verification
Periksa kepatuhan skema terhadap kontrak aplikasi Express menggunakan preflight check:
```bash
npm run db:check
```
Output yang diharapkan:
```text
[Schema Check] PASS: Seluruh tabel, kolom, tipe data, dan indeks kanonik terverifikasi sesuai runtime schema.
```

### Tahap 10: Production Change ID & Apply
Pada jadwal maintenance production, terapkan migrasi tertunda:
```bash
ALLOW_DB_MIGRATIONS=true \
MIGRATION_MODE=existing \
MIGRATION_EXPECTED_HOST=production-db \
MIGRATION_EXPECTED_DATABASE=assets_monitoring \
MIGRATION_RECOVERY_PROOF_ID=rec-proof-2026-09-09-prod-dump-verified \
MIGRATION_CHANGE_ID=CR-TRACKIT-2026-09-01 \
npm run db:migrate:apply
```

### Tahap 11: Rollback Procedure (Prosedur Pemulihan Darurat)
Jika migrasi mengalami kegagalan fatal pada production:
1. Segera hentikan traffic masuk (maintenance mode pada Nginx).
2. Pulihkan snapshot/dump yang dibuat pada Tahap 1:
   ```bash
   dropdb -h $DB_HOST -U $DB_USER $DB_NAME
   createdb -h $DB_HOST -U $DB_USER $DB_NAME
   pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME -v "backup_pre_adoption_*.dump"
   ```
3. Verifikasi kembali koneksi database dan integritas data.
4. Investigasi log kegagalan migrasi dan koordinasikan dengan tim pengembang.

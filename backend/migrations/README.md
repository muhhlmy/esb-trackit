# Database Migrations Guide

Direktori ini berisi skema dan migrasi database untuk TrackIT.

## Struktur Direktori

- `versioned/` (**Canonical Migrations**)
  - Berisi file migrasi resmi berurutan dengan konvensi penamaan `NNNN_name.sql` (misalnya `0001_core_schema.sql`, `0002_runtime_extensions.sql`).
  - Dijalankan secara terkontrol melalui migration runner dengan PostgreSQL advisory lock, SHA-256 checksum verification, dan pencatatan pada tabel ledger `app_schema_migrations`.
  - **Perintah CLI:**
    - Periksa rencana migrasi: `npm run db:migrate:plan`
    - Terapkan migrasi: `npm run db:migrate:apply`
  - Tabel `asset_shipments`, `cases`, `faq`, `backup_metadata`, `password_reset_otps`, dan ekstensi lainnya sudah didefinisikan secara kanonik di dalam `versioned/0002_runtime_extensions.sql`.

- `001_*.sql` s.d. `005_*.sql` (**Legacy Reference Files**)
  - File-file ini merupakan arsip dokumentasi perubahan skema masa lampau (sebelum migrasi kanonik diperkenalkan).
  - **JANGAN** dijalankan secara manual pada production karena seluruh skema tersebut telah dikonsolidasikan ke dalam migrasi kanonik pada folder `versioned/`.

Untuk prosedur adopsi database existing atau migrasi production, silakan merujuk ke dokumen:
`docs/database-migration-adoption.md`

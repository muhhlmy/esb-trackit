# ESB TrackIT

Aplikasi web internal untuk pengelolaan aset IT, aset GA dan OPS, data karyawan, pengajuan, pengiriman, tiket helpdesk, serta Help Center berbasis Knowledge Base. Satu basis kode (monorepo) yang menaungi SPA Vue 3, REST API Express 5, dan basis data PostgreSQL 16.

[![CI](https://github.com/muhhlmy/esb-trackit/actions/workflows/ci.yml/badge.svg)](https://github.com/muhhlmy/esb-trackit/actions/workflows/ci.yml)
[![E2E Tests](https://github.com/muhhlmy/esb-trackit/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/muhhlmy/esb-trackit/actions/workflows/e2e-tests.yml)
[![CodeQL](https://github.com/muhhlmy/esb-trackit/actions/workflows/codeql.yml/badge.svg)](https://github.com/muhhlmy/esb-trackit/actions/workflows/codeql.yml)

## Daftar Isi

- [Ringkasan](#ringkasan)
- [Fitur](#fitur)
- [Arsitektur](#arsitektur)
- [Teknologi](#teknologi)
- [Struktur Direktori](#struktur-direktori)
- [Menjalankan Secara Lokal](#menjalankan-secara-lokal)
- [Deployment dengan Docker](#deployment-dengan-docker)
- [Database dan Migrasi](#database-dan-migrasi)
- [Environment Variables](#environment-variables)
- [Skema Database](#skema-database)
- [API Reference](#api-reference)
- [Import dan Export XLSX](#import-dan-export-xlsx)
- [Keamanan](#keamanan)
- [Pengujian](#pengujian)
- [CI/CD](#cicd)
- [Perintah Lainnya](#perintah-lainnya)
- [Dokumentasi Terkait](#dokumentasi-terkait)
- [Lisensi](#lisensi)

## Ringkasan

ESB TrackIT melayani tiga kelompok pengguna dengan kebutuhan berbeda:

1. **Karyawan umum** melihat aset yang sedang mereka pegang, membuat tiket bantuan, dan membaca artikel Help Center tanpa perlu login.
2. **Tim IT, GA, dan OPS** mengelola inventaris per kategori, memproses pengajuan, dan menangani pengiriman barang.
3. **Admin dan superadmin** mengatur akun dan izin, memantau log aktivitas, menjalankan export data, serta melakukan backup dan restore database langsung dari antarmuka.

Aplikasi ini digunakan secara internal, sehingga seluruh halaman manajemen berada di balik autentikasi. Hanya Help Center (artikel, FAQ, kategori) yang terbit publik, dan hanya konten berstatus `PUBLISHED` yang tampil.

## Fitur

### Aset
- **Aset IT** mencatat hostname, serial number, spesifikasi, pemegang (relasi ke NIK karyawan), lokasi, tipe perangkat, merek, model, status (`In Use`, `Stock`, `Damaged`, `In Service`, `Disposal`), dan kondisi (`Baru` hingga `Rusak Berat`). Setiap perubahan pemegang terekam di `riwayat_pemakaian_aset`, setiap perubahan data terekam di `log_riwayat_aset`.
- **Aset GA** dan **Aset OPS** memiliki inventaris, skema tabel, dan aturan izin tersendiri sehingga tidak bercampur dengan aset IT.
- **Pengajuan aset** (`asset_submissions`) berjalan sebagai workflow berstatus `draft → submitted → completed`, dengan opsi pembatalan dan nomor pengajuan unik per dokumen.
- **Label barcode** dapat dibuat per aset dari halaman Aset IT untuk kebutuhan physical tagging.
- **Aset Karyawan** (halaman My Assets) menampilkan aset milik karyawan yang sedang login.

### Helpdesk
- Tiket memiliki nomor unik, kategori, prioritas (`Low` hingga `Critical`), dan antrean per tim (IT, HR, GA). Antrean dapat dikelola adminnya masing-masing.
- Komentar mendukung lampiran; percakapan dan perubahan status terekam sebagai riwayat audit per tiket.
- Penanganan tiket mencakup claim, reassign, penyelesaian, dan pembatalan, dengan rating kepuasan CSAT 1–5 dari pelapor setelah tiket selesai.
- Pembaruan tiket masuk secara realtime melalui Server-Sent Events; koneksi SSE difilter per pengguna sesuai hak aksesnya sehingga detail tiket tidak bocor ke pihak yang tidak berkepentingan.

### Help Center
- Artikel insiden (SOP) dan FAQ yang sudah dipublikasikan dapat dibaca publik tanpa login, lengkap dengan kategori, tingkat keparahan (`low/medium/high`), tag, dan pencarian.
- Pencarian pengunjung dicatat untuk menghasilkan daftar pencarian populer.
- CMS admin menyediakan editor rich text (TipTap) dengan struktur baku per artikel: konteks masalah, langkah penanganan, Do's and Don'ts, dan snippet perintah.
- Pengguna terautentikasi dapat menyimpan bookmark artikel.

### Operasional dan Administrasi
- **Pengiriman** mencatat permintaan kirim barang atau aset, penerima, tujuan, nomor resi (AWB), status pelacakan (`belum_dikirim` hingga `diterima`), dan pembatalan.
- **Dashboard** merangkum tren aset, distribusi kondisi, komposisi tipe perangkat, dan tren CSAT dalam grafik (Chart.js).
- **Log aktivitas** dan **log audit login** terpusat pada `system_audit_logs`, termasuk nilai sebelum dan sesudah perubahan (`before/after` dalam JSONB), pelaku, IP, dan user-agent.
- **Backup dan restore** dijalankan dari UI admin: `pg_dump` dengan checksum SHA-256, backup otomatis sebelum restore, retensi berdasarkan umur file dan jumlah file, hingga audit trail setiap operasi.
- **Export data** administratif ke XLSX untuk aset, pengguna, tiket, dan tabel lainnya, khusus superadmin.

## Arsitektur

```text
┌──────────────────────────────────────────────────────────┐
│                       Browser (SPA)                      │
│   Vue 3 + Vue Router + Tailwind CSS 4                    │
│   State via composables, semua HTTP lewat useApi         │
│   Sesi: cookie HttpOnly · Realtime: SSE                  │
└─────────────────────────┬────────────────────────────────┘
                          │ HTTP/HTTPS
            ┌─────────────▼──────────────┐
            │  Nginx (container frontend)│
            │  statis SPA + proxy /api   │
            └─────────────┬──────────────┘
                          │
            ┌─────────────▼──────────────┐
            │  Express 5 API (Node 22)   │
            │  routes → controllers →    │
            │  services → pg             │
            │  · JWT + sesi server-side  │
            │  · RBAC + rate limiting    │
            │  · SSE broadcaster         │
            └─────────────┬──────────────┘
                          │
            ┌─────────────▼──────────────┐
            │      PostgreSQL 16         │
            │  24 tabel, 3 view, trigger │
            │  audit dan anti-hard-delete│
            └────────────────────────────┘
```

Beberapa keputusan desain yang perlu diketahui sebelum menyentuh kode:

- Backend berlapis: `routes → controllers → services → pg`. Controller memvalidasi input, service yang memegang SQL, dan seluruh query memakai placeholder parameterized (`$1`).
- Server tidak pernah menjalankan DDL saat startup. Ia hanya memverifikasi bahwa runtime schema sesuai; perubahan skema hanya lewat migrasi versioned.
- Backend adalah sumber kebenaran untuk role dan izin. Pemeriksaan izin di frontend (`permissionAccess.js`) hanya mengatur navigasi, bukan keamanan.
- Realtime memakai EventEmitter in-process yang dirancang untuk deployment single-instance. Roadmap multi-instance telah didokumentasikan di `realtimeService.js` (opsi PostgreSQL `LISTEN/NOTIFY` atau Redis Pub/Sub).
- Frontend tidak memakai state library. State dikelola lewat composables, dan setiap panggilan HTTP melewati `useApi` yang menangani cookie sesi serta redirect 401 secara global.

## Teknologi

| Area | Teknologi |
| --- | --- |
| Frontend | Vue 3.5, Vue Router, Vite, Tailwind CSS 4, TipTap (editor), Chart.js, GSAP, JsBarcode, Lucide, SheetJS (`xlsx`), DOMPurify |
| Backend | Node.js (ESM), Express 5, `pg`, `jsonwebtoken`, `bcryptjs`, `multer`, `nodemailer`, `isomorphic-dompurify` |
| Database | PostgreSQL 16 dengan migrasi versioned, view, dan trigger |
| Pengujian | Node test runner (unit), Playwright dengan axe-core (E2E), CodeQL (SAST) |
| Infrastruktur | Docker Compose, Nginx, GitHub Actions |
| Tooling | oxlint, ESLint, Prettier, nodemon, pipeline design tokens |

Node.js wajib versi `^22.18.0` atau `>=24.12.0` sesuai kolom `engines` pada `package.json`.

## Struktur Direktori

```text
esb-trackit/
├── backend/                        REST API Express (ESM)
│   ├── migrations/
│   │   ├── versioned/              Migrasi kanonik 0001–0008 (satu-satunya yang dieksekusi)
│   │   └── 0xx_*.sql               Arsip legacy, tidak dijalankan
│   ├── src/
│   │   ├── config/                 env, koneksi DB, runner migrasi, verifikasi schema
│   │   ├── controllers/            Validasi input dan orkestrasi HTTP
│   │   ├── services/               Logika bisnis dan SQL (auth, backup, SSE, izin, dll.)
│   │   ├── middleware/             Auth, rate limit, security headers, error handler
│   │   ├── routes/                 Definisi endpoint dan alias legacy
│   │   ├── security/               Kebijakan CORS
│   │   ├── errors/ · utils/ · assets/
│   │   ├── app.js                  CORS, security headers, rate limit, router
│   │   └── server.js               Bootstrap dan graceful shutdown
│   └── tests/                      Unit test backend (node --test)
├── frontend/                       SPA Vue 3
│   ├── src/
│   │   ├── views/                  Halaman aplikasi (termasuk views/admin/)
│   │   ├── components/             UI kit, chart, tiket, cases, layout
│   │   ├── composables/            State management
│   │   ├── services/ · utils/ · config/ · styles/
│   │   └── router/index.js         Routing dan gating izin halaman
│   ├── tests/                      Unit test frontend (node --test)
│   ├── Dockerfile
│   ├── nginx.conf                  SPA + reverse proxy /api + header keamanan
│   └── vite.config.js              Proxy API dan security headers untuk dev/preview
├── e2e/                            Playwright: tests/, pages/, fixtures/
├── scripts/                        Inisialisasi DB, QA automation, tokens, deploy
├── docs/                           Konvensi, audit keamanan, laporan QA, runbook, manual
├── design-tokens/                  Sumber design tokens (npm run build:tokens)
├── .github/workflows/              ci.yml, e2e-tests.yml, codeql.yml
├── docker-compose.yml              postgres, migrate, backend, frontend
├── playwright.config.js            Validasi database test loopback *_test
└── package.json                    Skrip root: E2E, dokumen, tokens, deploy
```

## Menjalankan Secara Lokal

Prasyarat: Node.js `^22.18.0 || >=24.12.0` dan PostgreSQL 16 yang berjalan di lokal.

### Backend

```bash
cd backend
npm install
```

Buat file `backend/.env` dengan isi minimal berikut. File ini tidak pernah masuk git.

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=esb_trackit
DB_USER=postgres
DB_PASSWORD=<password-postgres-anda>
JWT_SECRET=<string-acak-minimal-32-karakter>
```

`JWT_SECRET` divalidasi ketat saat startup: wajib diisi, minimal 32 karakter, tanpa nilai bawaan di source code. Aplikasi menolak menyala tanpanya.

Terapkan migrasi untuk menyiapkan skema:

```bash
npm run db:migrate:plan    # tinjau rencana tanpa mengubah apa pun
npm run db:migrate:apply   # terapkan; wajib menyertakan guard env (lihat bagian Database dan Migrasi)
npm run db:check           # verifikasi runtime schema
```

Jalankan server:

```bash
npm run dev      # nodemon, memantau src/ dan .env
npm start        # produksi sederhana
```

API berjalan di `http://localhost:3000`. Cek `GET /health`; respons `{"status":"healthy"}` berarti koneksi database sehat.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

SPA berjalan di `http://localhost:5173`. Vite meneruskan semua permintaan `/api` ke backend pada `http://127.0.0.1:3000`; ubah target lewat variabel `VITE_API_PROXY_TARGET`.

Build produksi:

```bash
npm run build     # vite build
npm run preview   # sajikan hasil build
```

### Akun pertama

Untuk environment non-produksi, superadmin awal dapat dibuat melalui variabel `SEED_SUPERADMIN_NAME`, `SEED_SUPERADMIN_EMAIL`, dan `SEED_SUPERADMIN_PASSWORD` pada proses inisialisasi database. Gunakan kredensial yang berbeda untuk setiap environment.

## Deployment dengan Docker

`docker-compose.yml` menjalankan empat layanan:

| Layanan | Peran |
| --- | --- |
| `postgres` | PostgreSQL 16-alpine dengan healthcheck `pg_isready` |
| `migrate` | One-shot: menerapkan migrasi lalu keluar; backend menunggu layanan ini selesai |
| `backend` | Node 22-alpine, user non-root, dilengkapi `postgresql-client` untuk backup/restore |
| `frontend` | Nginx: menyajikan SPA, mem-proxy `/api` ke `backend:3000`, mendukung SSE (`proxy_buffering off`) |

Langkah deployment:

```bash
cp .env.example .env
# Edit .env. Wajib diisi: DB_PASSWORD, JWT_SECRET,
# MIGRATION_RECOVERY_PROOF_ID, MIGRATION_CHANGE_ID

docker compose up -d --build
```

Aplikasi dapat diakses di `http://localhost`.

Detail hardening yang sudah diterapkan pada compose: `no-new-privileges:true` dan `cap_drop: ALL` pada container aplikasi, volume terpisah untuk data database (`pgdata`) dan file backup (`backups`), serta subnet internal `172.28.0.0/16`. Bila Anda menaruh reverse proxy eksternal (Nginx host, AWS ALB, Cloudflare), sesuaikan `TRUST_PROXY_CIDRS` dengan CIDR proxy yang sebenarnya. Nilai wildcard seperti `*` atau `0.0.0.0/0` tidak diperbolehkan dan akan ditolak.

## Database dan Migrasi

Empat aturan yang berlaku mutlak:

1. Semua perubahan skema hanya melalui file di `backend/migrations/versioned/`. DDL manual dilarang.
2. File `0xx_*.sql` di folder `migrations/` adalah arsip legacy. Jangan dijalankan.
3. Jangan mencampur import dump dengan penerapan migrasi pada database yang sama. Pilih satu jalur.
4. Untuk database lama yang belum memakai ledger migrasi, ikuti runbook di `docs/database-migration-adoption.md` sebelum menjalankan migrasi apa pun.

Perintah migrasi memerlukan guard environment. Tanpa guard tersebut, `db:migrate:apply` menolak berjalan:

| Variabel | Keterangan |
| --- | --- |
| `ALLOW_DB_MIGRATIONS` | Harus `true`. Pernyataan niat eksplisit. |
| `MIGRATION_MODE` | `fresh` untuk database baru/kosong, `existing` untuk database yang sudah mengadopsi ledger. |
| `MIGRATION_EXPECTED_HOST` | Host database target; harus cocok persis. |
| `MIGRATION_EXPECTED_DATABASE` | Nama database target; harus cocok persis. |
| `MIGRATION_RECOVERY_PROOF_ID` | Bukti bahwa backup/restore sudah diverifikasi sebelum migrasi (minimal 8 karakter). |
| `MIGRATION_CHANGE_ID` | ID tiket change request; wajib di lingkungan production. |
| `REQUIRE_NON_SUPERUSER` | Opsional; memaksa role pemilik database berstatus non-superuser. |

## Environment Variables

### Backend inti

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `PORT` | `3000` | Port HTTP API |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | lihat `.env.example` | Koneksi PostgreSQL |
| `JWT_SECRET` | wajib | Minimal 32 karakter |
| `PASSWORD_BCRYPT_ROUNDS` | `12` | Dibatasi 10–14 |
| `ACCESS_TOKEN_TTL_SECONDS` | `900` | Umur access token, dibatasi 300–3600 detik (sliding session) |
| `SESSION_COOKIE_PATH` | `/` | Path cookie sesi HttpOnly |

### Keamanan dan jaringan

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `CORS_ORIGINS` | origin dev lokal | Daftar origin exact dipisah koma; nilai `*` menyebabkan startup gagal |
| `TRUST_PROXY_CIDRS` | kosong | IP/CIDR proxy tepercaya, exact, dipisah koma |
| `EMAIL_ENABLED` | `false` | Mengaktifkan pengiriman email (aktivasi akun, reset password) |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` `EMAIL_FROM` | kosong | Konfigurasi SMTP |
| `FRONTEND_URL` | `http://localhost` | Origin frontend untuk tautan dalam email |

### Backup database

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `DB_BACKUP_DIR` | `storage/backups` | Lokasi penyimpanan dump |
| `DB_BACKUP_RETENTION_DAYS` | `30` | Hapus backup lebih tua dari N hari |
| `DB_BACKUP_MAX_FILES` | `20` | Batas jumlah file backup |
| `PG_DUMP_PATH` `PG_RESTORE_PATH` `PSQL_PATH` | `pg_dump` dst. | Lokasi binary PostgreSQL client |

### Root dan Docker Compose

`.env.example` di root memuat variabel tambahan untuk compose: kredensial database, guard migrasi (`MIGRATION_*`), seed superadmin, kredensial QA (`QA_SUPERADMIN_EMAIL`, `QA_SUPERADMIN_PASSWORD` untuk skrip QA di `scripts/qa/`), dan konfigurasi SMTP. Kredensial QA hanya untuk environment test.

File `.env`, `.env.e2e`, folder `backend/storage/backups/`, dan berkas `*.dump` semuanya gitignored.

## Skema Database

Skema kanonik berisi 24 tabel dan 3 view, dengan constraint yang ditegakkan langsung di database:

| Grup | Objek |
| --- | --- |
| Identitas dan auth | `karyawan`, `users`, `user_sessions`, `account_security_state`, `password_reset_otps` |
| Aset | `aset_ti`, `aset_ga`, `aset_ops`, `asset_submissions`, `riwayat_pemakaian_aset`, `log_riwayat_aset` |
| Helpdesk | `ticket_queues`, `tickets`, `komentar_tiket`, `ticket_casp_ratings`, `user_ticket_queues`, `log_riwayat_tiket` |
| Help Center | `faq`, `cases` |
| Logistik | `asset_shipments` |
| Audit dan operasi | `system_audit_logs`, `log_audit_login`, `backup_metadata`, `backup_audit_log` |
| View | `daftar_aset_ti_lengkap`, `v_ticket_stats_per_queue`, `v_employee_asset_summary` |

Poin desain yang perlu diketahui:

- Status enum ditegakkan lewat `CHECK` constraint, bukan hanya di aplikasi. Contoh: status aset hanya boleh salah satu dari lima nilai yang terdaftar; rating CSAT harus antara 1 dan 5.
- Trigger `auto_update_timestamp()` memelihara kolom `updated_at` pada tabel utama.
- Trigger `prevent_hard_delete()` melindungi `users`, `aset_ti`, dan `tickets`. DELETE langsung akan gagal; penghapusan harus lewat soft delete (`deleted_at`).
- Foreign key memakai strategi hapus yang disengaja: `SET NULL` untuk referensi opsional, `RESTRICT` untuk data yang tidak boleh hilang (`users` pada tiket), `CASCADE` untuk data turunan.
- Index parsial dipasang untuk query panas, misalnya index pada `status` yang hanya mencakup baris `deleted_at IS NULL`.

## API Reference

Basis URL `/api`, format JSON. Permintaan tanpa `Content-Type: application/json` untuk method ber-body akan ditolak. Autentikasi memakai cookie sesi HttpOnly yang didapat setelah login; token tidak disimpan di browser.

### Autentikasi

| Method | Endpoint | Akses | Fungsi |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Publik (rate-limited) | Login, menerbitkan cookie sesi |
| POST | `/api/auth/logout` | JWT | Menghapus sesi di sisi server |
| GET | `/api/auth/me` | JWT | Profil dan izin pengguna saat ini |
| POST | `/api/auth/change-password` | JWT | Ganti sandi sendiri |
| POST | `/api/auth/forgot-password` | Publik (rate-limited) | Memulai reset via OTP |
| POST | `/api/auth/verify-reset-otp` | Publik (rate-limited) | Verifikasi OTP |
| POST | `/api/auth/reset-password` | Publik (rate-limited) | Menyetel sandi baru |

### Modul utama

| Endpoint | Akses minimum | Fungsi |
| --- | --- | --- |
| `/api/assets` | Izin `assets` | Aset IT: CRUD, `/my`, `/stats`, `/cycle/:nik` |
| `/api/ga-assets` | Izin `assets_ga` | Aset GA. Alias: `/api/assets-ga`, `/api/assets_ga` |
| `/api/ops-assets` | Izin `assets_ops` | Aset OPS. Alias: `/api/assets-ops`, `/api/assets_ops` |
| `/api/employees` | Admin | Master data karyawan. Alias legacy: `/api/karyawan` |
| `/api/users` | Admin | Akun, role, dan izin per fitur |
| `/api/tickets` | Izin `tickets` | CRUD tiket, komentar, lampiran, claim/reassign, riwayat, CASP, statistik. `GET /events` = SSE |
| `/api/ticket-queues` | JWT | Antrean tiket; pengelolaan admin antrean oleh superadmin |
| `/api/shipments` | Izin `shipments` | Pengiriman dan import. Alias: `/api/pengiriman` |
| `/api/submissions` | Izin `submissions` | Pengajuan aset |
| `/api/case-bookmarks` | JWT | Bookmark artikel per pengguna |
| `/api/logs` | Admin | Log aktivitas sistem |

### Help Center

| Method | Endpoint | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/cases/public` | Publik | Artikel berstatus `PUBLISHED` |
| GET | `/api/faqs/public` | Publik | FAQ berstatus `PUBLISHED` |
| GET | `/api/kb-categories/public` | Publik | Kategori/topic cards |
| GET, POST | `/api/kb-search-logs` | Publik | Pencatatan pencarian; `/popular` untuk daftar populer |
| CRUD | `/api/cases` `/api/faqs` `/api/kb-categories` | Izin `knowledge_base` | CMS draft/publish |
| GET | `/api/kb-search-logs/stats` | Admin | Statistik pencarian KB |

### Import, export, dan administrasi database

| Method | Endpoint | Akses | Fungsi |
| --- | --- | --- | --- |
| POST | `/api/import/excel` | Admin | Import Karyawan dan/atau Aset IT |
| POST | `/api/import/excel-assets` | Admin | Import Aset GA, OPS, atau Pengiriman |
| GET, POST | `/api/export/*` | Superadmin | Metadata tabel, export XLSX aset/pengguna/tiket/data |
| POST | `/api/export/reset-database` | Superadmin | Reset database (dijaga `ENABLE_DB_RESET`) |
| GET | `/api/admin/database/status` | Superadmin | Status dan integritas skema |
| GET, POST, DELETE | `/api/admin/database/backups` | Superadmin | Buat, daftar, hapus, unduh backup |
| POST | `/api/admin/database/restore[/validate]` | Superadmin | Validasi lalu restore dump (upload maks. 500 MB) |
| GET | `/api/admin/database/audit-logs` | Superadmin | Audit trail backup/restore |
| GET | `/health` | Publik | Health check termasuk koneksi database |

Izin di atas memakai 13 kunci fitur (`dashboard`, `assets`, `assets_ga`, `assets_ops`, `my_assets`, `tickets`, `submissions`, `shipments`, `users`, `logs`, `karyawan`, `export`, `knowledge_base`), masing-masing dengan level `none`, `read_only`, atau `full`. Alias legacy tetap tersedia demi kompatibilitas, dan otorisasi selalu diperiksa ulang di backend.

## Import dan Export XLSX

Dua jaminan pada jalur XLSX:

1. File export bebas formula injection. Nilai berawalan `=`, `+`, `-`, atau `@` dinetralkan sebelum ditulis ke workbook, sehingga membuka hasil export di Excel tidak mengeksekusi formula apa pun.
2. Header dan nama sheet pada export identik dengan template import, sehingga file hasil export bisa diedit lalu langsung diimpor kembali.

| Halaman | Sheet | Identitas baris | Catatan |
| --- | --- | --- | --- |
| Karyawan | `Table Karyawan` | NIK | Impor karyawan lebih dulu agar relasi pemegang aset terbentuk |
| Aset IT | `Table Asset` | Kombinasi hostname/serial | Impor biasa hanya aset |
| Aset IT lengkap | `Table Karyawan` + `Table Asset` | NIK + hostname | Aktifkan opsi "Import lengkap" untuk impor awal dua sheet sekaligus |
| Aset GA | `Data Aset GA` | hostname | |
| Aset OPS | `Data Aset OPS` | hostname | |
| Pengiriman | `Data Pengiriman` | resi | Header template sama dengan export |

Modal import menyediakan dua mode. **Tambah Data** menyisipkan tanpa menyentuh data lama. **Replace All** menghapus data kategori target terlebih dahulu; konfirmasi dengan mengetik `GANTI`, dan validasi konfirmasi yang sama dijalankan ulang di server. Untuk Aset IT, Replace All menawarkan cakupan "Aset IT saja" atau "Aset IT dan Karyawan". Menghapus karyawan tidak pernah ikut menghapus akun `users`.

## Keamanan

Lapisan demi lapisan, sesuai implementasi di kode:

**Sesi.** JWT dipasangkan dengan tabel `user_sessions` sehingga token dapat dicabut, diperpanji (sliding), dan tidak pernah disimpan di localStorage. Cookie memakai flag HttpOnly.

**Otorisasi.** Tiga role global (`user`, `admin`, `superadmin`) ditambah izin granular 13 kunci fitur per pengguna. Setiap endpoint memeriksa ulang izin; frontend tidak pernah menjadi penentu.

**Rate limiting.** Tiga tingkat: global untuk semua `/api`, per-pengguna untuk klien terautentikasi, dan khusus endpoint auth. Bucket dibatasi jumlahnya untuk mencegah kebocoran memori, dan trafik SSE dikecualikan agar koneksi realtime tidak terputus oleh limiter.

**Perlindungan akun.** Percobaan login gagal dilacak per akun di `account_security_state` hingga terkunci sementara. Reset password memakai OTP yang disimpan sebagai hash dengan batas percobaan dan kedaluwarsa.

**Header dan transport.** CSP ketat, HSTS saat HTTPS, `X-Frame-Options: DENY`, `Permissions-Policy` yang menutup kamera/mikrofon/geolokasi, COOP dan CORP, serta header `Vary: Origin` untuk mencegah cache poisoning lintas origin. CORS memakai allowlist exact; konfigurasi wildcard membuat aplikasi gagal menyala.

**Validasi input.** Seluruh SQL parameterized; identifier dinamis (hanya di export) melewati `quoteAllowedIdentifier()`. Body non-JSON ditolak. Konten HTML disanitasi dengan DOMPurify di kedua sisi. File XLSX hasil export dinetralkan dari formula.

**Audit.** Tabel `system_audit_logs` mencatat modul, aksi, entitas, diff before/after, pelaku, IP, dan user-agent untuk aktivitas lintas modul. Login, backup/restore, tiket, dan aset memiliki jalur audit masing-masing.

**Infrastruktur.** Container aplikasi berjalan non-root tanpa kapabilitas tambahan, proxy tepercaya didefinisikan eksplisit lewat CIDR, dan CodeQL berjalan di CI.

Laporan audit keamanan lengkap tersedia di `docs/security-audit-2026-09-19.md` beserta arsip di `docs/audits/`.

## Pengujian

```bash
# dari root
npm run test:backend        # unit test backend  (node --test)
npm run test:frontend       # unit test frontend (node --test)
npm run test:e2e            # Playwright, termasuk persiapan database otomatis
npm run test:e2e:smoke      # hanya skenario ber-tag @smoke
npm run test:e2e:headed     # browser tampil
npm run test:e2e:ui         # Playwright UI mode
npm run test:e2e:report     # buka laporan HTML
```

Cakupan E2E terdiri atas 31 berkas spec di `e2e/tests/` yang mengelompokkan skenario alami: smoke, auth (login, logout, autentikasi), tiket (lifecycle, draft, undo, claim/unclaim, rating CASP, pencarian, izin), aset (CRUD, assignment, GA, OPS), submissions, dashboard, RBAC, keamanan (auth, authz, input), aksesibilitas (axe-core), error states, regresi halaman publik, view mode, dan QA extended.

Aturan yang ditegakkan Playwright: suite E2E hanya boleh dijalankan terhadap database lokal dengan host loopback dan nama berakhiran `_test`. Konfigurasi yang melanggar akan menggagalkan seluruh run sebelum test dimulai. Salin `.env.e2e.example` menjadi `.env.e2e` untuk menyiapkannya; jangan pernah mengarahkan E2E ke database lain.

## CI/CD

Tiga workflow GitHub Actions:

| Workflow | Pemicu | Isi |
| --- | --- | --- |
| `ci.yml` | push/PR ke `main`, `master`, `dev` | Backend: preflight sintaks dan unit test dengan service container PostgreSQL 16. Frontend: lint, unit test, build. |
| `e2e-tests.yml` | push/PR | Suite Playwright penuh dengan database test sekali pakai |
| `codeql.yml` | push/PR | Analisis keamanan statis |

## Perintah Lainnya

```bash
# root
npm run docs:manual:pdf     # membangun ulang manual pengguna (PDF)
npm run build:tokens        # membangun design tokens
npm run deploy:frontend     # skrip deploy frontend (scripts/deploy-frontend.sh)

# backend
cd backend
npm run db:migrate:plan     # tinjau rencana migrasi
npm run db:migrate:apply    # terapkan migrasi (wajib guard env)
npm run db:check            # verifikasi runtime schema
npm run check               # preflight sintaks server/app/config

# frontend
cd frontend
npm run lint                # oxlint + eslint
npm run lint:fix            # perbaikan otomatis
npm run format              # prettier write
```

## Dokumentasi Terkait

| Dokumen | Isi |
| --- | --- |
| `e2e/README.md` | Panduan menjalankan suite E2E Playwright dan aturan keamanannya |
| `docs/CONVENTIONS.md` | Konvensi kode, layout, aturan SQL, dan aturan state frontend |
| `docs/database-migration-adoption.md` | Runbook adopsi ledger migrasi untuk database lama |
| `docs/security-audit-2026-09-19.md` | Laporan audit keamanan |
| `docs/PRODUCTION_QA_REPORT.md` | Laporan QA pra-rilis |
| `docs/user-manual-source.html` | Sumber manual pengguna (dibangun menjadi PDF) |
| `docs/audits/`, `docs/qa/`, `docs/deploy/` | Arsip audit UI/UX, artefak QA, dan catatan deployment |

## Lisensi

Hak cipta © 2026 ESB TrackIT. Perangkat lunak internal; penggunaan dan distribusi di luar organisasi memerlukan izin tertulis.

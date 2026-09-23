# TrackIT

TrackIT adalah aplikasi web untuk pengelolaan aset IT, aset GA dan OPS, data karyawan, pengajuan, pengiriman, tiket helpdesk, serta Help Center berbasis Knowledge Base. Satu basis kode (monorepo) yang menaungi SPA Vue 3, REST API Express 5, dan basis data PostgreSQL 16.


TrackIT is a web-based asset and IT service management platform designed to help organizations manage IT assets, requests, approvals, inventory, and operational workflows from a centralized interface.

- [Ringkasan](#ringkasan)
- [Fitur](#fitur)
- [Arsitektur](#arsitektur)
- [Teknologi](#teknologi)
- [Struktur Direktori](#struktur-direktori)
- [Menjalankan Secara Lokal](#menjalankan-secara-lokal)
- [Deployment dengan Docker](#deployment-dengan-docker)
- [Image Docker dari GHCR](#image-docker-dari-ghcr)
- [Database dan Migrasi](#database-dan-migrasi)
- [Environment Variables](#environment-variables)
- [Skema Database](#skema-database)
- [API Reference](#api-reference)
- [Import dan Export XLSX](#import-dan-export-xlsx)
- [Keamanan](#keamanan)
- [Pengujian](#pengujian)
- [CI/CD](#cicd)
- [Panduan Deployment Production](#panduan-deployment-production)
- [Troubleshooting](#troubleshooting)
- [Perintah Lainnya](#perintah-lainnya)
- [Kontribusi](#kontribusi)
- [Dokumentasi Terkait](#dokumentasi-terkait)
- [Lisensi](#lisensi)

## Overview

TrackIT melayani tiga kelompok pengguna dengan kebutuhan berbeda:

1. **Employees** — view assigned assets, open helpdesk tickets, and read published Help Center articles.
2. **Operations teams (IT, GA, OPS)** — maintain per-domain asset inventories, process submissions and shipments, and work ticket queues.
3. **Administrators** — manage accounts and feature permissions, review audit logs, run XLSX exports, and perform database backup/restore from the admin UI.

Seluruh halaman manajemen berada di balik autentikasi. Hanya Help Center (artikel, FAQ, kategori) yang terbit publik, dan hanya konten berstatus `PUBLISHED` yang tampil.

Design constraints that shape the codebase:

- Backend layers are explicit: `routes → controllers → services → pg`, with parameterized SQL throughout.
- The server does not run DDL at startup; schema changes go through versioned migrations only.
- The backend is the source of truth for roles and permissions. Frontend permission checks only gate navigation.
- Realtime ticket updates use Server-Sent Events from an in-process event bus (single-instance deployment model).

### Helpdesk
- Tiket memiliki nomor unik, kategori, prioritas (`Low` hingga `Critical`), dan antrean per tim (IT, HR, GA). Antrean dapat dikelola adminnya masing-masing.
- Komentar mendukung lampiran; percakapan dan perubahan status terekam sebagai riwayat audit per tiket.
- Penanganan tiket mencakup claim, reassign, penyelesaian, dan pembatalan, dengan rating kepuasan CSAT 1–5 dari pelapor setelah tiket selesai.
- Pembaruan tiket masuk secara realtime melalui Server-Sent Events; koneksi SSE difilter per pengguna sesuai hak aksesnya.

### Help Center
- Artikel insiden (SOP) dan FAQ yang sudah dipublikasikan dapat dibaca publik tanpa login, lengkap dengan kategori, tingkat keparahan (`low/medium/high`), tag, dan pencarian.
- CMS admin menyediakan editor rich text (TipTap) dengan struktur baku per artikel.
- Pengguna terautentikasi dapat menyimpan bookmark artikel.

### Operasional dan Administrasi
- **Pengiriman** mencatat permintaan kirim barang atau aset, penerima, tujuan, nomor resi (AWB), status pelacakan, dan pembatalan.
- **Dashboard** merangkum tren aset, distribusi kondisi, komposisi tipe perangkat, dan tren CSAT dalam grafik (Chart.js).
- **Log aktivitas** dan **log audit login** terpusat pada `system_audit_logs`, termasuk nilai sebelum dan sesudah perubahan (before/after JSONB), pelaku, IP, dan user-agent.
- **Backup dan restore** dijalankan dari UI admin: `pg_dump` dengan checksum SHA-256, backup otomatis sebelum restore, retensi berdasarkan umur dan jumlah file, serta audit trail setiap operasi.
- **Export data** administratif ke XLSX untuk aset, pengguna, tiket, dan tabel lainnya, khusus superadmin.

### Request and Helpdesk Workflows

- Tickets with unique numbers, categories, priority levels, and per-team queues
- Claim, reassign, resolve, and cancel flows; comments with attachments
- Ticket history and status changes captured for audit
- CSAT rating (1–5) after completion
- Realtime updates over SSE (`GET /api/tickets/events`), filtered per user access
- Shipments module: recipients, destinations, AWB/tracking numbers, status progression, cancel
- Submissions module for asset requests with approval-style lifecycle

### Knowledge Base and Help Center

- Published incident articles (SOP-style), FAQs, and category/topic cards served publicly
- Severity tags, free-text search, and popular-search logging
- Rich-text CMS editor (TipTap) for authenticated editors with `knowledge_base` permission
- Per-user article bookmarks for signed-in users

### User Management and Access Control

- Session-based authentication with HttpOnly cookies (JWT paired with server-side sessions)
- Roles: `user`, `admin`, `superadmin`
- Per-feature permission keys (`none` / `read_only` / `full`) checked on every API request
- Password change, forgot-password OTP flow, and enrollment credentials that require OTP completion
- Employee master data and user provisioning from admin screens

### Reporting and Administration

- Dashboard charts: asset trends, condition distribution, device-type mix, CSAT trends (Chart.js)
- Activity and login audit trails (`system_audit_logs`, `log_audit_login`)
- Admin-initiated PostgreSQL backup and restore with SHA-256 checksums, retention limits, and backup audit log
- Superadmin-only XLSX exports for assets, users, tickets, and related tables
- Health endpoint (`GET /health`) including database connectivity

## Feature Matrix

| Area | Capability | Status |
| --- | --- | --- |
| Authentication | Session cookie + server-side session, OTP password reset | Available |
| Authorization | Global roles + 13 feature permission keys (RBAC) | Available |
| Assets | IT / GA / OPS inventories, assignment, history, labels | Available |
| Requests | Submissions workflow | Available |
| Helpdesk | Tickets, queues, comments, CSAT, SSE realtime | Available |
| Logistics | Shipments with tracking status | Available |
| Knowledge base | Public Help Center + authenticated CMS | Available |
| Import / Export | XLSX import and export with formula-injection guards | Available |
| Audit | System audit logs and login audit | Available |
| Backup | Admin UI backup / restore with checksums and retention | Available |
| Testing | Node unit tests (backend, frontend) | Available |
| Testing | Playwright E2E (Chromium, Firefox) | Available |
| Testing | axe-core accessibility suite | Available |
| CI | GitHub Actions (backend, frontend, dependencies, E2E) | Available |
| SAST | CodeQL (JavaScript/TypeScript) | Available |
| Containers | Docker Compose stack (PostgreSQL, migrate, backend, frontend) | Available |

## Architecture

Local development:

```text
Browser
   │
   ▼
Frontend (Vite dev server, :5173)
   │  proxies /api
   ▼
Backend API (Express, :3000)
   │
   ▼
PostgreSQL (:5432)
```

Docker Compose:

- Backend berlapis: `routes → controllers → services → pg`. Controller memvalidasi input, service yang memegang SQL, dan seluruh query memakai placeholder parameterized (`$1`).
- Server tidak pernah menjalankan DDL saat startup. Ia hanya memverifikasi bahwa runtime schema sesuai; perubahan skema hanya lewat migrasi versioned.
- Backend adalah sumber kebenaran untuk role dan izin. Pemeriksaan izin di frontend hanya mengatur navigasi, bukan keamanan.
- Realtime memakai EventEmitter in-process yang dirancang untuk deployment single-instance. Roadmap multi-instance telah didokumentasikan di `realtimeService.js` (opsi PostgreSQL `LISTEN/NOTIFY` atau Redis Pub/Sub).
- Frontend tidak memakai state library. State dikelola lewat composables, dan setiap panggilan HTTP melewati `useApi` yang menangani cookie sesi serta redirect 401 secara global.

Operational notes (VERIFIED from source and Compose):

- Same-origin deployment is the canonical production model: the reverse proxy serves the SPA and forwards `/api` to the backend.
- Access tokens are short-lived; the browser holds an HttpOnly session cookie. Tokens are not stored in `localStorage`.
- Application containers drop Linux capabilities and run with `no-new-privileges`.
- Realtime is an in-process EventEmitter intended for single-instance deployments.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | Vue 3.5, Vue Router, Vite, Tailwind CSS 4, TipTap (editor), Chart.js, GSAP, JsBarcode, Lucide, SheetJS (`xlsx`), DOMPurify |
| Backend | Node.js (ESM), Express 5, `pg`, `jsonwebtoken`, `bcryptjs`, `multer`, `nodemailer`, `isomorphic-dompurify` |
| Database | PostgreSQL 16 dengan migrasi versioned, view, dan trigger |
| Pengujian | Node test runner (unit), Playwright dengan axe-core (E2E), CodeQL (SAST) |
| Infrastruktur | Docker Compose, Nginx, GitHub Actions, GitHub Packages (GHCR) |
| Tooling | oxlint, ESLint, Prettier, nodemon, pipeline design tokens |

Node.js engines (from `backend/package.json` and `frontend/package.json`): `^22.18.0 || >=24.12.0`.

## Project Structure

```text
trackit/
├── backend/                        REST API Express (ESM)
│   ├── migrations/
│   │   ├── versioned/       Canonical migrations (only executed path)
│   │   └── 0xx_*.sql        Legacy reference files (do not run)
│   ├── src/
│   │   ├── config/                 env, koneksi DB, runner migrasi, verifikasi schema
│   │   ├── controllers/            Validasi input dan orkestrasi HTTP
│   │   ├── services/               Logika bisnis dan SQL (auth, backup, SSE, izin, dll.)
│   │   ├── middleware/             Auth, rate limit, security headers, error handler
│   │   ├── routes/                 Definisi endpoint dan alias legacy
│   │   ├── security/               Kebijakan CORS, session token
│   │   ├── errors/ · utils/ · assets/
│   │   ├── app.js                  CORS, security headers, rate limit, router
│   │   └── server.js               Bootstrap dan graceful shutdown
│   ├── Dockerfile                  Image API (context: ./backend)
│   └── tests/                      Unit test backend (node --test)
├── frontend/                       SPA Vue 3
│   ├── src/
│   │   ├── views/                  Halaman aplikasi (termasuk views/admin/)
│   │   ├── components/             UI kit, chart, tiket, cases, layout
│   │   ├── composables/            State management
│   │   ├── services/ · utils/ · config/ · styles/
│   │   └── router/index.js         Routing dan gating izin halaman
│   ├── Dockerfile                  Image Nginx SPA (context: ./frontend)
│   ├── nginx.conf                  SPA + reverse proxy /api + header keamanan
│   └── vite.config.js              Proxy API dan security headers untuk dev/preview
├── e2e/                            Playwright: tests/, pages/, fixtures/
├── scripts/                        Inisialisasi DB, QA automation, tokens, deploy
├── docs/                           Konvensi, keamanan, laporan QA, runbook, manual
├── design-tokens/                  Sumber design tokens (npm run build:tokens)
├── .github/workflows/              ci.yml, e2e-tests.yml, codeql.yml, docker-publish.yml
├── docker-compose.yml              postgres, migrate, backend, frontend
├── playwright.config.js            Validasi database test loopback *_test
└── package.json                    Skrip root: E2E, dokumen, tokens, deploy
```

## Requirements

- Node.js `^22.18.0` or `>=24.12.0`
- npm
- PostgreSQL 16 (local instance, or Docker Compose)
- Docker and Docker Compose (optional, for the full stack)
- Playwright browsers (for E2E): installed via `npx playwright install`

## Installation

```bash
git clone https://github.com/muhhlmy/esb-trackit.git
cd esb-trackit

# Root (Playwright and root scripts)
npm ci

# Backend
npm --prefix backend ci

# Frontend
npm --prefix frontend ci
```

Copy environment templates before configuring:

```bash
cp .env.example .env                 # Docker Compose / root
cp backend/.env.example backend/.env  # local backend
cp frontend/.env.example frontend/.env
cp .env.e2e.example .env.e2e          # E2E only
```

Fill required values in your **local** `.env` files. Never commit `.env`, `.env.e2e`, database dumps, or backup files.

## Configuration

| File | Purpose |
| --- | --- |
| `backend/.env.example` | API port, PostgreSQL, JWT secret, CORS, rate limits, SMTP, migration guards, backup paths |
| `frontend/.env.example` | Vite host/proxy settings (`VITE_API_BASE_URL` stays empty for same-origin cookies) |
| `.env.example` | Docker Compose inputs (DB password, JWT secret, migration guards, optional SMTP/seed) |
| `.env.e2e.example` | Playwright base URLs and disposable test accounts |

Rules enforced by the application (VERIFIED):

- `JWT_SECRET` is required at startup (minimum 32 characters) and has no source-code default.
- `DB_PASSWORD` is required at startup.
- `CORS_ORIGINS` must be an exact comma-separated allowlist; `*` fails startup.
- `TRUST_PROXY_CIDRS` accepts only explicit IP/CIDR values (empty if you are not behind a proxy).
- Frontend `VITE_*` values are public to the browser — never put backend secrets there.

Do not commit `.env` files, credentials, private keys, production configuration, or database dumps.

## Database Setup

TrackIT uses **PostgreSQL 16**. Schema changes are applied only from `backend/migrations/versioned/` via the migration runner (advisory lock, SHA-256 checksums, `app_schema_migrations` ledger).

Legacy `backend/migrations/0xx_*.sql` files are documentation archives — do not execute them.

### Migration commands (backend working directory)

```bash
npm run db:migrate:plan    # inspect pending migrations (no changes)
npm run db:migrate:apply   # apply migrations (guarded)
npm run db:check           # verify runtime schema expectations
```

`db:migrate:apply` refuses to run unless the guard environment is set, including at least:

| Variable | Role |
| --- | --- |
| `ALLOW_DB_MIGRATIONS` | Must be `true` (explicit intent) |
| `MIGRATION_MODE` | `fresh` or `existing` |
| `MIGRATION_EXPECTED_HOST` | Must match the target host exactly |
| `MIGRATION_EXPECTED_DATABASE` | Must match the target database exactly |
| `MIGRATION_RECOVERY_PROOF_ID` | Proof ID from a verified backup/restore |
| `MIGRATION_CHANGE_ID` | Change-request identifier (required in production) |
| `REQUIRE_NON_SUPERUSER` | Optional: require non-superuser DB owner |

For adopting an existing database onto the migration ledger, follow `docs/database-migration-adoption.md`.

Docker Compose runs a dedicated `migrate` one-shot service before the backend starts.

### E2E / test database

Playwright only accepts:

- `DB_HOST` in `localhost`, `127.0.0.1`, or `::1`
- `DB_NAME` matching `*_test`

Preparation is handled by `npm run test:e2e:prepare` (`scripts/initialize-test-database.mjs --seed-e2e`).

## Running Locally

### Database

Start PostgreSQL 16 on `localhost:5432` (local install or `docker compose up postgres`).

### Backend

```bash
npm --prefix backend run db:migrate:plan
npm --prefix backend run db:migrate:apply
npm --prefix backend run dev
```

Buat file `backend/.env` dengan isi minimal berikut. File ini tidak pernah masuk git.

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trackit
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
npm --prefix frontend run dev
```

- App: `http://localhost:5173`
- Vite proxies `/api` to `http://127.0.0.1:3000` (override with `VITE_API_PROXY_TARGET`)

### First account (non-production)

When database reset/seeding is enabled (`ENABLE_DB_RESET=true`), the backend can create an initial superadmin from `SEED_SUPERADMIN_NAME`, `SEED_SUPERADMIN_EMAIL`, and `SEED_SUPERADMIN_PASSWORD`. Use unique credentials per environment and never reuse production passwords in development.

## Testing

All commands below are defined in the repository `package.json` files.

```bash
npm run build     # vite build
npm run preview   # sajikan hasil build dengan security headers
```

E2E coverage (31 spec files under `e2e/tests/`): smoke, auth, tickets, assets, submissions, dashboard, RBAC, security (auth/authz/input), accessibility (axe-core), negative/error states, public regressions, view mode, and extended QA.

Unit suites include security-focused tests such as session lifecycle, brute-force lockout, rate limiting, CORS, security headers, IDOR authorization, XSS sanitizing, and export formula-injection guards.

See `e2e/README.md` for suite architecture and safety rules.

> This README does not claim a green test run for every environment. Verify with the commands above in CI or locally.

## Production Build

```bash
# Frontend
npm --prefix frontend run build     # vite build → frontend/dist
npm --prefix frontend run preview   # optional local preview

# Backend syntax preflight (used in CI)
npm --prefix backend run check

# Lint and format (frontend, used in CI)
npm --prefix frontend run lint
npm --prefix frontend run format:check
```

Optional root helpers:

```bash
npm run build:tokens        # build design tokens from design-tokens/
npm run docs:manual:pdf     # regenerate the user manual PDF
```

## Docker

Verified Compose services:

| Service | Role |
| --- | --- |
| `postgres` | PostgreSQL 16 Alpine with `pg_isready` healthcheck |
| `migrate` | One-shot job: applies versioned migrations, then exits |
| `backend` | Node 22 Alpine, non-root user, `postgresql-client` for backup/restore |
| `frontend` | Nginx: serves the SPA, proxies `/api` to the backend, SSE-friendly buffering |

```bash
cp .env.example .env
# Set at minimum: DB_PASSWORD, JWT_SECRET,
# MIGRATION_RECOVERY_PROOF_ID, MIGRATION_CHANGE_ID

docker compose up --build
```

Application UI: `http://localhost` (Compose publishes the frontend on port 80).

Notes:

## Image Docker dari GHCR

Setiap push ke `main` dan setiap tag `v*.*.*` mempublikasikan dua image ke GitHub Packages (GHCR) melalui workflow `docker-publish.yml`, lalu image ditandatangani dengan cosign:

```text
ghcr.io/<owner>/<repo>-backend:latest
ghcr.io/<owner>/<repo>-frontend:latest
```

Menarik image untuk deployment tanpa build lokal:

```bash
docker pull ghcr.io/<owner>/<repo>-backend:latest
docker pull ghcr.io/<owner>/<repo>-frontend:latest
```

Verifikasi signature cosign:

```bash
cosign verify \
  --certificate-identity-regexp '^https://github.com/<owner>/<repo>/\.github/workflows/' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  ghcr.io/<owner>/<repo>-backend:latest
```

Catatan:

- Pull request hanya membuild image tanpa push, sehingga CI tetap memvalidasi Dockerfile.
- Image `frontend` di-build dari context `./frontend`, image `backend` dari context `./backend`.
- Package pertama kali mungkin perlu di-set **public** (atau dikonfigurasi aksesnya) di tab *Packages* pada repository settings.

## Database dan Migrasi

## Security

High-level security model as implemented (no exploit-oriented detail):

| Area | Implementation |
| --- | --- |
| Authentication | HttpOnly session cookie; JWT validated against server-side sessions (revocable, sliding) |
| Authorization | Roles `user` / `admin` / `superadmin` plus 13 feature permission keys, enforced in API middleware |
| Password storage | bcrypt with configurable rounds (default 12, bounded 10–14); non-bcrypt hashes fail closed |
| Account protection | Login failure lockout state; OTP-based password reset with hashing, expiry, and attempt limits |
| Session hygiene | Short access-token TTL with server session as source of truth; logout revokes server-side |
| Rate limiting | Global API limiter, per-user authenticated limiter, dedicated auth endpoint limiter |
| SQL | Parameterized queries; dynamic export identifiers restricted through an allowlist helper |
| Input / output | JSON-only body policy for API mutations; DOMPurify sanitizing on client and server paths |
| Headers | CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP; HSTS when deployed behind TLS |
| CORS | Exact origin allowlist; wildcards rejected at startup |
| XLSX | Formula-injection neutralization on export; template-aligned import validation |
| Audit | Cross-module system audit (before/after JSONB, actor, IP, user-agent) plus login audit |
| Secrets | Required via environment with no insecure source defaults; `.env*` gitignored (examples only tracked) |
| Supply chain | Dependabot, `npm audit --audit-level=high` in CI, CycloneDX SBOM artifacts, CodeQL |
| Containers | Non-root backend, capability drop, `no-new-privileges` |

### Security disclosure

To report a vulnerability, open a private GitHub security advisory on this repository, or contact the maintainer through GitHub.

**Do not commit secrets, credentials, private keys, production configuration, or sensitive infrastructure information.**

- Keep real values only in local `.env` files (gitignored) or a secret manager
- Use GitHub repository secrets for CI/CD values that cannot be dummy data
- Rotate any credential that may have been exposed
- Never publish private keys or database dumps

## Environment Variables

Representative placeholders (always prefer the `.env.example` files as the source of truth):

```env
# backend/.env
NODE_ENV=development
HOST=127.0.0.1
PORT=3000
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=<database-name>
DB_USER=<database-user>
DB_PASSWORD=<set-in-environment>

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `CORS_ORIGINS` | origin dev lokal | Daftar origin exact dipisah koma; nilai `*` menyebabkan startup gagal |
| `TRUST_PROXY_CIDRS` | kosong (compose: `172.28.0.0/16`) | IP/CIDR proxy tepercaya, exact, dipisah koma |
| `EMAIL_ENABLED` | `false` | Mengaktifkan pengiriman email (aktivasi akun, reset password) |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` `EMAIL_FROM` | kosong | Konfigurasi SMTP |
| `FRONTEND_URL` | `http://localhost` | Origin frontend untuk tautan dalam email |

CORS_ORIGINS=http://localhost:5173
TRUST_PROXY_CIDRS=

EMAIL_ENABLED=false
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=<sender@example.com>

### Root dan Docker Compose

`.env.example` di root memuat variabel tambahan untuk compose: kredensial database, guard migrasi (`MIGRATION_*`), seed superadmin, kredensial QA (`QA_SUPERADMIN_EMAIL`, `QA_SUPERADMIN_PASSWORD` untuk skrip QA di `scripts/qa/`), dan konfigurasi SMTP. Kredensial QA hanya untuk environment test.

File `.env`, `.env.e2e`, folder `backend/storage/backups/`, dan berkas `*.dump` semuanya gitignored. Jangan pernah menyimpan kredensial production di repository.

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

- Status enum ditegakkan lewat `CHECK` constraint, bukan hanya di aplikasi.
- Trigger `auto_update_timestamp()` memelihara kolom `updated_at` pada tabel utama.
- Trigger `prevent_hard_delete()` melindungi `users`, `aset_ti`, dan `tickets`. DELETE langsung akan gagal; penghapusan harus lewat soft delete (`deleted_at`).
- Foreign key memakai strategi hapus yang disengaja: `SET NULL` untuk referensi opsional, `RESTRICT` untuk data yang tidak boleh hilang, `CASCADE` untuk data turunan.
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
| `/api/tickets` | Izin `tickets` | CRUD tiket, komentar, lampiran, claim/reassign, riwayat, CSAT, statistik. `GET /events` = SSE |
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

1. File export bebas formula injection. Nilai berawalan `=`, `+`, `-`, atau `@` dinetralkan sebelum ditulis ke workbook.
2. Header dan nama sheet pada export identik dengan template import, sehingga file hasil export bisa diedit lalu langsung diimpor kembali.

| Halaman | Sheet | Identitas baris | Catatan |
| --- | --- | --- | --- |
| Karyawan | `Table Karyawan` | NIK | Impor karyawan lebih dulu agar relasi pemegang aset terbentuk |
| Aset IT | `Table Asset` | Kombinasi hostname/serial | Impor biasa hanya aset |
| Aset IT lengkap | `Table Karyawan` + `Table Asset` | NIK + hostname | Aktifkan opsi "Import lengkap" untuk impor awal dua sheet sekaligus |
| Aset GA | `Data Aset GA` | hostname | |
| Aset OPS | `Data Aset OPS` | hostname | |
| Pengiriman | `Data Pengiriman` | resi | Header template sama dengan export |

Modal import menyediakan dua mode. **Tambah Data** menyisipkan tanpa menyentuh data lama. **Replace All** menghapus data kategori target terlebih dahulu; konfirmasi dengan mengetik `GANTI`, dan validasi konfirmasi yang sama dijalankan ulang di server.

## Keamanan

**Sesi.** JWT 15 menit dipasangkan dengan tabel `user_sessions` sehingga token dapat dicabut, diperpanji (sliding), dan tidak pernah disimpan di localStorage. Cookie `trackit_session` memakai flag HttpOnly dan SameSite=Lax; Secure diaktifkan di production.

**Otorisasi.** Tiga role global (`user`, `admin`, `superadmin`) ditambah izin granular 13 kunci fitur per pengguna. Setiap endpoint memeriksa ulang izin; frontend tidak pernah menjadi penentu.

**Rate limiting.** Tiga tingkat: global untuk semua `/api`, per-pengguna untuk klien terautentikasi, dan khusus endpoint auth. Trafik SSE dikecualikan agar koneksi realtime tidak terputus oleh limiter.

**Perlindungan akun.** Percobaan login gagal dilacak per akun di `account_security_state` hingga terkunci sementara. Reset password memakai OTP yang disimpan sebagai hash dengan batas percobaan dan kedaluwarsa.

**Header dan transport.** CSP ketat, HSTS saat HTTPS, `X-Frame-Options: DENY`, `Permissions-Policy` yang menutup kamera/mikrofon/geolokasi, COOP dan CORP, serta header `Vary: Origin`. CORS memakai allowlist exact; konfigurasi wildcard membuat aplikasi gagal menyala.

**Validasi input.** Seluruh SQL parameterized; identifier dinamis (hanya di export) melewati `quoteAllowedIdentifier()`. Body non-JSON ditolak. Konten HTML disanitasi dengan DOMPurify di kedua sisi. File XLSX hasil export dinetralkan dari formula.

**Audit.** Tabel `system_audit_logs` mencatat modul, aksi, entitas, diff before/after, pelaku, IP, dan user-agent untuk aktivitas lintas modul. Login, backup/restore, tiket, dan aset memiliki jalur audit masing-masing.

**Infrastruktur.** Container aplikasi berjalan non-root tanpa kapabilitas tambahan (`no-new-privileges`, `cap_drop: ALL`), proxy tepercaya didefinisikan eksplisit lewat CIDR, CodeQL berjalan di CI, dan image Docker dipublikasikan bertanda tangan cosign.

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

Cakupan E2E terdiri atas 31 berkas spec di `e2e/tests/` yang mengelompokkan skenario alami: smoke, auth, tiket, aset (IT/GA/OPS), submissions, dashboard, RBAC, keamanan, aksesibilitas (axe-core), error states, regresi halaman publik, view mode, dan QA extended.

Aturan yang ditegakkan Playwright: suite E2E hanya boleh dijalankan terhadap database lokal dengan host loopback dan nama berakhiran `_test`. Konfigurasi yang melanggar akan menggagalkan seluruh run sebelum test dimulai. Salin `.env.e2e.example` menjadi `.env.e2e` untuk menyiapkannya; jangan pernah mengarahkan E2E ke database lain.

## CI/CD

Empat workflow GitHub Actions:

| Workflow | Pemicu | Isi |
| --- | --- | --- |
| `ci.yml` | push/PR ke `main`, `master`, `dev` | Backend: preflight sintaks dan unit test dengan service container PostgreSQL 16. Frontend: lint, unit test, build. |
| `e2e-tests.yml` | push/PR | Suite Playwright penuh dengan database test sekali pakai |
| `codeql.yml` | push/PR | Analisis keamanan statis |
| `docker-publish.yml` | push `main`, tag `v*.*.*`, jadwal harian | Build dan push image `backend` + `frontend` ke GHCR, signing cosign (PR: build saja) |

Rekomendasi governance repository: lindungi branch `main` dengan required PR, minimal satu approval, required status checks (CI, E2E, CodeQL), nonaktifkan force push, dan pin action ke commit SHA.

## Panduan Deployment Production

Checklist minimum sebelum go-live:

1. **HTTPS**: terminate TLS di reverse proxy, redirect HTTP → HTTPS, aktifkan HSTS. Gunakan certificate yang valid (mis. Let's Encrypt).
2. **Secrets**: set `JWT_SECRET` acak ≥32 karakter, `DB_PASSWORD` kuat, dan simpan keduanya di secret manager atau file `.env` mode `600` di luar repository. Rotasi berkala.
3. **Trusted proxy**: set `TRUST_PROXY_CIDRS` ke CIDR reverse proxy yang sebenarnya. Jangan pernah `*` atau `0.0.0.0/0`.
4. **CORS**: set `CORS_ORIGINS` ke origin production secara exact.
5. **Database**: backup terjadwal + uji restore berkala; database tidak pernah exposed ke host publik.
6. **Migrasi**: setiap perubahan skema lewat `db:migrate:apply` dengan guard env lengkap (`MIGRATION_RECOVERY_PROOF_ID`, `MIGRATION_CHANGE_ID`) setelah backup terverifikasi.
7. **Monitoring**: pantau `/health`, log aplikasi, dan disk usage untuk volume backup.
8. **Rollback**: simpan image GHCR per tag versi; rollback = jalankan tag sebelumnya + restore backup terverifikasi.
9. **Email**: bila `EMAIL_ENABLED=true`, gunakan kredensial SMTP dari secret, bukan dari repository.
10. **Update**: patch container image dan dependency secara berkala (`npm audit`, rebuild image).

## Troubleshooting

| Gejala | Penyebab umum | Tindakan |
| --- | --- | --- |
| Backend gagal start: `JWT_SECRET` invalid | Secret kosong/pendek | Isi ≥32 karakter acak di `backend/.env` |
| `db:migrate:apply` menolak jalan | Guard env belum lengkap | Set `ALLOW_DB_MIGRATIONS=true`, `MIGRATION_MODE`, `MIGRATION_EXPECTED_HOST/DATABASE`, proof/change ID |
| `Runtime schema belum siap` saat startup | Skema DB tidak cocok dengan versi migrasi | Jalankan `npm run db:migrate:apply`, lalu `npm run db:check` |
| Login 401 padahal kredensial benar | Cookie tidak terkirim (Secure di HTTP, path salah) | Akses via HTTPS di production; cek `SESSION_COOKIE_PATH` |
| Rate limit kena saat development | Global limiter aktif untuk semua `/api` | Restarts reset bucket; turunkan trafik atau sesuaikan env limiter |
| E2E menolak jalan | Database target tidak loopback / tidak berakhiran `_test` | Perbaiki `.env.e2e`; pelanggaran memang sengaja digagalkan |
| SSE tidak update | Proxy mem-buffer response | Pastikan `proxy_buffering off` untuk rute `/api` (sudah di `frontend/nginx.conf`) |

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

## Kontribusi

1. Fork atau buat branch dari `main`.
2. Pastikan `npm run lint`, `npm run test:backend`, `npm run test:frontend`, dan `npm run build` lulus sebelum membuka PR.
3. Untuk perubahan skema, tambahkan file migrasi versioned baru — jangan mengubah file migrasi yang sudah ada.
4. Jangan pernah commit file `.env`, kredensial, dump database, atau kunci privat. Scanner secret berjalan di history.
5. PR di-review sebelum merge; branch `main` sebaiknya dilindungi dengan required checks.

## Dokumentasi Terkait

## API Overview

Base path: `/api`. JSON in/out. Mutating requests must send `Content-Type: application/json`. Authentication uses the session cookie established at login.

| Area | Prefix | Access |
| --- | --- | --- |
| Authentication | `/api/auth/*` | Public login/reset (rate-limited); session for the rest |
| Health | `/health` | Public |
| IT assets | `/api/assets` | Feature permission `assets` |
| GA assets | `/api/ga-assets` (+ aliases) | Permission `assets_ga` |
| OPS assets | `/api/ops-assets` (+ aliases) | Permission `assets_ops` |
| Tickets and queues | `/api/tickets`, `/api/ticket-queues` | Permission `tickets` (SSE: `GET /api/tickets/events`) |
| Submissions | `/api/submissions` | Permission `submissions` |
| Shipments | `/api/shipments` (+ alias) | Permission `shipments` |
| Help Center content | `/api/cases/public`, `/api/faqs/public`, `/api/kb-categories/public` | Public, published only |
| CMS content | `/api/cases`, `/api/faqs`, `/api/kb-categories` | Permission `knowledge_base` |
| Bookmarks | `/api/case-bookmarks` | Authenticated session |
| Employees | `/api/employees` (+ legacy alias) | Admin+ |
| Users | `/api/users` | Admin+ |
| Activity logs | `/api/logs` | Admin+ |
| Excel import | `/api/import/*` | Admin+ |
| Export | `/api/export/*` | Superadmin |
| Backup / restore | `/api/admin/database/*` | Superadmin |

Legacy path aliases remain for compatibility; authorization is always re-checked on the server. There is no OpenAPI document in this repository.

## Development Workflow

1. Clone the repository and install dependencies (`npm ci` per package).
2. Copy `.env.example` templates; set local secrets only in gitignored files.
3. Start PostgreSQL 16.
4. Run `npm run db:migrate:plan`, then `npm run db:migrate:apply` with guards set.
5. Start backend (`npm --prefix backend run dev`) and frontend (`npm --prefix frontend run dev`).
6. Run unit tests (`npm run test:backend`, `npm run test:frontend`).
7. Run E2E when needed (`cp .env.e2e.example .env.e2e`, then `npm run test:e2e`).
8. Run lint/format checks (`npm --prefix frontend run lint`, `npm --prefix frontend run format:check`).
9. Open a pull request against `main` and wait for required checks.

## CI and Quality Checks

| Workflow | Purpose |
| --- | --- |
| `e2e/README.md` | Panduan menjalankan suite E2E Playwright dan aturan keamanannya |
| `docs/CONVENTIONS.md` | Konvensi kode, layout, aturan SQL, dan aturan state frontend |
| `docs/database-migration-adoption.md` | Runbook adopsi ledger migrasi untuk database lama |
| `docs/PRODUCTION_QA_REPORT.md` | Laporan QA pra-rilis |
| `docs/user-manual-source.html` | Sumber manual pengguna (dibangun menjadi PDF) |
| `docs/audits/`, `docs/qa/`, `docs/deploy/` | Arsip audit UI/UX, artefak QA, dan contoh konfigurasi deployment |

Repository automation also includes a pull request template and CODEOWNERS for review routing.

Dirilis di bawah lisensi ISC (lihat kolom `license` pada `package.json`). Tambahkan file `LICENSE` bila Anda memerlukan lisensi lain untuk distribusi Anda.

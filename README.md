# ESB TrackIT

Platform internal untuk manajemen aset IT, GA, OPS, data karyawan, pengiriman, helpdesk, dan Help Center.

## Modul

- Aset IT: perangkat, pemegang, kondisi, status, riwayat pemakaian, dan audit aset.
- Aset GA dan OPS: inventaris kategori terpisah.
- Karyawan dan pengguna: data karyawan, hierarki atasan, hak akses, dan sinkronisasi akun saat import.
- Pengiriman: request, penerima, tujuan, resi, status, dan bukti pengiriman.
- Tiket: antrean bantuan, komentar, lampiran, SLA, CASP, dan pembaruan SSE.
- Help Center: Knowledge Base, kategori, FAQ, bookmark, dan CMS.
- Admin: log aktivitas, export, backup, restore, dan pemeriksaan database.

## Stack

| Area | Teknologi |
| --- | --- |
| Frontend | Vue 3, Vue Router, Vite, Tailwind CSS 4, SheetJS (`xlsx`) |
| Backend | Node.js ESM, Express 5, PostgreSQL, `pg` |
| Keamanan | JWT dengan sesi server-side, RBAC, validasi whitelist, CORS allowlist, rate limit, proteksi origin/CSRF |
| Test | Node test runner dan Playwright |

## Struktur

```text
esb-trackit/
├── backend/                    # Express API, migrasi, test
│   ├── migrations/versioned/    # Migrasi PostgreSQL kanonik
│   └── src/
├── frontend/                   # Vue SPA
├── e2e/                         # Playwright test
├── docs/                        # Dokumentasi teknis
├── esb-trackit.sql              # Dump schema PostgreSQL tanpa data
├── package.json                 # Perintah E2E root
└── README.md
```

## Database

`esb-trackit.sql` adalah dump schema PostgreSQL dari database proyek saat ini.

- Berisi tabel, sequence, constraint, foreign key, dan index.
- Tidak berisi data, owner, privilege, password, token, API key, atau connection string.
- Gunakan untuk membuat database kosong bila diperlukan:

```bash
createdb esb_trackit
psql -d esb_trackit -f esb-trackit.sql
```

Untuk skema production atau database existing, gunakan migrasi versioned. Jangan mencampur import dump dan penerapan migrasi pada database yang sama tanpa runbook adopsi migrasi.

```bash
cd backend
npm run db:migrate:plan
npm run db:migrate:apply
npm run db:check
```

Migrasi butuh guard environment, termasuk `MIGRATION_MODE`, target database, recovery proof, dan change ID. Lihat `docs/database-migration-adoption.md` bila database sudah ada tanpa ledger migrasi.

## Konfigurasi backend

Node.js harus sesuai `engines`: `^22.18.0 || >=24.12.0`. PostgreSQL diperlukan.

```bash
cd backend
npm install
```

Buat `backend/.env`. Jangan commit file ini.

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=esb_trackit
DB_USER=postgres
DB_PASSWORD=[REDACTED]
JWT_SECRET=[REDACTED]
DEFAULT_USER_PASSWORD=[REDACTED]
```

`JWT_SECRET` minimal 32 karakter. `DEFAULT_USER_PASSWORD` minimal 8 karakter.

Jalankan API:

```bash
cd backend
npm run dev
# atau
npm start
```

Server tidak menjalankan DDL saat startup. Server hanya memverifikasi runtime schema.

## Konfigurasi frontend

```bash
cd frontend
npm install
npm run dev
```

Vite berjalan pada `http://localhost:5173` dan proxy API mengarah ke backend lokal.

Build production:

```bash
cd frontend
npm run build
npm run preview
```

## Import dan Export XLSX

Export memakai XLSX dan aman dari formula spreadsheet. Nilai yang mulai dengan `=`, `+`, `-`, atau `@` dinetralkan sebelum ditulis ke workbook.

Header dan sheet Export disamakan dengan template Import agar file Export dapat diedit lalu digunakan sebagai sumber Import.

| Halaman | Sheet Import/Export | Catatan |
| --- | --- | --- |
| Karyawan | `Table Karyawan` | Template halaman Karyawan hanya berisi data karyawan. Identitas: NIK. |
| Aset IT | `Table Asset` | Import biasa hanya aset. Import Karyawan dulu untuk menghubungkan `NIK Pemegang`. |
| Aset IT lengkap | `Table Karyawan` + `Table Asset` | Aktifkan `Import lengkap: Karyawan + Aset IT` untuk import awal dua sheet. |
| Aset GA | `Data Aset GA` | Identitas: hostname. |
| Aset OPS | `Data Aset OPS` | Identitas: hostname. |
| Pengiriman | `Data Pengiriman` | Header template dan Export sama. |

Setiap modal Import menyediakan:

- `Tambah Data`: tidak menghapus data lama.
- `Replace All`: menghapus data kategori target lalu memasukkan file.
- Konfirmasi `Replace All`: ketik `GANTI`; validasi juga dilakukan server-side.

Untuk Aset IT, `Replace All` menawarkan scope:

- `Aset IT saja`
- `Aset IT dan Karyawan`

Hapus Karyawan tidak menghapus akun `users`.

## API utama

| Endpoint | Akses | Fungsi |
| --- | --- | --- |
| `/api/auth/*` | Public/JWT | Login, logout, profil, dan reset password |
| `/api/assets` | JWT | Aset IT |
| `/api/ga-assets` | JWT | Aset GA |
| `/api/ops-assets` | JWT | Aset OPS |
| `/api/employees` | JWT | Karyawan |
| `/api/shipments` | JWT | Pengiriman |
| `/api/tickets` | JWT | Tiket, komentar, CASP, dan SSE |
| `/api/import/excel` | JWT write | Import Karyawan dan/atau Aset IT |
| `/api/import/excel-assets` | JWT write | Import Aset GA atau OPS |
| `/api/export/*` | Superadmin | Export administratif |
| `/health` | Public | Health check |

Alias legacy endpoint tetap tersedia untuk kompatibilitas. Akses akhir selalu diperiksa backend, bukan hanya router frontend.

## Perintah

```bash
# Root
npm run test:backend
npm run test:frontend
npm run test:e2e
npm run test:e2e:smoke
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:report

# Backend
cd backend
npm test
npm run check
npm run db:check

# Frontend
cd frontend
npm run build
npm run lint
npm run format:check
```

Untuk E2E, salin `.env.e2e.example` menjadi `.env.e2e`, lalu isi konfigurasi environment test secara lokal. Jangan simpan credential dalam repository.

## Lisensi

Hak Cipta © 2026 ESB TrackIT.
# E2E Test Automation Suite

Panduan menjalankan suite End-to-End Playwright untuk ESB TrackIT. Suite ini menguji journey pengguna secara nyata melintasi seluruh layer aplikasi, dari browser hingga database. Untuk gambaran umum project, kembali ke [README utama](../README.md).

## Arsitektur Pengujian

```text
Playwright (browser automation)
   ↓
Vue 3 + Vite Frontend        http://localhost:5173
   ↓
Express 5 REST API           http://localhost:3000
   ↓
PostgreSQL 16 (database test berakhiran _test)
```

## Struktur Direktori

```text
e2e/
├── global-setup.js            Login per role via UI, simpan storageState JSON, gagal cepat bila auth kosong
├── auth/                      storageState JSON per role (superadmin.json, admin.json, user.json)
│                              Dibuat ulang oleh global-setup pada setiap run
├── fixtures/
│   ├── auth.fixture.js        Fixture superAdminPage, adminPage, userPage
│   ├── test-data.js           Generator data unik (prefix E2E-AUTO, E2E-AST, E2E-TCK, E2E-EMP)
│   └── users.js               Definisi akun test; kredensial dibaca dari env E2E_*
├── helpers/
│   ├── api.js                 Helper API untuk precondition test
│   ├── cleanup.js             Hapus data test berawalan E2E- via API (tanpa SQL massal)
│   └── monitor.js             Pantau console/pageerror/requestfailed, pisahkan noise dari error aplikasi
├── pages/
│   └── TicketListPage.js      Page Object Model untuk halaman tiket
├── tests/                     31 spec dalam 13 grup (lihat rincian di bawah)
└── README.md
```

Rincian grup test di `tests/`:

| Grup | Cakupan |
| --- | --- |
| `smoke/` | Alur inti aplikasi, ber-tag `@smoke` |
| `auth/` | Login (`@smoke`), logout dan guard route, invalid session dan token kedaluwarsa |
| `tickets/` | Buat tiket (`@smoke`), lifecycle, draft, undo, claim/unclaim, rating CASP, pencarian, izin |
| `assets/` | List (`@smoke`), create (`@smoke`), edit, assignment, delete, aset GA, aset OPS |
| `submissions/` | CRUD pengajuan aset |
| `dashboard/` | KPI cards, chart, navigasi (`@smoke`) |
| `rbac/` | Pembagian akses user, admin, dan superadmin |
| `security/` | Autentikasi, otorisasi, dan handling input |
| `accessibility/` | Audit axe-core |
| `negative/` | Penanganan error, duplikat input, error states |
| `public/` | Regresi halaman publik Help Center |
| `viewmode/` | Toggle mode tampilan |
| `qa-extended/` | Skenario QA tambahan |

## Prasyarat

- Node.js `^22.18.0` atau `>=24.12.0`, sesuai kolom `engines` pada `package.json`.
- PostgreSQL 16 berjalan di lokal, dengan satu database kosong khusus pengujian yang namanya berakhiran `_test` (contoh `esb_trackit_test`).

Salin konfigurasi lalu isikan kredensial akun test:

```bash
cp .env.e2e.example .env.e2e
```

Variabel yang dibutuhkan `fixtures/users.js`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=esb_trackit_test
DB_USER=<user-postgres-lokal>
DB_PASSWORD=<password-postgres-lokal>

E2E_SUPERADMIN_EMAIL=<akun-superadmin-test>
E2E_SUPERADMIN_PASSWORD=<password-superadmin-test>
E2E_ADMIN_EMAIL=<akun-admin-test>
E2E_ADMIN_PASSWORD=<password-admin-test>
E2E_USER_EMAIL=<akun-user-test>
E2E_USER_PASSWORD=<password-user-test>
```

Kredensial di atas harus milik akun yang di-seed pada database test oleh `scripts/initialize-test-database.mjs`, bukan akun produksi. Playwright menolak konfigurasi yang host-nya bukan loopback atau nama database-nya tidak berakhiran `_test`; seluruh run gagal sebelum test pertama dijalankan.

Siapkan migrasi dan akun fixture secara idempotent:

```bash
npm run test:e2e:prepare
```

Perintah `test:e2e`, `test:e2e:smoke`, `test:e2e:headed`, dan `test:e2e:ui` menjalankan langkah persiapan ini secara otomatis.

## Cara Menjalankan

Pasang browser Playwright sekali di awal:

```bash
npx playwright install chromium
```

| Perintah | Fungsi |
| --- | --- |
| `npm run test:e2e:smoke` | Hanya skenario `@smoke`; cocok untuk umpan balik cepat |
| `npm run test:e2e` | Seluruh regresi (31 spec) |
| `npm run test:e2e:headed` | Browser tampil, interaksi terlihat |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run test:e2e:report` | Buka laporan HTML hasil run terakhir |

Sebelum test pertama, `global-setup.js` melakukan login via UI untuk ketiga role (`superadmin`, `admin`, `user`), menyimpan sesi sebagai storageState JSON di `e2e/auth/`, dan memverifikasi cookie `esb_session` HttpOnly benar-benar ada. Bila login salah satu role gagal, seluruh run dihentikan agar test tidak berjalan dengan state auth kosong.

## Strategi Data Test dan Aturan Keamanan

1. E2E tidak boleh menyentuh database selain database test lokal berakhiran `_test`. Aturan ini ditegakkan oleh `playwright.config.js`, bukan sekadar kesepakatan.
2. Setiap data yang dibuat test memakai prefix unik dari `fixtures/test-data.js`: `E2E-AUTO-<timestamp>-<rand>` secara umum, atau prefix per modul seperti `E2E-AST` untuk aset, `E2E-TCK` untuk tiket, dan `E2E-EMP` untuk karyawan.
3. `helpers/cleanup.js` menghapus data sisa test melalui API dengan filter prefix `E2E-` pada hostname, serial number, atau catatan. Tidak ada pernyataan `DELETE` massal terhadap tabel.
4. Bila perlu menambah generator data, ikuti pola yang sama: prefix `E2E-*` agar cleanup mengenalinya.

## Konfigurasi Playwright

Pengaturan penting di `playwright.config.js`:

| Pengaturan | Lokal | CI |
| --- | --- | --- |
| Workers | 4 | 2 |
| Retries | 0 | 2 |
| Trace | `on-first-retry` | `on-first-retry` |
| Screenshot | `only-on-failure` | `only-on-failure` |
| Video | `retain-on-failure` | `retain-on-failure` |

Timeout assertion sengaja diperlonggar dari bawaan 5 detik karena login memakai bcrypt plus query database dan bisa melewati 5 detik pada mesin dengan banyak worker paralel.

## Integrasi GitHub Actions

Workflow `.github/workflows/e2e-tests.yml`:

| Pemicu | Yang dijalankan |
| --- | --- |
| Pull request ke `main` | Smoke suite (`--grep @smoke`) dan audit aksesibilitas axe-core (`e2e/tests/accessibility/`) |
| Push ke `main` | Seluruh regression suite |

Database test disiapkan di CI oleh `scripts/initialize-test-database.mjs --seed-e2e` dengan service container PostgreSQL 16. Artefak yang diunggah: `playwright-report/` (selalu, retensi 14 hari) dan `test-results/` berisi trace, screenshot, dan video saat failure.

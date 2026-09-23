# Final Audit Report — TrackIT (muhhlmy/esb-trackit)

Tanggal: 2026-09-23 · Executor: Buffy (Freebuff) · Mode: audit + safe-fix langsung di working directory, dengan persetujuan owner untuk: full branding normalization, sanitize docs in place, delete duplicate workflows.

## Ringkasan Eksekutif

Audit external claim → verifikasi lokal → eksekusi fix. Dari 20+ klaim audit masuk, **sebagian terkonfirmasi, sebagian sudah tidak valid** (sudah diperbaiki sebelumnya). Semua P0/P1 yang actionable telah dieksekusi kecuali Git history rewrite (butuh keputusan owner, berisiko, dan force push).

### Status klaim audit eksternal

| Klaim eksternal | Hasil verifikasi |
| --- | --- |
| Vite preview middleware bug (P2) | **SUDAH DIPERBAIKI** — `frontend/vite.config.js:67` sudah `applyHeaders(FRONTEND_SECURITY_HEADERS)`. Tidak ada perubahan diperlukan |
| `TRUST_PROXY_CIDRS` kosong di compose | **TIDAK VALID** — sudah terisi default `172.28.0.0/16` yang cocok dengan subnet compose (`docker-compose.yml:123`). Tetap di-dokumentasikan agar disesuaikan bila proxy eksternal |
| Duplikasi GitHub Actions | **TERKONFIRMASI** — 6 workflows, 2 pasangan duplikat; `docker-image.yml` build root `Dockerfile` yang tidak ada (selalu gagal) |
| Info disclosure di docs | **TERKONFIRMASI** — IP LAN/public, domain, username, port VPN/SSH, cert path di 4+ file docs |
| Branding ESB di README & app | **TERKONFIRMASI** — tersebar di 40+ file |
| `esb_session` cookie | **TERKONFIRMASI** — 13+ referensi |
| Git history secrets | **PARSIAL** — lihat credential-audit.md; tidak ada production secret aktif, ada dump PII |

## P0 — Dieksekusi

1. **Full Git history secret scan** (gitleaks v8.21.2, 247 commits): 10 findings → 3 commit unik, diklasifikasi manual: 1 Supabase anon key legacy (inherently public), 6 token E2E/QA **expired**, 3 string api-key-like QA. **Tidak ada production credential.** Detail: `reports/credential-audit.md`.
2. **Working tree + ignored files scan**: 29 findings, **semua untracked/ignored** (`private.key`, certs, `.env.e2e`, backups, `NetSendo/`). `git ls-files` membuktikan tidak ada yang tracked.
3. **Sanitasi docs**: `docs/security-audit-2026-09-19.md`, `docs/ui-ux-baseline.md`, `docs/qa/*`, `docs/prompts/*`, `docs/presentation/*`, `docs/user-manual-source.html` — semua IP real → documentation IPs (203.0.113.x / 10.10.8.x), `trackit.esb.co.id` → `trackit.example.com`, `esb-admin` → `deploy-user`, `/etc/letsencrypt/live/trackit.esb.co.id` → contoh generik. Verifikasi ulang: residual scan bersih.
4. **GitHub Actions dibersihkan**: hapus `node.js.yml` (duplikat ci.yml, matrix Node 18/20 di luar engines) dan `docker-image.yml` (build Dockerfile root yang tidak ada → selalu gagal). Sisa: `ci.yml`, `e2e-tests.yml`, `codeql.yml`, `docker-publish.yml`, + baru `secret-scanning.yml`.

## P1 — Dieksekusi

5. **README di-rewrite total**: `# TrackIT`, deskripsi generik, arsitektur, stack, struktur, local dev, Docker, **bagian baru "Image Docker dari GHCR"**, migrasi, env vars, API reference, keamanan, testing, CI/CD, **panduan deployment production + troubleshooting + kontribusi**. Tanpa ESB/company/infrastruktur nyata. Badge GitHub Actions dihapus (menyertakan nama repo lama).
6. **Full branding normalization** (opsi yang dipilih owner):
   - `esb_session` → `trackit_session` (backend + tests + e2e; semua konsumen dari satu konstanta `SESSION_COOKIE_NAME`)
   - `esb_trackit` → `trackit` di semua `.env.example` + compose default + runtimeSchema (kini dari `process.env.DB_NAME`)
   - Container names `esb-*` → `trackit-*`
   - `frontend/index.html`: title + application-name + favicon/apple-touch-icon → `/logo.svg`, `/logo.png`
   - File logo di-rename via `git mv` (esb-logo-only.svg/png → logo.svg/png, esb-logo.svg → logo-full.svg, esb_logo_only.png → logo.png)
   - CSS/tailwind/design-tokens: `--color-esb-*` → `--color-brand-*`, `--gradient-esb-*` → `--gradient-brand-*`, key Tailwind `esb-*` → `brand-*`, key tokens `esb-blue` → `brand-blue`, dst.
   - Email templates: header/footer/konten tanpa "ESB TrackIT", "PT Esensi Solusi Buana", "People Technology"; `EMAIL_FROM` default → `"TrackIT" <no-reply@trackit.local>`; CID `esbLogoOnly` → `trackitLogo`
   - Backup filename prefix `esb_trackit_` → `trackit_`; tmpdir restore `esb-trackit-restore` → `trackit-restore`
   - Fallback email karyawan `@esb.co.id` → `@example.com`; dummy hostname `ESB-LAP-*` → `IT-LAP-*`; localStorage keys `esb_*` → `trackit_*`; `ESB-User` di seed KB → `Company-User`
   - File audit + deploy docs di-rename: `ESB-TrackIT-Re-Audit-*.md` → `TrackIT-Re-Audit-*.md`, `nginx-esb-trackit.conf` → `nginx-trackit.conf`; PDF manual → `PANDUAN_PENGGUNAAN_TRACKIT.pdf`
7. **Prevention**: workflow `secret-scanning.yml` (gitleaks full history, push/PR + harian) dengan `.gitleaks.toml` allowlist 3 commit ter-audit → CI hijau, leak baru gagal CI (terverifikasi lokal: "no leaks found").

## Tereksekusi sebagian / NOT DONE (butuh keputusan owner)

- **Git history rewrite** (menghapus dump PII + anon key): TIDAK dilakukan — berisiko, invalidates semua clone, wajib force push. Rekomendasi: BFG Repo-Cleaner pada dump + koordinasi rotasi password. Alternatif minimum: rotasi password yang ada di dump (semua sejak 2026-08).
- **GitHub governance** (branch protection, ruleset, CODEOWNERS): butuh akses settings repo — TIDAK diubah. Rekomendasi lengkap ada di README §CI/CD.
- **Repo rename GitHub** `muhhlmy/esb-trackit` → `muhhlmy/trackit`: tidak bisa dari CLI; badge CI baru bisa ditambahkan setelah rename (atau sebaliknya, URL badge tetap berfungsi karena GitHub me-redirect).
- **Vite preview / trusted proxy**: tidak ada bug — hanya dikonfirmasi.
- **UI/UX consolidation** (PageHeader/StatCard/EmptyState/ErrorState/skeleton), Lighthouse, visual regression, container scanning, Redis rate limiting: P2/P3, out of scope sesi ini.

## Verifikasi yang dijalankan

| Check | Hasil |
| --- | --- |
| `npm run build:tokens` | PASS — 190 tokens, 4 baris esb→brand |
| Backend tests (email, backup, import, password, seed) | PASS 30/30 |
| Frontend tests (full suite) | PASS 103/103 |
| `node --check` 8 file backend yang diubah | PASS |
| Backend preflight (`npm run check`) | PASS |
| Frontend `npm run build` | PASS — 9.43s |
| oxlint + eslint | PASS — 0 warnings, 0 errors |
| `docker compose config` (dengan dummy guard env) | PASS |
| gitleaks dengan `.gitleaks.toml` (exit-code 1 mode) | CLEAN — CI green |
| Residual scan `git grep -i esb` | Hanya false positive: `resB` (test), `esbenp` (Prettier publisher), lockfiles |
| Sensitive-info scan docs | BERSIH (hanya 127.0.0.1/0.0.0.0/documentation IPs) |

### Catatan verifikasi

- **TIDAK dijalankan**: E2E Playwright penuh (butuh DB `_test` berjalan; konfigurasi `.env.e2e` lokal menunjuk `DB_NAME=esb_trackit_test` lama — perlu update ke `trackit_test` sebelum run), lint/format backend, CodeQL, Lighthouse.
- **Side effect test lokal**: 1 file test backend (`sessionSlidingAuth.test.js`) membuat 2 user test ber-timestamp di DB `esb_trackit` lokal lalu **soft-delete** (pola resmi aplikasi; tidak bisa login). Tidak ada data production yang diubah/dihapus. Semua run test lain non-DB atau read-only.
- File live `backend/.env` (ignored) masih memakai `DB_NAME=esb_trackit` — **tidak diubah oleh audit** (file lokal berisi kredensial; mengubahnya akan memutus koneksi backend live). Owner harus menyelaraskan sendiri saat adopt nama DB baru, atau tetap pakai nama lama via env (kode sekarang membaca dari env).

## Production readiness blockers (urutan)

1. Putuskan & jalankan **history rewrite + rotasi password** (atau dokumentasikan risiko residual).
2. Update `.env` live + deploy environment ke nama DB/cookie baru, atau re-deploy dengan env lama yang eksplisit.
3. Aktifkan branch protection + required checks (CI, E2E, CodeQL, Secret Scanning).
4. Update `.env.e2e` → `trackit_test`, jalankan suite E2E penuh.
5. Set visibility package GHCR + verifikasi workflow `docker-publish.yml` di run pertama.

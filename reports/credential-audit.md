# Credential Audit — TrackIT (muhhlmy/esb-trackit)

Tanggal audit: 2026-09-23
Metode: gitleaks v8.21.2 (full history, 247 commits), `git log --diff-filter=A` inventory, manual verification of each finding, tree scan (`gitleaks detect --no-git`).

Aturan pelaporan: **tidak ada nilai secret yang dicetak** di dokumen ini. Semua nilai direpresentasikan sebagai fingerprint/tipe.

## 1. Git history (10 temuan gitleaks, 3 commit unik)

| # | Commit | File | Tipe | Klasifikasi | Rotasi? |
| --- | --- | --- | --- | --- | --- |
| H1 | `36fcc984` | `config.js` (root, file sudah dihapus) | JWT-format string | **Supabase anon key** proyek legacy "ESB Case". Anon key memang didesain public dan dilindungi RLS; file sudah tidak ada di tree | Disarankan (hygiene) |
| H2 | `27e1b462` | `e2e/auth/superadmin.json`, `e2e/auth/admin.json`, `e2e/auth/user.json` | JWT (3 token) | Session storage state E2E. Payload menunjukkan **sudah expired** | Tidak perlu |
| H3 | `4e34f640` | `qa_tokens.json` (3 token), `qa-api-results.json` (3 string API-key-like) | JWT + api-key | Artefak QA automation; token **sudah expired** | Tidak perlu untuk token; string api-key perlu dicek apakah masih valid |

Kesimpulan history: **tidak ditemukan production credential aktif** (JWT production secret, DB password, SMTP password, private key, cloud key). Yang pernah bocor: 1 Supabase anon key legacy + token E2E/QA yang expired. Semua tetap readable di history hingga rewrite/rotation dilakukan.

## 2. Database dump pernah di-commit (PII, bukan credential)

- `backend/database_dump.sql` ditambahkan pada commit `d279fb5` dan dihapus pada `603d590`.
- Isi historis memuat: **bcrypt password hash** user production/staging (termasuk hash yang sama untuk 3 akun awal), email personal `@esb.co.id` (nama personel nyata), struktur `app_schema_migrations` lengkap.
- `backend/esb_trackit_db.sql` (history): schema-only, **0** statement INSERT.
- Severity: **P1** — bukan credential, tetapi PII + hash yang dapat di-crack offline. Tidak dapat dihapus tanpa Git history rewrite.
- Rekomendasi: (a) pastikan semua password terkait sudah dirotasi/diubah sejak Agustus 2026, (b) pertimbangkan BFG/history rewrite + force push (keputusan owner), (c) larang commit dump via pre-commit hook.

## 3. Current tree (29 temuan gitleaks, semuanya untracked/ignored)

| Lokasi | Tipe | Status |
| --- | --- | --- |
| `private.key`, `certificate/private.key`, `certificate.crt`, `ca_bundle.crt` | TLS private key + certs | **Ignored** (`.gitignore` menutup `*.key`, `*.crt`, `certificate/`). TTL self-signed lokal |
| `.env.e2e`, `backend/.env` (+ 2 `.env.bak-*`) | env lokal | **Ignored** (`.env*`) |
| `124.158.150.150.enc.zip`, `.backups/**`, `backend/storage/backups/**` | backup arsip | **Ignored** |
| `e2e/auth/*.json` | JWT E2E (expired) | **Ignored** |
| `NetSendo/**` | proyek lain di dalam working dir (false positive curl-auth-header) | **Ignored** (tidak tracked, tidak ada di .gitignore eksplisit — tercover `.gitignore` lain) |

Konfirmasi: `git ls-files | grep -E '\.(key|crt|enc\.zip|bak)|\.env\.e2e$'` → **NONE TRACKED**. Tidak ada credential production di tracked files.

## 4. E2E test credentials di `.env.e2e.example` (tracked, by-design)

Berisi password test eksplisit (`E2eSuperadmin-ChangeMe1!` dst.) untuk database `_test` disposable. Bukan production credential. Rekomendasi (belum dieksekusi): generate password via CI env agar reviewer tidak menganggapnya credential nyata.

## 5. Prevention yang ditambahkan

- `.github/workflows/secret-scanning.yml`: gitleaks full-history setiap push/PR + harian.
- `.gitleaks.toml`: allowlist 3 commit historis ter-audit (H1–H3) sehingga CI hijau, dan **setiap kebocoran baru akan gagal CI**.

## 6. Batasan audit (NOT VERIFIED)

- Reflog dan objek yang hanya ada di lokal (staged/unpushed) tidak discan dari sisi remote; scan dilakukan di working dir ini yang mencakup seluruh 247 commit lokal.
- Isi file di luar project root dan binary terenkripsi (`*.enc.zip`) tidak didekripsi/diperiksa isinya.

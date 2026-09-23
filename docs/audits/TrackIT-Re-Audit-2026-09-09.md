# Audit Menyeluruh TrackIT — Re-Audit Commit Terbaru

**Repository:** `trackit`  
**Branch:** `main`  
**HEAD yang diaudit:** `8c1e41e23c74da9971561f8c1743eda60ba06905`  
**Tanggal audit ulang:** 9 September 2026  
**Baseline audit sebelumnya:** `5746c2f54bbe8fe055f5ba53f21c437dcabb3a8d`

---

# Executive Verdict

## **HOLD — jauh lebih dekat ke Production Ready**

Audit ulang terhadap `main` terbaru menunjukkan bahwa mayoritas temuan P1 pada audit sebelumnya sudah diperbaiki secara substansial dan dengan pendekatan arsitektur yang tepat.

Status project meningkat signifikan, terutama pada:

- credential lifecycle,
- backup hygiene,
- database migrations,
- graceful shutdown,
- container hardening,
- E2E configuration,
- dependency governance,
- Vite security configuration,
- dan modul baru Shipment Tracking.

Namun project **belum dapat dinyatakan production-ready** karena masih terdapat:

1. **P0 — GitHub Actions masih gagal sebelum job dimulai**
2. **P1 — existing database migration adoption belum memiliki runbook operasional**
3. **P1 — trusted reverse proxy belum dikonfigurasi aman secara default**
4. **P2 — regression pada Vite Preview middleware**
5. Governance review/release masih belum enforced secara nyata

---

# 1. Ringkasan Perubahan Status Audit

| Area / Temuan | Audit Lama | Audit Baru |
|---|---:|---:|
| GitHub Actions tidak jalan | 🔴 P0 | 🔴 **Belum selesai** |
| Backup `.dump` di current tree | 🔴 P0/P1 | 🟢 **Resolved** |
| Shared `DEFAULT_USER_PASSWORD` | 🟠 P1 | 🟢 **Resolved** |
| E2E env / PostgreSQL / Firefox | 🟠 P1 | 🟢 **Secara konfigurasi resolved** |
| `tokenExpiresAt` salah | 🟠 P1 | 🟢 **Resolved** |
| Graceful shutdown vs SSE | 🟠 P1 | 🟢 **Resolved** |
| PostgreSQL/backend exposed ke host | 🟠 P1 | 🟢 **Resolved** |
| Runtime DDL vs migration formal | 🟠 P1/P2 | 🟢 Arsitektur fixed, 🟠 adoption gap |
| Vite `allowedHosts: true` | 🟡 P2 | 🟢 **Resolved** |
| Vite membaca `backend/.env` | 🟡 P2 | 🟢 **Resolved** |
| Dependabot root workspace | 🟡 P2 | 🟢 **Resolved secara config** |
| Deployment hardening | 🟡 P2 | 🟢 **Much better** |
| PR/reviewer governance | 🟡 P2 | 🟡 **Masih belum enforced** |
| Vite preview middleware | — | 🟡 **Bug baru ditemukan** |
| Trust proxy deployment | — | 🟠 **P1** |
| Existing-DB migration adoption | — | 🟠 **P1 / conditional P0** |

---

# 2. P0 — GitHub Actions Masih `startup_failure`

Ini masih menjadi blocker terbesar.

Untuk HEAD:

`8c1e41e23c74da9971561f8c1743eda60ba06905`

GitHub mencatat workflow terkait push dan Dependabot, tetapi workflow utama tetap berakhir dengan:

`startup_failure`

Push workflow terbaru juga tidak memiliki job yang sempat dibuat:

```text
total_count: 0
jobs: []
```

Artinya failure terjadi sebelum backend tests, frontend tests, lint, format, build, dependency audit, SBOM generation, maupun Playwright dapat dijalankan.

## Kondisi CI Source Saat Ini

Secara statis, konfigurasi CI sudah meningkat signifikan:

### Backend CI

- PostgreSQL 16 isolated service
- test database `assets_monitoring_test`
- explicit DB credentials khusus CI
- `npm ci`
- syntax/preflight check
- isolated database initializer
- backend unit tests

### Frontend CI

- `npm ci`
- ESLint
- format check
- frontend unit tests
- production build

### Dependency CI

Matrix:

```text
.
backend
frontend
```

Dengan:

- `npm ci`
- `npm audit --audit-level=high`
- CycloneDX SBOM
- artifact upload

### E2E

Sudah diperbaiki menjadi:

- PostgreSQL 16
- database `_test`
- migration-based test initialization
- `npm ci`
- Chromium + Firefox installation
- PR smoke test
- full regression pada push `main`

Dengan demikian, workflow YAML yang sebelumnya bermasalah sudah diperbaiki secara substansial.

## Risiko

Selama GitHub Actions masih tidak dapat memulai job:

- HEAD `main` tidak memiliki automated release evidence,
- tidak ada bukti exact commit lulus test,
- required checks tidak dapat dipercaya,
- merge ke `main` belum dapat dianggap releasable artifact.

## Rekomendasi

**P0 remediation:**

1. cek repository/org GitHub Actions settings,
2. cek Actions permission/policy,
3. cek repository workflow enablement,
4. cek account/org-level restriction,
5. jalankan ulang CI,
6. wajibkan exact HEAD menghasilkan:
   - Backend CI green,
   - Frontend CI green,
   - Dependency CI green,
   - E2E green,
   - CodeQL green.

---

# 3. Shared Default Password — Resolved

Temuan shared `DEFAULT_USER_PASSWORD` sudah ditutup.

Runtime configuration tidak lagi mewajibkan organization-wide default password.

Akun baru hasil employee/import sekarang menggunakan enrollment credential random yang sengaja **bukan bcrypt hash**.

Konsepnya:

```text
!enrollment:<random bytes>
```

Sementara password verification hanya menerima valid bcrypt hash.

Dengan demikian:

- akun baru tidak memiliki password bersama,
- tidak ada universal initial credential,
- user wajib menyelesaikan password enrollment/reset melalui OTP email.

## Security Model Baru

```text
Employee / imported account created
        ↓
Random non-login enrollment credential stored
        ↓
Password authentication fails closed
        ↓
User receives OTP / reset flow
        ↓
New bcrypt password enrolled
        ↓
Normal authentication enabled
```

Ini adalah desain yang jauh lebih aman.

## Catatan Operasional

SMTP/email harus benar-benar aktif pada production.

Jika:

```text
EMAIL_ENABLED=false
```

akun baru tetap aman dari login menggunakan credential bersama, tetapi user juga tidak dapat menyelesaikan account enrollment.

---

# 4. `tokenExpiresAt` — Resolved

Bug login response sebelumnya sudah diperbaiki.

Sekarang `issueSessionCookie()` mengembalikan:

```js
expMs: exp * 1000
```

yang merepresentasikan actual JWT expiry, bukan server-side session expiry.

Dengan demikian:

```text
tokenExpiresAt ≠ sessionExpiresAt
```

sesuai desain:

- JWT pendek,
- server session lebih panjang,
- token direfresh secara sliding/gliding.

---

# 5. Graceful Shutdown + SSE — Resolved

Graceful shutdown sekarang diekstrak menjadi service khusus.

Flow baru:

```text
stop accepting connections
        ↓
close long-lived SSE streams
        ↓
drain active HTTP requests
        ↓
reap idle connections
        ↓
close PostgreSQL pool
        ↓
exit
```

Ini menutup risiko deadlock sebelumnya ketika:

```text
await server.close()
```

menunggu SSE selesai, tetapi SSE baru ditutup setelah `server.close()` selesai.

Terdapat juga fail-safe timeout 10 detik.

---

# 6. Backup & Database Dump Hygiene — Resolved pada Current Tree

Root `.gitignore` sekarang memiliki:

```gitignore
backend/storage/backups/
*.dump
```

Dump lama juga sudah dihapus dari current Git tree.

## Legacy SQL Seed

`backend/trackit_db.sql` sekarang sengaja menjadi disabled legacy entrypoint.

File tersebut tidak lagi melakukan:

- seed known password,
- destructive schema bootstrap,
- embedded credentials.

Sebaliknya operator diarahkan ke:

```bash
npm run db:migrate:plan
npm run db:migrate:apply
```

## Catatan Git History

Penghapusan file dari current tree **tidak otomatis menghapus Git blob dari commit lama**.

Jika dump yang sebelumnya pernah ter-commit mengandung production/company data nyata, tetap diperlukan:

- historical data inspection,
- secret/data incident assessment,
- Git history rewrite,
- credential rotation bila relevan.

---

# 7. Database Migration Architecture — Sangat Meningkat

Database lifecycle sekarang jauh lebih matang.

Backend memiliki:

```bash
npm run db:migrate:plan
npm run db:migrate:apply
```

Migration runner menggunakan:

- versioned SQL migrations,
- contiguous version check,
- SHA-256 checksum,
- migration ledger,
- PostgreSQL advisory lock,
- exact target host verification,
- exact target database verification,
- recovery proof ID,
- production change ID,
- per-migration transaction,
- lock timeout,
- statement timeout,
- rollback,
- checksum drift detection.

Ledger:

```text
app_schema_migrations
```

menyimpan antara lain:

- version,
- name,
- checksum,
- applied_at,
- applied_by,
- recovery proof,
- change ID,
- execution time.

## Startup Behavior

Application startup sekarang:

```text
DB connection check
        ↓
verifyRuntimeSchema()
        ↓
start HTTP server
```

Startup **tidak lagi menjalankan runtime DDL**.

Ini adalah improvement besar.

---

# 8. P1 — Existing Database Adoption Belum Lengkap

Migration runner dengan sengaja menolak database existing yang sudah memiliki application tables tetapi belum memiliki migration ledger.

Ini aman secara desain karena mencegah aplikasi secara otomatis menganggap legacy production database sebagai migration baseline.

Namun belum ada operational adoption workflow yang terdokumentasi.

## Migration Apply Membutuhkan

```text
MIGRATION_MODE
MIGRATION_EXPECTED_HOST
MIGRATION_EXPECTED_DATABASE
ALLOW_DB_MIGRATIONS
MIGRATION_RECOVERY_PROOF_ID
MIGRATION_CHANGE_ID
```

Tetapi variable tersebut belum tercantum secara lengkap pada:

- root `.env.example`,
- `backend/.env.example`,
- deployment runbook README.

## Risiko

Pada database production yang berasal dari versi lama:

```text
existing application tables
+
no app_schema_migrations ledger
```

migration runner akan menolak adoption.

Jika schema tersebut juga belum memenuhi runtime schema terbaru, backend startup akan fail-fast.

## Rekomendasi

Buat prosedur resmi:

### `docs/database-migration-adoption.md`

Isi minimal:

1. backup production DB,
2. restore verification,
3. inspect current schema,
4. validate expected migration baseline,
5. reviewed adoption strategy,
6. establish migration ledger,
7. migration dry-run,
8. staging migration,
9. runtime schema verification,
10. production change ID,
11. rollback procedure.

Tambahkan seluruh migration env ke `.env.example`.

---

# 9. P1 — Trusted Proxy Configuration

Production Docker topology adalah:

```text
Client
  ↓
Frontend Nginx
  ↓
Backend Express
```

Nginx sudah meneruskan:

```text
X-Real-IP
X-Forwarded-For
X-Forwarded-Proto
```

Tetapi backend Docker Compose default:

```yaml
TRUST_PROXY_CIDRS: ${TRUST_PROXY_CIDRS:-}
```

Jika kosong, Express trust proxy tetap disabled.

## Dampak

Backend dapat menganggap Nginx container IP sebagai:

```text
req.ip
```

bukan actual client IP.

Ini mempengaruhi:

- public API rate limiting,
- login rate limiting,
- audit login IP,
- brute-force tracking,
- security observability.

Jika banyak user datang melalui satu Nginx:

```text
many users → one proxy IP bucket
```

yang berpotensi menyebabkan rate limiter saling mempengaruhi.

## Rekomendasi

Production harus menggunakan exact proxy CIDR/IP.

Jangan gunakan:

```text
true
*
0.0.0.0/0
```

Gunakan hanya network frontend/reverse proxy yang memang dipercaya.

---

# 10. Container Security — Improved

Docker Compose sekarang lebih aman.

PostgreSQL:

- tidak dipublish ke host.

Backend:

- port `3000` tidak dipublish ke host.

Frontend/Nginx:

- satu-satunya public entrypoint pada port 80.

Backend juga menggunakan:

```yaml
security_opt:
  - no-new-privileges:true

cap_drop:
  - ALL
```

Ini mengurangi container privilege.

Backup storage tetap menggunakan dedicated Docker volume.

---

# 11. Nginx Hardening — Improved

Normal application traffic dibatasi:

```nginx
client_max_body_size 10m;
```

Sedangkan 500 MB hanya diberikan khusus ke endpoint database restore/validation.

Ini menutup masalah sebelumnya ketika seluruh `/api` menerima request body sampai 500 MB.

Security headers mencakup:

- CSP,
- X-Content-Type-Options,
- X-Frame-Options,
- Referrer-Policy,
- Permissions-Policy,
- COOP,
- CORP.

---

# 12. Vite Security — Improved

Temuan audit sebelumnya sudah banyak ditutup.

## Resolved

Vite sekarang:

- tidak membaca `backend/.env`,
- menggunakan `VITE_API_PROXY_TARGET`,
- tidak memakai `allowedHosts: true`,
- memiliki explicit `VITE_ALLOWED_HOSTS`,
- CSP `connect-src` lebih sempit,
- sourcemap production disabled,
- dotfile/package files diblok pada dev/preview.

---

# 13. P2 — Vite Preview Middleware Regression

Ditemukan bug baru pada Vite config.

Middleware factory:

```js
const applyHeaders = (headers) => (_req, res, next) => {
  ...
}
```

Pada development dipasang benar:

```js
server.middlewares.use(applyHeaders(devHeaders))
```

Tetapi preview menggunakan:

```js
server.middlewares.use(applyHeaders)
```

Padahal seharusnya:

```js
server.middlewares.use(
  applyHeaders(FRONTEND_SECURITY_HEADERS)
)
```

## Dampak

Pada `vite preview`, Connect/Vite memberikan:

```text
req, res, next
```

ke factory, bukan middleware hasil factory.

Factory hanya mengembalikan function dan tidak menjalankan `next()`.

Akibatnya preview server dapat hang/tidak meneruskan request.

## Severity

**P2**

Production Docker tidak menggunakan Vite Preview sehingga bukan production blocker langsung.

Tetapi release verification melalui:

```bash
npm run preview
```

tidak bisa dipercaya sampai diperbaiki.

---

# 14. Shipment Tracking Module — Security Review

Modul Shipment merupakan fitur baru dibanding baseline audit sebelumnya.

Endpoint:

```text
/api/shipments
/api/pengiriman
```

berada di belakang:

```text
authenticateToken
authenticatedUserRateLimiter
```

dan module permission:

```text
shipments: read
shipments: write
```

## Permission Defaults

Normal user:

```json
{
  "shipments": "none"
}
```

Superadmin:

```text
shipments = full
```

## Security Positives

Controller menerapkan:

- strict allowed field whitelist,
- plain-object validation,
- maximum string lengths,
- calendar date validation,
- status enum validation,
- active markup rejection,
- HTTP/HTTPS-only delivery proof URL,
- parameterized PostgreSQL query,
- server-bound `created_by`,
- authenticated permission separation.

Client tidak dapat spoof:

```text
created_by
```

karena identity berasal dari:

```js
req.user.id
```

## Test Coverage

Backend shipment test source mencakup:

- unauthenticated → 401,
- permission none → 403,
- read-only GET allowed,
- read-only write denied,
- full permission CRUD,
- automatic superadmin access,
- invalid status,
- invalid date,
- missing required field,
- dangerous URL protocol,
- overlong tracking number,
- unknown payload fields.

Tidak ditemukan obvious:

- SQL injection,
- direct IDOR,
- privilege escalation,
- client-controlled identity,
- stored active-markup path.

## Catatan Frontend Tests

Frontend shipment tests saat ini sebagian besar berupa structural/source assertion, misalnya:

```js
source.includes(...)
```

Ini berguna sebagai regression guard, tetapi tidak menggantikan real browser behavioral test.

Karena itu Playwright E2E tetap penting.

---

# 15. Dependency Governance — Improved

Dependabot sekarang mencakup:

```text
/
backend
frontend
github-actions
```

Root workspace sebelumnya tidak tercakup.

CI juga menambahkan:

```bash
npm audit --audit-level=high
npm sbom --sbom-format cyclonedx
```

Ini meningkatkan software supply-chain visibility.

---

# 16. PR / Release Governance — Belum Enforced

Repository sekarang mempunyai:

```text
.github/CODEOWNERS
.github/pull_request_template.md
```

Ini adalah langkah yang benar.

Namun CODEOWNERS saat ini hanya:

```text
* @muhhlmy
```

sementara komentar mengatakan author tetap membutuhkan independent reviewer.

PR terbaru juga:

- merged,
- tidak memiliki requested reviewer,
- tidak memiliki submitted PR review,
- masuk ke `main` meskipun exact merge commit tidak mempunyai working CI.

Artinya governance policy ada secara dokumentasi, tetapi belum enforced secara nyata.

## Rekomendasi

Terapkan branch/ruleset policy:

- no direct push to `main`,
- required PR,
- minimum 1 independent approval,
- CODEOWNERS review required,
- stale review dismissal,
- conversation resolution required,
- required status checks,
- required CodeQL,
- required Backend CI,
- required Frontend CI,
- required E2E smoke,
- optional dependency CI before merge,
- prevent force push,
- prevent deletion.

---

# 17. Legacy/Duplicate Migration Cleanup

Masih terdapat:

```text
backend/migrations/006_asset_shipments.sql
```

sementara canonical migration runner hanya membaca:

```text
backend/migrations/versioned/
```

dan `asset_shipments` sudah terdapat dalam canonical migration:

```text
0002_runtime_extensions.sql
```

File `006_asset_shipments.sql` sebaiknya:

- dihapus,
- dipindah ke archive,
- atau diberi README yang tegas bahwa file tersebut legacy/non-executable.

Tujuannya mencegah operator menjalankan migration yang salah secara manual.

---

# 18. Documentation Drift

README sudah diperbaiki terkait authentication cookie.

Namun terdapat minor mismatch:

README menyebut browser menggunakan:

```text
credentials: 'include'
```

sedangkan actual composable menggunakan:

```js
credentials: 'same-origin'
```

Untuk canonical same-origin architecture saat ini, implementation tersebut masuk akal.

Dokumentasi perlu disamakan dengan actual runtime contract.

---

# 19. Prioritas Remediasi

## P0 — Sebelum Production Promotion

### 1. Pulihkan GitHub Actions

Harus mendapatkan exact HEAD dengan:

```text
Backend CI        PASS
Frontend CI       PASS
Dependency CI     PASS
Playwright E2E    PASS
CodeQL            PASS
```

Tidak cukup hanya workflow YAML terlihat benar.

---

## P1 — Production Operations

### 2. Existing DB Migration Adoption

Buat:

```text
docs/database-migration-adoption.md
```

dan dokumentasikan seluruh migration environment.

### 3. Configure Trusted Reverse Proxy

Set exact:

```text
TRUST_PROXY_CIDRS
```

sesuai production network.

Verifikasi:

```text
req.ip
audit login IP
rate limit IP
```

menggunakan real client address.

---

## P2 — Quality / Maintenance

### 4. Fix Vite Preview

Ubah:

```js
server.middlewares.use(applyHeaders)
```

menjadi:

```js
server.middlewares.use(
  applyHeaders(FRONTEND_SECURITY_HEADERS)
)
```

### 5. Remove Legacy Migration Duplicate

Remove/archive:

```text
backend/migrations/006_asset_shipments.sql
```

### 6. Enforce PR Governance

Aktifkan repository ruleset / branch protection dengan:

- required checks,
- independent review,
- CODEOWNERS,
- no force push.

### 7. Update Documentation

Sinkronkan:

- migration lifecycle,
- same-origin auth,
- trusted proxy,
- deployment steps,
- Vite preview,
- README directory structure.

---

# 20. Final Assessment

| Domain | Assessment |
|---|---|
| Authentication design | 🟢 Good |
| Server-side session | 🟢 Good |
| Password hashing | 🟢 Good |
| New-account enrollment | 🟢 Good |
| RBAC / Permissions | 🟢 Good |
| IDOR protection | 🟢 Good |
| Input validation | 🟢 Good |
| SQL injection defense | 🟢 Good |
| XSS defense | 🟢 Good |
| Rate limiting design | 🟢 Good |
| Proxy-aware security | 🟠 Needs production configuration |
| Backup hygiene | 🟢 Good on current tree |
| Git historical data hygiene | 🟡 Review if dump was real |
| Database migrations | 🟢 Strong architecture |
| Existing database adoption | 🟠 Needs runbook |
| Runtime schema validation | 🟢 Strong |
| Graceful shutdown | 🟢 Good |
| SSE architecture | 🟢 Good for current deployment |
| Container hardening | 🟢 Good |
| Nginx hardening | 🟢 Good |
| Frontend build security | 🟢 Good |
| Vite Preview | 🟡 Bug |
| Shipment backend | 🟢 Good baseline |
| Shipment RBAC | 🟢 Good |
| Shipment tests | 🟢 Good backend coverage |
| Frontend behavioral coverage | 🟡 Depends on E2E |
| Dependency governance | 🟢 Improved |
| CI configuration | 🟢 Stronger |
| CI execution reliability | 🔴 Critical blocker |
| PR governance | 🟡 Needs enforcement |
| Production readiness | 🔴 HOLD |

---

# Final Verdict

## **HOLD**

Push terbaru menutup mayoritas masalah substansial dari audit sebelumnya.

Project sekarang memiliki fondasi yang jauh lebih kuat pada:

- authentication,
- password lifecycle,
- RBAC,
- data hygiene,
- schema lifecycle,
- deployment isolation,
- test infrastructure,
- dependency security,
- dan operational safety.

Tidak lagi ditemukan alasan utama untuk menahan production berdasarkan:

- shared default password,
- database dump pada current tree,
- token expiry contract,
- graceful shutdown,
- direct PostgreSQL/backend exposure,
- runtime schema mutation,
- atau Vite wildcard host.

Namun release tetap harus ditahan sampai:

1. **GitHub Actions benar-benar dapat memulai job dan semua required checks lulus**
2. **existing database migration/adoption path terdokumentasi dan diuji**
3. **trusted reverse proxy dikonfigurasi sesuai production topology**
4. **Vite Preview regression diperbaiki**

Setelah empat item tersebut ditutup dan exact commit mendapatkan CI/E2E hijau, project dapat dinaikkan menjadi:

## **READY WITH CONDITIONS**

Tahap berikutnya setelah itu adalah staging verification dan production deployment checklist.

---

# Audit Scope & Limitations

Audit ini merupakan:

- static repository audit,
- architecture review,
- security review,
- CI/CD configuration review,
- GitHub workflow state review,
- regression review dari audit sebelumnya.

Audit ini bukan:

- live production penetration test,
- network vulnerability scan,
- database content forensic review,
- container runtime scan,
- authenticated browser pentest,
- dependency CVE verification dari running CI.

Karena GitHub Actions masih mengalami `startup_failure`, test suite pada exact HEAD belum dapat divalidasi melalui GitHub CI evidence.

# ESB TrackIT — Comprehensive Project Audit

**Repository:** `muhhlmy/esb-trackit`  
**Branch audited:** `main`  
**Baseline commit:** `dee123234cb4945846ce2ba89103eac9c24be78a`  
**Audit date:** 2026-09-08  
**Audit type:** Static source/configuration review + GitHub Actions metadata review

---

## 1. Executive Summary

ESB TrackIT memiliki fondasi engineering yang cukup baik, khususnya pada backend security, authentication architecture, RBAC, defensive coding, serta automated testing. Project ini **tidak membutuhkan rewrite**.

Namun, kondisi `main` pada baseline audit belum direkomendasikan untuk dianggap sepenuhnya production-ready karena terdapat beberapa defect dan configuration drift yang berdampak langsung pada authentication reliability, CI/CD, E2E, deployment, backup persistence, dan operasional realtime.

### Overall Assessment

| Area | Score | Notes |
|---|---:|---|
| Architecture | 7/10 | Separation frontend/backend baik, tetapi beberapa controller dan view sudah terlalu besar |
| Backend Security | 8/10 | Auth/RBAC dan defensive coding relatif matang |
| Frontend Security | 7/10 | HttpOnly session dan sanitization baik; production CSP belum konsisten |
| Authentication / Session | 5/10 | Sliding JWT memiliki defect prioritas tinggi |
| Database / Data Integrity | 7/10 | Parameterized SQL, migration, backup safety cukup baik |
| CI/CD | 4/10 | GitHub Actions `main` mengalami `startup_failure` dan config drift |
| Automated Testing | 8/10 | Coverage luas termasuk RBAC, security, E2E, accessibility |
| Deployment / Operations | 5/10 | Backup persistence, graceful shutdown, proxy config, scaling realtime perlu diperbaiki |
| Maintainability | 5.5/10 | Mulai muncul God Component dan God Controller |
| **Overall** | **~6.5/10** | Fondasi baik, tetapi terdapat beberapa P0/P1 yang nyata |

---

## 2. Priority Findings

| Severity | Finding | Impact |
|---|---|---|
| 🔴 HIGH | Sliding JWT praktis tidak berjalan | User dapat 401 setelah ~15 menit walau server session 12 jam |
| 🔴 HIGH | CI `main` mengalami `startup_failure` | Quality gate tidak reliable |
| 🔴 HIGH | E2E tidak menyediakan seluruh required backend env | Backend E2E dapat gagal start |
| 🔴 HIGH | Port E2E/backend `3000` vs Vite proxy `5000` | Browser E2E dapat menuju API yang salah |
| 🔴 HIGH | Backup Docker tidak persistent | File backup dapat hilang saat container direcreate |
| 🟠 MEDIUM-HIGH | Global API limiter berjalan sebelum auth | Protected API efektifnya dibatasi per-IP, bukan per-user |
| 🟠 MEDIUM | Docker reverse proxy tidak meneruskan real client IP | Audit/rate-limit dapat melihat banyak user sebagai satu proxy |
| 🟠 MEDIUM | SSE realtime in-memory | Tidak siap horizontal scaling |
| 🟠 MEDIUM | Graceful shutdown SSE/HTTP belum lengkap | Restart dapat memutus koneksi secara kasar |
| 🟠 MEDIUM | Production frontend CSP tidak konsisten | SPA HTML tidak mendapat hardening setara backend |
| 🟠 MEDIUM | Docs cross-origin API bertentangan dengan auth cookie | Deployment API domain terpisah akan bermasalah |
| 🟠 MEDIUM | `.sql` didukung restore tetapi divalidasi memakai `pg_restore` | Plain SQL restore dapat tertolak |
| 🟠 MEDIUM | Backend masih membawa `xlsx@0.18.5` | Dependency hygiene / advisory exposure |
| 🟡 LOW-MEDIUM | Frontend API memiliki endpoint tanpa pasangan backend | Contract drift / unnecessary 404 |
| 🟡 LOW-MEDIUM | God Views / God Controllers | Maintainability dan regression risk meningkat |

---

# 3. Detailed Findings

## 3.1 HIGH — Sliding Authentication Token Tidak Efektif

### Kondisi

Backend menggunakan:

- JWT akses pendek, default sekitar 15 menit.
- Server-side session sekitar 12 jam.
- Cookie HttpOnly sebagai transport token.
- Mekanisme sliding token melalui `maybeSlideSessionToken()`.

Relevant files:

- `backend/src/config/env.js`
- `backend/src/security/sessionToken.js`
- `backend/src/app.js`
- `backend/src/middleware/authMiddleware.js`
- `backend/src/controllers/authController.js`

### Masalah

Di `backend/src/app.js`, router dijalankan sebelum sliding middleware:

```js
app.use(router)

app.use((req, res, next) => {
  if (req.user && !res.headersSent) {
    void maybeSlideSessionToken(req, res)
  }
  next()
})
```

Mayoritas route handler mengakhiri response menggunakan `res.json()`, `res.send()`, atau equivalent tanpa memanggil `next()`.

Akibatnya request sukses biasanya tidak pernah mencapai sliding middleware.

Selain itu, `issueSessionCookie()` menghasilkan JWT dengan expiry pendek, tetapi cookie `Max-Age` mengikuti lifetime server-side session yang lebih panjang.

### Dampak

Flow potensial:

```text
Login
  ↓
Cookie hidup ~12 jam
  ↓
JWT di dalam cookie expired ~15 menit
  ↓
Sliding refresh tidak berjalan
  ↓
Protected API berikutnya → 401
  ↓
Frontend clear auth cache
  ↓
User dipaksa login kembali
```

### Severity

**HIGH**

### Recommendation

Pindahkan refresh token ke authentication lifecycle:

```text
Request
  ↓
authenticateToken
  ↓
verify JWT
  ↓
verify server-side session
  ↓
refresh JWT when near expiry
  ↓
authorization
  ↓
controller
```

Pisahkan semantic:

```text
tokenExpiresAt
sessionExpiresAt
```

Tambahkan regression test yang membuat JWT mendekati expiry dan memastikan response protected endpoint mendapatkan `Set-Cookie`.

---

## 3.2 HIGH — GitHub Actions `main` Sedang Tidak Sehat

### Kondisi

Baseline commit:

```text
dee123234cb4945846ce2ba89103eac9c24be78a
```

GitHub Actions run untuk commit tersebut memiliki status:

```text
conclusion: startup_failure
```

Run sebelumnya juga mengalami kondisi serupa.

### Dampak

Tidak terdapat reliable quality gate untuk commit terbaru.

Karena startup failure terjadi sebelum job normal berjalan, test/lint/build tidak dapat dijadikan bukti bahwa `main` sehat.

### Severity

**HIGH**

### Recommendation

Investigasi GitHub Actions configuration dan repository-level workflow execution terlebih dahulu.

Checklist:

- Repository Actions permissions.
- Workflow syntax/event configuration.
- Required actions policy.
- Organization restrictions.
- Runner availability.
- Workflow file validity.
- Branch protection integration.

Setelah startup failure selesai, lanjutkan memperbaiki runtime CI issues di bagian berikut.

---

## 3.3 HIGH — Backend CI Tidak Menyediakan Required Environment

### Relevant Files

- `backend/src/config/env.js`
- `.github/workflows/ci.yml`

### Kondisi

`env.js` mewajibkan:

```text
DB_PASSWORD
JWT_SECRET
DEFAULT_USER_PASSWORD
```

`JWT_SECRET` juga harus memenuhi minimum length.

Tetapi job backend pada `ci.yml` menjalankan:

```yaml
- run: npm run check
- run: npm test
```

tanpa explicit test environment untuk secret tersebut.

Beberapa backend tests import `app.js` secara langsung dan ikut memuat `env.js`.

### Dampak

Begitu GitHub Actions startup problem selesai, backend tests berpotensi gagal pada module initialization.

Selain itu, `npm run check` sudah menjalankan Node tests, lalu `npm test` dijalankan lagi, sehingga test backend berpotensi dieksekusi dua kali.

### Severity

**HIGH**

### Recommendation

Buat standardized CI env:

```yaml
env:
  DB_HOST: localhost
  DB_PORT: 5432
  DB_USER: postgres
  DB_PASSWORD: postgrespassword
  DB_NAME: assets_monitoring
  JWT_SECRET: ci-only-secret-minimum-32-characters
  DEFAULT_USER_PASSWORD: CIOnlyTempPass123!
```

Pastikan nilainya hanya dummy value untuk ephemeral CI.

Pisahkan:

```text
check = syntax/preflight only
test  = tests only
```

agar tidak redundant.

---

## 3.4 HIGH — E2E Port Configuration Split-Brain

### Relevant Files

- `.github/workflows/e2e-tests.yml`
- `playwright.config.js`
- `frontend/vite.config.js`
- `backend/src/config/env.js`
- `.env.e2e.example`
- `deploy/nginx-esb-trackit.conf`

### Kondisi

Sebagian config memakai backend port:

```text
3000
```

sedangkan sebagian lainnya memakai:

```text
5000
```

Contoh:

```text
E2E workflow        → 3000
backend default     → 3000
Vite dev proxy      → 5000
Playwright default  → 5000
Nginx template      → 5000
```

### Dampak

E2E direct API helper mungkin berhasil ke `3000`, tetapi browser request:

```text
Browser → Vite :5173 → /api → :5000
```

dapat gagal karena backend sebenarnya hidup di `3000`.

### Severity

**HIGH**

### Recommendation

Gunakan satu source of truth.

Contoh:

```text
BACKEND_PORT=3000
E2E_API_URL=http://127.0.0.1:3000
VITE_API_PROXY_TARGET=http://127.0.0.1:3000
```

Vite config:

```js
const API_TARGET =
  process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000'
```

Hindari hardcode port di banyak file.

---

## 3.5 HIGH — Backup Docker Tidak Persistent

### Relevant Files

- `backend/src/services/backupService.js`
- `docker-compose.yml`

### Kondisi

Default backup location:

```text
storage/backups
```

Backend container tidak memiliki persistent volume untuk lokasi tersebut.

`docker-compose.yml` hanya memberi volume persistent kepada PostgreSQL:

```text
pgdata:/var/lib/postgresql/data
```

### Dampak

Scenario:

```text
Backup berhasil
  ↓
Metadata tersimpan ke PostgreSQL
  ↓
.dump tersimpan di filesystem container
  ↓
Container backend direcreate
  ↓
File backup hilang
  ↓
Metadata masih ada
```

Ini menyebabkan false sense of disaster recovery.

### Severity

**HIGH**

### Recommendation

Minimal:

```yaml
backend:
  volumes:
    - backups:/app/storage/backups

volumes:
  pgdata:
  backups:
```

Untuk production lebih baik gunakan external storage:

- S3-compatible object storage
- NAS
- dedicated backup server
- offsite encrypted storage

Tambahkan scheduled restore verification, bukan sekadar backup creation.

---

## 3.6 MEDIUM-HIGH — Rate Limiter Protected API Tidak Benar-Benar Per User

### Relevant Files

- `backend/src/middleware/rateLimitMiddleware.js`
- `backend/src/routes/index.js`

### Kondisi

Rate limiter mendukung:

```js
req.user?.id
  ? `api:user:${req.user.id}`
  : `api:ip:${getClientIp(req)}`
```

Tetapi middleware diterapkan:

```js
router.use('/api', apiRateLimiter)
```

sebelum:

```js
authenticateToken
```

### Dampak

Pada protected API, `req.user` belum tersedia.

Akibatnya rate limit efektifnya menjadi per-IP.

Di jaringan kantor/NAT, banyak user dapat berbagi satu IP sehingga saling mempengaruhi limit.

### Recommendation

Gunakan dua layer:

```text
Global anonymous IP limiter
        +
Authenticated per-user limiter
```

Contoh:

```text
/api → global limiter
protected endpoint → authenticateToken → authenticated limiter
```

---

## 3.7 MEDIUM — Docker Nginx Tidak Meneruskan Real Client IP

### Relevant Files

- `frontend/Dockerfile`
- `deploy/nginx-esb-trackit.conf`
- `backend/src/config/env.js`

### Kondisi

Production template Nginx meneruskan:

```text
X-Real-IP
X-Forwarded-For
X-Forwarded-Proto
X-Request-ID
```

Tetapi Nginx config yang dibuat dalam `frontend/Dockerfile` tidak lengkap.

### Dampak

Backend dapat melihat banyak request berasal dari proxy/container IP yang sama.

Hal ini mempengaruhi:

- login audit
- rate limiting
- abuse detection
- incident forensics
- log correlation

### Recommendation

Samakan Docker Nginx dengan production template.

Tetap gunakan `TRUST_PROXY_CIDRS` yang restrictive dan exact, jangan `trust proxy = true` secara generik.

---

## 3.8 MEDIUM — Realtime SSE Hanya In-Memory

### Relevant Files

- `backend/src/services/realtimeService.js`
- `backend/src/controllers/ticketController.js`

### Hal yang Sudah Baik

Ticket realtime memiliki:

- role-aware event filtering
- queue-aware authorization
- per-user connection limits
- global connection capacity
- live DB revalidation
- SSE heartbeat
- `X-Accel-Buffering: no`

### Masalah

Client registry menggunakan:

```js
const sseClients = new Set()
```

Event delivery berada di memory process.

### Dampak

Single instance:

```text
Node A
```

bekerja.

Multi-instance:

```text
Node A ← client SSE
Node B ← ticket update
```

Node A tidak otomatis mengetahui event yang terjadi di Node B.

### Recommendation

Jika horizontal scaling dibutuhkan, gunakan event bus:

- Redis Pub/Sub
- PostgreSQL LISTEN/NOTIFY
- NATS
- Kafka

Untuk internal single-instance deployment, ini belum blocker.

---

## 3.9 MEDIUM — Graceful Shutdown Belum Lengkap

### Relevant Files

- `backend/src/server.js`
- `backend/src/services/realtimeService.js`

### Kondisi

`server.js` mengimport:

```js
closeAllSseClients
```

tetapi tidak memanggilnya pada `SIGTERM`/`SIGINT`.

Shutdown saat ini pada dasarnya:

```text
pool.end()
process.exit()
```

### Dampak

- SSE connections terputus secara kasar.
- Active HTTP requests dapat terpotong.
- Deployment rolling menjadi kurang graceful.

### Recommendation

Implement:

```text
SIGTERM
  ↓
server.close()
  ↓
closeAllSseClients()
  ↓
wait active requests
  ↓
pool.end()
  ↓
exit
```

Tambahkan shutdown timeout fail-safe.

---

## 3.10 MEDIUM — Production Frontend CSP Tidak Konsisten

### Relevant Files

- `backend/src/middleware/securityHeaders.js`
- `frontend/vite.config.js`
- `frontend/Dockerfile`
- `deploy/nginx-esb-trackit.conf`

### Kondisi

Backend dan Vite development mempunyai CSP.

Production SPA HTML dilayani oleh Nginx, tetapi production Nginx config tidak memberikan CSP yang sama kuat.

### Dampak

CSP pada API response tidak melindungi SPA document.

### Recommendation

Tambahkan pada Nginx:

```nginx
add_header Content-Security-Policy "default-src 'self'; ..." always;
```

Pastikan policy kompatibel dengan:

- Vue build
- fonts
- images/blob
- SSE/fetch
- required worker usage

---

## 3.11 MEDIUM — Cross-Origin API Documentation Bertentangan dengan Cookie Auth

### Relevant Files

- `frontend/.env.example`
- `frontend/src/composables/useApi.js`
- `backend/src/app.js`

### Kondisi

Frontend docs memberi contoh:

```text
VITE_API_BASE_URL=https://api.example.com
```

Tetapi client menggunakan:

```js
credentials: 'same-origin'
```

Backend CORS juga menggunakan:

```text
credentials: false
```

### Dampak

Jika frontend dan backend ditempatkan di domain terpisah, session cookie tidak akan bekerja seperti desain sekarang.

### Recommendation

Pilihan terbaik saat ini:

**Tetapkan same-origin deployment sebagai canonical architecture.**

Hapus atau koreksi contoh cross-origin.

Jika cross-origin memang requirement, perlu redesign pada:

- `credentials: include`
- credentialed CORS
- cookie SameSite policy
- Secure cookie
- CSRF defense
- CSP connect-src

---

## 3.12 MEDIUM — `.sql` Restore Validation Tidak Konsisten

### Relevant Files

- `backend/src/routes/backupRoutes.js`
- `backend/src/services/backupService.js`
- `backend/src/controllers/backupController.js`

### Kondisi

Upload filter menerima:

```text
.dump
.sql
.tar
```

Tetapi validation menjalankan:

```text
pg_restore --list
```

untuk file restore.

### Masalah

Plain `.sql` bukan archive format `pg_restore`.

Plain SQL biasanya diproses dengan:

```text
psql
```

### Dampak

`.sql` terlihat didukung, tetapi dapat gagal pada validation sebelum restore.

### Recommendation

Branch berdasarkan format:

```text
.dump / .tar
    → pg_restore --list

.sql
    → dedicated SQL validation + psql restore path
```

Atau, jika plain SQL tidak ingin didukung, hapus `.sql` dari accepted format supaya contract tidak misleading.

---

## 3.13 MEDIUM — Backend Dependency `xlsx@0.18.5`

### Relevant Areas

- `backend/package.json`
- frontend SheetJS usage

### Kondisi

Backend masih membawa `xlsx` versi lama, sementara penggunaan aplikasi yang ditemukan berada di frontend dengan versi lebih baru.

### Dampak

- dependency audit noise
- unnecessary attack surface
- larger production image
- supply-chain complexity

### Recommendation

Jika tidak digunakan:

```bash
cd backend
npm uninstall xlsx
```

Lalu:

```bash
npm audit
npm test
```

Tambahkan dependency automation seperti Dependabot/Renovate dan static security scanning seperti CodeQL.

---

## 3.14 LOW-MEDIUM — God Components / God Controllers

### Examples

Frontend view sizes yang besar antara lain:

- `frontend/src/views/AssetsView.vue`
- `frontend/src/views/DashboardView.vue`
- `frontend/src/views/ExportView.vue`
- `frontend/src/views/DatabaseView.vue`
- `frontend/src/views/AssetsGaView.vue`
- `frontend/src/views/AssetsOpsView.vue`
- `frontend/src/views/EmployeesView.vue`

Backend juga memiliki controller yang besar:

- `backend/src/controllers/exportController.js`
- `backend/src/controllers/assetController.js`
- `backend/src/controllers/importController.js`
- `backend/src/controllers/employeeController.js`

### Dampak

- logic UI/domain bercampur
- harder unit testing
- high blast radius
- higher merge conflicts
- higher AI-assisted coding regression risk
- review lebih sulit

### Recommendation

Targetkan orchestration view relatif kecil.

Contoh Tickets architecture:

```text
TicketsView
├── TicketFilters
├── TicketTable
├── TicketDetail
├── TicketCommentPanel
├── TicketCasp
├── useTickets
├── useTicketFilters
└── useTicketRealtime
```

Backend:

```text
Controller
   ↓
Service
   ↓
Repository / Query layer
```

Controller fokus ke HTTP contract, bukan domain orchestration.

---

## 3.15 LOW-MEDIUM — Frontend / Backend API Contract Drift

### Relevant File

- `frontend/src/services/api.js`

Frontend masih mempunyai helper:

```text
GET /api/templates
GET /api/stats
```

tetapi route backend yang matching tidak ditemukan dalam audit.

### Dampak

- unnecessary 404
- misleading API abstraction
- hidden fallback behavior
- API contract menjadi sulit dipercaya

### Recommendation

Buat explicit API contract inventory.

Hapus endpoint stale atau implement backend route yang memang diperlukan.

Idealnya gunakan:

- OpenAPI specification
- generated API types/client
- API contract test

---

# 4. Security Strengths to Preserve

Project memiliki beberapa security pattern yang sudah baik dan sebaiknya dipertahankan.

## 4.1 HttpOnly Authentication

JWT tidak lagi disimpan di `localStorage`.

Frontend hanya menyimpan sanitized user object untuk UI state.

Credential sebenarnya berada pada HttpOnly cookie.

Ini mengurangi risiko token theft melalui XSS.

---

## 4.2 Server-Side Session Verification

JWT bukan satu-satunya source of truth.

Authentication middleware:

1. memverifikasi JWT
2. memverifikasi session ID di PostgreSQL
3. mengambil user terbaru dari database
4. memvalidasi `is_active`
5. mengambil role dan permissions dari database

Dengan ini:

- revoked session cepat tidak valid
- account disable cepat berlaku
- role change cepat berlaku
- permission change tidak bergantung pada stale JWT claims

---

## 4.3 Ticket Authorization Architecture

`ticketAccessService` merupakan salah satu bagian terkuat project.

Policy bersifat deny-by-default dan memisahkan:

- reporter
- admin
- superadmin
- queue membership
- assignment
- CASP access
- ticket claim
- reassignment
- delete permission
- event access
- state transition

Ownership menggunakan server-side IDs, bukan display name.

---

## 4.4 Input / Browser Security

Project sudah mempunyai beberapa mitigasi:

- exact CORS allowlist
- Origin / Referer validation
- HttpOnly cookie
- SameSite cookie
- security headers
- CSP pada backend/dev
- HTML sanitization sebelum `v-html`
- brute-force lockout
- rate limiter
- dummy bcrypt untuk anti user enumeration timing
- request ID
- structured error response

---

## 4.5 Database Security

SQL pada code yang direview dominan menggunakan parameterized query.

Dynamic SQL identifier pada export memakai allowlisted/quoted identifier mechanism.

Backup process memakai:

```text
spawn(command, args)
```

bukan shell string interpolation.

---

## 4.6 Backup Safety Controls

Backup subsystem sudah memiliki:

- SHA-256 checksum
- audit log
- metadata
- safety backup sebelum restore
- path traversal protection
- restore validation
- superadmin restriction

Issue utamanya lebih ke persistence deployment, bukan konsep service-nya.

---

## 4.7 Test Coverage

Backend mempunyai test untuk area seperti:

- CORS
- CSRF
- brute force
- rate limiting
- IDOR
- canonical error schema
- security headers
- XSS sanitization
- backup/restore
- export
- asset/dashboard logic

E2E dikelompokkan ke:

```text
accessibility
assets
auth
dashboard
negative
qa-extended
rbac
tickets
```

Ini merupakan fondasi QA yang baik.

---

# 5. Remediation Plan

## P0 — Fix Before Next Production Release

### P0-1 — Authentication Sliding Token

**Files likely involved:**

```text
backend/src/app.js
backend/src/middleware/authMiddleware.js
backend/src/security/sessionToken.js
backend/tests/*
```

**Acceptance criteria:**

- JWT mendekati expiry direfresh pada authenticated request.
- Server session expiry tetap tidak bertambah.
- Revoked session tetap menghasilkan 401.
- Browser tidak logout setelah access-token TTL jika server session masih valid.
- Regression test tersedia.

---

### P0-2 — Restore GitHub Actions

**Acceptance criteria:**

- `ci.yml` berjalan.
- `e2e-tests.yml` berjalan.
- No `startup_failure`.
- PR tidak dapat dianggap healthy tanpa checks.

---

### P0-3 — Standardize CI/Test Environment

**Acceptance criteria:**

Semua required env tersedia:

```text
DB_PASSWORD
JWT_SECRET
DEFAULT_USER_PASSWORD
```

Backend unit test dapat start dari clean GitHub runner.

---

### P0-4 — Canonical Backend Port

**Acceptance criteria:**

Tidak ada mixed port `3000`/`5000` untuk canonical local/E2E flow.

Dokumentasi, Vite, Playwright, CI, Docker, dan production template konsisten.

---

### P0-5 — Persistent Backup Storage

**Acceptance criteria:**

- Recreate backend container.
- Backup tetap tersedia.
- Download backup berhasil.
- Metadata dan physical file tetap sinkron.

---

# 6. P1 — Hardening

## P1-1 — Session Lifetime Regression Test

Test skenario:

```text
login
→ near-expiry token
→ protected API request
→ receive new cookie
→ old access expiry passes
→ session still usable
```

---

## P1-2 — Two-Layer Rate Limiting

```text
Anonymous/IP limiter
+
Authenticated/user limiter
```

---

## P1-3 — Standardize Reverse Proxy Headers

Production template dan Docker Nginx harus konsisten.

---

## P1-4 — Production CSP

CSP diterapkan ke frontend HTML, bukan hanya API response.

---

## P1-5 — Graceful Shutdown

Close:

1. listener
2. SSE
3. active requests
4. DB pool

---

## P1-6 — Fix SQL Restore Contract

Either:

```text
Support .sql properly
```

atau:

```text
Remove .sql support
```

Jangan advertise format yang tidak berhasil divalidasi.

---

## P1-7 — Dependency Hygiene

- remove unused backend `xlsx`
- npm audit
- Dependabot/Renovate
- CodeQL

---

# 7. P2 — Architecture & Maintainability

## P2-1 — Realtime Multi-Instance Support

Implement event bus ketika horizontal scaling menjadi requirement.

---

## P2-2 — Refactor Large Views and Controllers

Pisahkan domain logic dari HTTP/UI orchestration.

---

## P2-3 — API Contract Cleanup

- hapus stale endpoints
- kurangi legacy aliases
- document canonical endpoints
- pertimbangkan OpenAPI

---

## P2-4 — Continuous Security Automation

Tambahkan:

- CodeQL
- dependency scanning
- secret scanning policy
- SBOM generation bila perlu
- container image scanning

---

# 8. Recommended Execution Order

| Order | Action | Goal |
|---|---|---|
| 1 | Fix sliding JWT | Authentication reliability |
| 2 | Repair GitHub Actions startup failure | Restore CI visibility |
| 3 | Add canonical CI env | Make backend tests reliable |
| 4 | Standardize backend port | Fix E2E/dev config |
| 5 | Persist backup storage | Disaster recovery reliability |
| 6 | Add session regression test | Prevent recurrence |
| 7 | Split IP/user limiter | Abuse protection |
| 8 | Standardize proxy headers | Correct IP/audit behavior |
| 9 | Add frontend production CSP | Browser hardening |
| 10 | Implement graceful shutdown | Deploy reliability |
| 11 | Fix `.sql` restore | Functional consistency |
| 12 | Remove old backend xlsx | Dependency hygiene |
| 13 | Realtime event bus if scaling | Horizontal scalability |
| 14 | Refactor large modules | Maintainability |
| 15 | API contract cleanup | Consistency |
| 16 | Add security automation | Continuous assurance |

---

# 9. Production Readiness Gate

Sebelum release production berikutnya, minimal harus PASS:

```text
[ ] Sliding session regression test
[ ] Backend CI green
[ ] Frontend CI green
[ ] E2E smoke green
[ ] E2E main regression green
[ ] Backend port config consistent
[ ] Required env validated
[ ] Backup survives container recreate
[ ] Reverse proxy client IP verified
[ ] CSP verified on frontend HTML
[ ] Restore supported formats tested
[ ] Graceful shutdown tested
```

---

# 10. Final Verdict

**ESB TrackIT layak dilanjutkan dan tidak direkomendasikan untuk rewrite.**

Project sudah memiliki banyak keputusan engineering yang benar, terutama pada:

- server-side authentication session
- HttpOnly cookie strategy
- backend authorization
- ticket RBAC
- defensive SQL patterns
- XSS mitigation
- brute-force protection
- backup safety
- automated testing

Risiko terbesar saat ini berasal bukan dari kelemahan fundamental arsitektur, tetapi dari **configuration drift dan lifecycle integration** yang muncul seiring project berkembang.

Empat prioritas teratas adalah:

1. **Fix sliding JWT/session**
2. **Restore GitHub Actions**
3. **Fix CI/E2E environment + port consistency**
4. **Make backup storage persistent**

Setelah empat area ini selesai, project akan berada pada posisi yang jauh lebih kuat untuk production hardening selanjutnya.

---

# 11. Audit Scope & Limitation

Audit ini mencakup:

- repository structure
- backend source
- frontend source
- auth/session architecture
- RBAC
- ticket security policy
- database access patterns
- backup/restore
- Docker
- Nginx
- CI workflow
- E2E configuration
- automated test inventory
- dependency/config review
- operational lifecycle review

Audit ini **belum mencakup**:

- live penetration testing
- authenticated DAST
- production load testing
- database stress/concurrency testing
- network infrastructure review
- TLS certificate inspection pada deployment nyata
- cloud/IAM audit
- secret inventory pada runtime environment
- restore drill terhadap production-size database

Karena itu, setelah P0/P1 selesai, disarankan melakukan tahap lanjutan:

```text
Static Audit
    ↓
CI Repair
    ↓
Security Regression
    ↓
Live QA / DAST
    ↓
Load Test
    ↓
Backup Restore Drill
    ↓
Production Readiness Review
```

---

**Document:** ESB TrackIT Comprehensive Project Audit  
**Baseline:** `main@dee123234cb4945846ce2ba89103eac9c24be78a`  
**Date:** 2026-09-08

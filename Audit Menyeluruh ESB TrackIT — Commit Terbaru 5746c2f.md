# Audit Menyeluruh ESB TrackIT

**Repository:** `muhhlmy/esb-trackit`  
**Branch:** `main`  
**HEAD yang diaudit:** `5746c2f54bbe8fe055f5ba53f21c437dcabb3a8d`  
**Tanggal commit:** 8 September 2026  
**Audit dilakukan:** 9 September 2026

Commit terbaru adalah merge PR #2 dan perubahan kodenya hanya menyentuh `frontend/vite.config.js`, terutama pengaturan API proxy, loading environment, security headers, dan Vite dev/preview server. 

## Executive Verdict

### **HOLD — belum Production-Ready**

Saya menurunkan verdict dari laporan internal sebelumnya **“READY WITH CONDITIONS”** menjadi **“HOLD”**.

Alasannya bukan karena arsitektur aplikasi buruk. Justru authentication, RBAC, XSS defense, rate limiting, backup authorization, dan sejumlah defensive coding sudah cukup matang. Masalah utamanya sekarang adalah **release assurance, credential/data hygiene, CI/CD reliability, dan beberapa regression defect**.

Laporan remediasi sebelumnya menyatakan 228 backend tests dan 60 frontend tests lulus serta project “READY WITH CONDITIONS”. Namun itu adalah evidence lokal historis.  Commit `main` terbaru justru menghasilkan GitHub Actions run dengan conclusion **`startup_failure`**. 

---

# 1. Pemahaman Arsitektur Project

ESB TrackIT bukan lagi sekadar asset tracker. Saat ini project sudah menjadi platform enterprise internal dengan tiga domain besar:

| Layer | Implementasi |
|---|---|
| Frontend | Vue 3, Vite, TailwindCSS 4, Vue Router, TipTap, Chart.js |
| Backend | Node.js, Express 5, PostgreSQL |
| Auth | JWT pendek + server-side PostgreSQL session + HttpOnly cookie |
| Realtime | Server-Sent Events |
| Asset | IT, GA, Ops, employee assignment/history |
| Helpdesk | ticket queue, assignee, SLA, comments, CASP |
| Knowledge Base | Cases, FAQ, CMS, rich-text |
| Admin | User/employee management, import/export |
| Database Ops | backup, restore, reset DB |
| QA | Node test, Playwright, axe accessibility |
| Security automation | Dependabot + CodeQL |

README sendiri mendeskripsikan modul Asset Management, Employee Management, Helpdesk, CASP, Knowledge Base, Analytics, SSE, Import/Export, backup/restore, serta OTP password reset. 

Backend dependencies utama termasuk Express 5, PostgreSQL, JWT, bcrypt, Multer, Nodemailer, DOMPurify, dan CORS.  Frontend menggunakan Vue, TipTap, Chart.js, GSAP, DOMPurify, dan SheetJS. 

---

# 2. Temuan Prioritas

| ID | Severity | Temuan | Status |
|---|---|---|---|
| A-01 | **P0** | GitHub Actions pada HEAD `main` startup failure | Confirmed |
| A-02 | **P0 conditional / P1 confirmed** | Database backup dumps masih tracked di Git | Confirmed |
| A-03 | **P1 High** | Semua akun hasil import dapat memakai satu shared default password | Confirmed |
| A-04 | **P1 High** | Workflow E2E tidak konsisten dengan runtime requirements | Confirmed |
| A-05 | **P1** | `tokenExpiresAt` pada login response salah | Confirmed |
| A-06 | **P1** | Graceful shutdown dapat deadlock dengan SSE aktif | Confirmed |
| A-07 | **P1** | PostgreSQL dan backend dipublish langsung ke host | Confirmed |
| A-08 | **P1/P2** | Schema management terbagi antara bootstrap dan versioned migrations | Confirmed |
| A-09 | **P2** | Vite `allowedHosts: true` + coupling ke `backend/.env` | Confirmed |
| A-10 | **P2** | Dependency governance belum mencakup root workspace | Confirmed |
| A-11 | **P2** | God controllers/views masih besar | Confirmed/deferred |
| A-12 | **P2** | PR/release governance lemah | Confirmed sebagian |
| A-13 | **P2** | QA scripts dan docs masih mengandung contract/port lama | Confirmed |
| A-14 | **P2** | Deployment hardening masih dapat dipersempit | Confirmed |

---

# 3. A-01 — Release Quality Gate Sedang Tidak Berfungsi

Ini blocker terbesar.

Commit `5746c2f...` menghasilkan workflow run pada `main`, tetapi hasil akhirnya:

**`conclusion: startup_failure`**

dan kegagalan terjadi seketika setelah push. 

Dengan demikian, tidak ada evidence dari GitHub bahwa HEAD terbaru telah melewati:

- backend tests,
- frontend tests,
- lint,
- format check,
- frontend production build,
- Playwright E2E,
- CodeQL.

CI YAML sebenarnya sudah lumayan baik: menggunakan `npm ci`, lint, frontend build, unit test, serta GitHub Actions yang dipin ke commit SHA. 

Tetapi quality gate hanya bernilai jika benar-benar berjalan.

**Implikasi:** merge ke `main` saat ini tidak dapat dianggap sebagai releasable artifact.

---

# 4. A-02 — Database Backup Files Ada di Git Repository

Ini salah satu temuan paling serius.

Current Git tree masih berisi banyak file:

`backend/storage/backups/*.dump`

termasuk sebuah dump berukuran sekitar **8,4 MB**, selain beberapa backup dan `pre_restore` dump lain. 

Lebih buruk lagi, `.gitignore` root maupun backend **tidak meng-ignore `storage/backups` atau `*.dump`**.  

Artinya ini bukan hanya historical accident; dump baru bisa ikut ter-commit lagi.

Saya sengaja tidak mengasumsikan bahwa dump tersebut mengandung production data karena binary contents tidak terverifikasi pada audit ini. Tetapi bila salah satu merupakan copy database nyata, harus dianggap sebagai **potential data exposure incident**, karena backup database dapat membawa:

users, employee data, email, asset ownership, ticket content, audit logs, password hashes, dan data internal lain.

**Remediasi:** keluarkan seluruh dump dari tree, ignore directory, lalu bila ada real data lakukan history rewrite dan credential/session rotation sesuai klasifikasi datanya.

---

# 5. A-03 — Shared Default Password untuk User Baru

`DEFAULT_USER_PASSWORD` adalah required secret di runtime. 

Masalahnya, employee creation dan bulk import menggunakan nilai itu sebagai password default untuk akun baru. Import bahkan meng-hash default password sekali kemudian menerapkannya ke akun-akun yang dibuat. 

Saya tidak menemukan forced first-login password rotation semacam:

`must_change_password = true`

atau equivalent state machine.

Jadi bila 100 user dibuat melalui import, secara desain mereka dapat mulai dengan satu shared secret yang sama.

Root `.env.example` bahkan memberi contoh:

`DEFAULT_USER_PASSWORD=TemporaryUserPass123!` 

**Rekomendasi:** jangan gunakan reusable organization-wide default password. Gunakan random per-user bootstrap token/password atau invitation/reset-password flow, dan paksa credential enrollment sebelum user mendapat normal access.

---

# 6. A-04 — E2E Pipeline Memiliki Beberapa Defect

Ada setidaknya tiga masalah.

Pertama, backend `env.js` mewajibkan `DEFAULT_USER_PASSWORD`, tetapi E2E workflow tidak menyuplai variable tersebut pada test execution.  

Kedua, Playwright config mendefinisikan **Chromium dan Firefox**. 

Tetapi workflow hanya menjalankan:

`npx playwright install --with-deps chromium`

sehingga Firefox project tidak diprovision secara eksplisit. 

Ketiga, backend CI utama menjalankan test suite yang memiliki database integration tests—misalnya sliding-session test secara langsung membuat user/session PostgreSQL—tetapi workflow CI utama tidak mendefinisikan PostgreSQL service maupun schema initialization.  

E2E workflow mempunyai PostgreSQL service; backend CI tidak.

Jadi sesudah GitHub Actions startup blocker diperbaiki pun, pipeline masih perlu direkonsiliasi.

---

# 7. A-05 — `tokenExpiresAt` Salah

Ini regression defect yang konkret.

`issueSessionCookie()` menghitung JWT `exp` pendek, tetapi return value-nya adalah:

`expMs: expiresMs`

di mana `expiresMs` merupakan expiration **server session**, bukan JWT expiration. 

Kemudian login controller melakukan:

`tokenExpiresAt: new Date(expMs).toISOString()`

dan secara terpisah:

`sessionExpiresAt: new Date(session.expiresAt).toISOString()` 

Hasilnya kedua timestamp dapat menunjuk ke masa berlaku sesi 12 jam, sementara JWT sebenarnya sekitar 15 menit.

Authentication middleware sendiri menghitung nilai yang benar dari `claims.exp`. 

**Fix:** `issueSessionCookie()` harus mengembalikan actual token expiry, misalnya `tokenExpiresAtMs = exp * 1000`.

Tambahkan login contract test yang memastikan:

`tokenExpiresAt < sessionExpiresAt`.

---

# 8. A-06 — Graceful Shutdown SSE Masih Salah Urutan

Remediasi sebelumnya menyatakan graceful shutdown sudah selesai.

Tetapi implementasi current HEAD melakukan:

1. `await server.close()`
2. baru `closeAllSseClients()`
3. lalu `pool.end()`



Masalahnya, SSE adalah HTTP connection yang sengaja hidup lama. `server.close()` dapat menunggu active SSE connections selesai, sedangkan SSE baru diperintahkan selesai **setelah await tersebut selesai**.

`closeAllSseClients()` sendiri memang mampu mengakhiri seluruh client. 

Urutan yang lebih aman adalah:

stop accepting connections → close/drain SSE → await HTTP close → drain DB → exit.

Saat ini fail-safe 10 detik dapat berubah menjadi forced shutdown path ketika SSE masih aktif.

---

# 9. Authentication & Security — Bagian yang Sudah Baik

Security architecture secara keseluruhan justru termasuk sisi terkuat project.

JWT verification mem-pin algorithm ke `HS256`, memvalidasi server-side session, mengambil role/permission terbaru dari database, menolak disabled/deleted user, dan tidak mempercayai role/permission yang terdapat pada JWT. 

Browser session menggunakan HttpOnly cookie dengan `SameSite=Lax`, dan `Secure` otomatis aktif pada production. 

Frontend juga sudah berhenti menyimpan JWT di localStorage; localStorage hanya menyimpan sanitized user display state. 

Backend memiliki exact CORS allowlist, `trust proxy` CIDR validation, security headers, state-changing Origin/Referer validation, dan layered rate limit.  

Password change/reset juga melakukan server-side session revocation, anti-enumeration pada forgot-password, dan password complexity validation.  

Untuk rich HTML, project telah menempatkan DOMPurify-based sanitization sebelum `v-html`; sink CaseReader dan editor preview terlihat menggunakan sanitized content. 

Jadi saya **tidak** melihat alasan untuk mengganti total authentication architecture. Yang dibutuhkan adalah menutup defect dan operational gaps.

---

# 10. Database & Schema Lifecycle

Ada dua sistem schema evolution:

- versioned SQL migration runner,
- `bootstrapSchema()` saat setiap server start.

Server production menjalankan database check → `bootstrapSchema()` → `verifyRuntimeSchema()`. 

Sementara migration runner berada di tool `migrateDatabase.js`, dengan mode `--plan` / `--apply`. 

Namun backend `package.json` bahkan tidak mempunyai canonical `db:migrate` command; yang masih diekspos adalah `db:setup`, sementara `setupDatabase.js` sengaja dinonaktifkan dan selalu melempar error.  

Ini perlu disederhanakan.

Production schema sebaiknya mempunyai satu authoritative path:

**versioned migration → validation → application startup**

dan bootstrap runtime hanya untuk idempotent non-destructive safety check, bukan sebagai migration layer kedua.

---

# 11. Seed Database dan Known Credentials

`backend/esb_trackit_db.sql` masih memiliki seed default superadmin yang secara eksplisit mendokumentasikan password `admin123`. 

Legacy production setup command memang sudah dinonaktifkan, jadi saya tidak menyatakan credential tersebut otomatis menjadi production vulnerability. 

Namun file ini digunakan oleh E2E database initialization. 

Sebaiknya test schema dipisahkan dari production migration/bootstrap, sehingga tidak ada known credential pada schema artifact yang berpotensi dipakai operator secara manual.

---

# 12. Deployment & Container Security

Backend Docker image sudah cukup baik karena menjalankan aplikasi sebagai non-root `node` user. Backup storage juga sekarang persistent melalui named volume. 

Namun Docker Compose mem-publish:

`5432:5432` untuk PostgreSQL  
`3000:3000` untuk backend  
`80:80` untuk frontend



Jika frontend Nginx memang canonical entrypoint dan `/api` diproxy ke backend, PostgreSQL dan backend tidak seharusnya perlu di-publish ke host pada production topology.

Cukup network internal Compose untuk Postgres/backend dan publish frontend/reverse-proxy saja.

Nginx sendiri sudah menambahkan CSP, frame protection, forwarded client IP, request ID, dan proxy headers. 

Catatan hardening tambahan: `/api/` menerima `client_max_body_size 500m` secara global karena restore backup. Lebih baik 500 MB hanya untuk restore endpoint dan endpoint umum memakai limit jauh lebih kecil.

---

# 13. Latest Commit Review — `vite.config.js`

Perubahan terbaru memperbaiki port/config drift dengan mencoba:

`VITE_API_PROXY_TARGET` → process env → `backend/.env PORT` → fallback `127.0.0.1:3000`. 

Itu praktis untuk development, tetapi membuat frontend build tooling bergantung pada file environment backend.

Saya lebih menyarankan explicit configuration saja daripada membaca `backend/.env` dari Vite.

Lebih penting, current config menggunakan:

`allowedHosts: true`

untuk dev maupun preview server. 

Karena default bind masih `127.0.0.1`, impact normalnya rendah. Tetapi bila `VITE_HOST=0.0.0.0` digunakan pada LAN/server, host validation ikut terbuka.

Sebaiknya gunakan explicit host allowlist.

---

# 14. CI/CD & Supply Chain

Hal positif:

- GitHub Actions third-party actions dipin ke commit SHA.
- CodeQL telah dikonfigurasi.
- Dependabot telah dikonfigurasi.
- frontend lint + formatting + build dijadikan CI steps. 
- CodeQL memakai minimal explicit permissions. 

Tetapi Dependabot hanya mencakup `/backend`, `/frontend`, dan GitHub Actions. 

Root workspace juga mempunyai dependencies seperti Playwright, axe, dan Lighthouse. 

Jadi perlu npm Dependabot entry untuk directory `/`.

Frontend `xlsx` juga berasal dari direct SheetJS tarball URL, bukan standard npm package registry version.  Ini bukan vulnerability dengan sendirinya, tetapi perlu perhatian khusus terhadap provenance/update automation.

Belum ada quality gate untuk coverage percentage, dependency audit/SBOM, container image scan, atau release artifact provenance yang terlihat pada CI utama.

---

# 15. Maintainability

Project sudah menjadi aplikasi besar tetapi struktur beberapa file belum mengikuti pertumbuhannya.

Repository tree menunjukkan view/controller yang sangat besar; laporan audit sebelumnya juga mengakui **“Large God views & controllers” hanya partially addressed** dan broad refactoring sengaja ditunda. 

Contoh current tree antara lain `TicketsView.vue` yang sudah sekitar 116 KB dan `ticketController.js` sekitar 59 KB. 

Risikonya bukan sekadar style:

- regression lebih sulit dilokalisasi,
- unit testing domain logic lebih sulit,
- merge conflict meningkat,
- authorization logic lebih mudah tersebar,
- UI state menjadi semakin sulit diprediksi.

Refactoring sebaiknya bertahap berdasarkan bounded domain, bukan rewrite.

---

# 16. Dokumentasi & Governance

README masih memiliki beberapa indikasi drift.

Contohnya dokumentasi endpoint menyebut client memakai `Authorization: Bearer <token>`, sementara browser architecture saat ini sudah canonical menggunakan HttpOnly cookie dan frontend explicitly tidak lagi memakai Authorization header.  

QA script lama juga masih membaca token dari `localStorage/sessionStorage` dan melakukan logout ke port `5000`. 

PR terbaru sendiri dibuat dan merged dalam rentang sangat pendek, tanpa requested reviewer maupun conversation comment pada PR snapshot. 

Saya mencoba memverifikasi branch protection melalui GitHub connector, tetapi integration tidak mempunyai permission untuk endpoint tersebut. Jadi required-review / required-status-check protection harus dianggap **unverified**, bukan absent.

---

# 17. Recommended Remediation Order

1. **Freeze production promotion dari HEAD sekarang** sampai GitHub Actions dapat menjalankan jobs dan menghasilkan CI hijau.
2. **Investigasi seluruh tracked `.dump`** tanpa mengekspos datanya; bila ada real company data, lakukan incident handling, history purge, rotation, dan tambahkan `backend/storage/backups/**` ke `.gitignore`.
3. **Hilangkan shared `DEFAULT_USER_PASSWORD` model**; ganti dengan per-user random enrollment/reset flow plus forced initial password setup.
4. **Perbaiki CI/E2E:** provision DB secara deterministik, isi semua required env, install Chromium+Firefox atau restrict project, gunakan `npm ci` tanpa `|| npm install`, lalu jadikan checks required sebelum merge.
5. **Fix authentication contract:** return actual JWT expiry dari `issueSessionCookie()` dan tambah login-response regression test.
6. **Fix graceful shutdown:** close/drain SSE sebelum menunggu `server.close()`.
7. **Tutup infrastructure exposure:** jangan publish PostgreSQL/backend host ports untuk production stack kecuali memang diperlukan.
8. **Satukan database migration lifecycle:** canonical `db:migrate:plan` / `db:migrate:apply`, CI validation, kemudian app startup.
9. **Tighten Vite/Nginx:** explicit `allowedHosts`, endpoint-specific body-size limit, dan CSP `connect-src` lebih sempit.
10. **Perbaiki governance:** Dependabot root workspace, CODEOWNERS/reviewer policy, required CI checks, update README/QA scripts, lalu mulai refactor God controllers/views secara bertahap.

---

# 18. Final Assessment

| Area | Assessment |
|---|---|
| Authentication design | **Good** |
| Authorization / RBAC | **Good** |
| Web security baseline | **Good** |
| Password lifecycle | **Needs improvement** |
| Data/backup hygiene | **High risk** |
| Backend design | **Moderate–Good** |
| Frontend architecture | **Moderate** |
| Database lifecycle | **Needs consolidation** |
| Testing breadth | **Good on paper** |
| CI reliability | **Critical problem** |
| Deployment hardening | **Moderate** |
| Maintainability | **Moderate risk** |
| Governance | **Needs improvement** |
| Production readiness | **HOLD** |

### Kesimpulan

ESB TrackIT **tidak perlu dirombak dari nol**. Arsitektur security utama menunjukkan banyak keputusan yang benar dan remediation September sudah memperbaiki sejumlah P0/P1 lama.

Tetapi current `main` belum layak diberi label production-ready karena tiga kelas risiko belum tertutup:

**CI tidak memberikan release evidence, backup/data hygiene belum aman, dan account bootstrap masih menggunakan shared default password.**

Di samping itu ada dua regression defect yang konkret—`tokenExpiresAt` salah dan graceful shutdown SSE salah urutan—serta beberapa problem CI yang akan muncul sesudah startup failure GitHub Actions dibereskan.

Target yang tepat menurut audit ini adalah:

**stabilize → secure data/credentials → make CI authoritative → fix regressions → consolidate migrations → baru refactor maintainability.**
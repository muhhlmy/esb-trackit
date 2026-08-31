# Plan: Help Center First + Search-No-Result → Login + DB-backed Case/SOP CRUD

## Goal
Make the app open to the Help Center, redirect users to login when a search yields no matching case, and give admin/superadmin real (database-backed) CRUD for Cases/SOPs and the CMS.

## Current context / assumptions (verified by reading the repo)

- Root route `/` → `frontend/src/views/HomeView.vue` = Help Center. **Already opens to Help Center** — no work needed for "Help Center first".
- Search flow today: `HomeView.vue` `handleSearchSubmit()` calls `setSearch(query)` then `router.push('/cases')`. In `CasesView.vue`, `CaseReader` renders `activeCase` from `useCases.js`. There is **no empty-result handling** — `activeCase` falls back to the first case when nothing matches.
- Cases/SOPs are **hardcoded + localStorage**, not in the DB. `frontend/src/composables/useCases.js` holds `DEFAULT_CASES` (6 SOPs) and `fetchCases/saveCase/deleteCase` call `/cases` via `services/api.js` but the backend has **no `/api/cases` route** (confirmed: no case/kb/article table in `backend/esb_trackit_db.sql`, no case controller/route). Every call 404s and silently falls back to local state.
- Case CRUD buttons are gated by `isCrudUnlocked` destructured from `useAuth()` in 4 files (`Navbar.vue`, `MobileNav.vue`, `NotionTreeSidebar.vue`, `CaseReader.vue`). `frontend/src/composables/useAuth.js` **does not export `isCrudUnlocked`** → it is `undefined` (falsy) → CRUD UI is effectively hidden for everyone. This is the root reason admin/superadmin cannot CRUD cases today.
- Admin CMS exists but is also local-only: `frontend/src/views/admin/AdminDashboardView.vue` (list) and `DocEditorView.vue` (TipTap editor; `handleSaveDraft` and `handlePublish` both just call `saveCase` with no status distinction).
- **Reference pattern to reuse**: the FAQ feature just shipped (see `backend/migrations/003_faq.sql`, `backend/src/controllers/faqController.js`, `backend/src/routes/faqRoutes.js`, `backend/src/config/runtimeSchema.js` `faq` block, `frontend/src/views/FaqAdminView.vue`). Follow it exactly: raw `pg` + `AppError`/`createHttpError` + `authorizeRoles` + idempotent `CREATE TABLE IF NOT EXISTS` in both a `migrations/NNN_*.sql` file and `server.js` startup + `runtimeSchema.js` entry.
- Case data shape (frontend camelCase → DB snake_case), from `useCases.js` `DEFAULT_CASES` and `CaseDrawer.vue`:
  - `id` (string in frontend like `'laptop-01'`; DB uses `SERIAL` int — must migrate IDs)
  - `title` → `title`
  - `category` → `category` (values: hardware, software, git, workplace, environment, backend, devops)
  - `severity` → `severity` (high/medium/low)
  - `tags` (string[]) → `tags` (jsonb)
  - `summary` → `summary`
  - `problemContext` → `problem_context`
  - `actionSteps` (string[]) → `action_steps` (jsonb)
  - `dosAndDonts.dos` / `dosAndDonts.donts` (string[]) → `dos` / `donts` (jsonb)
  - `snippets` (`[{label, code}]`) → `snippets` (jsonb)
  - `isCustom` (bool) → `is_custom`
  - NEW: `status` (`DRAFT`/`PUBLISHED`) — added so `DocEditorView` "Save Draft" vs "Publish Article" behave differently and public Help Center only shows `PUBLISHED`.

## Architecture / proposed approach

Single `cases` table (mirroring the FAQ table) with `jsonb` columns for the structured list fields — no normalized `case_steps`/`case_snippets` sub-tables (YAGNI: cases are content documents, not relational data). Backend exposes `/api/cases/*` with public read (`PUBLISHED` only, no auth) and admin CRUD behind `authorizeRoles('admin','super admin','superadmin')`, exactly like `/api/faqs/*`. Frontend rewires the existing `useCases` composable to be purely API-driven (delete `DEFAULT_CASES` + localStorage fallback), fixes the `isCrudUnlocked` gap in `useAuth`, and adds a no-result → login redirect in the search path.

## Step-by-step tasks

### Backend

#### Task 1 — Migration `backend/migrations/004_cases.sql`

Create the file. Follow the `003_faq.sql` style (idempotent `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` + guarded seed).

```sql
-- =====================================================================
-- TABEL: cases (Help Center SOP / Case CMS)
-- Cases & SOPs ditampilkan dinamis di Help Center. Hanya status PUBLISHED
-- yang tampil di publik; DRAFT hanya terlihat via CMS admin.
-- =====================================================================
CREATE TABLE IF NOT EXISTS cases (
    id              SERIAL          PRIMARY KEY,
    title           VARCHAR(300)    NOT NULL,
    category        VARCHAR(100)    NOT NULL,
    severity        VARCHAR(20)     NOT NULL DEFAULT 'medium',
    tags            JSONB           NOT NULL DEFAULT '[]'::jsonb,
    summary         TEXT,
    problem_context TEXT,
    action_steps    JSONB           NOT NULL DEFAULT '[]'::jsonb,
    dos             JSONB           NOT NULL DEFAULT '[]'::jsonb,
    donts           JSONB           NOT NULL DEFAULT '[]'::jsonb,
    snippets        JSONB           NOT NULL DEFAULT '[]'::jsonb,
    status          VARCHAR(20)     NOT NULL DEFAULT 'DRAFT',
    is_custom       BOOLEAN         NOT NULL DEFAULT FALSE,
    sort_order      INTEGER         NOT NULL DEFAULT 0,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_cases_status
        CHECK (status IN ('DRAFT', 'PUBLISHED')),
    CONSTRAINT chk_cases_severity
        CHECK (severity IN ('low', 'medium', 'high'))
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
```

Seed the existing 6 SOPs as `PUBLISHED`, idempotent by `title`. Transcribe verbatim from `frontend/src/composables/useCases.js` `DEFAULT_CASES` (ids `laptop-01`, `laptop-02`, `hp-01`, `hp-02`, `google-workspace-01`, `google-workspace-02`). One full example; repeat for the other 5:

```sql
INSERT INTO cases
  (title, category, severity, tags, summary, problem_context, action_steps, dos, donts, snippets, status, is_custom, sort_order)
SELECT
  'SOP Setup Laptop Baru untuk New Joiner / Pergantian Perangkat',
  'hardware',
  'high',
  '["laptop-baru","oobe","setup-device","new-joiner","it-support","windows"]'::jsonb,
  'Panduan Operasional Standar (SOP) penyiapan unit laptop Windows baru bagi karyawan baru (new joiner) atau fasilitas penggantian unit kerja.',
  'Saat menyiapkan unit laptop baru dari distributor/vendor, diperlukan proses bypass pembuatan akun online Microsoft saat OOBE, penyiapan akun lokal standar perusahaan, penyesuaian opsi keamanan, serta instalasi paket aplikasi kerja wajib.',
  '["Nyalakan unit laptop baru hingga masuk ke tampilan Out-of-Box Experience (OOBE) pada tahap \\"Let''s connect you to a network\\".", "Tekan kombinasi tombol Shift + F10 (atau Fn + Shift + F10) pada keyboard untuk membuka jendela Command Prompt (CMD)."]'::jsonb,
  '["Pastikan script installer .bat dieksekusi dengan hak akses Administrator (Run as Administrator)."]'::jsonb,
  '["Jangan menghubungkan laptop ke koneksi Wi-Fi/Internet pada tahap awal OOBE sebelum menjalankan perintah oobe\\bypassnro."]'::jsonb,
  '[{"label":"Script Auto Setup User & Password Never Expire (.bat)","code":"net user \\"ESB-User\\" Essensians@2026 /add"}]'::jsonb,
  'PUBLISHED',
  FALSE,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM cases WHERE title = 'SOP Setup Laptop Baru untuk New Joiner / Pergantian Perangkat'
);
```

Verification: after applying (Task 5), `SELECT count(*) FROM cases;` returns `6`.

#### Task 2 — Controller `backend/src/controllers/caseController.js`

Mirror `faqController.js`. Use `import { pool } from '../config/database.js'` and the helpers from `../security/requestValidation.js` (`assertPlainObject`, `assertAllowedFields`, `createHttpError`, `parsePositiveIntegerParam`).

Field mapping helpers (single source of truth for row ↔ frontend shape):

```js
function mapCaseRow(row) {
  return {
    id: Number(row.id),
    title: row.title,
    category: row.category,
    severity: row.severity,
    tags: Array.isArray(row.tags) ? row.tags : [],
    summary: row.summary || '',
    problemContext: row.problem_context || '',
    actionSteps: Array.isArray(row.action_steps) ? row.action_steps : [],
    dosAndDonts: {
      dos: Array.isArray(row.dos) ? row.dos : [],
      donts: Array.isArray(row.donts) ? row.donts : [],
    },
    snippets: Array.isArray(row.snippets) ? row.snippets : [],
    status: row.status,
    isCustom: row.is_custom === true,
    sort_order: Number(row.sort_order),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
```

Validation (required: `title`, `category`, `severity`, `status`; arrays must be arrays of strings; `snippets` array of `{label,code}`):

- `title` string, trimmed, 1..300 chars
- `category` string, trimmed, 1..100 chars
- `severity` in `('low','medium','high')`
- `status` in `('DRAFT','PUBLISHED')`
- `tags`/`action_steps`/`dos`/`donts` → array of strings (each ≤ 2000 chars, total ≤ 100 items)
- `snippets` → array of `{label:string, code:string}` (≤ 50 items)
- `summary`/`problem_context` → optional string (trimmed, ≤ 20000 chars)
- `sort_order` → integer ≥ 0 (default 0)
- `is_custom` → boolean (default false)

Endpoint handlers (same shapes as `faqController.js`):

- `listPublicCases(req,res)` → `SELECT ... WHERE status='PUBLISHED' ORDER BY sort_order ASC, id ASC` (public, no auth)
- `listCases(req,res)` → all, `ORDER BY sort_order ASC, id ASC`
- `getCase(req,res)` → by id, 404 if missing
- `createCase(req,res)` → `INSERT ... RETURNING *`, status 201
- `updateCase(req,res)` → `UPDATE ... SET col=COALESCE($n,col), updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`, 404 if missing
- `deleteCase(req,res)` → `DELETE ... RETURNING id`, 404 if missing, returns `{ message }`

Reuse the exact `faqController.js` structure (constants for field sets, `normalize*` functions, `validateCreateBody`/`validateUpdateBody`). Note: `updateCase` must use `COALESCE` against JSONB columns identically (pass `null` for untouched fields) — but JSONB columns must NOT be `COALESCE`d with `null` blindly if the client omits them; keep the same pattern: `payload.tags ?? null` etc.

#### Task 3 — Routes `backend/src/routes/caseRoutes.js`

```js
import { Router } from 'express'
import { authorizeRoles } from '../middleware/authMiddleware.js'
import {
  listCases, getCase, createCase, updateCase, deleteCase,
} from '../controllers/caseController.js'

export const caseRouter = Router()
const requireAdmin = authorizeRoles('admin', 'super admin', 'superadmin')

caseRouter.get('/', requireAdmin, listCases)
caseRouter.get('/:id', requireAdmin, getCase)
caseRouter.post('/', requireAdmin, createCase)
caseRouter.put('/:id', requireAdmin, updateCase)
caseRouter.delete('/:id', requireAdmin, deleteCase)
```

#### Task 4 — Wire routes into `backend/src/routes/index.js`

Add imports and mounts (public read first, then authed admin router), mirroring the FAQ block added earlier:

```js
import { caseRouter }      from './caseRoutes.js'
import { listPublicCases } from '../controllers/caseController.js'
// ...
router.get('/api/cases/public', listPublicCases)   // public, PUBLISHED only, no auth
router.use('/api/cases', authenticateToken, caseRouter)
```

Place these next to the existing `/api/faqs/public` + `/api/faqs` lines so the two public endpoints sit together.

#### Task 5 — `backend/src/config/runtimeSchema.js` + `backend/src/server.js`

- `runtimeSchema.js`: add a `cases` block to `REQUIRED_RUNTIME_SCHEMA` (all columns with `nn('int4'|'varchar'|'text'|'jsonb'|'bool'|'timestamp')` and `optional(...)` for `summary`/`problem_context`), add `cases: 'r'` to `REQUIRED_RELATION_KINDS`, add `idx_cases_status` to `REQUIRED_INDEXES`.
- `server.js`: append the same `CREATE TABLE IF NOT EXISTS cases (...) + CREATE INDEX IF NOT EXISTS idx_cases_status` to the idempotent startup block (next to the `faq` block).

Apply + verify:

```bash
cd backend
node --input-type=module -e "
import 'dotenv/config';
import fs from 'node:fs';
const { pool } = await import('./src/config/database.js');
await pool.query(fs.readFileSync('./migrations/004_cases.sql','utf8'));
const r = await pool.query('SELECT id, title, status FROM cases ORDER BY id');
console.log('cases count =', r.rowCount);
for (const c of r.rows) console.log(c.id, c.status, c.title);
await pool.end();
"
```

Expected: `cases count = 6`, all `PUBLISHED`.

Then schema preflight:

```bash
npm run db:check
```

Expected output unchanged except still valid: `Schema & Export Metadata valid: 3 karyawan, 16 aset, 27 users, 1 tickets.`

#### Task 6 — Backend syntax + test

```bash
node --check src/controllers/caseController.js && node --check src/routes/caseRoutes.js && node --check src/routes/index.js && node --check src/server.js && node --check src/config/runtimeSchema.js && echo OK
npm test
```

Expected: `OK` for the check; `npm test` shows `198 pass, 9 fail` (the 9 are pre-existing `passwordResetOtp.test.js` failures — out of scope, do not fix here). Confirm no NEW failures vs. this baseline.

### Frontend

#### Task 7 — Add `isCrudUnlocked` to `frontend/src/composables/useAuth.js`

Add one computed (admin or superadmin may CRUD) and export it:

```js
const isCrudUnlocked = computed(() => isAdmin.value) // isAdmin is already defined: admin OR superadmin
```

Add `isCrudUnlocked` to the returned object. This flips the currently-`undefined` flag so the existing `v-if="isCrudUnlocked"` blocks in `Navbar.vue`, `MobileNav.vue`, `NotionTreeSidebar.vue`, `CaseReader.vue` render for admin/superadmin only. No other component edits needed for gating.

#### Task 8 — Rewrite `frontend/src/composables/useCases.js` to be DB-driven

Replace the local-first behavior with API-first (no `DEFAULT_CASES`, no localStorage fallback). Keep the exported surface identical so all consumers (`HomeView`, `CasesView`, `CaseReader`, `CaseDrawer`, `NotionTreeSidebar`, `AdminDashboardView`, `DocEditorView`, `App.vue`) keep working:

- `const cases = ref([])` (start empty, not `[...DEFAULT_CASES]`).
- `fetchCases()` → `const data = await api.getCases({category,severity,search}); cases.value = data.data` — note `services/api.js` `getCases` already returns the resolved `request()` body; the current code checks `res.data.length` because the old backend contract was different. Standardize: `cases.value = await api.getCases(...)` where the API returns a plain array (make the backend return a bare JSON array, like FAQ). If `res.data` vs array ambiguity remains, normalize: `const data = await api.getCases(...); cases.value = Array.isArray(data) ? data : (data?.data || [])`.
- `saveCase(formData)` → on create call `api.createCase(payload)` and `unshift`/reload; on edit `api.updateCase(id, payload)`. No try/catch fallback to local mutation — let errors surface so the UI toast shows them.
- `deleteCase(id)` → `await api.deleteCase(id)` then remove locally.
- Add `status` passthrough so `DocEditorView` can set `DRAFT` vs `PUBLISHED`.
- Add a `hasNoSearchResult` computed: `computed(() => !!searchQuery.value.trim() && filteredCases.value.length === 0)`.
- Keep `filteredCases`, `activeCase` selection logic, but change `activeCase` to return `null` when `filteredCases` is empty AND `searchQuery` is set (so "no result" is detectable instead of silently falling back to `cases[0]`).

Verification (quick unit sanity, no framework): run the frontend build.

```bash
cd frontend && npm run build
```

Expected: `✓ built in …` with no error. (If `useCases.js` no longer references `DEFAULT_CASES`, confirm no remaining import/usage with `search_files` for `DEFAULT_CASES`.)

#### Task 9 — Search no-result → login redirect in `frontend/src/views/CasesView.vue`

Use `useCases`'s `searchQuery`, `filteredCases` (or the new `hasNoSearchResult`), and `useAuth`'s `isAuthenticated`:

- Destructure `searchQuery, hasNoSearchResult` from `useCases()` and `isAuthenticated` from `useAuth()`.
- When `hasNoSearchResult` is true, render a "No results" panel instead of `CaseReader`:
  - If `!isAuthenticated` → auto-redirect to `/login` (call `router.push('/login')` in an `onMounted`/`watch` guard), plus show a fallback link "Sign in to submit a ticket".
  - If `isAuthenticated` → show a CTA button "Create a support ticket" that does `router.push('/tickets')`.

Import `useRouter` if not already (CasesView currently does not import it — add `import { useRouter } from 'vue-router'`).

Interpretation note (recorded here so the implementer doesn't guess): "redirect to login" applies when the visitor is anonymous. An already-authenticated user hitting no results is sent to `/tickets` to create a ticket instead of a pointless `/login` round-trip (the router already bounces logged-in users off `/login`).

Verification: build again + manual smoke (Task 11).

#### Task 10 — Wire status in `frontend/src/views/admin/DocEditorView.vue`

- `handleSaveDraft()` → `saveCase({ ...doc.value, status: 'DRAFT' })`.
- `handlePublish()` → `saveCase({ ...doc.value, status: 'PUBLISHED' })`.
- Ensure `doc.value` includes a `status` field defaulting to `'DRAFT'`.

(Optional, low-risk) `AdminDashboardView.vue` already lists via `useCases` — after Task 8 it reflects DB rows automatically; add a `Status` badge column only if time permits, mirroring `FaqAdminView.vue`.

#### Task 11 — End-to-end verification

Backend running on `127.0.0.1:5000` (Vite proxies `/api` there), frontend on `5173`.

Public read:

```bash
curl -s http://127.0.0.1:5000/api/cases/public | head -c 300
```

Expected: JSON array, 6 objects, all `"status":"PUBLISHED"`.

Admin auth gate:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5000/api/cases
```

Expected: `401`.

CRUD flow (script it like the FAQ E2E; obtain a token via `POST /api/auth/login` with `mhmmdhelmya@gmail.com` / `admin123` — reset earlier this session):

1. `POST /api/cases` create a `DRAFT` case → `201`, returns object.
2. `GET /api/cases/public` → count stays 6 (draft hidden).
3. `PUT /api/cases/:id {status:'PUBLISHED'}` → public count 7.
4. `PUT ... {status:'DRAFT'}` → public count 6.
5. `DELETE /api/cases/:id` → `GET /api/cases` count back to 6.

Expected final: 6 cases, no leftover test row.

## Tests / validation (TDD cycle)

Backend has no test framework beyond `node --test`; follow the existing `backend/tests/*.test.js` style and add `backend/tests/caseApi.test.js` BEFORE writing the controller (Task 2) — write it after Task 1 so the table exists:

1. **RED**: write `caseApi.test.js` asserting (a) public list returns only `PUBLISHED`, (b) admin create validates empty `title` → 400, (c) update 404 on missing id, (d) delete removes row. Run `node --test tests/caseApi.test.js` → fails (route missing).
2. **GREEN**: implement Tasks 2–5. Re-run → passes.
3. Keep the existing `npm test` baseline at `198 pass` (do not regress; the 9 `passwordResetOtp` failures are pre-existing).

Commit after each task with `git add -A && git commit -m "..."` (only if the user has asked for commits; otherwise stage-ready is fine).

## Risks, tradeoffs, open questions

- **ID type change**: frontend case `id` is a string (`'laptop-01'`); DB `SERIAL` returns integers. `activeCaseId`/`selectCase` compare by id — after DB migration all ids are ints, so string comparisons still work via `==` in `filteredCases`/`selectCase`, but confirm `:key` and `activeCaseId === item.id` don't break (Vue coerces loosely; verify in smoke test). The 6 seeded SOPs get auto-assigned int ids 1–6; update any hardcoded id references (e.g. `activeCaseId` initial value) to read from the fetched list.
- **`services/api.js` response shape**: `getCases` currently returns whatever `/cases` returns; the backend must return a bare JSON array (not `{data:[...]}`) to match the FAQ public endpoint and keep `useCases` simple. Confirm `getCaseById`/`createCase`/`updateCase`/`deleteCase` in `api.js` match the new endpoints (they already target `/cases`, `/cases/:id` — just verify method/paths).
- **`isCrudUnlocked` scope**: exposing it as `isAdmin` grants CRUD UI to any `admin`/`superadmin` role. Backend still enforces `authorizeRoles` independently, so UI gating is cosmetic only — safe.
- **Seed size**: transcribing 6 long SOPs into `004_cases.sql` is verbose but explicit/reproducible. Alternative (rejected): a Node script importing frontend `DEFAULT_CASES` — cross-package import is fragile. If seed bloat is a concern, seed via a separate `005_seed_cases.sql` so `004` stays table-only.
- **Open question**: should public Help Center show `DRAFT` cases to their creator? No — per requirement, public = `PUBLISHED` only, same as FAQ. Admin sees all via `/api/cases`.

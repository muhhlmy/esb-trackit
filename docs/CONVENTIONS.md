# TrackIT — Project Conventions

Monorepo: Vue 3 SPA + Express API + PostgreSQL. Commands below run from repo root.

## Layout

```
backend/   Express 5 API (ESM, Node >= 22.18). Layered: routes -> controllers -> services -> pg.
frontend/  Vue 3 SPA (Vite, Tailwind 4). views/ = pages, components/ = reusable, composables/ = state.
e2e/       Playwright. Tests in e2e/tests, page objects in e2e/pages, fixtures in e2e/fixtures.
docs/      All documentation: audits/, deploy/, prompts/, qa/.
scripts/   DB initializer + QA automation scripts.
```

## Commands

```bash
# Backend (needs PostgreSQL on localhost:5432)
npm --prefix backend test          # node --test, 299 tests
npm --prefix backend run check     # syntax preflight
npm --prefix backend run dev       # nodemon on :3000

# Frontend
npm --prefix frontend test         # node --test, 88 tests
npm --prefix frontend run lint     # oxlint + eslint
npm --prefix frontend run format:check
npm --prefix frontend run build

# E2E (needs disposable DB ending in _test)
cp .env.e2e.example .env.e2e
npm run test:e2e
```

## Database

Never run DDL manually. Canonical migrations live in `backend/migrations/versioned/`,
applied via `npm --prefix backend run db:migrate:apply` with guard env vars
(MIGRATION_MODE, MIGRATION_EXPECTED_HOST, MIGRATION_EXPECTED_DATABASE,
ALLOW_DB_MIGRATIONS, MIGRATION_RECOVERY_PROOF_ID, MIGRATION_CHANGE_ID).
Existing-DB adoption runbook: `docs/database-migration-adoption.md`.
Files in `backend/migrations/0xx_*.sql` are legacy archive, not executable.

Backend startup verifies runtime schema but never runs DDL.

## Conventions

- Backend: ESM, layered only (routes -> controllers -> services). Controllers validate
  input; services own SQL. All SQL uses parameterized `$1` placeholders. Dynamic
  identifiers must pass `quoteAllowedIdentifier()` in exportController.js.
- Frontend: no Pinia. State = composables. Every HTTP call goes through
  `useApi` (`credentials: 'same-origin'`, HttpOnly session cookie, global 401 handling).
  Never store JWT in localStorage. `utils/authStorage.js` sanitizes the cached user
  object to UI-safe fields only.
- Auth: backend is source of truth for roles/permissions. Client `permissionAccess.js`
  is UX gating only; every endpoint re-checks server-side.
- Secrets: never commit. `.env`, `.env.e2e`, `backend/storage/backups/`, `*.dump`
  are gitignored. QA scripts read `QA_SUPERADMIN_EMAIL`/`QA_SUPERADMIN_PASSWORD`
  from environment, never hardcoded.

## Testing

- Unit tests import source and assert behavior. Frontend tests may assert on source
  text as regression guards, but real browser behavior is E2E.
- E2E only runs against loopback DB with name ending `_test` (enforced in
  `playwright.config.js` and `scripts/initialize-test-database.mjs`).

## CI

`.github/workflows/`: ci.yml (backend+frontend), e2e-tests.yml, codeql.yml.
Required for merge to main. CodeQL must stay green.

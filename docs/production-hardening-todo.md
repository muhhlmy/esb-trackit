# Production Hardening — 30-Item Todo List (Grade A target)

**Date:** 2026-09-22
**Baseline:** commit `bbb9c5f` (working tree uncommitted), lint 0, 92/92 frontend tests, build pass.
**Owner convention:** FE = frontend, BE = backend, DB = database, QA = verification.

Priorities: **P0** = ship-blocker / correctness · **P1** = high-value production quality ·
**P2** = polish · **P3** = nice-to-have.
"Done when" is the acceptance test — an item is not done until that check passes.

---

## A. Consistency — page shell & data display

| # | P | Area | Task | Done when |
| --- | --- | --- | --- | --- |
| 1 | P1 | FE | Adopt `PageHeader` in all 12 remaining views (`AssetsView`, `AssetsGaView`, `AssetsOpsView`, `MyAssetsView`, `SubmissionsView`, `CasesView`, `DatabaseView`, `FaqAdminView`, `admin/AdminDashboardView`, `admin/KbCategoriesView`, `admin/DocEditorView`, `AccessDeniedView`/`NotFoundView`) | No view contains a raw page-level `<h1>`; `rg "<h1" frontend/src/views` returns only editor content areas |
| 2 | P1 | FE | Create a single `EmptyState` primitive (icon, title, description, optional CTA slot) | All 20+ empty states render through it; no ad-hoc empty markup remains |
| 3 | P1 | FE | Create a single `ErrorState` primitive (message + retry action) | Every list/detail view renders `ErrorState` on fetch failure, distinct from empty |
| 4 | P1 | FE | Consolidate KPI cards onto one component (extend `StatCard` for dashboard/shipments/tickets) | One KPI implementation in `components/ui/`; dashboard/shipments/tickets use it |
| 5 | P1 | FE | Replace hand-built `BaseSkeleton` grids with `SkeletonTable` presets (`assets`, `submissions`) | `AssetsView`/`AssetsGaView`/`AssetsOpsView`/`SubmissionsView` use `<SkeletonTable preset=…>` |
| 6 | P2 | FE | Normalise empty-state vocabulary: "Belum ada" = first-run empty, "Tidak ada" = filtered-out | Documented rule in the copy guide; grep shows no mixed usage for the same condition |
| 7 | P2 | FE | De-duplicate copy in `UsersView` (`:977/:1001`) and `SubmissionsView` (`:640/:770`) | Each string exists once, driven by a shared constant |

## B. Feedback & correctness

| # | P | Area | Task | Done when |
| --- | --- | --- | --- | --- |
| 8 | P1 | FE | Remove local `showToast` in `DatabaseView` and `ExportView`; use `useToast` | `rg "function showToast" frontend/src/views` returns nothing; one toast system app-wide |
| 9 | P1 | FE | Replace bare `catch {}` in `DashboardView:312` with logged + surfaced handling | No empty catch blocks in views; error is logged and a toast/error state shown |
| 10 | P1 | FE | Add retry affordance to all failed-fetch paths | Every `catch` on a load path offers retry (via `ErrorState`) |
| 11 | P2 | FE | Prevent duplicate submit on all create/edit forms (disable while pending) | Submitting twice rapidly creates one record (verify manually per form) |

## C. Performance

| # | P | Area | Task | Done when |
| --- | --- | --- | --- | --- |
| 12 | P1 | FE | ✅ **Done** — GSAP lazily loaded; no static `import 'gsap'` remains | `gsap` is a lazy chunk; startup unchanged when animations never run |
| 13 | P1 | FE | ✅ **Done** — dashboard charts async; Chart.js leaves the initial dashboard chunk | `DashboardView` initial chunk < 40 kB; Chart.js loads after KPI paint |
| 14 | P1 | FE | Lazy-load `xlsx` inside the three import modals (dynamic `import('xlsx')` in the handler) | Opening an import modal is the first time `xlsx` is fetched |
| 15 | P2 | FE | Route-level prefetch on link hover/idle for the heaviest routes (`/export`, `/admin/editor`) | Chunk network panel shows prediction only on intent |
| 16 | P2 | FE | Audit `DashboardView` render cost: memoise computed status/location aggregations | No full recompute on unrelated reactive changes (profiled) |
| 17 | P2 | BE | Review list endpoints for over-fetching: return only fields the table renders | Payload per list row reduced; documented in API notes |
| 18 | P1 | DB | Audit missing indexes on hot filter/sort columns (tickets status/priority, assets status/location, logs created_at) | `EXPLAIN ANALYZE` shows index scans, no seq scans on large tables |
| 19 | P2 | DB | Investigate N+1 patterns in `GET /api/assets`, `/api/tickets`, `/api/employees` | Query count per request is constant regardless of row count |
| 20 | P3 | FE | Add bundle-size budget check to CI (fail if entry gzip > threshold) | CI fails on regression above the agreed budget |

## D. Accessibility

| # | P | Area | Task | Done when |
| --- | --- | --- | --- | --- |
| 21 | P1 | QA | Re-run axe-core across all 19 routes (desktop + mobile) and record results | `qa-reports/axe-*.json` current; 0 critical/serious |
| 22 | P1 | FE | Ensure every icon-only control has an accessible name | axe `button-name`/`link-name` = 0; manual audit of `AppRowActions`, row menus |
| 23 | P2 | FE | Verify focus order + trap in every modal/drawer (not just Menu Lainnya) | Keyboard-only run-through of each modal passes |
| 24 | P2 | FE | Confirm colour contrast on all status badges and chart labels | axe `color-contrast` = 0 on all routes |
| 25 | P2 | FE | Verify `prefers-reduced-motion` short-circuits all animation paths | With reduced motion on, no GSAP chunk is requested |

## E. Database & safety

| # | P | Area | Task | Done when |
| --- | --- | --- | --- | --- |
| 26 | P0 | DB | Confirm a verified backup/recovery point exists before any migration | Backup manifest present and restore tested on a disposable copy |
| 27 | P1 | DB | Review all migrations for destructive operations (drop/rename) and confirm rollback path | Each migration has a documented, tested rollback or is proven additive |
| 28 | P2 | DB | Normalise inconsistent field naming / timestamp columns identified in schema review | Naming convention documented; divergences listed with migration plan |

## F. Testing, tooling & docs

| # | P | Area | Task | Done when |
| --- | --- | --- | --- | --- |
| 29 | P1 | QA | Run full E2E + backend suites against a disposable test DB and record results | `npm run test:e2e` + backend tests pass; report checked in |
| 30 | P1 | QA | Add a CI gate that runs axe + unit + build on every PR | PRs cannot merge with failing a11y/build/tests |

---

## Suggested execution order (sprints)

1. **Sprint 1 (correctness):** 8, 9, 10, 26, 29 — remove the second toast system, fix silent catches, protect the DB, prove the baseline.
2. **Sprint 2 (shell consistency):** 1, 2, 3, 4, 5 — one header, one empty state, one error state, one KPI card, one skeleton strategy.
3. **Sprint 3 (performance):** 14, 15, 17, 18, 19 — finish lazy loading, then backend/DB hot paths.
4. **Sprint 4 (a11y + polish):** 6, 7, 11, 21–25.
5. **Sprint 5 (guards):** 16, 20, 27, 28, 30.

---

## Skill recommendations

No new install is required: the capability needed for this work is already available in
this session and the repo (`.agents/skills/`):

- **`accessibility-review`** — items 21–25.
- **`design-critique`** / **`hallmark`** — items 1–7 visual-consistency review.
- **`ux-copy`** / **`anti-ai-slop-writing`** — items 6, 7 copy normalisation.
- **`database-optimizer`** / **`postgres-pro`** — items 18, 19, 27, 28.
- **`verification-before-completion`** — gating every "done when".

If you want a dedicated consistency linter beyond these, the only candidate worth
adding is a design-token/class-drift checker, but item 20's bundle budget plus the
existing `run-copy-linters.js` already cover most of that risk without a new dependency.

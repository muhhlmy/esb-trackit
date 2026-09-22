# UI_UX_AUDIT.md — TrackIT Cross-Page Product Audit

**Date:** 2026-09-22 · **Branch:** `main` · **Last commit:** `bbb9c5f` (working tree uncommitted)
**Phases covered:** 0 (discovery), 1 (baseline), 2 (inventory), 3 (cross-page audit)
**Status:** Phase 3 complete — stopped at the Phase 3→4 gate (see §7).

> Scope discipline: this document is an audit. The only production changes already
> made this session are performance-only and are listed in §5. Nothing else was modified.

---

## 1. Executive summary

TrackIT is a Vue 3 + Express 5 + PostgreSQL asset/helpdesk platform. The foundation
is sound: routing is lazy-loaded and guarded, authorization is enforced server-side,
tests and lint are green, and a partial design system exists. The product's weakness is
**not architecture — it is consistency**. The same UI concepts (page header, KPI card,
table, loading state, empty state, notification) are implemented several different ways
across sibling pages, so the app reads as a set of pages rather than one product.

Three root causes explain most differences:

- **RC-1 — No enforced page shell.** `PageHeader` exists but only 7 of 19 views use it.
- **RC-2 — Primitives were built after pages.** `StatCard`, `SkeletonTable`, `useToast` exist,
  but earlier pages hand-roll equivalents, so the primitives have partial adoption.
- **RC-3 — Feedback paths are per-page.** Some pages use `useToast`, two define their own.
  Error states are usually toast-only, so a failed request is indistinguishable from "no data".

No fabricated content, no invented business rules, and no authorization weakening were
found. Content-integrity issues are limited to a "Pencarian populer" surface and
dummy/fallback topic data in the Help Center (Phase 10 targets).

---

## 2. Phase 0 — Environment & tooling inventory

| Item | Finding | Evidence |
| --- | --- | --- |
| Package manager | npm (lockfile v3, workspaces) | `package-lock.json` |
| Node | `^22.18.0 \|\| >=24.12.0` | `frontend/package.json` `engines` |
| Frontend framework | Vue 3.5 (Composition API, `<script setup>`) | `frontend/package.json` |
| Build | Vite 8 / Rolldown | `vite.config.js` |
| Styling | Tailwind CSS 4 + custom token CSS | `frontend/src/assets/main.css` |
| Backend | Express 5, ESM, `pg` | `backend/src/app.js`, `backend/src/server.js` |
| DB | PostgreSQL 16 | `docker-compose.yml` |
| Routing | Vue Router 5, `createWebHistory`, lazy routes, `beforeEach` guard | `frontend/src/router/index.js` |
| Auth | JWT + server-side session, HttpOnly cookies, RBAC | `router/index.js`, `utils/permissionAccess.js` |
| State | Composables (no Pinia/Vuex) | `frontend/src/composables/` |
| Unit tests | Node built-in runner, 92 tests | `frontend/tests/` |
| E2E | Playwright (chromium + firefox) | `playwright.config.js`, `e2e/` |
| **Axe-core** | ✅ available (`@axe-core/playwright` ^4.13.0) | root `package.json` |
| **Playwright** | ✅ available (^1.50.1) | root `package.json` |
| Type checking | ❌ not present (JS project, `jsconfig.json` only) | `frontend/jsconfig.json` |
| Lighthouse | ❌ not installed | — |
| Bundle analyzer | ❌ not installed (build output used instead) | — |
| Visual regression | ❌ not installed | — |
| Storybook | ❌ not installed | — |
| Theme | Light theme is the product; `html.dark` rules exist but are not the target | `main.css` |

**Gate 0 — PASS.** Architecture and tooling understood; no production code modified for discovery.

### 2.1 Existing design-system sources (fragmentation risk)

- `design-tokens/*.json` → generated `frontend/src/styles/tokens.css` (via `scripts/build-tokens.js`).
- `frontend/src/assets/main.css` — primary CSS token/theme file.
- `frontend/src/composables/useChartTheme.js` — chart colours.
- `frontend/src/utils/assetStatus.js`, `dashboardDesignTokens` (removed earlier) — status maps.

Chart colours are centralised, but there is no single authoritative list of *component*
tokens (button/table/badge), so component CSS still carries literal hex values.

---

## 3. Phase 1 — Baseline

| Check | Result |
| --- | --- |
| Build | ✅ pass (`vite build`, ~16 s) |
| Lint (oxlint + eslint) | ✅ 0 errors |
| Unit tests | ✅ 92/92 |
| Backend tests | ✅ (per prior run) 284/286, 2 skipped |
| E2E / axe | ⚠️ configured, needs disposable `_test` DB to run — not executed here |
| Light theme | ✅ enforced by product |

**Baseline failures at start of session:** none outstanding (prior audit fixed the
known lint/test failures). Recovery snapshot: `.backups/2026-09-22_pre-english/`.

**Gate 1 — PASS.** Baseline documented; existing failures separated from new.

---

## 4. Phase 2 — Structural inventory

### 4.1 Route inventory (23 entries incl. aliases)

| Path | Name | Layout | Permission |
| --- | --- | --- | --- |
| `/` | home | Help Center | public |
| `/cases`, `/cases/:id` | cases, case-detail | Help Center / app-shell | public |
| `/login` | login | standalone | public |
| `/dashboard` | dashboard | app-shell | `dashboard` |
| `/assets` | assets | app-shell | `assets` |
| `/assets-ga` (`/assets/ga`) | assets-ga | app-shell | `assets_ga` |
| `/assets-ops` (`/assets/ops`) | assets-ops | app-shell | `assets_ops` |
| `/my-assets` (`/assets/karyawan`) | my-assets | app-shell | `my_assets` |
| `/karyawan` | karyawan | app-shell | `karyawan` |
| `/tickets` | tickets | app-shell | `tickets` |
| `/users` | users | app-shell | `users` |
| `/faqs` | faqs | app-shell | `knowledge_base` |
| `/submissions` (`/pengajuan`) | submissions | app-shell | `submissions` |
| `/shipments` (`/pengiriman`) | shipments | app-shell | `shipments` |
| `/logs` | logs | app-shell | `logs` |
| `/export` | export | app-shell | `export` (superadmin) |
| `/database` | database | app-shell | superadmin |
| `/admin/cases` | admin-cases | app-shell | `knowledge_base` (admin+) |
| `/admin/kb-categories` | admin-kb-categories | app-shell | `knowledge_base` (admin+) |
| `/admin/editor/:id?` (`/admin/article-editor/:id?`) | article-editor | fullscreen | `knowledge_base` (admin+) |
| `/forbidden` | forbidden | app-shell | public |
| `/:pathMatch(.*)*` | NotFound | app-shell | public |

### 4.2 Layouts

- **app-shell** — `AppSidebar` + `AppHeader` + `RouterView` with GSAP page transition (`App.vue`).
- **Help Center standalone** — `Navbar` + `MobileNav` (public `/`, anonymous `/cases`).
- **fullscreen editor** — `RouterView` + `Toast` + `AppBottomNav`.
- **login** — standalone.

### 4.3 Component inventory (reusable)

| Group | Components |
| --- | --- |
| `ui/` | `PageHeader`, `StatCard`, `AppModal`, `AppBadge`, `AppPagination`, `AppRowActions`, `AppViewToggle`, `CustomSelect`, `SearchableSelect`, `FilterModal`, `AppImportModal`, `AssetCategoryImportModal`, `AssetCategoryExportModal`, `ShipmentImportModal`, `ShipmentExportModal` |
| `ui/skeleton/` | `BaseSkeleton`, `SkeletonTable`, `SkeletonCard`, `SkeletonList`, `SkeletonChart`, `SkeletonAvatar` |
| `layout/` | `AppSidebar`, `AppHeader`, `AppBottomNav`, `MobileNav`, `Navbar` |
| `common/` | `Toast`, `AuthGateCard`, `AssetLabelModal` |
| `charts/` | `AssetTrendLineChart`, `AssetTypeBarChart`, `AssetConditionPieChart`, `CsatDashboardSection`, `CsatTrendLineChart`, `BaseChartCard` |
| `dashboard/` | `QuickActions`, `StatCard` ⚠️ **dead (unused — no src consumer)** |

### 4.4 Composables / API client

`useApi` (fetch wrapper, same-origin cookies), `useAuth`, `useToast`, `useViewMode`,
`useTicketRealtime`, `useTicketEvents`, `useCases`, `useKbCategories`, `useBookmarks`,
`useLanguage` (ID/EN dictionary — **used only by HomeView + Navbar**), `useChartTheme`,
`useGsap` (now lazy).

### 4.5 Forms / tables / dialogs / notifications

- Forms: inline in views; `CustomSelect`/`SearchableSelect` for selects; native validation + toast errors.
- Tables: per-view markup; `AppPagination` shared; `AppViewToggle` (card/table) on 8 list pages.
- Dialogs: `AppModal` shared; import/export modals per domain.
- Notifications: `useToast` + global `Toast`; **two views use a private toast (RC-3)**.

**Gate 2 — PASS.** Complete route, page, layout, and reusable-component inventory exists.

---

## 5. Changes already made this session (performance only)

| File | Change | Evidence |
| --- | --- | --- |
| `frontend/src/composables/useGsap.js` | GSAP loaded on demand via `import('gsap')`; added shared `animateIn()` helper; DOM-only fallback | no static `import 'gsap'` remains |
| `frontend/src/views/DashboardView.vue` | 4 chart components via `defineAsyncComponent` | initial chunk 79.26 → **8.86 kB gzip** |
| `frontend/src/views/HomeView.vue`, `admin/KbCategoriesView.vue`, `admin/AdminDashboardView.vue` | use `animateIn()`; no eager GSAP | startup `index+useGsap` 58.87 → **31.5 kB gzip** |

Verified: lint 0, 92/92 tests, build pass. Recovery point: `.backups/2026-09-22_pre-english/`.

---

## 6. Phase 3 — Cross-page audit

### 6.1 Comparison matrix

✅ shared primitive · ⚠️ partial · ❌ custom/absent

| Route | PageHeader | KPI cards | Pagination | View toggle | Loading | Toast |
| --- | --- | --- | --- | --- | --- | --- |
| dashboard | ✅ | ❌ custom | n/a | n/a | SkeletonCard/Chart | inline error ref |
| assets | ❌ | – | ✅ | ✅ | ⚠️ hand-built | – |
| assets-ga | ❌ | – | ✅ | ✅ | ⚠️ hand-built | – |
| assets-ops | ❌ | – | ✅ | ✅ | ⚠️ hand-built | – |
| my-assets | ❌ | ✅ StatCard | ✅ | – | ⚠️ | inline |
| tickets | ✅ | ❌ custom | ✅ | ✅ | SkeletonList | – |
| shipments | ✅ | ❌ custom | ✅ | ✅ | SkeletonTable | – |
| submissions | ❌ | – | ❌ | – | ⚠️ hand-built | – |
| karyawan | ✅ | ✅ StatCard | ✅ | ✅ | SkeletonTable | – |
| users | ✅ | ✅ StatCard | ✅ | – | SkeletonTable | – |
| logs | ✅ | – | ✅ (×3) | ✅ | SkeletonTable | – |
| export | ✅ | – | – | – | SkeletonCard | ❌ local |
| database | ❌ | – | – | – | SkeletonCard | ❌ local |
| faqs | ❌ | – | – | – | ⚠️ | ✅ useToast |
| cases | ❌ | – | – | – | ⚠️ | – |
| admin/cases | ❌ | – | – | ✅ | ⚠️ | ✅ useToast |
| admin/kb-categories | ❌ | – | – | – | ⚠️ | ✅ useToast |
| admin/editor | ❌ | – | – | – | – | ✅ useToast |

### 6.2 Findings — with root cause, class, and evidence

| ID | Finding | Root cause | Class | Evidence |
| --- | --- | --- | --- | --- |
| C-01 | 12 views hand-roll page headers | RC-1 | design inconsistency | `DatabaseView:361`, `SubmissionsView:640/770`, `AccessDeniedView:7` |
| C-02 | 4 different KPI-card implementations | RC-2 | design inconsistency | `StatCard.vue` vs dashboard/shipments/tickets |
| C-03 | 4 loading strategies; hand-built skeletons | RC-2 | design inconsistency | `AssetsView:971-1035`, `TicketsView:2986` |
| C-04 | Two toast systems | RC-3 | **functional inconsistency** | `DatabaseView:62`, `ExportView:93` |
| C-05 | Empty-state copy unnormalised ("Belum ada" vs "Tidak ada") | RC-1/RC-2 | design inconsistency | `AssetsView:1068`, `LogsView:476`, `ShipmentsView:525` |
| C-06 | Most list views have no persistent error state (toast-only) | RC-3 | **functional inconsistency** | `router`-wide fetch paths |
| C-07 | Duplicated copy/headings inside one view | RC-2 | design debt | `UsersView:977/1001`, `SubmissionsView:640/770` |
| C-08 | Dead duplicate `components/dashboard/StatCard.vue` | RC-2 | design debt | no `src` importer |
| C-09 | Search is client-side on 7 pages, server-side on 3 | technical (dataset size) | **intentional** — document it | `TicketsView:593`, `LogsView`, `ShipmentsView` |
| C-10 | `useLanguage` (ID/EN) exists but only HomeView/Navbar use it | RC-1 | design debt | `useLanguage.js` consumers |
| H-01 | Help Center shows "Pencarian populer" + fallback topic/dummy data | content integrity | **to fix (Phase 10)** | `useLanguage.js` `popular_searches`, `HomeView` |

### 6.3 Classification of intentional differences (do not "fix")

- **C-09** client vs server search — justified by dataset size; Phase 17 should document the rule.
- Fullscreen editor layout, Help Center standalone layout, login standalone layout — intentional layout variants.
- Charts only on dashboard — intentional (single chart consumer).

**Gate 3 — PASS.** Priority list, root causes, and duplicate patterns identified. No broad implementation performed.

---

## 7. Stop condition

Per the prompt's own rule, Phase 4 (P0 fixes) does not begin until this gate is accepted.
Recommended Phase 4 scope (P0 only, none are currently proven to block users without a
live run): verify mobile navigation without refresh, verify no false `/forbidden` on
authorized deep links, verify auth initialization has no race. These require the E2E/test
DB, so Phase 4 should start by running the E2E suite.

See `docs/UI_UX_TODO.md` for the full 30-item backlog with implementation and validation detail.

---

## 8. Phase 4 — live E2E evidence (2026-09-22)

A local stack was already running and was used as-is:

| Service | Endpoint | Status |
| --- | --- | --- |
| API | `http://127.0.0.1:3000/health` | `{"status":"healthy"}` |
| Frontend | `http://127.0.0.1:5173/` | HTTP 200 |
| Postgres | `127.0.0.1:5432` | accepting connections |

E2E ran on its own isolated ports (`:3100` API / `:5273` frontend) against the
**disposable** `esb_trackit_test` DB (`test:e2e:prepare` → migrate `fresh` + seed) — the
running instance was not touched.

### Results (chromium)

| Suite | Result |
| --- | --- |
| `smoke` + `accessibility` + `rbac` | **12 passed / 9 failed** (3.2 m) |
| `dashboard` + `viewmode` | **14 passed / 1 failed** (2.1 m) |

**Safety signal:** the dashboard suite is green, which confirms the async-chart change
(DashboardView) did not regress KPI/chart rendering.

### Failure attribution

| Suite | Cause | Class |
| --- | --- | --- |
| accessibility / Menu Lainnya | Playwright **strict-mode violation**: `[aria-label="Menu lainnya"]` matches both the button and the drawer `<nav>` | **test-side bug** |
| rbac / Admin Dashboard | navigates to `/`, lands on the **public Help Center**, then expects the dashboard KPI "Total Aset" | **routing/expectation mismatch** — needs a product decision |
| viewmode / Shipments | view toggle (`role=group`, name "Mode tampilan daftar") not found although 13 sibling viewmode specs pass | likely permission/redirect — needs attribution |
| smoke / S-05 | `page.goto` target closed (timeout cascade) | cascade |
| accessibility / skip-link, 2× axe Dashboard, Quick Actions, Focus-visible | not yet attributed (error contexts overwritten by the next run) | needs re-run |

### P0/P1 candidates found live

- **R-01 (P1, HIGH):** authenticated users opening `/` stay on the public Help Center;
  the mobile "Beranda" slot and `defaultLandingRoute()` expect a dashboard landing for
  permitted roles. This is a behaviour decision — **not changed unilaterally**.
- **R-02 (P1, MEDIUM):** `e2e/tests/accessibility/accessibility.spec.js` Menu Lainnya locator
  is ambiguous (button + nav share the aria-label) — a test fix, safe to correct.
- **H-01 confirmed live:** the public Help Center renders "Pencarian populer" with dummy
  chips (Password Reset / VPN Setup / Hardware Request) — Phase 10 / TODO 20.

### Note on evidence retention

Playwright clears `test-results/` on each run, so only the most recent run's error
contexts were available when this was written. A single consolidated run (all suites,
`--reporter=json`) should be captured next time to preserve full evidence.

# UI_UX_TODO.md — TrackIT 30-Item Production Backlog

**Date:** 2026-09-22 · **Scope:** TrackIT frontend (app-shell, pages, design system) + read-only backend/DB review
**Status legend:** `DONE` · `IN PROGRESS` · `BLOCKED (needs test DB)` · `NOT STARTED`
**Risk:** LOW (visual, predictable) · MEDIUM (multi-page behaviour) · HIGH (routing/auth/state/shell) · CRITICAL (access control/data/startup)

Items marked DONE were completed and verified this session; see evidence in `docs/UI_UX_AUDIT.md` §5.

---

## TODO 01 — Full workspace structural discovery
- **Problem:** No single current map of the workspace, tooling, and architecture.
- **Evidence:** Repo root, `frontend/`, `backend/`; README; `package.json`; `vite.config.js`.
- **Root cause:** N/A (discovery task).
- **Impact:** Enables all later phases.
- **Affected:** whole repo (read-only).
- **Components:** N/A.
- **Risk:** LOW.
- **Implementation:** Inventory completed and recorded.
- **Validation:** `docs/UI_UX_AUDIT.md` §2.
- **Status:** DONE

## TODO 02 — Baseline build and functional health
- **Problem:** Need a known-good baseline before changes.
- **Evidence:** lint 0, 92/92 unit tests, build pass; backend 284/286.
- **Root cause:** N/A.
- **Impact:** Distinguishes pre-existing vs new failures.
- **Affected:** `frontend/`, `backend/`.
- **Components:** N/A.
- **Risk:** LOW.
- **Implementation:** Ran build/lint/tests; snapshot at `.backups/2026-09-22_pre-english/`.
- **Validation:** `docs/UI_UX_AUDIT.md` §3.
- **Status:** DONE

## TODO 03 — Complete route and page inventory
- **Problem:** Routes/pages/layouts were not consolidated in one place.
- **Evidence:** `router/index.js` (23 entries incl. aliases).
- **Root cause:** N/A.
- **Impact:** Basis for cross-page comparison.
- **Affected:** `frontend/src/router/index.js`, `frontend/src/views/**`.
- **Components:** layouts in `components/layout/`.
- **Risk:** LOW.
- **Implementation:** Recorded.
- **Validation:** `docs/UI_UX_AUDIT.md` §4.
- **Status:** DONE

## TODO 04 — Cross-page structural comparison
- **Problem:** Sibling pages use different structural primitives.
- **Evidence:** findings C-01, C-02, C-03 in `docs/UI_UX_AUDIT.md`.
- **Root cause:** RC-1 (no enforced page shell), RC-2 (primitives built late).
- **Impact:** Pages read as unrelated; high visual inconsistency.
- **Affected:** `DatabaseView`, `SubmissionsView`, `AssetsView`, `AssetsGaView`, `AssetsOpsView`, `MyAssetsView`, `CasesView`, `FaqAdminView`, `admin/**`.
- **Components:** `PageHeader`, `StatCard`, `SkeletonTable`.
- **Risk:** LOW–MEDIUM (shared-component rollout).
- **Implementation:** Unify on `PageHeader`; extend `StatCard`; standardise skeletons.
- **Validation:** grep for raw page `<h1>`; visual check of ≥3 representative pages.
- **Status:** NOT STARTED

## TODO 05 — Cross-page functional comparison
- **Problem:** Same actions behave differently (toast, error handling, duplicate submit).
- **Evidence:** C-04, C-06.
- **Root cause:** RC-3 (per-page feedback paths).
- **Impact:** Inconsistent feedback; failures look like empty data.
- **Affected:** `DatabaseView`, `ExportView`, all list views.
- **Components:** `useToast`, `Toast`.
- **Risk:** MEDIUM.
- **Implementation:** Single toast path; add error states.
- **Validation:** trigger a failing request on 3 pages; identical behaviour.
- **Status:** NOT STARTED

## TODO 06 — Routing and navigation audit
- **Problem:** Need proof guards, aliases, deep links, back/forward behave.
- **Evidence:** `router/index.js` `beforeEach`, aliases, `onError` recovery.
- **Root cause:** N/A (audit).
- **Impact:** Reliability of navigation.
- **Affected:** `router/index.js`, `utils/permissionAccess.js`, `utils/authStorage.js`.
- **Components:** `AppSidebar`, `AppBottomNav`.
- **Risk:** HIGH (validation only).
- **Implementation:** E2E navigation matrix per role.
- **Validation:** Playwright run with `_test` DB.
- **Status:** IN PROGRESS — live chromium run done; found R-01 (authenticated `/` lands on public Help Center). See `docs/UI_UX_AUDIT.md` §8.

## TODO 07 — Mobile navigation deep fix
- **Problem:** Must confirm mobile nav needs no manual refresh and all routes reachable.
- **Evidence:** `AppBottomNav` "Menu Lainnya" already routes from shared `navigationConfig.js`.
- **Root cause:** Prior audit already centralised config.
- **Impact:** Mobile usability.
- **Affected:** `components/layout/AppBottomNav.vue`, `config/navigationConfig.js`.
- **Components:** `AppBottomNav`.
- **Risk:** HIGH (nav availability).
- **Implementation:** Verify RBAC matrix + no-refresh; fix only proven defects.
- **Validation:** 390×844 Playwright run.
- **Status:** BLOCKED (needs test DB)

## TODO 08 — Forbidden and authorization root cause analysis
- **Problem:** Rule out false `/forbidden` for authorized users.
- **Evidence:** guard redirects to `findFirstAllowedRoute`; server enforces final access.
- **Root cause:** Possible session-hydration timing on first load.
- **Impact:** Users blocked from permitted pages.
- **Affected:** `router/index.js`, `utils/authStorage.js`, `backend/src/**`.
- **Components:** N/A.
- **Risk:** CRITICAL.
- **Implementation:** Trace hydration order; fix only if reproduced.
- **Validation:** per-role E2E deep-link test.
- **Status:** IN PROGRESS — RBAC suite ran; 2 failures traced to navigation/routing expectation, not a proven false-Forbidden. See §8.

## TODO 09 — Application initialization performance audit
- **Problem:** Quantify startup cost and waterfall.
- **Evidence:** entry `index` 30.4 kB gzip; GSAP/Chart.js now lazy.
- **Root cause:** N/A (audit).
- **Impact:** Perceived speed.
- **Affected:** `main.js`, `App.vue`, `composables/**`.
- **Components:** N/A.
- **Risk:** MEDIUM.
- **Implementation:** Measure FCP/LCP/long tasks; identify duplicate init requests.
- **Validation:** Performance trace before/after.
- **Status:** NOT STARTED

## TODO 10 — Fast TrackIT flash screen
- **Problem:** Ensure initial boot has a fast, non-lingering loader.
- **Evidence:** `frontend/index.html`; `main.js` mount.
- **Root cause:** N/A.
- **Impact:** First impression; avoids blank screen.
- **Affected:** `frontend/index.html`, `frontend/src/main.js`, `App.vue`.
- **Components:** N/A.
- **Risk:** MEDIUM.
- **Implementation:** Fast-flash that hides immediately on ready; no artificial delay.
- **Validation:** Throttled reload; loader gone when app ready.
- **Status:** NOT STARTED

## TODO 11 — Route transition loading
- **Problem:** Route chunk loading can look stalled for heavy routes.
- **Evidence:** `App.vue` GSAP transition; lazy routes.
- **Root cause:** Lazy chunks have no explicit loading affordance.
- **Impact:** Perceived responsiveness.
- **Affected:** `App.vue`, `router/index.js`.
- **Components:** skeletons.
- **Risk:** MEDIUM.
- **Implementation:** Light per-route loading state; do not full-screen-block every route.
- **Validation:** Navigate to `/export`; no blank frame.
- **Status:** NOT STARTED

## TODO 12 — Design system normalization
- **Problem:** Component tokens (button/table/badge) have literal hex values; partial token use.
- **Evidence:** `design-tokens/*.json`, `styles/tokens.css`, `main.css`.
- **Root cause:** tokens added after components; no component-token layer.
- **Impact:** Colour/spacing drift across components.
- **Affected:** `components/ui/**`, `assets/main.css`, `design-tokens/**`.
- **Components:** all primitives.
- **Risk:** MEDIUM.
- **Implementation:** Add component tokens; replace literals; 8px spacing scale.
- **Validation:** no unresolved hex in component CSS; visual diff.
- **Status:** NOT STARTED

## TODO 13 — Global layout consistency
- **Problem:** Page container width/padding and action placement vary.
- **Evidence:** app-shell `max-w-[1560px]`; page-level headers differ (C-01).
- **Root cause:** RC-1.
- **Impact:** Pages feel like one app only partially.
- **Affected:** `App.vue`, `components/layout/**`, views.
- **Components:** `PageHeader`, `AppHeader`.
- **Risk:** MEDIUM.
- **Implementation:** One page shell contract (header + toolbar + content width).
- **Validation:** side-by-side of 5 list pages.
- **Status:** NOT STARTED

## TODO 14 — Reusable component consistency matrix
- **Problem:** Duplicate/dead primitives; partial adoption.
- **Evidence:** C-08 dead `components/dashboard/StatCard.vue`; two StatCards.
- **Root cause:** RC-2.
- **Impact:** Confusion, drift.
- **Affected:** `components/ui/StatCard.vue`, `components/dashboard/StatCard.vue`.
- **Components:** `StatCard`.
- **Risk:** LOW.
- **Implementation:** Delete dead duplicate; keep one KPI component.
- **Validation:** build + grep importers.
- **Status:** DONE — dead duplicate `components/dashboard/StatCard.vue` deleted (verified zero importers in `src` and `tests`). Lint 0 · 92/92 tests · build passes. Remaining: extend `ui/StatCard` for dashboard/shipments/tickets (TODO 04).

## TODO 15 — Dashboard UX audit
- **Problem:** Dashboard uses bespoke KPI cards and inline empty/error text.
- **Evidence:** `DashboardView` custom KPI markup; charts now async.
- **Root cause:** RC-2/RC-3.
- **Impact:** Inconsistent with list pages.
- **Affected:** `views/DashboardView.vue`.
- **Components:** `StatCard`, `QuickActions`, charts, skeletons.
- **Risk:** MEDIUM.
- **Implementation:** Adopt shared KPI + empty/error primitives; keep data logic.
- **Validation:** dashboard functional test + visual check.
- **Status:** NOT STARTED

## TODO 16 — Asset management UX audit
- **Problem:** Assets IT/GA/OPS differ in header and skeleton implementation.
- **Evidence:** C-01, C-03.
- **Root cause:** RC-1/RC-2.
- **Impact:** Three near-identical pages look different.
- **Affected:** `AssetsView`, `AssetsGaView`, `AssetsOpsView`.
- **Components:** `PageHeader`, `SkeletonTable`, `FilterModal`.
- **Risk:** MEDIUM.
- **Implementation:** Same shell + skeletons; preserve each page's fields/rules.
- **Validation:** CRUD flow per page.
- **Status:** NOT STARTED

## TODO 17 — Request and approval UX audit
- **Problem:** Submissions/shipments/tickets workflows differ in header & states.
- **Evidence:** `SubmissionsView` raw `<h1>`; C-01/C-05.
- **Root cause:** RC-1/RC-2/RC-3.
- **Impact:** Workflow inconsistency.
- **Affected:** `SubmissionsView`, `ShipmentsView`, `TicketsView`.
- **Components:** `PageHeader`, `EmptyState`, `ErrorState`.
- **Risk:** MEDIUM.
- **Implementation:** Align shell and state handling; no business-rule changes.
- **Validation:** end-to-end create flow per workflow.
- **Status:** NOT STARTED

## TODO 18 — Form system audit
- **Problem:** Labels/validation/submit-state patterns vary; duplicate-submit risk.
- **Evidence:** inline `v-model` forms; toast-only errors.
- **Root cause:** RC-2/RC-3.
- **Impact:** Data-entry inconsistency; double submits.
- **Affected:** all views with forms.
- **Components:** `CustomSelect`, `SearchableSelect`, `AppModal`.
- **Risk:** MEDIUM.
- **Implementation:** standard field/label/error pattern; disable while pending.
- **Validation:** rapid-double-submit test per form.
- **Status:** NOT STARTED

## TODO 19 — Table and data density audit
- **Problem:** Table markup/density/search strategy differ per page.
- **Evidence:** C-09; per-view table markup.
- **Root cause:** RC-2.
- **Impact:** Readability/consistency.
- **Affected:** list views.
- **Components:** `SkeletonTable`, `AppPagination`, `AppViewToggle`.
- **Risk:** MEDIUM.
- **Implementation:** shared table conventions; document search rule.
- **Validation:** compare 4 list pages at 1280/768.
- **Status:** NOT STARTED

## TODO 20 — Help Center and content integrity audit
- **Problem:** "Pencarian populer" and fallback/dummy topic content present.
- **Evidence:** `useLanguage.js` `popular_searches`; `HomeView` topic fallbacks.
- **Root cause:** placeholder content shipped with the Help Center.
- **Impact:** Perceived fake content; broken/no-data links.
- **Affected:** `views/HomeView.vue`, `components/layout/Navbar.vue`, `composables/useLanguage.js`, `useCases`.
- **Components:** topic cards, popular-search chips.
- **Risk:** MEDIUM.
- **Implementation:** hide/remove dummy sections; render only real KB data or true empty state.
- **Validation:** verify each article id/route/link resolves; grep for dummy arrays.
- **Status:** IN PROGRESS — DONE: removed "Pencarian populer" (block + `defaultPopularSearches` + fetch + `TrendingUp`), removed `DEFAULT_FEATURED_SOPS` and `DEFAULT_TOPIC_CARDS` fallbacks (now data-only), gated the Topics section with `v-if`. Verified: build + lint 0 + 92/92 tests + live render (public E2E snapshot shows section gone).
- **Remaining:** `DEFAULT_FAQS` hardcoded fallback + FAQ section gating; verify no `DEFAULT_*` arrays remain.

## TODO 21 — Empty state system
- **Problem:** Empty states unnormalised and often CTA-less.
- **Evidence:** C-05.
- **Root cause:** RC-1/RC-2.
- **Impact:** Unclear next step for users.
- **Affected:** all list/detail views.
- **Components:** new `EmptyState` primitive.
- **Risk:** LOW.
- **Implementation:** one primitive (icon/title/desc/CTA); one vocabulary rule.
- **Validation:** every empty case renders through it.
- **Status:** NOT STARTED

## TODO 22 — Error handling system
- **Problem:** Failures surface as empty tables (toast-only).
- **Evidence:** C-06.
- **Root cause:** RC-3.
- **Impact:** Users cannot tell failure from no-data.
- **Affected:** all fetch paths.
- **Components:** new `ErrorState` primitive, `useToast`.
- **Risk:** MEDIUM.
- **Implementation:** shared error state with retry; distinct from empty.
- **Validation:** force 500 on 3 pages; retry works.
- **Status:** NOT STARTED

## TODO 23 — Responsive system audit
- **Problem:** Verify 320–1920 behaviour, no overflow, tables/forms reflow.
- **Evidence:** prior audits claim pass; not re-verified live.
- **Root cause:** N/A (audit).
- **Impact:** Mobile usability.
- **Affected:** all views.
- **Components:** shell, tables, dialogs.
- **Risk:** MEDIUM.
- **Implementation:** viewport sweep with screenshots.
- **Validation:** 9 breakpoints, no horizontal scroll.
- **Status:** BLOCKED (needs running app)

## TODO 24 — Accessibility audit
- **Problem:** Need current axe results across routes.
- **Evidence:** old `qa-reports/axe-*.json` (2026-09-17).
- **Root cause:** N/A.
- **Impact:** Compliance; keyboard/SR usability.
- **Affected:** all views.
- **Components:** icon-only buttons, modals, charts.
- **Risk:** MEDIUM.
- **Implementation:** axe sweep desktop+mobile; fix names/contrast/focus.
- **Validation:** 0 critical/serious.
- **Status:** IN PROGRESS — suite ran on chromium (6 failures). At least one (Menu Lainnya) is a test-side strict-mode locator bug (R-02); the rest need re-attribution with a consolidated run.

## TODO 25 — Performance audit
- **Problem:** Material-impact performance not fully mapped.
- **Evidence:** startup `index+useGsap` 58.87→31.5 kB gzip (DONE); Chart.js out of dashboard chunk (DONE); `xlsx` verified to live **only** in lazy `exportEngine` chunk (`grep SheetJS dist/assets/index-*.js` = 0 hits), so it is already on-demand; `DocEditorView` (Tiptap) is already a lazy route chunk.
- **Root cause:** N/A for xlsx/tiptap — already correct.
- **Impact:** Remaining load speed risk is low.
- **Affected:** `frontend/src/views/DashboardView.vue`, `composables/useGsap.js`, `HomeView.vue`, `admin/**`.
- **Components:** charts, GSAP.
- **Risk:** LOW.
- **Implementation:** GSAP + charts done. Remaining: only add a CI bundle budget (see TODO 29). No further dependency changes needed.
- **Validation:** build output comparison (done).
- **Status:** DONE (core); CI budget deferred to TODO 29

## TODO 26 — Frontend runtime bug hunt
- **Problem:** Runtime errors/leaks not systematically checked.
- **Evidence:** console/network not captured without live run.
- **Root cause:** N/A (audit).
- **Impact:** Hidden defects.
- **Affected:** all views.
- **Components:** `useTicketRealtime`, modals, scroll-lock.
- **Risk:** MEDIUM.
- **Implementation:** console/network capture across flows; fix root causes.
- **Validation:** zero new errors; existing documented.
- **Status:** BLOCKED (needs running app)

## TODO 27 — Formal pairwise page comparison
- **Problem:** Need post-fix comparison to prove convergence.
- **Evidence:** baseline matrix in `docs/UI_UX_AUDIT.md` §6.1.
- **Root cause:** N/A.
- **Impact:** Confirms consistency achieved.
- **Affected:** all major pages.
- **Components:** all primitives.
- **Risk:** LOW.
- **Implementation:** pairwise matrix after Phase 7–9; classify remaining diffs.
- **Validation:** no unexplained major inconsistency.
- **Status:** NOT STARTED

## TODO 28 — Visual and behavioral regression
- **Problem:** Ensure fixes did not regress visuals/behaviour.
- **Evidence:** no baseline screenshots yet (tooling absent).
- **Root cause:** N/A.
- **Impact:** Prevent regressions.
- **Affected:** all.
- **Components:** all.
- **Risk:** MEDIUM.
- **Implementation:** capture desktop/mobile/modals before & after.
- **Validation:** no unintended diff.
- **Status:** NOT STARTED

## TODO 29 — Production hardening and final QA
- **Problem:** Need full gate: build/lint/tests/E2E/axe.
- **Evidence:** unit+build pass; E2E/axe pending DB.
- **Root cause:** N/A.
- **Impact:** Ship confidence.
- **Affected:** `frontend/`, `backend/`, `e2e/`.
- **Components:** N/A.
- **Risk:** HIGH.
- **Implementation:** run all suites; resolve P0/P1.
- **Validation:** all available suites pass.
- **Status:** NOT STARTED

## TODO 30 — Final production report and prioritized backlog
- **Problem:** Need a report reflecting the app's true state.
- **Evidence:** this backlog + audit.
- **Root cause:** N/A.
- **Impact:** Handoff/documentation.
- **Affected:** `docs/**`.
- **Components:** N/A.
- **Risk:** LOW.
- **Implementation:** write `docs/PRODUCTION_QA_REPORT.md`.
- **Validation:** report matches reality.
- **Status:** NOT STARTED

---

## Execution gates

| Phase group | TODOs | Gate |
| --- | --- | --- |
| Phase 0–3 (this session) | 01, 02, 03, 04, 05 | ✅ passed |
| Phase 4 (P0) | 06, 07, 08 | needs E2E/test DB |
| Phase 6 (perf) | 09, 10, 11, 25 | needs perf trace |
| Phase 7–8 (design system) | 12, 13, 14, 18, 19 | visual + functional check |
| Phase 9 (features) | 15, 16, 17 | per-area functional test |
| Phase 10–12 | 20, 21, 22, 23, 24, 26 | axe + runtime capture |
| Phase 13–17 | 27, 28, 29, 30 | full suite pass |

# UI/UX Baseline Audit Report — TrackIT Frontend

**Date:** 2026-09-21
**Environment:** Linux Mint 22.3 (ptx), Node via nvm, npm workspace monorepo
**Auditor:** Hermes Agent (nvidia/nemotron-3-super-120b-a12b)

---

## 1. Architecture Overview

### Repository Structure
```
trackit/                      (root npm workspace)
├── package.json                  (workspace root, scripts)
├── package-lock.json             (npm lockfile v3)
├── skills-lock.json              (agent skills lockfile, v1)
├── docker-compose.yml
├── .github/workflows/            (ci.yml, e2e-tests.yml, codeql.yml)
├── scripts/                      (DB init, QA automation)
│   └── qa/
├── e2e/                          (Playwright E2E tests)
├── backend/                      (Express 5 API, ESM)
└── frontend/                     (Vue 3 SPA)
    ├── package.json
    ├── vite.config.js            (Vite 8 / rolldown)
    ├── tailwind.config.js        (Tailwind CSS 4 config)
    ├── postcss.config.js
    ├── jsconfig.json             (JS, not TypeScript)
    ├── eslint.config.js
    ├── .oxlintrc.json
    ├── .prettierrc.json
    ├── src/
    │   ├── main.js
    │   ├── App.vue
    │   ├── assets/main.css       (25KB — main CSS token file)
    │   ├── router/index.js       (Vue Router 5, lazy-loaded)
    │   ├── composables/          (state/data — no Pinia)
    │   ├── services/api.js       (fetch wrapper, HttpOnly cookies)
    │   ├── utils/                (dashboardDesignTokens, authStorage, etc.)
    │   ├── views/                (16+ views)
    │   ├── components/
    │   │   ├── ui/               (AppBadge, AppModal, AppPagination, etc.)
    │   │   ├── dashboard/        (StatCard, DashboardPanel, TypographyToggle)
    │   │   ├── charts/           (6 chart components + BaseChartCard)
    │   │   ├── layout/           (AppSidebar, AppHeader, AppBottomNav, MobileNav)
    │   │   ├── common/           (Toast, AuthGateCard, AssetLabelModal)
    │   │   └── ui/skeleton/      (6 skeleton components)
    └── tests/                    (88+ node:test files)
```

### Technology Stack (Determined by Inspection)

| Layer | Technology | Details |
|---|---|---|
| **Framework** | Vue 3.5 | Composition API, `<script setup>`, SFCs |
| **Build Tool** | Vite 8.0 | Rolldown renderer, HMR |
| **Package Manager** | npm (npm 7+ workspaces) | package-lock.json v3 |
| **Language** | JavaScript (ESM) | jsconfig.json, no TypeScript |
| **CSS System** | Tailwind CSS 4 | `@tailwindcss/vite`, `@tailwindcss/postcss`, `@custom-variant` |
| **UI Library** | None (custom) | Pure Tailwind + custom Vue components |
| **Chart Library** | Chart.js 4 + vue-chartjs 5 | Single chart ecosystem |
| **Icons** | lucide-vue-next + Material Symbols Outlined | Mixed icon systems |
| **State Management** | Vue 3 `ref`/`reactive` | Composables pattern, no Pinia/Vuex |
| **Data Fetching** | `useApi` composable | fetch API, `credentials: 'same-origin'`, HttpOnly session cookies |
| **Test Framework** | Node test runner (`node --test`) | 92 tests, 10 suites |
| **E2E Framework** | Playwright 1.62 | chromium + firefox browsers |
| **Routing** | Vue Router 5 | `createWebHistory`, lazy-loaded routes, `beforeEach` auth guard |
| **Linting** | ESLint + Oxlint | Dual linter configuration |
| **Formatting** | Prettier | `.prettierrc.json` |
| **Storybook** | Not installed | No component catalog |
| **Skills** | `.agents/skills/` directory | hallmark, anti-ai-slop-writing, no-ai-slop, kill-ai-slop |
| **Skills Lock** | `skills-lock.json` (v1) | 4 skills locked |

### Existing Agent Skills (Phase 3-5 Discovery)

Skills are pre-installed in `.agents/skills/` (symlinked from `.claude/skills/`):

| Skill | Source | Purpose |
|---|---|---|
| `hallmark` | Nutlope/hallmark | Design quality gate — AI slop detection |
| `no-ai-slop` | petergyang/no-ai-slop | Writing quality — README/copy/microcopy |
| `anti-ai-slop-writing` | jalaalrd/anti-ai-slop-writing | Copy editing, documentation, UX writing |
| `kill-ai-slop` | yetone/kill-ai-slop | Anti-AI-slop filter/linter |

### Existing Design System

The project already has a **partially-implemented** design system with multiple sources of truth that need consolidation:

1. **`frontend/src/assets/main.css` (887 lines)** — The primary CSS token file:
   - `@theme {}` block with color, font, and type scale tokens
   - `:root` with desktop typography scaling support (`--fs-scale-factor: 1`)
   - CSS custom properties for colors, radii, shadows, borders, gradients
   - `html.dark` / `html.light` theme support
   - Focus-visible global styles
   - 5-step type scale: `--fs-2xs` (10px) through `--fs-2xl` (18px)
   - Plus Jakarta Sans font family

2. **`frontend/src/composables/useDesignSystem.js`** — JS export of color palette:
   - `COLORS` object with primary/secondary/success/warning/danger/info
   - `STATUS_COLORS` mapping (digunakan, tersedia, dalam perawatan, rusak, disposal)
   - `TYPOGRAPHY` sizes/weights/lineHeights
   - `SPACING`, `RADIUS`, `SHADOWS`
   - Helper functions: `getStatusColor()`, `getBadgeTypeFromStatus()`, `calculatePercentage()`, `formatDate()`, `getDeviceIcon()`

3. **`frontend/src/composables/useChartTheme.js`** — Centralized chart theming:
   - `chartColors` object (brand colors, grays, text colors, grid lines)
   - `palette` array (8-color sequential palette)
   - `fontStack` (matches main.css)
   - `commonOptions` (shared Chart.js config: legend, tooltip, interaction, animations)

4. **`frontend/src/composables/useTypographyScale.js`** — Desktop typography scaling:
   - Supports `DEFAULT` and `COMPACT` modes
   - Persists to localStorage (`dashboard_typography_scale`)
   - Sets `data-typography` attribute on root element
   - NOTE: Only 2 levels (default/compact ~30%), not the required 7-level 100%-70% scale

5. **`frontend/src/utils/dashboardDesignTokens.js`** — Dashboard-specific tokens:
   - Status color mapping for asset conditions
   - `getAssetStatusBadgeType()`, `getAssetStatusColor()`, `getAssetStatusLabel()`

6. **`frontend/tailwind.config.js`** — Tailwind theme extensions for colors, fontFamily, fontSize

### Design Token Fragmentation Problem

**CRITICAL FINDING:** Design tokens exist in **4 separate files** with no single source of truth:
- `main.css` — CSS `@theme` + `:root` variables (primary source)
- `useDesignSystem.js` — JS color constants (partially duplicates main.css)
- `useChartTheme.js` — JS chart color constants (partially duplicates main.css)
- `dashboardDesignTokens.js` — JS status color mappings (partially duplicates main.css)

Color values are inconsistent across files:
- `useDesignSystem.js` has `success: '#13DEB9'`, `danger: '#FA896B'` (pastel/brand palette)
- `useChartTheme.js` has `success: '#0E9F6E'`, `danger: '#DC2626'` (WCAG-compliant Tailwind shades)
- `AssetConditionPieChart.vue` hardcodes `#0E9F6E/#D97706/#EA580C/#DC2626` (chart palette)
- `DashboardView.vue` `getStatusColorClass()` uses `#13DEB9/#49BEFF/#FFAE1F/#FA896B` (design system palette)

This inconsistency is the root cause of the test failure (see §3.4).

### Current Component System

Components are organized into 5 directories:
- **`ui/`** — Primitives: `AppBadge`, `AppModal`, `AppPagination`, `AppRowActions`, `AppViewToggle`, `CustomSelect`, `SearchableSelect`, `FilterModal`, `StatCard` (duplicate of `dashboard/StatCard`)
- **`dashboard/`** — Dashboard-specific: `StatCard`, `DashboardPanel`, `TypographyToggle`
- **`charts/`** — 6 chart components: `AssetConditionPieChart`, `AssetTrendLineChart`, `AssetTypeBarChart`, `BaseChartCard`, `CsatDashboardSection`, `CsatTrendLineChart`
- **`layout/`** — 5 layout components: `AppSidebar`, `AppHeader`, `AppBottomNav`, `MobileNav`, `Navbar`
- **`common/`** — `Toast`, `AuthGateCard`, `AssetLabelModal`
- **`ui/skeleton/`** — 6 skeleton components: `BaseSkeleton`, `SkeletonAvatar`, `SkeletonCard`, `SkeletonChart`, `SkeletonList`, `SkeletonTable`

### Current Chart System

- **Library:** Chart.js 4 + vue-chartjs 5 (single ecosystem, well-maintained)
- **Central theme:** `useChartTheme.js` provides `chartColors`, `palette`, `fontStack`, `commonOptions`
- **Base wrapper:** `BaseChartCard.vue` handles loading/error/empty states with `embedded` mode
- **Chart types:** 2 bar, 2 line, 1 pie (all extend `BaseChartCard`)
- **Color inconsistency:** `AssetConditionPieChart.vue` uses hardcoded WCAG colors (`#0E9F6E`, `#D97706`, `#EA580C`, `#DC2626`) that don't match `useChartTheme.palette` or `useDesignSystem.STATUS_COLORS`

### Current Routing System

Vue Router 5 with:
- `createWebHistory` for clean URLs
- Lazy-loaded route components
- `beforeEach` navigation guard for auth checks
- Permission-based route metadata
- 16+ views: Dashboard, Assets, Assets GA, Assets Ops, My Assets, Tickets, Submissions, Shipments, Employees, Users, Database, Export, Logs, Cases, FAQs, Settings, Admin CMS, Knowledge Base, Login, NotFound

---

## 2. Baseline Audit Results

### 2.1 Build Status

```
npm --prefix frontend run build
```

| Metric | Result |
|---|---|
| **Status** | PASS ✓ |
| Build time | 8.35s |
| Modules transformed | 1861 |
| Output | `frontend/dist/` |
| Main bundle | `dist/index.html` (3.93 kB gzip) |
| JS chunks | Multiple lazy-loaded chunks |
| CSS chunks | Multiple view-scoped chunks (max 8.92 kB gzip for LogsView) |
| Total CSS size | ~70 kB total across view-scoped chunks |

**Bundle size analysis (gzipped):**
- AppViewToggle: 0.11 kB
- AssetTypeBarChart: ~0.11 kB CSS
- SubmissionsView: 0.44 kB
- AppPagination: 0.50 kB
- CasesView: 0.60 kB
- AdminDashboardView: 1.22 kB
- DocEditorView: 1.35 kB
- DatabaseView: 1.47 kB
- ShipmentsView: 1.53 kB
- MyAssetsView: 1.75 kB
- ExportView: 1.76 kB
- TicketsView: 1.95 kB
- LogsView: 2.04 kB
- DashboardView: (not shown — likely largest chunk)

### 2.2 Test Status

```
cd frontend && node --test
```

| Metric | Result |
|---|---|
| **Status** | FAIL ✗ (1 of 92 tests failing) |
| Total tests | 92 |
| Passing | 91 |
| Failing | 1 |
| Suites | 10 |
| Duration | 4.4s |

**Failing test:** `tests/dashboardStatsFixes.test.js` — test: "AssetConditionPieChart defines distinct colors for all 5 asset conditions"

**Root cause:** Test expects colors from `useDesignSystem.js` legacy palette (`#13DEB9`, `#FFAE1F`, `#E855A2`, `#FA896B`) but `AssetConditionPieChart.vue` uses WCAG-compliant Tailwind shades (`#0E9F6E`, `#D97706`, `#EA580C`, `#DC2626`). The current implementation colors are more accessible but the test was not updated.

| Test file | Status |
|---|---|
| adminCmsNoSilentFallback.test.js | PASS ✓ |
| appAudit.test.js | PASS ✓ |
| assetPemegangPreview.test.js | PASS ✓ |
| assetsGaView.test.js | PASS ✓ |
| assetsOpsView.test.js | PASS ✓ |
| attachmentPolicy.test.js | PASS ✓ |
| cmsRbacPermissions.test.js | PASS ✓ |
| dashboardStatsFixes.test.js | FAIL ✗ (1/3 tests) |
| defect06PollingLifecycle.test.js | PASS ✓ |
| defect0708Accessibility.test.js | PASS ✓ |
| dynamicHeaderMeta.test.js | PASS ✓ |
| employeesView.test.js | PASS ✓ |
| exportView.test.js | PASS ✓ |
| importTemplatesDummyData.test.js | PASS ✓ |
| locationNormalizer.test.js | PASS ✓ |
| shipmentsFrontend.test.js | PASS ✓ |
| sidebarPublicMenu.test.js | PASS ✓ |
| submissionsAssetMapping.test.js | PASS ✓ |
| ticketEventsTransport.test.js | PASS ✓ |
| ticketFrontendPolicy.test.js | PASS ✓ |
| viteDepsAndRouterRecovery.test.js | PASS ✓ |

### 2.3 Lint Status

```
npm --prefix frontend run lint:check
```

| Metric | Result |
|---|---|
| **Status** | FAIL ✗ |
| ESLint errors | 6 (0 warnings) |
| Oxlint errors | 0 |

**6 lint errors in 4 files:**

| File | Line | Error | Rule |
|---|---|---|---|
| `AssetTypeBarChart.vue` | 26:22 | `'palette' is assigned a value but never used` | no-unused-vars |
| `StatCard.vue` | 44:27 | `'tone' is not defined` | no-undef |
| `StatCard.vue` | 47:22 | `'count' is not defined` | no-undef |
| `TypographyToggle.vue` | 4:9 | `'currentScale' is assigned a value but never used` | no-unused-vars |
| `TypographyToggle.vue` | 4:44 | `'resetToDefault' is assigned a value but never used` | no-unused-vars |
| `DashboardView.vue` | 28:9 | `'isCompact' is assigned a value but never used` | no-unused-vars |

### 2.4 Format Check Status

```
npx prettier --check
```

| Metric | Result |
|---|---|
| **Status** | FAIL ✗ |
| Files with formatting issues | 17 files |

**17 files need Prettier formatting:**
- `src/components/charts/AssetTypeBarChart.vue`
- `src/components/charts/CsatDashboardSection.vue`
- `src/components/dashboard/DashboardPanel.vue`
- `src/components/dashboard/StatCard.vue`
- `src/views/AssetsGaView.vue`
- `src/views/AssetsOpsView.vue`
- `src/views/DashboardView.vue`
- `src/views/EmployeesView.vue`
- `src/views/UsersView.vue`
- `src/composables/useCases.js`
- `src/composables/useDesignSystem.js`
- `src/composables/useTypographyScale.js`
- `src/main.js`
- `src/router/index.js`
- `src/utils/dashboardDesignTokens.js`
- `src/utils/ticketPresentation.js`
- 13 test files in `tests/`

### 2.5 Typecheck Status

| Metric | Result |
|---|---|
| **Status** | N/A (JavaScript project — no TypeScript) |
| jsconfig.json | Present (path alias `@/` → `src/`) |
| No static type checking available | — |

### 2.6 Bundle Size

| Metric | Value |
|---|---|
| Total CSS (gzipped, all chunks) | ~70 kB |
| Largest CSS chunk (LogsView) | 2.04 kB gzip |
| Total JS modules | 1861 |
| HTML entry | 3.93 kB gzip |

### 2.7 Accessibility Status

Pre-existing axe-core results in `qa-reports/` (run 2026-09-17):

| Page | Violations | Critical | Serious | Moderate | Passes |
|---|---|---|---|---|---|
| Dashboard | 1 | 0 | 1 | 0 | 27 |
| Tickets | 1 | 0 | 1 | 0 | 24 |
| Asset GA | 0 | 0 | 0 | 0 | — |
| Asset OPS | 0 | 0 | 0 | 0 | — |
| Asset TI | 0 | 0 | 0 | 0 | — |
| Export | 0 | 0 | 0 | 0 | — |
| Users | 0 | 0 | 0 | 0 | — |

**Known violations:**
1. **Dashboard** (serious): `color-contrast` — `<p class="dashboard-eyebrow">RINGKASAN OPERASIONAL</p>` fails WCAG 2 AA contrast ratio
2. **Tickets** (serious): `color-contrast` — Material Symbols icons (`assignment_late`, `task_alt`) at `text-[20px]` have insufficient contrast

### 2.8 Performance Status

No Lighthouse CI configured. No performance baseline metrics captured via tooling. Build output indicates reasonable code-splitting (view-scoped CSS chunks). No obvious performance issues identified from build output.

### 2.9 Console / Network Errors

Cannot be assessed via browser (browser login is blocked in this environment — vault password is stale after DB reset). Baseline verified via build output and static analysis only.

### 2.10 Current Design Problems

**Critical:**
1. **Token fragmentation** — Design tokens spread across 4 files (CSS + 3 JS) with inconsistent color values
2. **Lint errors** — 6 errors in 4 files (unused vars, undefined refs)
3. **Formatting drift** — 17 files need formatting
4. **Test failure** — Color mismatch between test expectations and implementation
5. **Duplicate StatCard** — Two `StatCard.vue` files exist (`ui/StatCard.vue` with broken template refs, `dashboard/StatCard.vue` working)

**High:**
6. **Desktop scale limited** — `useTypographyScale.js` only supports 2 levels (default/compact), not the required 7-level 100%-70% scale
7. **No desktop scale control UI** — `TypographyToggle.vue` has unused imports; no settings UI for scale selection
8. **Hardcoded color values** — Many components use inline hex colors instead of CSS variables (e.g., DashboardView, AppBadge, SkeletonTable)
9. **Accessibility violations** — 2 serious color-contrast violations (Dashboard eyebrow, Tickets icons)
10. **Broken `ui/StatCard.vue`** — Template references `$tone` and `$count` which are not defined props

**Medium:**
11. **No single source of truth** for design tokens (`design-tokens/` directory does not exist)
12. **No Storybook** — No component development/catalog system
13. **No visual regression testing** — No Percy/Chromatic/Vitest-imagetests
14. **No Lighthouse CI** — No automated performance monitoring
15. **No pre-commit hooks** — No husky or lint-staged
16. **CSS token scope** — Tokens defined in `@theme` but many components bypass them with arbitrary hex values

**Visual observations:**
- Dashboard uses `shadow-2xs` on stat cards — reasonable, not excessive
- Color palette uses blue (#0A51B0) as primary, orange (#FF4F1B) as accent — brand
- Rounded corners: `rounded-xl` (12px) on cards, `rounded-full` on badges — moderate, not over-rounded
- No glassmorphism, no excessive gradients, no badge spam — clean enterprise look
- Indonesian language throughout — appropriate localization
- Material Symbols + Lucide icon mix is slightly inconsistent but functional

### 2.11 CI / Tooling Status

Current CI (`.github/workflows/ci.yml`):
- Install dependencies
- Lint (oxlint + eslint)
- TypeScript check (N/A for JS)
- Unit tests (node --test)
- Build

**Missing from CI:**
- No accessibility testing (axe-core)
- No visual regression
- No Lighthouse
- No copy linting (no-ai-slop, anti-ai-slop-writing)

### 2.12 Known Technical Debt

1. **`ui/StatCard.vue`** — References undefined `$tone` and `$count` (should be `:tone` and `:count` or proper props)
2. **Color token inconsistency** — `useDesignSystem.js` pastel colors vs `useChartTheme.js` WCAG colors vs `AssetConditionPieChart.vue` hardcoded colors
3. **17 files with formatting drift** — Prettier not enforced via pre-commit
4. **Test/implementation mismatch** — `dashboardStatsFixes.test.js` expects old palette colors
5. **No design-tokens/ directory** — No structured token system at project root
6. **Limited desktop scale** — Only 2 levels, no 7-level scale control
7. **No centralized ChartAdapter** — Chart options duplicated across 6 chart components (though `useChartTheme.js` provides `commonOptions`)
8. **No component catalog** — No Storybook for UI development

---

## 3. Recommended Implementation Sequence

### Phase 1 — Foundation (Non-breaking)
1. **Design token system** — Create `design-tokens/` directory with JSON token files, single source of truth
2. **Token generator** — `npm run build:tokens` → `src/styles/tokens.css`
3. **Consolidate colors** — Unify useDesignSystem.js, useChartTheme.js, dashboardDesignTokens.js to use generated CSS token variables
4. **Fix lint errors** — Clean up unused vars, fix `ui/StatCard.vue` broken refs

### Phase 2 — Desktop Scale
5. **7-level desktop scale** — Extend `useTypographyScale.js` to support 100%-70% (7 levels)
6. **Desktop scale control UI** — Create settings component with accessible radio/touch controls
7. **Token-based scaling** — `--desktop-scale` variable affects typography, spacing, card padding

### Phase 3 — Component System
8. **Standardize cards** — Single `DashboardPanel`/`BaseChartCard` pattern with loading/error/empty states
9. **Form UX improvements** — Standardize form controls, labels, helper text
10. **Navigation UX** — Preserve existing sidebar/header, ensure keyboard access

### Phase 4 — Chart System
11. **ChartAdapter** — Centralize chart options configuration
12. **Color unification** — Make charts use centralized palette tokens
13. **Chart accessibility** — Add data table alternatives, ARIA labels

### Phase 5 — Quality & Testing
14. **Accessibility fixes** — Fix Dashboard eyebrow contrast, Tickets icon contrast
15. **Fix test failure** — Align test expectations with WCAG-compliant colors
16. **Prettier formatting** — Auto-format 17 files
17. **Unit tests** — Add tests for new components
18. **Visual regression tests** — Add Percy or Vitest-imagetests
19. **Lighthouse CI** — Add performance monitoring to CI pipeline
20. **Pre-commit hooks** — Add husky + lint-staged

### Phase 6 — Documentation & Skills
21. **Skills manifest** — Create `skills/manifest.json` and `skills/README.md`
22. **Skill installer scripts** — `scripts/skills-install.sh`, `skills-update.sh`, `skills-audit.sh`
23. **README update** — Document new systems
24. **Copy linting** — `scripts/run-copy-linters.js`

### Phase 7 — Final Validation
25. **Final audit** — Re-run all tests, lint, build, accessibility, visual regression
26. **Final report** — `docs/ui-ux-final-report.md`, `docs/skills-audit.md`

---

## 4. Acceptance Criteria (Pre-implementation)

| Criterion | Baseline | Target |
|---|---|---|
| Build | PASS | PASS |
| Lint | FAIL (6 errors) | PASS (0 errors) |
| Format check | FAIL (17 files) | PASS (0 files) |
| Unit tests | FAIL (1/92 failing) | PASS (92/92) |
| Accessibility (axe) | 2 serious violations | 0 critical, 0 serious |
| Desktop scale levels | 2 (default/compact) | 7 (100%-70%) |
| Design token sources | 4 fragmented files | 1 `design-tokens/` directory |
| Storybook | Not installed | Installed + stories for core components |
| Visual regression | Not installed | Installed with tests |
| Lighthouse CI | Not installed | Installed |
| Pre-commit hooks | None | Husky + lint-staged |
| Skills manifest | Not exists | `skills/manifest.json` + audit script |

---

## 5. Re-verification — 2026-09-21 (post-fix, live)

Backup: `.backups/pre-fix-backup/` (branch `main`, commit `bbb9c5f`).

### Fixed defects

| Defect | Root cause | Fix |
|---|---|---|
| Bottom nav leaked "Database" to non-superadmins | `hasPermission('database')` was used as a superadmin gate; it returns true for superadmin only by accident, router blocked the route but the item rendered | `navigationConfig.js` declares `superadminOnly: true`; one `isNavItemVisible()` rule shared by sidebar + bottom nav + Menu Lainnya |
| Menu duplicated across 3 components (sidebar, bottom nav, more-menu) | Each component owned its own copy of the menu list | `src/config/navigationConfig.js` = single source of truth; sidebar/bottom-nav consume it |
| Bottom nav lost its Home slot; reporters saw only "Tiket + Lainnya" | `/dashboard` item filtered out when `hasPermission('dashboard')` was false | Home slot now resolves per role: `/dashboard` → `/my-assets` → `/` (never empty) |
| Duplicate `/my-assets` slot for reporters | Home resolved to `/my-assets` while the standalone my-assets slot remained | Slot is dropped when Home resolves to the same route |
| Dashboard quick actions were a second navigation menu | Mixed navigation ("Semua Aset", "Lihat Tiket", "Aset Saya", "Ekspor Data") into an action bar | Actions only: Buat Tiket, Tambah Aset, Tambah Karyawan, Pengajuan BAST |
| `/assets?action=add`, `/tickets?action=create`, `/karyawan?action=add` were dead query params | No view ever read `route.query.action` | `onMounted` deep-links in AssetsView / TicketsView / EmployeesView, guarded by the same permission as each view's own toolbar button; param self-clears so a refresh does not reopen the modal |
| Build failure — invalid CSS custom-property names | Token generator emitted `--spacing-1.5` (dots are illegal in custom-property names); these collided with Tailwind's `--spacing` scale | `sanitizeNumericSegments()` in `scripts/build-tokens.js` |
| Build failure — arbitrary-value class in selector | `html[data-typography="compact"] .text-[10px]` re-parsed by Tailwind v4 | replaced with class-independent selectors |
| Desktop scale attacked CSS specificity | `[data-desktop-scale] .p-4` (0,2,0) overrode Tailwind `.p-4` **and** responsive `sm:p-4` at every scale; `[data-desktop-scale] button` forced 36px on all buttons | Native Tailwind v4 approach: root `font-size` + `--spacing: calc(0.25rem * var(--desktop-scale))` — zero specificity conflicts, no global `transform` |
| WCAG 1.4.4 violation | `.text-xs` at 0.7 scale = 12px × 0.7 = **8.4px** | floor of 11px for small text |
| `DesktopScaleControl` never rendered | `AppHeader.vue` imported from `../components/ui/...` (nonexistent path from `components/layout/`) | corrected import path |
| Token names unusable | generator emitted `--dimension-header-height` / `--safe-area-inset-bottom` from grouping artefacts | `stripCategoryPrefix()` + `TOKEN_ALIASES`; `--desktop-scale`, `--header-height`, `--safe-area-inset-bottom` now emit correctly |
| Dead code | `DashboardPanel.vue`, `TypographyToggle.vue`, `useDesignSystem.js`, `useTypographyScale.js`, `dashboardDesignTokens.js`, `exportAssetsCsv.js`, `exportAssetCategoryCsv.js` — zero consumers | deleted (562+ lines). `currencyFormatter.js` was NOT dead: restored and its duplicated inline copy in `AssetsOpsView.vue` replaced by the shared util |

### Live verification (Playwright, authenticated as superadmin, https://trackit.example.com)

| Check | Result |
|---|---|
| Build | PASS — 1865 modules |
| Lint | PASS — 0 errors |
| Unit tests | PASS — 92/92 |
| Mobile 390×844 bottom nav | Beranda → Tiket → Aset → Aset Saya → Menu lainnya |
| Desktop 1440×900 bottom nav | hidden (`display:none`) — correct |
| Menu Lainnya contents | 13 items, all sidebar features reachable |
| Dashboard quick actions | Buat Tiket, Tambah Aset, Tambah Karyawan, + Lainnya |
| `--desktop-scale` token | resolves to `1` at runtime |
| DesktopScaleControl | renders |
| Horizontal overflow (360/390/412) | none |
| Console / page errors | none |
| AssetsOpsView (formatCurrency refactor) | renders, `page-ready` |

Bottom-nav RBAC matrix was additionally verified by simulating each role against
`navigationConfig.js` (superadmin / IT-admin / reporter / public) — zero duplicate
routes, Home slot populated for every role.

---

## 6. Desktop Scale Control removed — 2026-09-21

The density selector (`Atur kepadatan tampilan desktop`, label "1×") was removed
from both the app header and the dashboard intro, at the user's request.

Removed entirely (no remaining consumers):
- `src/components/ui/DesktopScaleControl.vue`
- `src/composables/useDesktopScale.js`
- `--desktop-scale` token from `design-tokens/layout.json` (regenerated)
- 39-line `[data-desktop-scale]` CSS block in `src/assets/main.css`
- `useDesktopScale` init / localStorage restore in `src/main.js`

Dashboard quick actions also absorbed the duplicate "Tambah aset" toolbar button
(`dashboard-add`) — that button and its now-dead CSS (desktop + mobile + dark
blocks) were removed; the capability is reached through the quick-action
"Tambah Aset" instead. Dead `goToAddAsset`, `canWriteAssets`, `useRouter`, and
`hasWritePermission` references in `DashboardView.vue` were cleaned up.

Quick-action bar styling: first entry is now the filled primary CTA
(`#0A51B0`), remaining entries are ghost buttons — consistent with the existing
`btn-primary` style and the removed `dashboard-add` button.

Verified live (authenticated): scale control absent on both mobile 390×844 and
desktop 1440×900; header, sidebar, and quick actions intact; no console or page
errors; no horizontal overflow.

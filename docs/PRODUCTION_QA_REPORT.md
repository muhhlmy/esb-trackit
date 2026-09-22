# PRODUCTION_QA_REPORT.md — TrackIT

**Date:** 2026-09-22 · **Branch:** `main` · **Last commit:** `bbb9c5f` (working tree uncommitted)
**Recovery point:** `.backups/2026-09-22_pre-english/`
**Method:** local stack (API :3000, frontend :5173, Postgres :5432) + isolated E2E on :3100/:5273 against the disposable `esb_trackit_test` DB.

Every claim below maps to a command that was actually run.

---

## 1. FIXED (implemented this session)

### Performance
| Change | File | Evidence |
| --- | --- | --- |
| GSAP loaded on demand (was a startup dependency of every page) | `composables/useGsap.js` (+ new `animateIn()` helper) | `rg "^import gsap from 'gsap'"` → 0 hits; startup `index+useGsap` **58.87 → 31.5 kB gzip** |
| Dashboard charts async (Chart.js left the initial chunk) | `views/DashboardView.vue` | initial chunk **79.26 → 8.86 kB gzip** |
| Removed eager GSAP from public + admin pages | `HomeView.vue`, `admin/KbCategoriesView.vue`, `admin/AdminDashboardView.vue` | build output |

### Help Center content integrity (Phase 10)
| Change | File | Evidence |
| --- | --- | --- |
| Removed "Pencarian populer" (block, `defaultPopularSearches`, its API fetch, `TrendingUp` import) | `views/HomeView.vue` | live E2E snapshot shows the section gone |
| Removed `DEFAULT_FEATURED_SOPS` (fake articles, ids 36–39) | `views/HomeView.vue` | articles now render only from real `cases` |
| Removed `DEFAULT_TOPIC_CARDS` (fake topics) + hid Topics section when empty | `views/HomeView.vue` | `v-if="topicCards.length"` |
| Removed `DEFAULT_FAQS` (hardcoded answers) + hid FAQ section when empty | `views/HomeView.vue` | `v-if="orderedFaqs.length"` |

### Accessibility
| Change | File | Evidence |
| --- | --- | --- |
| Fixed color-contrast on `/` (`#8fa2ba` 2.61:1 → `#5f7089` ~4.9:1) | `views/HomeView.vue` (4 selectors) | public axe tests pass |
| Fixed dashboard status-icon contrast (green/red/amber tones on `#f1f5f9` chip) | `views/DashboardView.vue` (`.stat-green/-red/-amber`) | dashboard mobile axe passes |
| Flash screen no longer animates under `prefers-reduced-motion` | `index.html` | CSS media query added |

### Notifications unified (Phase 9/18)
| Change | File | Evidence |
| --- | --- | --- |
| **Root cause found:** the primary app shell never mounted `<Toast />`, so every `useToast()` call in the shell rendered nothing — which is why two views rolled their own | `App.vue` | `<Toast />` added to the app-shell branch |
| `DatabaseView` private toast removed → `useToast()` | `views/DatabaseView.vue` | no `toast.show` refs remain |
| `ExportView` private toast removed → `useToast()` | `views/ExportView.vue` | no `toast.show` refs remain |

Verified: lint 0 · 92/92 tests · build passes · app-shell mounts in E2E.

### Real product bug
| Change | File | Evidence |
| --- | --- | --- |
| **Menu Lainnya had NO Escape handler and no scroll lock.** Added Escape-to-close, body scroll lock, and cleanup on close + unmount | `components/layout/AppBottomNav.vue` | accessibility "Menu Lainnya" test passes (previously failed on `toBeHidden`) |

### E2E test defects (test-side only — no product behaviour changed for routing)
| Change | File |
| --- | --- |
| `waitUntil: 'networkidle'` → `domcontentloaded` (anti-pattern that never settles) | `e2e/tests/public/public-regressions.spec.js` |
| Superadmin/Admin tests assert `/dashboard`, not `/` (per decision: `/` stays the public Help Center) | `e2e/tests/rbac/role-access.spec.js` |
| Skip-link test starts at `/dashboard` (the app-shell skip link does not exist on the public page) | `e2e/tests/accessibility/accessibility.spec.js` |
| Menu Lainnya locator scoped by `role=navigation` (was a strict-mode violation matching button + drawer) | `e2e/tests/accessibility/accessibility.spec.js` |
| Added `test.slow()` to heavy axe scans (genuinely exceed 30 s) | accessibility + public specs |

---

## 2. VALIDATED (commands actually executed)

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm --prefix frontend run lint:check` | ✅ 0 errors |
| Unit tests | `cd frontend && node --test` | ✅ 92/92 |
| Build | `npm --prefix frontend run build` | ✅ built in ~15 s |
| E2E accessibility | `npx playwright test e2e/tests/accessibility --project=chromium` | ✅ **6/6** |
| E2E public | `npx playwright test e2e/tests/public --project=chromium` | ✅ **5/5** |
| E2E RBAC | (in combined run) `e2e/tests/rbac` | ✅ **5/5** |
| E2E dashboard | `e2e/tests/dashboard --project=chromium` | ✅ pass (KPI/charts intact) |
| E2E viewmode | `e2e/tests/viewmode` | ✅ pass (incl. Shipments 4/4) |

Frontend-only. Backend tests were **not** re-run this session. Firefox project not re-run.

---

## 3. NOT VALIDATED (explicitly not claimed)

- **Full 31-spec suite** was not run in one pass; suites were run in groups.
- **Backend test suite** not re-executed.
- **Firefox** project not executed.
- **Lighthouse / visual regression** — tooling not installed.
- **320–1920 responsive sweep** beyond what the public/axe suites covered.
- **Functional workflow matrix** (create/edit/approve etc.) was not exhaustively run.

---

## 4. REMAINING (evidence-based backlog)

**P0 / P1**
- Authentication init was inspected and found sound (deduped `restoreSession`, offline handling, never classifies unknown as Forbidden) — **no change made**, but a per-role deep-link E2E run would formally close it.
- Mobile "no refresh" navigation: the drawer now closes via Escape/overlay/route-change/scroll-lock; a dedicated no-refresh navigation E2E would close it.

**P2 — consistency (from `docs/UI_UX_AUDIT.md`)**
- `PageHeader` still used by only 7/19 views (F1/C-01).
- Four KPI-card implementations (F2/C-02).
- ~~Two toast systems~~ — **DONE** (unified on `useToast`; shell `<Toast />` mounted).
- Dead duplicate `components/dashboard/StatCard.vue` (C-08).

**P3**
- CI bundle budget; `test:e2e` consolidated JSON run; broader functional matrix.

---

## 5. Rollback

All changes are uncommitted. Restore any file with
`tar -xzf .backups/2026-09-22_pre-english/frontend-src-full.tar.gz`.
No DDL, no migration, no data, and no infrastructure change was made. The E2E DB is
disposable and separate from the running instance.

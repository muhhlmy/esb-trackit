# Page-by-Page UI/UX Consistency Audit — ESB TrackIT

**Date:** 2026-09-22
**Scope:** `frontend/src/views/**` (19 routes) + shared UI primitives
**Method:** static structural comparison across every view; evidence is `file:line`.
**Status of findings:** structural findings are verified from source. Anything that
requires a running backend/browser is marked _(needs runtime verification)_.

This audit answers three questions for every page: *what primitives does it use,
how does it differ from its siblings, and is the difference justified?*

---

## 1. Evidence base

Shared primitives that already exist (and should be the standard):

| Primitive | Path | Used by |
| --- | --- | --- |
| `PageHeader` | `components/ui/PageHeader.vue` | 7 of 19 views |
| `StatCard` | `components/ui/StatCard.vue` | 3 views |
| `AppPagination` | `components/ui/AppPagination.vue` | 9 views |
| `AppViewToggle` | `components/ui/AppViewToggle.vue` | 8 views |
| `Skeleton*` | `components/ui/skeleton/*` | all, but inconsistently |
| `useToast` | `composables/useToast.js` | 5 modules |

---

## 2. Cross-page comparison matrix

Legend: ✅ uses the shared primitive · ⚠️ partial/varies · ❌ custom/absent.

| Route | View | PageHeader | KPI cards | Charts | Pagination | View toggle | Loading state | Toast |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/dashboard` | DashboardView | ✅ | ❌ custom | ✅ 4 | n/a | n/a | SkeletonCard/SkeletonChart | inline `error` ref |
| `/assets` | AssetsView | ❌ raw `<h1>` | – | – | ✅ | ✅ | ⚠️ hand-built BaseSkeleton | – |
| `/assets-ga` | AssetsGaView | ❌ raw `<h1>` | – | – | ✅ | ✅ | ⚠️ hand-built BaseSkeleton | – |
| `/assets-ops` | AssetsOpsView | ❌ raw `<h1>` | – | – | ✅ | ✅ | ⚠️ hand-built BaseSkeleton | – |
| `/my-assets` | MyAssetsView | ❌ raw `<h1>` | ✅ StatCard | – | ✅ | – | ⚠️ | inline |
| `/tickets` | TicketsView | ✅ | ❌ custom stat cards | – | ✅ | ✅ | SkeletonList | – |
| `/shipments` | ShipmentsView | ✅ | ❌ custom summary | – | ✅ | ✅ | SkeletonTable | – |
| `/submissions` | SubmissionsView | ❌ raw `<h1>` | – | – | ❌ | – | ⚠️ hand-built BaseSkeleton | – |
| `/karyawan` | EmployeesView | ✅ | ✅ StatCard | – | ✅ | ✅ | SkeletonTable | – |
| `/users` | UsersView | ✅ | ✅ StatCard | – | ✅ | – | SkeletonTable | – |
| `/logs` | LogsView | ✅ | – | – | ✅ (×3 tabs) | ✅ | SkeletonTable | – |
| `/export` | ExportView | ✅ | – | – | – | – | SkeletonCard | ❌ local `showToast` |
| `/database` | DatabaseView | ❌ raw `<h1>` | – | – | – | – | SkeletonCard | ❌ local `showToast` |
| `/faqs` | FaqAdminView | ❌ raw `<h1>` | – | – | – | – | ⚠️ | ✅ useToast |
| `/cases` | CasesView | ❌ raw `<h1>` | – | – | – | – | ⚠️ | – |
| `/admin/cases` | admin/AdminDashboardView | ❌ raw `<h1>` | – | – | – | ✅ | ⚠️ | ✅ useToast |
| `/admin/kb-categories` | admin/KbCategoriesView | ❌ raw `<h1>` | – | – | – | – | ⚠️ | ✅ useToast |
| `/admin/editor` | admin/DocEditorView | ❌ raw `<h1>` | – | – | – | – | – | ✅ useToast |

---

## 3. Findings

### F1 — Page headers are inconsistent (high impact, low risk)

Only **7 views** use `PageHeader` (`PageHeader.vue:1`); the other **12** hand-roll an
`<h1>` with different classes, e.g.:

- `DatabaseView.vue:361` — `<h1 class="text-xl font-bold tracking-tight text-[#333333]">`
- `AccessDeniedView.vue:7` — `text-xl font-extrabold text-[#2A3547]`
- `SubmissionsView.vue:640` / `:770` — two different heading styles in one file
  (a form heading `text-…` and a separate toolbar heading `text-base sm:text-lg`)

Consequence: pages differ in padding, icon presence, border, shadow, and subtitle
treatment. `PageHeader` supplies its own card (`padding:16px 20px`, border, radius,
shadow) so a page using it and a page not using it will not visually align.

### F2 — Four different KPI/stat card implementations (high impact)

- `StatCard.vue` — Users, Employees, MyAssets.
- Dashboard KPI cards — bespoke markup + `SkeletonCard variant="summary"` (`DashboardView.vue:361`).
- Shipments — bespoke "4 summary cards".
- Tickets — bespoke stat cards.

Same visual job, four code paths, four typographic/spacing treatments.

### F3 — Loading states use four different strategies (medium)

- `SkeletonTable` with presets — Logs `logs`, Shipments `assets`, Employees `employees`, Users `users`.
- Hand-built `BaseSkeleton` blocks (dozens of literal widths) — `AssetsView.vue:971-1035`,
  `AssetsOpsView.vue:529-593`, `AssetsGaView.vue:528-592`, `SubmissionsView.vue:873-954`.
- `SkeletonList` — Tickets (`TicketsView.vue:2986`).
- `SkeletonCard` — Database (`:409`), Export (`:511`).

`SkeletonTable` already supports a `preset` prop; the hand-built ones duplicate that
capability with hard-coded pixel widths, which drift from the real row layout.

### F4 — Duplicated toast implementations (medium, correctness-adjacent)

`DatabaseView.vue:62` and `ExportView.vue:93` each define a **local** `showToast`
that mutates a local `toast` ref, while `useToast.js` is the shared mechanism used by
`FaqAdminView`, `DocEditorView`, `useKbCategories`, `useBookmarks`, `useCases`.
Two toast systems in one app can diverge in duration (local=4000ms vs shared=3000ms),
stacking behaviour, and placement. **This is the closest thing to a bug in this list.**

### F5 — Empty-state copy is unnormalised (medium)

Phrasings in use today:

- "Belum ada aset IT yang terdaftar…" (`AssetsView.vue:1068`)
- "Tidak ada riwayat perubahan aset ditemukan." (`LogsView.vue:476`)
- "Tidak ada pengguna yang sesuai pencarian." (`UsersView.vue:977`, `:1001`)
- "Belum ada data pengiriman." (`ShipmentsView.vue:525`)

"Belum ada" (not yet) vs "Tidak ada" (there is none) are used interchangeably for the
same condition, and only some carry a call-to-action. No shared `EmptyState` primitive.

### F6 — Error states are inconsistent / sometimes absent (medium)

- Dashboard keeps an `error` ref and renders it (`DashboardView.vue:171,185`).
- Most list views (`AssetsView`, `EmployeesView`, `ShipmentsView`, …) only fire a
  toast on failure and show an empty table if the request fails — the user cannot
  distinguish "no records" from "request failed". _(needs runtime verification)_
- `DashboardView.vue:312` has a bare `catch {}` — **checked and intentional**: it sits inside the debounced background `scheduleTicketStatsRefresh()` poll, which self-heals on the next `fetchStats()`. Not a defect.

### F7 — Search is implemented two ways without a rule (low/informational)

Client-side filtering: Assets, GA, Ops, Employees, MyAssets, FAQ, admin lists.
Server-side search: Tickets (`:593`, debounced), Shipments, Logs. This is defensible
(dataset size differs) but is undocumented, so it reads as inconsistency.

### F8 — Header duplicates inside one view (low)

`SubmissionsView.vue` renders two separate `<h1>` headings (`:640`, `:770`) depending
on mode; `UsersView.vue` renders the same empty-state string twice (`:977`, `:1001`)
for card vs table layouts. Not bugs, but they are copy that must be changed in two
places, which is how drift starts.

---

## 4. Bugs / risks found

| # | Severity | Location | Issue |
| --- | --- | --- | --- |
| B1 | Medium | `DatabaseView.vue:62`, `ExportView.vue:93` | Second toast system; diverges from `useToast` (duration/style/stacking). |
| ~~B2~~ | — | `DashboardView.vue:312` | **False positive (verified):** bare `catch {}` is a deliberate background-poll no-op. Keep as-is. |
| B3 | Low | `UsersView.vue:977/:1001`, `SubmissionsView.vue:640/:770` | Duplicated copy/headings that must be kept in sync manually. |
| B4 | Low | `AssetsView.vue:971-1035` et al. | Hand-built skeletons hard-code widths that drift from real rows. |

No security or data-integrity bugs were found in this pass. Authorization is enforced
server-side (see `backend/src/**`); the frontend router guard (`router/index.js`) is
defence-in-depth only, which is correct.

---

## 5. Recommendation summary

Normalise in this order — each layer removes whole categories of difference:

1. **Page shell** — make `PageHeader` universal (F1), add `EmptyState` + `ErrorState` primitives (F5, F6).
2. **Data display** — one KPI card component (F2), `SkeletonTable` presets everywhere (F3).
3. **Feedback** — one toast path, `useToast` only (F4/B1).
4. **Copy** — one vocabulary ("Belum ada" for empty-first-run, "Tidak ada" for filtered-out) (F5).

The itemised, prioritised execution plan is in
[`production-hardening-todo.md`](./production-hardening-todo.md).

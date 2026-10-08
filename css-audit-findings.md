# CSS/Design-System Audit — 30 Components (frontend/src/components)

Scope: `<template>` class attributes + `<style>` blocks of the 30 listed components, audited against the compact design standard (12px body, 14px/600 titles, 28–34px controls, 6px radius, 10–12px card padding, 44px touch targets only inside mobile media queries).

**Cascade fact that shapes this report (verified):** `frontend/package.json` → Tailwind **v4.3.3**; `main.css` line 1 is `@import 'tailwindcss'` and all its own rules are **unlayered**, SFC `<style scoped>` is unlayered too. Unlayered CSS **beats `@layer utilities`** Tailwind classes. Therefore shared rules win over many template utilities:
- `.ui-select-trigger/.ui-select-menu/.ui-action-menu/.ui-modal-panel/.ui-pagination-button/.ui-menu-trigger/.ui-search-input` (main.css, most with `!important`) → 6px radius enforced; local `rounded-xl/lg` on those elements are **dead**.
- `.shadow-card/.ui-card` (main.css L338) → 6px radius + 11px padding; `rounded-xl`/`p-4` on `shadow-card` elements are **dead**.
- `h2,h3 { font-size: 14px }` (main.css L225) → `text-base`/`text-sm` on bare `h3` are **dead**.
- `table thead th / tbody td { padding: .45rem .75rem }` (main.css L832/L851) → skeleton/preview-table `py-4 px-4 pl-5` utilities are **dead**.
- `.inventory-dialog.app-modal-panel.ui-modal-panel button { min-height:32px !important; border-radius:6px }` (inventory-polish.css L256, loaded by Assets views) → asset-modal `min-h-10`/`rounded-xl` are dead *when that sheet is loaded*, live otherwise.

Findings are ranked **MUST FIX** (live violation of a hard rule), **MINOR** (13px body, 7–8px radius vs 6px, 36px controls, 16px paddings/gaps, dead-class cleanup, shared-rule duplication), **IGNORE** (protected by the brief). Line numbers are exact.

---

## 1. layout/AppBottomNav.vue — bottom nav (bar 48px, items 38px, labels 10/11px = compliant, keep)

- **L216 · MINOR (cat 2)** `class="clean-more-menu absolute left-0 right-0 bottom-full rounded-t-2xl bg-white … p-2"` → replace `rounded-t-2xl` with `rounded-t-[6px]` (16px top radius on a menu sheet; mobile-only so low priority — `rounded-t-lg` (8px) acceptable compromise).
- **L322–325 · MINOR (cat 1)** `.clean-more-menu button { min-width: 44px; min-height: 44px; }` — 44px rule sits outside any media query although the menu only renders inside an `lg:hidden` subtree. → wrap the `.clean-more-menu` scoped block in `@media (max-width: 1023px) { … }` to match the visibility gate (no visual change; makes the mobile-only intent explicit).
- **L328–329 · MINOR (cat 1)** `.clean-more-menu a { border: 1px solid #edf1f6; padding: 15px 7px; gap: 9px; }` — ~72px touch tiles, mobile-only by markup. → same `@media (max-width: 1023px)` wrap; optionally `padding: 12px 7px`.
- **IGNORE:** nav `min-h-[48px]` (L173, matches `--bottom-nav-height`), items `min-h-[38px]`/`rounded-xl` (L181, L198) and scoped `border-radius: 9px` (L298) — bottom-nav touch bar is explicitly kept; `.clean-more-menu > div:first-child > span { font-size: 13px }` (L318) = 13px mobile section title, on-spec; `.clean-more-menu { padding: 14px }` (L310) < 16px, OK.

## 2. layout/Navbar.vue — Help Center navbar (worst offender in scoped CSS)

- **L217 · MUST FIX (cat 1)** `.navbar-search { … min-height: 40px; … }` → `min-height: 32px;` (control > 34px; keep `border-radius: 8px` → see L220).
- **L220 · MINOR** `border-radius: 8px;` → `border-radius: 6px;` (`--ui-radius-control`).
- **L257 · MUST FIX (cat 1)** `.navbar-language select { … min-height: 44px; … }` → `min-height: 32px;` (44px select outside mobile).
- **L286 · MUST FIX (cat 1)** `.navbar-signin { … min-height: 42px; … }` → `min-height: 30px;` (button; `--btn-height: 30px`). **L288 · MINOR** `border-radius: 8px;` → `border-radius: 6px;`.
- **L306 · MUST FIX (cat 1)** `.profile-trigger { … min-height: 44px; … }` → `min-height: 32px;`. **L308 · MINOR** `border-radius: 8px;` → `border-radius: 6px;`.
- **L349 · MUST FIX (cat 1)** `.profile-dropdown { … border-radius: 12px; … }` → `border-radius: 6px;` (menu panel > 8px).
- **L362 · MINOR (cat 1)** `.profile-identity strong { font-size: 13px; … }` → `font-size: 12px;`.
- **L383 · MUST FIX (cat 1+3)** `.profile-links a, .profile-logout { … min-height: 44px; width: 100%; padding: 10px 12px; … }` → `min-height: 32px;` and **L385** `padding: 10px 12px;` → `padding: 6px 10px;` (44px menu items outside mobile; item lands ~30px ≤ 36px). **L387 · MINOR** `border-radius: 7px;` → `border-radius: 6px;`.
- **L210 · MINOR (cat 1)** `.navbar-actions { … gap: 18px; … }` → `gap: 12px;`.
- **L179 · MINOR (cat 1)** `.navbar-brand { … min-height: 44px; … }` → `min-height: 36px;` (brand link, not a form control — desktop 44px still contradicts the compact scale).
- **IGNORE:** L156 `padding: 0 24px` (page gutter), L163 navbar height 76px, L168 `gap: 28px` (page-level layout), L188 wordmark 19px (brand text), mobile block L429–491 (all 44px inside `@media (max-width: 767px)` — allowed), L366/L370 11/10px identity text (on-spec).

## 3. layout/MobileNav.vue

- **L14 · MINOR (consistency)** `min-h-[56px]` on the nav → `min-h-[48px]` (align to `--bottom-nav-height: 48px` and AppBottomNav). Items `min-h-[44px]` (L19/31/41/55) are within the allowed 44–48px touch range — keep.
- **IGNORE:** item `rounded-xl` (L19 etc.) and scoped `border-radius: 9px` (L74) — bottom-nav touch ergonomics kept per brief.

## 4. dashboard/QuickActions.vue — ✅ fully compliant (14px/600 heading, 11px secondary, 12px/10.5px labels, 10px gap, `padding: 10px 12px`, 6px radius, 12px→11px mobile block). No edits. Use as the reference pattern.

## 5. ui/AppModal.vue — structurally compliant (title 13/14px, body p-2.5/p-3, h-7 close)

- **L117 · MINOR (cat 4, dead classes)** `class="modal-panel app-modal-panel ui-modal-panel flex … rounded-t-xl sm:rounded-[6px] border-t …"` → delete `rounded-t-xl sm:rounded-[6px]` — `.ui-modal-panel { border-radius: 6px !important }` (main.css L443) already wins, so the mobile sheet currently renders 6px anyway; keeping the dead utilities invites regressions. (If a larger mobile sheet top-radius is desired, it must be added as an explicit scoped exception.)
- **IGNORE:** header/body/footer paddings (px-3/py-2, p-2.5/p-3 — within 10–14px), drag handle, all focus/transition styles.

## 6. ui/AppImportModal.vue

MUST FIX (cat 2 — live `rounded-xl/2xl` on card-like panels/buttons, no shared rule overrides these):
- **L338** `class="rounded-xl bg-rose-50 p-3 …"` → `rounded-[6px] …`
- **L345** `class="rounded-xl bg-emerald-50 p-4 …"` → `rounded-[6px] bg-emerald-50 p-3 …`
- **L437** `class="rounded-xl bg-rose-50 p-4 …"` → `rounded-[6px] bg-rose-50 p-3 …`
- **L516** `class="… rounded-2xl bg-[#ECF2FF] border … p-4"` → `… rounded-[6px] … p-3`
- **L527** download button `… rounded-xl bg-[#0A51B0] px-4 …` → `… rounded-[6px] …`
- **L543** dropzone `… rounded-2xl border-2 … p-6 …` → `… rounded-[6px] … p-4` (strict: `p-3`)
- **L591** & **L605** tab buttons `… rounded-xl px-4 py-2 …` → `… rounded-[6px] px-4 py-2 …`
- **L620** & **L689** preview-table wrappers `class="rounded-xl border border-[#E5EAEF] overflow-hidden"` → `rounded-[6px] …`
- **L791** Batal `min-h-11 sm:min-h-0 rounded-xl border …` → `min-h-11 sm:min-h-0 rounded-[6px] border …`
- **L801** submit `… rounded-xl bg-[#0A51B0] px-5 …` → `… rounded-[6px] … px-4 …`

MINOR:
- **L333** `class="space-y-4"` → `space-y-3` (16px section gap; applies to this and the three sibling modals).
- **L357, L394, L447, L482** `class="bg-white/60 rounded-lg p-2.5 …"` → `rounded-[6px]`; **L413, L500** `bg-amber-50 rounded-lg p-2.5 …` → `rounded-[6px]`.
- **L360, L378, L397, L450, L467, L485** `class="flex gap-4 flex-wrap"` → `gap-3`.
- **L519** `<h4 class="text-[13px] font-bold …">` → `text-xs` (h4 base is 12px).
- **L560, L564** `text-[13px] font-bold` dropzone copy → `text-xs`.
- **L673, L770** `class="p-4 text-center text-[12px] …"` → `p-3`.
- **L786** `… gap-3 pt-4 border-t …` → `pt-3`.
- **L527/L791/L801/L591/L605 (cat 4):** hand-roll `bg-[#0A51B0] hover:bg-[#0A4391] text-[12px] font-bold` + radius — exact duplicates of `.btn-primary`/`.btn-secondary` (main.css L591–653, kpi-tokens `--btn-*`). Adopt the shared classes.
- **IGNORE:** `min-h-11 sm:min-h-0` (44px only < 640px = mobile-only, allowed); L555 `h-12 w-12 rounded-2xl` icon tile (decorative); preview-table `p-2` cells + `text-[11px]` (dead — main.css `td` padding 7px/12px + 12px font win); L574 `py-4` transient parsing block.

## 7. ui/ConfirmDialog.vue

- **L69 · MUST FIX (cat 2)** `class="inline-flex h-9 items-center rounded-xl border border-[#E2E8F0] bg-white px-4 …"` → `inline-flex h-8 items-center rounded-[6px] …` (radius MUST; `h-9`→`h-8` is the MINOR height part, 36px > 34px).
- **L78 · MUST FIX (cat 2)** `class="inline-flex h-9 items-center gap-1.5 rounded-xl px-4 …"` → `inline-flex h-8 items-center gap-1.5 rounded-[6px] px-4 …`.
- **L62 · MINOR (cat 1)** `<p class="text-[13px] leading-relaxed …">` → `text-xs`.
- **MINOR (cat 4):** both buttons re-style `.btn-secondary`/`.btn-primary` (incl. destructive `bg-[#DC2626] hover:bg-[#B91C1C]`) — use the shared classes + a danger modifier.

## 8. ui/FilterModal.vue

- **L57 · MUST FIX (cat 1+2)** input `class="h-10 w-full rounded-xl border …"` → `h-8 w-full rounded-[6px] …` (40px input > 34px).
- **L63 · MUST FIX (cat 1+2)** select `class="h-10 w-full rounded-xl border …"` → `h-8 w-full rounded-[6px] …`.
- **L83 · MUST FIX (cat 1+2)** Reset `class="min-h-10 rounded-xl border … px-4 …"` → `min-h-8 rounded-[6px] …`.
- **L90 · MUST FIX (cat 1+2)** Apply `class="min-h-10 rounded-xl bg-[#0A51B0] px-5 …"` → `min-h-8 rounded-[6px] bg-[#0A51B0] px-4 …` (`px-5`→`px-4` MINOR).
- **L45 · MINOR** `class="space-y-4"` → `space-y-3`. **L78 · MINOR** `… pt-4 sm:flex-row …` → `pt-3`.
- **MINOR (cat 4):** buttons duplicate `.btn-primary`/`.btn-secondary`.

## 9. ui/CustomSelect.vue

- **L16 · MINOR (cat 1)** `heightClass: { type: String, default: 'h-9' },` → `default: 'h-8'` (36px trigger; callers passing explicit heights unaffected).
- **L100 · MINOR (cat 4, dead)** `class="ui-select-trigger … rounded-xl border …"` → remove `rounded-xl` (main.css `.ui-select-trigger` forces 6px `!important`).
- **L139 · MINOR (cat 4, dead)** `class="ui-select-menu … rounded-xl border … p-1.5"` → remove `rounded-xl` (`.ui-select-menu` forces 6px).
- **L152 · MINOR** option `class="flex h-8 w-full … rounded-lg px-2.5 …"` → `rounded-[6px]` (h-8 option = 32px ≤ 36px, OK).
- **IGNORE:** clear button h-5, focus/transition styles — compliant.

## 10. ui/SearchableSelect.vue

- **L18 · MUST FIX (cat 1)** `heightClass: { type: String, default: 'h-10' },` → `default: 'h-8'` (40px trigger > 34px, live — no global rule constrains it).
- **L230 · MINOR (cat 4, dead)** `class="ui-select-trigger … rounded-xl border …"` → remove `rounded-xl`.
- **L277 · MINOR (cat 4, dead)** `class="ui-select-menu … rounded-xl border … p-1.5"` → remove `rounded-xl`.
- **L297 · MINOR (cat 4, dead)** search input `class="ui-search-input h-8 … rounded-lg … focus:ring-2 …"` → remove `rounded-lg` (`.ui-search-input` forces 6px `!important`, incl. focus ring).
- **L319 · MINOR (cat 1+3)** option `… rounded-lg px-2.5 py-1.5 …` → `rounded-[6px] px-2.5 py-1 …` (two-line options ≈ 43px > 36px; `py-1` brings them to ~39px — content-driven, acceptable; single-line 28px).
- **L360 · MINOR** empty option `class="px-3 py-4 …"` → `py-3`.
- **IGNORE:** skeleton loading state, keyboard/ARIA logic, `text-[10px]` secondary labels.

## 11. ui/AppPagination.vue

- **L143 · MUST FIX (cat 1)** `.asset-pagination { … padding: 16px 20px; … }` → `padding: 10px 12px;`.
- **L145 · MUST FIX (cat 1)** `border-radius: 12px;` → `border-radius: 6px;`.
- **L160–161 · MUST FIX (cat 1)** `.asset-pagination button { min-width: 38px; height: 38px; … }` → `min-width: 32px; height: 30px;` (**L163 · MINOR** `border-radius: 8px;` → `6px`).
- **L147 · MINOR (cat 1)** `gap: 16px;` → `gap: 10px;`. **L179 · MINOR** mobile `.asset-pagination { padding: 16px; }` → `padding: 10px 12px;`.
- **L68 · MINOR (cat 1)** `class="… px-5 py-4 border-t …"` → `… px-3 py-2.5 border-t …`.
- **L92, L114, L132 · MINOR (cat 4, dead)** `ui-pagination-button … rounded-lg …` → remove `rounded-lg` (`.ui-pagination-button` forces 6px `!important`).
- **IGNORE (per brief):** L101 mobile select `min-h-11 … text-base … sm:hidden` and L188–196 `min-height: 44px; font-size: 16px` inside `@media (width < 40rem)` — intentional mobile touch + iOS zoom; L206–209 `.mobile-compact button { min-width/height: 2.75rem }` inside mobile media — allowed.

## 12. ui/AppViewToggle.vue — near-compliant

- **L21 · MINOR** `class="app-view-toggle … rounded-lg border … p-0.5"` → `rounded-[6px]` (control radius 6px; buttons' `rounded-md` already 6px).
- Buttons `h-7`, `text-[11px]` — on-spec. No other findings.

## 13. ui/AppRowActions.vue

- **L175 · MINOR (cat 4, dead)** `class="ui-menu-trigger … rounded-lg …"` → remove `rounded-lg` (`.ui-menu-trigger` forces 6px `!important`).
- **L190 · MINOR (cat 4, dead)** `class="ui-action-menu rounded-xl border … p-1.5 …"` → remove `rounded-xl` (`.ui-action-menu` forces 6px `!important`).
- **L201 · MINOR** menu item `class="flex w-full … rounded-lg px-3 py-2 text-[12px] …"` → `rounded-[6px] …` (item ≈ 33px ≤ 36px, OK).
- **IGNORE:** h-7 trigger (28px), `p-1.5` panel padding, teleport positioning logic.

## 14. ui/AppBadge.vue / 15. ui/StatusBadge.vue — ✅ compliant (pill `rounded-full` = allowed exception; 10–10.5px/`text-xs`, tokens delegated to design-system.js). No edits.

## 16. ui/EmptyState.vue

- **L37 · MINOR (dead class)** `<h3 class="text-base font-bold text-[#333333]">` → remove `text-base` (main.css `h3 { font-size: 14px }` already wins — renders 14px; the utility is misleading).
- **L47 · MUST FIX (cat 2)** `class="inline-flex h-9 … rounded-xl bg-[#0A51B0] px-4 …"` → `inline-flex h-8 … rounded-[6px] …` (radius MUST; h-9→h-8 MINOR).
- **L57 · MUST FIX (cat 2)** `class="inline-flex h-9 … rounded-xl border … px-4 …"` → `inline-flex h-8 … rounded-[6px] …`.
- **L30 · MINOR** `class="flex flex-col … px-6 py-12 text-center"` → `px-4 py-10` (48px vertical whitespace is generous for the compact scale; optional if the empty-state airiness is intentional).
- **MINOR (cat 4):** both buttons duplicate `.btn-primary`/`.btn-secondary`.
- **IGNORE:** L32 `h-14 w-14 rounded-2xl` icon tile (decorative), `text-xs` description.

## 17. ui/ErrorState.vue

- **L26 · MUST FIX (cat 2)** `class="… rounded-2xl border … bg-[#FEF2F2] p-4 sm:p-5 … text-[13px] …"` → `… rounded-[6px] … p-3 … text-xs …` (rounded-2xl + `p-5` both listed violations; `text-[13px]`→`text-xs` is the MINOR part).
- **L36 · MUST FIX (cat 2)** retry `class="inline-flex h-8.5 … rounded-xl bg-[#DC2626] px-3.5 …"` → `… rounded-[6px] …` (h-8.5 = 34px, OK).
- **MINOR (cat 4):** retry button re-styles a danger `.btn-primary` variant.

## 18. ui/Tooltip.vue

- **L32 · MINOR** `class="tt-bubble … rounded-lg bg-[#1E293B] px-2.5 py-1.5 text-[11px] …"` → `rounded-[6px]` (low priority — 11px bubble text is on-spec).

## 19. charts/BaseChartCard.vue

- **L80 · MUST FIX (cat 1)** `.chart-card h3 { font-size: 16px; … }` → `font-size: 14px;` (scoped rule overrides the template's correct `text-sm`; card title standard is 14px/13px-mobile).
- **L76 · MUST FIX (cat 1)** `.chart-card > div:first-child:has(h3) { … padding-bottom: 18px; … }` → `padding-bottom: 10px;` — and in the same block **L75 · MINOR** `margin-bottom: 24px;` → `margin-bottom: 12px;`, **L77 · MINOR** `gap: 16px;` → `gap: 10px;`.
- **L87 · MINOR (cat 1)** `.chart-card h3 + p { … font-size: 12px; … }` → `font-size: 11px;` (subtitle/secondary 10–11px; template `text-[11px]` is already correct, this override beats it).
- **L23 · MINOR (cat 4, dead)** `:class="embedded ? 'w-full' : 'shadow-card rounded-xl border border-[#E2E8F0] bg-white p-4'"` → `'shadow-card border border-[#E2E8F0] bg-white'"` — `.shadow-card` (main.css, unlayered) already enforces 6px radius + 11px padding, so `rounded-xl`/`p-4` are dead and the card currently renders on-spec; dropping them prevents future confusion.
- **L47, L56 · MINOR** `p-4` on error/empty inner blocks → `p-3`.
- **IGNORE:** template `text-sm` title (dead-but-correct), chart height prop, SkeletonChart usage.

## 20. charts/CsatDashboardSection.vue — biggest scoped-CSS offender

- **L327 · MUST FIX (cat 1)** `.csat-heading h3 { font-size: 18px; … }` → `font-size: 14px;` (section title standard). **L148 · MINOR (dead)** template `text-base` on the same h3 → remove (dead either way; scoped rule wins).
- **L341 · MUST FIX (cat 1)** `.csat-panel, .csat-trend { … padding: 24px; … }` → `padding: 12px;`. **L342 · MUST FIX** `border-radius: 16px;` → `border-radius: 6px;`.
- **L346 · MUST FIX (cat 1)** `.csat-panel h3 { font-size: 16px; … }` → delete the declaration (template `text-sm` = 14px is correct) or `font-size: 14px;`.
- **L351 · MUST FIX (cat 1)** `.csat-panel > div:first-child { padding-bottom: 18px; }` → `padding-bottom: 10px;`.
- **L360 · MUST FIX (cat 1)** `.csat-retry { … min-height: 44px; … }` → `min-height: 30px;`; **L362 · MUST FIX** `border-radius: 10px;` → `border-radius: 6px;`; **L361 · MINOR** `padding: 10px 16px;` → `padding: 6px 12px;` (**L359 · MINOR** `min-width: 132px;` → `min-width: 110px;`).
- **L380 · MUST FIX (cat 1)** mobile `.csat-panel, .csat-trend { padding: 18px; … }` → `padding: 10px;`; **L381 · MUST FIX** `border-radius: 12px;` → `border-radius: 6px;`.
- **L319, L336 · MINOR (cat 1)** `.csat-section { gap: 24px }` / `.csat-grid { gap: 24px }` → `gap: 12px;` (template `gap-4`/`gap-5` at L144/L164 are dead — scoped wins). **L373, L376 · MINOR** mobile `gap: 20px` → `gap: 12px;`.
- **L355 · MINOR (cat 1)** `.csat-panel > div:first-child p { … font-size: 12px; … }` → `font-size: 11px;` (subtitle; beats the template's correct `text-[11px]`).
- **L233 · MUST FIX (cat 2)** `<p class="mb-1 text-sm font-bold text-[#5B6B84]">/ 5.0</p>` → `text-xs` (14px label).
- **L151 · MINOR (cat 1)** `<p class="mt-0.5 text-xs font-medium …">` (section subtitle) → `text-[11px]`.
- **MINOR (cat 4, dead):** L167/L253 `rounded-xl … p-5` on `.csat-panel` — dead (scoped `.csat-panel` wins); remove or align to `rounded-[6px] p-3` for clarity.
- **IGNORE:** L229 `text-[36px]` KPI display number; pills (L156, L240); `py-8` empty/loading breathing room; Chart.js `cornerRadius: 8` tooltip (L79) — script config, out of scope per brief.

## 21. ui/skeleton/BaseSkeleton.vue — ✅ compliant (generic primitive; radius options incl. `xl`/`2xl` are for skeleton bars/avatars = pill/avatar exception). No edits.

## 22. ui/skeleton/SkeletonCard.vue

- **L18 · MUST FIX (cat 2)** `class="… rounded-xl border … p-2.5 sm:p-3 lg:p-3.5 shadow-2xs"` → `… rounded-[6px] …` (live — no shared class on this element); **MINOR** `lg:p-3.5` → `lg:p-3` (14px > 12px card standard).
- **L33 · MUST FIX (cat 2)** same `rounded-xl` in the summary variant → `rounded-[6px]`; **MINOR** `lg:p-3.5` → `lg:p-3`.
- **L49 · MINOR (cat 4, dead)** `class="rounded-xl border border-[#E5EAEF] bg-white p-4 shadow-card space-y-3"` → drop `rounded-xl`/`p-4` (`.shadow-card` unlayered wins → renders 6px/11px already); note `dark:bg-slate-900` is also dead against `.shadow-card { background: #fff }` — consider `.ui-card` + dark variant tokens.
- **IGNORE:** `min-h-[76px]` stat card heights, skeleton bar heights.

## 23. ui/skeleton/SkeletonTable.vue

- **L36, L128, L228, L290, L366 · MUST FIX (cat 2)** `class="w-full … rounded-xl border border-[#E2E8F0]/80 bg-white shadow-2xs"` (all five preset wrappers) → `rounded-[6px] …` (live — wrappers are plain divs).
- **MINOR (cat 4, dead utilities):** all `th class="py-3 pl-5 pr-4 …"` / `px-4` and `td class="py-4 pl-5 pr-4"` / `py-3.5 px-4` cells (users preset L52–117, employees L143–217, logs L234–278, tickets L296–354, default L371–412) — main.css `table thead th / tbody td { padding: .45rem .75rem; font-size: … }` (unlayered) wins, so the cells already render compact (≈7px/12px, 12px font); the `py-4 px-4 pl-5 pr-4` and `text-[11px]` utilities are dead and misleading. Either delete them or leave — do NOT "fix" them to smaller values, they have no effect.
- **IGNORE:** skeleton bar widths/heights (mirror real table density), avatar sizes.

## 24. ui/skeleton/SkeletonList.vue — ✅ compliant (`p-2.5` rows, 10–12px bars). No edits.

## 25. ui/skeleton/SkeletonChart.vue

- **L19 · MUST FIX (cat 2)** `class="… p-4 rounded-xl bg-[#F8FAFC] border …"` → `… p-3 rounded-[6px] …` (live; also note this is nested inside BaseChartCard's card, so 16px here is double padding).

## 26. ui/skeleton/SkeletonAvatar.vue — ✅ compliant (radius `xl` maps to the rounded-square avatar shape — pill/avatar exception). No edits.

## 27. ui/AssetCategoryExportModal.vue

- **L62 · MUST FIX (cat 2)** `class="… rounded-2xl border border-[#CFE0F8] bg-[#F4F8FF] p-4"` → `… rounded-[6px] … p-3`.
- **L67 · MUST FIX (cat 2)** `<p class="text-sm font-bold text-slate-800">` → `text-xs` (banner label).
- **L73 · MUST FIX (cat 2)** `class="… rounded-xl border border-slate-200 px-3 py-2.5"` → `rounded-[6px] …`.
- **L75 · MUST FIX (cat 2)** `<span class="text-sm font-bold text-[#0A51B0]">` → `text-xs`.
- **L79 · MUST FIX (cat 2)** `class="rounded-xl border border-amber-200 bg-amber-50 p-3 …"` → `rounded-[6px] …`.
- **L89 · MUST FIX (cat 1+2)** Batal `class="min-h-10 rounded-xl border … px-4 …"` → `min-h-8 rounded-[6px] …`.
- **L97 · MUST FIX (cat 1+2)** Unduh `class="inline-flex min-h-10 … rounded-xl bg-[#0A51B0] px-5 …"` → `inline-flex min-h-8 … rounded-[6px] … px-4 …`.
- **L61 · MINOR** `space-y-4` → `space-y-3`; **L84 · MINOR** `pt-4` → `pt-3`.
- **MINOR (cat 4):** `min-h-10`/`rounded-xl` on buttons are dead whenever inventory-polish.css is loaded (`.inventory-dialog…button { min-height:32px !important; border-radius:6px }`) — the fix above aligns the template with that shared style so it is correct standalone too. Buttons also duplicate `.btn-primary`/`.btn-secondary`.

## 28. ui/AssetCategoryImportModal.vue

MUST FIX (cat 2, live unless inventory-polish.css is loaded):
- **L602** steps strip `… rounded-xl border … p-2` → `rounded-[6px] …`
- **L618** template banner `… rounded-2xl border … p-4 …` → `rounded-[6px] … p-3`
- **L650** Unduh Template `inline-flex min-h-10 … rounded-xl bg-[#0A51B0] px-4 …` → `inline-flex min-h-8 … rounded-[6px] …`
- **L687** dropzone `… rounded-2xl border-2 … p-5 …` → `… rounded-[6px] … p-4` (strict: `p-3`)
- **L701** `<span class="mt-2 text-sm font-bold …">Tarik file ke sini</span>` → `text-xs`
- **L707** file card `rounded-2xl border … p-3` → `rounded-[6px] …`
- **L732** preview card `overflow-hidden rounded-2xl border …` → `rounded-[6px] …`
- **L792** fieldset `rounded-2xl border border-slate-200 p-3` → `rounded-[6px] …`
- **L810** replace-warning `… rounded-xl border … p-3` → `rounded-[6px] …`
- **L832** error alert `… rounded-xl border … p-3` → `rounded-[6px] …`
- **L839** success alert `… rounded-xl border … p-3` → `rounded-[6px] …`
- **L852** Batal `min-h-10 rounded-xl border … px-4` → `min-h-8 rounded-[6px] …`
- **L865** Import `inline-flex min-h-10 … rounded-xl bg-[#0A51B0] px-5 …` → `inline-flex min-h-8 … rounded-[6px] … px-4 …`

MINOR:
- **L601** `space-y-4` → `space-y-3`; **L846** `pt-4` → `pt-3`.
- **L724** delete-file button `h-9 w-9 … rounded-lg` → `h-8 w-8 … rounded-[6px]` (36px > 34px).
- **L824** GANTI input `mt-1 h-9 w-full rounded-lg …` → `mt-1 h-8 w-full rounded-[6px] …`.
- **L625** h3 `text-sm` — keep (real section title, 14px on-spec).
- **cat 4:** same `.inventory-dialog` dead/duplicate situation and `.btn-primary/.btn-secondary` duplication as the export modal.
- **IGNORE:** L710 `h-10 w-10 rounded-xl` icon tile (decorative); preview-table `px-3 py-2` cells (dead vs main.css table rules anyway).

## 29. ui/ShipmentExportModal.vue

- **L39 · MUST FIX (cat 2)** `… rounded-2xl border border-[#CFE0F8] bg-[#F4F8FF] p-4` → `… rounded-[6px] … p-3`.
- **L44 · MUST FIX (cat 2)** `<p class="text-sm font-bold text-slate-800">` → `text-xs`.
- **L50 · MUST FIX (cat 2)** `… rounded-xl border border-slate-200 px-3 py-2.5` → `rounded-[6px] …`.
- **L52 · MUST FIX (cat 2)** `<span class="text-sm font-bold text-[#0A51B0]">` → `text-xs`.
- **L56 · MUST FIX (cat 2)** `rounded-xl border border-amber-200 bg-amber-50 p-3 …` → `rounded-[6px] …`.
- **L66 · MUST FIX (cat 1+2)** Batal `min-h-10 rounded-xl border … px-4` → `min-h-8 rounded-[6px] …`.
- **L73 · MUST FIX (cat 1+2)** Unduh `inline-flex min-h-10 … rounded-xl bg-[#0A51B0] px-5` → `inline-flex min-h-8 … rounded-[6px] … px-4`.
- **L88–90 · MUST FIX (cat 1)** `.shipment-export-flow button { min-height: 44px; }` → **delete the rule** (44px controls outside any mobile media query; `shipment-dialog` has no CSS anywhere, nothing overrides it — this looks like leftover compensation for the now-fixed `--fs-scale-factor` bug, so remove rather than re-tune).
- **L38 · MINOR** `space-y-4` → `space-y-3`; **L61 · MINOR** `pt-4` → `pt-3`; **cat 4 MINOR** buttons duplicate `.btn-primary`/`.btn-secondary`.

## 30. ui/ShipmentImportModal.vue

MUST FIX:
- **L162** steps strip `… rounded-xl border … p-2` → `rounded-[6px] …` (cat 2)
- **L178** template banner `… rounded-2xl border … p-4 …` → `rounded-[6px] … p-3` (cat 2; p-4 MINOR)
- **L198** Unduh Template `inline-flex min-h-10 … rounded-xl bg-[#0A51B0] px-4` → `inline-flex min-h-8 … rounded-[6px] …` (cat 1+2)
- **L214** dropzone `… rounded-2xl border-2 … p-5 …` → `… rounded-[6px] … p-4` (strict `p-3`) (cat 2)
- **L227** `<span class="mt-2 text-sm font-bold …">Tarik file ke sini</span>` → `text-xs` (cat 2)
- **L232** file card `rounded-2xl border … p-3` → `rounded-[6px] …` (cat 2)
- **L255** preview card `overflow-hidden rounded-2xl border …` → `rounded-[6px] …` (cat 2)
- **L293** fieldset `rounded-2xl border border-slate-200 p-3` → `rounded-[6px] …` (cat 2)
- **L310** error `… rounded-xl border … p-3` → `rounded-[6px] …` (cat 2)
- **L317** success `… rounded-xl border … p-3` → `rounded-[6px] …` (cat 2)
- **L329** Batal `min-h-10 rounded-xl border … px-4` → `min-h-8 rounded-[6px] …` (cat 1+2)
- **L341** Import `inline-flex min-h-10 … rounded-xl bg-[#0A51B0] px-5` → `inline-flex min-h-8 … rounded-[6px] … px-4` (cat 1+2; px-5 MINOR)
- **L367–371 · MUST FIX (cat 1)** `.shipment-import-flow fieldset label { min-height: 44px; … }` → **delete the `min-height` declaration** (44px labels outside mobile).
- **L372–374 · MUST FIX (cat 1)** `.shipment-import-flow button { min-height: 44px; }` → **delete the rule** (same rationale as ShipmentExportModal — no `shipment-dialog` CSS exists to override it).

MINOR:
- **L160** `space-y-4` → `space-y-3`; **L323** `pt-4` → `pt-3`.
- **L247** delete-file button `h-9 w-9 … rounded-lg` → `h-8 w-8 … rounded-[6px]`.
- **L304** GANTI input `mt-1 h-9 w-full rounded-lg …` → `mt-1 h-8 w-full rounded-[6px] …`.
- **L185** h3 `text-sm` — keep (real title). **cat 4** button duplication of `.btn-primary`/`.btn-secondary`.
- **IGNORE:** L235 icon tile; L384–391 mobile block (compact 8px/12px — fine).

---

## Cross-cutting (category 4 — systemic dedup recommendations)

1. **Modal footer buttons (≈20 instances across 6 modals + ConfirmDialog/FilterModal/EmptyState/ErrorState)** hand-roll exactly what `.btn-primary`/`.btn-secondary` already provide (12px, 6px radius, `--btn-*` bg/hover, active scale). Adopt the shared classes (plus a `btn-danger` tone for destructive confirms) and delete the local styling. This single change removes most `rounded-xl` MUST FIXes at the source.
2. **Card primitives:** SkeletonCard/SkeletonTable/SkeletonChart/CsatDashboardSection re-implement `.ui-card`/`.shadow-card` (radius/padding/border) locally — Csat at 24px/16px. Replace local chrome with `.ui-card` (+ dark variants) so the `--ui-card-padding`/`--ui-radius-card` tokens govern.
3. **Dead utilities vs shared rules (remove, don't restyle):** `rounded-xl/lg` where `.ui-select-trigger/.ui-select-menu/.ui-action-menu/.ui-modal-panel/.ui-pagination-button/.ui-menu-trigger/.ui-search-input/.shadow-card` apply; `text-base/text-sm` on bare `h2/h3`; `py-4 px-4 pl-5 pr-4` + `text-[11px]` in skeleton/preview tables. They mislead future edits into "fixing" things that don't render.
4. **Scoped 44px compensation rules** (ShipmentExport L88–90, ShipmentImport L367–374, Csat `.csat-retry` L360) predate the centrally-fixed `--fs-scale-factor: 0.7` bug (no trace left in main.css) — nothing needs them anymore; delete.

## IGNORE register (explicitly out of scope per brief)

- Mobile-only 44px + 16px inputs: AppPagination L101 (`min-h-11 text-base sm:hidden`), L188–196, L206–209; all `min-h-11 sm:min-h-0` buttons (mobile < 640px only); Navbar 767px block; iOS-zoom 16px selects.
- Bottom-nav ergonomics: AppBottomNav bar 48px/items 38px/labels/radius; MobileNav items 44px (56px bar flagged MINOR for token alignment only).
- Brand wordmark 19px, KPI display `text-[36px]`, decorative icon tiles (`h-10/h-12/h-14` + `rounded-xl/2xl`), pill badges/avatars (`rounded-full`), skeleton bar radius options, Chart.js `cornerRadius` (script config), `py-8` empty-state breathing room, all colors/icons/text/focus-visible outlines (none removed anywhere), script logic.

## Tally

| Rank | Line edits |
|---|---|
| MUST FIX | ~85 (Navbar 6 · AppImportModal 13 · ConfirmDialog 2 · FilterModal 4 · SearchableSelect 1 · AppPagination 3 · EmptyState 2 · ErrorState 2 · BaseChartCard 2 · Csat 9 · SkeletonCard 2 · SkeletonTable 5 · SkeletonChart 1 · AssetExport 7 · AssetImport 13 · ShipmentExport 8 · ShipmentImport 15) |
| MINOR | ~70 (incl. all dead-class/shared-duplicate cleanups) |
| Compliant, no edits | QuickActions · AppModal (excl. 1 cleanup) · AppBadge · StatusBadge · AppViewToggle (excl. 1) · BaseSkeleton · SkeletonList · SkeletonAvatar |

# Audit UI TrackIT – Pemetaan & Temuan

**Tanggal:** 2026-10-08
**Scope:** Dashboard, Tiket, semua sub-menu, sidebar, KPI, tabel, filter, modal, form, tab, tombol

## 1. Arsitektur Teknologi
- Frontend Vue 3 + Vite + Tailwind CSS v4
- Tokens DTCG JSON → CSS custom properties via `scripts/build-tokens.js`
- Font utama: `Plus Jakarta Sans`, ui-sans-serif, system-ui, sans-serif

## 2. Peta Halaman
`frontend/src/views/`
- DashboardView.vue
- TicketsView.vue
- AssetsView.vue, AssetsGaView.vue, AssetsOpsView.vue, MyAssetsView.vue
- CasesView.vue
- SubmissionsView.vue
- UsersView.vue, EmployeesView.vue
- ShipmentsView.vue
- ExportView.vue, DatabaseView.vue, LogsView.vue
- Admin: AdminDashboardView.vue, DocEditorView.vue, KbCategoriesView.vue, FaqAdminView.vue

## 3. Komponen Bersama
- Layout: AppSidebar.vue, AppHeader.vue, AppBottomNav.vue, MobileNav.vue, Navbar.vue
- UI: StatCard.vue, PageHeader.vue, AppModal.vue, FilterModal.vue, AppPagination.vue, CustomSelect.vue, SearchableSelect.vue, AppBadge.vue, StatusBadge.vue
- KPI tokens: `frontend/src/assets/kpi-tokens.css`
- Global styles: `frontend/src/assets/main.css`, `frontend/src/styles/tokens.css`

## 4. Sumber Styling
- `design-tokens/typography.json` → font family, sizes, weights, line-height
- `design-tokens/spacing.json`, `radii.json`, `layout.json`
- `frontend/src/styles/tokens.css` auto-generated
- `frontend/src/assets/main.css` → base type scale, heading, button, input, card, table
- `frontend/src/assets/kpi-tokens.css` → KPI height/padding/font
- `tailwind.config.js` → fontFamily, fontSize dashboard-*

## 5. Temuan Font & Ukuran

### Font family
- Global: `Plus Jakarta Sans` konsisten di `main.css`, `tokens.css`, Tailwind
- Lokal berbeda:
  - `SubmissionsView.vue` print HTML: `font-family: Arial, sans-serif;` → untuk dokumen cetak A4, dipisah media print. Disarankan dipertahankan dengan fallback, tidak mempengaruhi UI aplikasi.
  - `DocEditorView.vue` monospace untuk editor → sesuai peran.

### Skala tipografi aktual
- Body: 12px desktop / 11px mobile ✓
- H1 judul halaman: 18px desktop / 16px mobile ✓
- H2/H3 judul bagian/card: 14px desktop / 13px mobile ✓
- Input/button/tabel/navigasi: 12px / 11px ✓
- Label KPI: 11px desktop / 10px mobile ✓
- Angka KPI: 19px desktop / 17px mobile → dalam rentang 18-20 / 16-18
- Teks tombol: 12px / 11px ✓

### Inkonsekuensi ukuran tersisa
- Beberapa view memiliki style scoped inline `font-size: 9px/8.5px` terutama pada badge/meta dan template cetak SubmissionsView. Audit v2 sebelumnya mempertahankan 8.5/9px untuk dokumen cetak PDF/A4.
- `text-[10.5px]`, `text-[11.5px]`, `text-[12.5px]` tersebar di kode — hasil snap sebelumnya. Perlu konsolidasi ke token `--fs-2xs/xs/sm/md`.

### Spacing & geometri
- Card padding: `--ui-card-padding: 11px` → mendekati 10-12px
- Radius card: `--ui-radius-card: 6px` ✓
- KPI height: 52px mobile / 56px desktop, padding 8-10 / 10-12 ✓
- Sidebar item height & label size masih 10px untuk group title → sesuai guideline compact.

## 6. Aturan Styling Utama
- Font family global di `:root` dan `body` dengan `font-family: 'Plus Jakarta Sans', ...`
- Line-height isi 1.45, heading 1.25 → mendekati 1.4-1.5 / 1.2-1.3
- Weight: isi 400, label 500, judul/angka 600
- Placeholder: `clamp(11px, calc(1em - 2px), 1em)` → 1 tingkat di bawah input
- Focus ring jelas, tidak dihapus
- Dark mode token terpisah

## 7. Rekomendasi Perbaikan Global
1. **Unifikasi font**: Pastikan semua komponen menggunakan var `--font-family-sans`. Hapus override `font-family: Arial` pada UI aplikasi non-print.
2. **Snap ukuran**: Ganti semua `text-[10.5px]` → `text-[11px]`, `text-[11.5px]` → `text-[12px]`, `text-[12.5px]` → `text-[13px]` pada komponen UI non-print.
3. **KPI angka**: Seragamkan ke `--kpi-value-font-size-lg: 18px` desktop, `--kpi-value-font-size: 16px` mobile untuk kepatuhan rentang spesifik.
4. **Card & sidebar**: Terapkan padding 10-12px desktop / 8-10px mobile secara konsisten via token `--ui-card-padding`.
5. **Tabel & filter**: Pastikan tinggi baris 34px, padding 0.45rem 0.75rem, teks 12/11px.
6. **Mobile**: Pastikan modal/form muat viewport, filter wrap, tabel scroll container.

## 8. Verifikasi
Perlu diperiksa manual:
- Dashboard, Tiket, Assets, Cases, Submissions pada desktop 1280px, tablet 768px, mobile 375px
- Font, ukuran, KPI, card, sidebar, tombol, tabel, filter, modal, wrapping, alignment, tinggi komponen, scroll horizontal

Laporan lengkap perubahan akan dicatat setelah penyesuaian token.

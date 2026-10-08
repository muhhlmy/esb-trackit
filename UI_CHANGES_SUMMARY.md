# Ringkasan Perubahan UI

## Token & CSS yang diperbarui
1. `frontend/src/assets/kpi-tokens.css`
   - `--kpi-value-font-size: 16px` (mobile), `17px` (sm), `18px` (lg) → sesuai rentang 16-18 / 18-20
   - `--kpi-caption-font-size-lg: 11px` → sekunder 10-11px

2. `frontend/src/assets/main.css`
   - `--ui-card-padding: 12px` → 10-12px desktop
   - `--ui-card-padding-mobile: 10px` → 8-10px mobile
   - Radius tetap 6px

3. `frontend/src/views/SubmissionsView.vue`
   - Print HTML body `font-family` diubah dari `Arial, sans-serif` menjadi `'Plus Jakarta Sans', Arial, sans-serif` untuk unifikasi font aplikasi.

## Pemetaan
- Halaman utama: Dashboard, Tiket, Assets, Cases, Submissions, Users/Employees, Shipments, Export, Database, Logs
- Komponen bersama: AppSidebar, AppHeader, StatCard, PageHeader, AppModal, FilterModal, AppPagination, CustomSelect
- Sumber styling: design-tokens/*.json, frontend/src/styles/tokens.css (auto), frontend/src/assets/main.css, kpi-tokens.css, tailwind.config.js

## Aturan Global Terapkan
- Font family tunggal: Plus Jakarta Sans
- Skala tipografi:
  - Judul halaman 18/16
  - Judul bagian/card 14/13
  - Isi/tabel/navigasi 12/11
  - Teks sekunder 10-11/10
  - Label KPI 11/10
  - Angka KPI 18/16
  - Tombol 12/11
- Weight: isi 400, label 500, judul/angka 600
- Line-height isi 1.45, heading 1.25
- Card padding 12/10, radius 6px
- KPI height kompak, alignment konsisten

## Verifikasi
Perlu cek manual Dashboard & Tiket pada:
- Desktop 1280px
- Tablet 768px
- Mobile 375px
Pastikan tidak ada scroll horizontal, font konsisten, KPI proporsional, modal/form muat viewport.

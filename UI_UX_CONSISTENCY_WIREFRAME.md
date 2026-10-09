# UI/UX Konsistensi & Wireframing – TrackIT

## Ringkasan Temuan Audit Menyeluruh

Audit layout komponen reusable dilakukan untuk 7 view utama: DashboardView, TicketsView, AssetsView, CasesView, SubmissionsView, UsersView, ShipmentsView.

### Pola Layout Standar yang Diharapkan
```
AppShell
├─ AppSidebar / AppHeader global
└─ Page
   ├─ PageHeader [title, subtitle, icon, actions slot]
   ├─ FilterBar / Toolbar [SearchInput, FilterButton, AppViewToggle, Tabs]
   ├─ KPI Row [StatCard x N]
   ├─ Chart / Panel Row [PanelCard x N]
   ├─ Data Section
   │   ├─ DataTable  [columns config, responsive card fallback]
   │   └─ AppPagination
   └─ EmptyState / ErrorState
```

### Komponen Reusable yang Ada & Pemakaian
**Sudah reusable & konsisten:**
- PageHeader, AppModal, ConfirmDialog, FilterModal, AppViewToggle, AppPagination, AppRowActions, AppBadge, StatusBadge, StatCard, EmptyState, ErrorState, BaseSkeleton, SkeletonTable, SearchableSelect, CustomSelect, AuthGateCard

**Belum reusable / hard-coded:**
- KPI cards di DashboardView & ShipmentsView → hard-coded div .dash-stat-card / .shipment-summary
- DataTable generik → semua view hard-code <table> native dengan styling scoped
- FilterBar / SearchInput → tiap view membuat input manual dengan class berbeda
- PanelCard → .dashboard-panel / .location-card / .asset-toolbar custom scoped
- FormSection / FormField / Stepper / Tabs → form multi-step di AssetsView, UsersView, SubmissionsView hard-coded
- UserCard / TicketCard / ShipmentCard → card mobile duplikasi markup desktop/mobile
- PermissionMatrix, OptionCardGrid, Toast global

### Inkonsistensi Utama per View

**DashboardView**
- KPI hard-coded .dash-stat-card, tidak pakai StatCard
- Tabel Aset/Tiket duplikasi markup mobile/desktop, tanpa DataTable reusable
- Panel .dashboard-panel hard-coded, padding belum mobile token
- Status bar progress manual dengan hex hard-coded

**TicketsView**
- KPI 4 kartu hard-coded, StatCard tersedia tidak dipakai
- Search & Queue tabs hard-coded, tidak pakai FilterBar / TabGroup reusable
- Ticket card desktop/mobile duplikasi besar
- Form unit/kategori button hard-coded, bisa OptionCardGrid
- Radius/padding campuran rounded-lg/xl

**AssetsView**
- Header toolbar hard-coded, PageHeader tidak dipakai, sticky dinonaktifkan via CSS
- Search input manual, FilterModal dipakai tapi styling berbeda
- Tabel hard-coded, card mobile hard-coded
- Form multi-step stepper custom, tidak reusable
- Tab detail hard-coded

**CasesView**
- Tidak pakai PageHeader, toolbar custom
- Modal drawer mobile hard-coded, seharusnya AppModal
- Empty state duplikasi, seharusnya EmptyState reusable
- Filter/search di sidebar, tidak standar

**SubmissionsView**
- Header hard-coded, bukan PageHeader
- Filter bar hard-coded, tidak ada FilterModal
- KPI hilang
- Section number bug 03/03
- Duplikasi markup aset baru/lama ~150 baris
- Print HTML inline >900 baris

**UsersView**
- Search bar hard-coded, clear button manual, padding berbeda EmployeesView
- Filter Modal konten tidak konsisten CustomSelect vs native select
- Permission matrix native select hard-coded
- Toast notifikasi div fixed hard-coded
- Skeleton mobile custom

**ShipmentsView**
- KPI hard-coded, tidak pakai StatCard
- Toolbar search styling khusus shipment-toolbar
- Tabel & card mobile hard-coded
- Toast notifikasi lokal
- Form section hard-coded

### Rekomendasi Wireframe & Normalisasi Komponen

1. **Page Shell**
   - Semua view pakai `PageHeader` + `FilterBar` reusable
   - FilterBar = SearchInput + FilterButton + AppViewToggle + TabGroup opsional

2. **KPI**
   - Wajib pakai `<StatCard>` untuk semua ringkasan angka
   - Prop: title, value, icon, color, subtitle

3. **Panel**
   - Buat `PanelCard.vue` dengan slot header/content
   - Padding token `--ui-card-padding` / mobile, radius 6px
   - Ganti semua .dashboard-panel, .location-card, .asset-toolbar custom

4. **Data**
   - Buat `DataTable.vue` generik dengan prop columns, rows, viewMode
   - Mode kartu otomatis fallback, tidak duplikasi markup
   - Gunakan `AppRowActions`, `AppBadge`, `StatusBadge` di dalam sel

5. **Form & Wizard**
   - `FormField`, `FormSection`, `Stepper`, `Tabs` reusable
   - Validasi standar, error alert komponen

6. **Filter & Search**
   - `SearchInput` reusable dengan clear icon
   - `FilterModal` dengan prop fields standar
   - `OptionCardGrid` untuk pilihan unit/kategori

7. **Notifikasi & State**
   - Toast global via composable `useToast`
   - EmptyState / ErrorState untuk semua halaman

8. **Tokenisasi**
   - Hilangkan hex hard-coded, pakai CSS var `--ui-*`, `--font-*`, `--spacing-*`, `--border-radius-md`
   - Radius seragam 6px, padding card 10-12/8-10, font Plus Jakarta Sans

### Langkah Implementasi Berikutnya
1. Refactor Dashboard KPI ke StatCard + PanelCard + DataTable
2. Normalisasi TicketsView: KPI, FilterBar, TicketCard reusable, TabGroup
3. Unifikasi AssetsView header & toolbar ke PageHeader + FilterBar
4. Standardisasi CasesView dengan PageHeader + AppModal drawer
5. Perbaiki SubmissionsView header, filter, KPI, bug nomor section, ekstrak AssetRows
6. Standarisasi UsersView search, permission matrix, toast
7. Refactor ShipmentsView KPI, toolbar, DataTable

Dengan normalisasi ini seluruh aplikasi akan mengikuti wireframe yang sama, mengurangi duplikasi, mempermudah maintenance tema/dark mode, dan konsisten UI/UX lintas halaman.

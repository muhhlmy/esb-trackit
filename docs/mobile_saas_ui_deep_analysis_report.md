# Laporan Analisis Mendalam: Optimasi UI, Ukuran Card, Layout SaaS & Transformasi Native Mobile App

**Project:** ESB TrackIT (Frontend IT Asset & Service Management)  
**Tanggal:** 6 Oktober 2026  
**Status:** Deep Audit & Architectural Blueprint  
**Fokus:** Densitas Layout SaaS, Reduksi Ukuran Card, Ergonomi Native Mobile App, Konsistensi Tipografi & Ruang Pandang (Viewport Efficiency)

---

## 1. Executive Summary & Ringkasan Temuan

Aplikasi **TrackIT** dibangun dengan fondasi teknologi modern (**Vue 3 Composition API, Vite, Tailwind CSS v4, Lucide Icons & Material Symbols**). Desain visual dasarnya bersih dan fungsional. Namun, berdasarkan audit mendalam terhadap seluruh struktur file template (`views/*.vue`), file style (`assets/*.css`, `styles/tokens.css`, `tailwind.config.js`), dan komponen navigasi shell (`App.vue`, `AppHeader.vue`, `AppBottomNav.vue`), terdapat **isu struktural utama dalam efisiensi ruang (space efficiency)**, khususnya pada **tampilan mobile (< 768px)**:

1. **Card Terlalu Besar & Boros Ruang Vertikal (Vertical Sprawl):**
   - Pada kartu KPI / ringkasan statistik (`DashboardView`, `TicketsView`, `ShipmentsView`, `EmployeesView`), padding kartu mencapai **16px–24px**, angka statistik mencapai **28px–36px**, dan di mobile dipecah menjadi **1 kolom vertikal**. Pada Dashboard, 5 kartu statistik menghabiskan **~950px tinggi layar** hanya untuk menampilkan 5 metrik angka sebelum user melihat konten utama.
2. **Duplikasi Header (Double Header Overhead):**
   - Shell utama (`AppHeader.vue`) sudah memakan tinggi **56px (h-14)** yang menampilkan judul halaman dan subtitle. Namun, hampir setiap halaman (`DashboardView`, `TicketsView`, `AssetsView`, `EmployeesView`, `UsersView`, `ShipmentsView`) memanggil komponen `<PageHeader />` setinggi **80px–110px** dengan ikon 44px, padding 20px, dan mengulang judul yang sama. Di layar smartphone dengan viewport efektif ~667px–844px, **30%–45% layar atas habis hanya untuk header dan breadcrumb**.
3. **Card List Data Tidak Menyerupai Native Mobile App:**
   - Komponen item data seperti `.tck-list-item` (tiket), `.laptop-row` (aset), dan `.admin-person-cards` (karyawan/user) dirancang dengan pendekatan desktop yang "dikecilkan secara paksa" (padding 18px–20px, multiple grid-rows, nested container abu-abu).
   - Pada native mobile app (seperti *Linear Mobile*, *Jira Mobile*, *GitHub Mobile*, atau *Apple Settings*), kartu berbentuk compact card-row list (list tile) dengan padding rapat (**10px–12px**), avatar compact (**32px**), status badge minimalis, dan hierarki font 2–3 baris teks yang informatif tanpa memakan tinggi hingga 180px–220px per item.
4. **Modal / Dialog Masih Bergaya Desktop:**
   - Komponen `AppModal.vue` menampilkan pop-up kotak melayang di tengah layar dengan margin luar (`p-3 sm:p-5`), bukan **Native Mobile Bottom Sheet** yang menempel di bagian bawah viewport (`bottom: 0`, rounded-t-2xl, dengan drag handle/swipe down to close).

---

## 2. Diagnosis Detail Struktur UI & Akar Masalah

### 2.1. Double Header Syndrome (Pemborosan 150px Viewport)

Di `AppHeader.vue`:
```html
<header class="app-header h-14 md:h-[64px] ...">
  <h1>{{ pageTitle }}</h1> <!-- e.g. "Tiket" / "Dashboard" -->
</header>
```
Lalu di dalam `TicketsView.vue` (dan view lainnya):
```html
<PageHeader title="Ticket Inbox" subtitle="Kelola pengajuan kendala..." icon="confirmation_number">
  <button>Buat Tiket</button>
</PageHeader>
```
- **Dampak pada Mobile:** Di viewport mobile 390×844px (iPhone 14/15/16):
  - Status bar + Browser bar: ~44px
  - AppHeader: 56px
  - PageHeader: ~88px
  - KPI Cards (grid/stack): ~160px
  - Toolbar & Search: ~52px
  - **Total ruang terpakai sebelum data pertama muncul: ~400px (hampir 55% viewport habis)**.
- **Solusi Native App:** Pada mode mobile (`< 768px`), judul halaman dilekatkan ke `AppHeader` (dengan tombol action di kanan atas header), sementara `<PageHeader>` di dalam konten utama disembunyikan atau di-flatten menjadi subtitle ringkas/action bar tanpa border card besar.

---

### 2.2. Ukuran & Padding Kartu KPI / StatCard yang Menggelembung

#### Komparasi Kondisi Saat Ini vs Target SaaS Native:
| Parameter | DashboardView (Saat Ini) | StatCard.vue (Saat Ini) | Standar Native Mobile / SaaS |
|---|---|---|---|
| **Card Padding** | `padding: 24px` (`@media: 16px`) | `p-3.5 sm:p-4` (14px–16px) | **`8px 12px`** (SaaS compact tile) |
| **Nilai Angka (Value)** | `font-size: 32px` (mobile: `28px–36px`) | `text-[24px] sm:text-[26px]` | **`18px–20px`** (bold tabular-nums) |
| **Icon Container** | `32px–42px` | `w-7 h-7` (28px) | **`20px–24px`** atau chip inline |
| **Grid Mobile (< 640px)** | **1 Kolom vertikal** (`minmax(0, 1fr)`) | 1–2 kolom | **2 Kolom sejajar** (`grid-cols-2`) atau horizontal scroll swipe chips |
| **Tinggi 1 Kartu** | **140px – 174px** | **85px – 100px** | **52px – 60px** |
| **Tinggi Total 5 Kartu** | **~850px** (2 full scroll) | ~200px (grid 2 col) | **~120px** (2 baris 2 col) atau **48px** (carousel) |

Di `DashboardView.vue` baris 1649–1698:
```css
.dashboard-view .dashboard-stats > * {
  min-width: 0;
  padding: 24px;
  border-radius: 16px;
}
@media (max-width: 639px) {
  .dashboard-stats {
    grid-template-columns: minmax(0, 1fr); /* 1 KOLOM VERTICAL! */
    gap: 20px;
  }
}
```
*Akar Masalah:* Rule `@media (max-width: 639px)` secara eksplisit memaksa kartu statistik menjadi 1 kolom dengan gap 20px dan padding besar. Ini membuat halaman Dashboard di HP terasa sangat panjang dan melelahkan untuk di-scroll.

---

### 2.3. Struktur Item List / Card Data (Tiket, Aset, Pengiriman)

#### A. Modul Tiket (`TicketsView.vue` baris 2043–2160):
Saat ini di mobile, 1 tiket dirender dengan struktur:
1. Baris 1: Avatar 36px + No. Tiket + Queue Pill + Tombol Row Action.
2. Baris 2: Judul Kendala (2 line clamp) + Deskripsi Singkat.
3. Baris 3: Kotak abu-abu 2 kolom berisi Pelapor + Penanggung Jawab (`p-2.5 bg-[#F8FAFC] border`).
4. Baris 4: Garis border-t + Status Badge + Priority Badge + Waktu & Komentar.

*Tinggi rata-rata per kartu tiket di mobile:* **185px – 210px!**  
Di layar HP, user hanya bisa melihat **1.5 hingga 2 tiket per layar penuh**.

*Pendekatan Native SaaS (Linear / Jira Mobile):*
- Tinggi kartu cukup **74px – 88px** (penghematan 60% ruang vertikal).
- Format list-item kompak:
  - Baris atas: `[#TCK-001]` `IT` · `Pelapor Name` · `3j lalu`
  - Baris tengah: Judul Tiket (bold 13px, 1-line truncate)
  - Baris bawah: Status Badge mini + Priority Dot + Assignee Avatar mini (20px) + Chat Count (inline).
  - Hilangkan kotak nested abu-abu di dalam kartu.

#### B. Modul Aset (`AssetsView.vue` & `asset-workspace.css`):
Di `asset-workspace.css` baris 511–525:
```css
.asset-inventory .laptop-list > .laptop-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 32px;
  grid-template-areas: 'identity identity actions' 'holder location location' 'state state state';
  gap: 20px 16px;
  padding: 20px;
  border-radius: 14px;
}
```
- Padding **20px** dan gap **20px 16px** per item aset terlalu tebal untuk mobile.
- Satu kartu aset memakan tinggi **~165px**. Jika ada 10 aset, pengguna harus scroll sejauh 1.700 pixel.
- Target: Reduksi padding menjadi **10px 12px**, gap **6px**, hilangkan whitespace berlebih, jadikan format compact asset card setinggi **70px–82px**.

---

### 2.4. Ergonomi Navigasi Bawah & Mobile Shell

`AppBottomNav.vue` sudah memiliki arsitektur yang baik:
- Terhubung dengan RBAC (`navigationConfig.js`).
- Ada `primaryBottomNav` (4 item) + tombol `Lainnya` (More menu drawer).
- Terdapat safe-area inset (`pb-[max(0.375rem,env(safe-area-inset-bottom))]`).

*Area Peningkatan agar 100% Native:*
1. **Tinggi Bottom Nav:** Saat ini `min-h-[56px]`. Di native iOS/Android, standar tab bar adalah 49px (iOS) atau 56px (Material 3). Tambahkan haptic touch feedback visual (micro active scale 0.94) dan ikon clean line 20px.
2. **Drawer Menu Lainnya:** Saat dibuka, drawer muncul dari bawah (`rounded-t-2xl`). Ini sudah bagus, tetapi perlu ditambahkan **drag indicator notch** (garis abu-abu kecil di atas) layaknya bottom sheet native.
3. **Penyelarasan Padding Bawah Konten (`App.vue`):**
   `App.vue` baris 153:
   `pb-[calc(56px+0.875rem+env(safe-area-inset-bottom,0px))]`
   Ini sudah mencegah konten tertutup bottom bar, namun di beberapa halaman yang memiliki floating button atau sticky toolbar, terjadi tabrakan margin.

---

### 2.5. Modals & Dialogs (`AppModal.vue`)

Di `AppModal.vue`:
```html
<div class="modal-backdrop ... p-3 sm:p-5">
  <div class="modal-panel max-h-[calc(100dvh-1.5rem)] rounded-2xl ...">
```
- Pada layar smartphone (< 640px), modal tampil sebagai kotak melayang di tengah dengan padding tepi 12px.
- **Pola Native Mobile:** Pada mobile (< 640px), modal seharusnya bertransformasi menjadi **Bottom Sheet Full/Half**:
  - Menempel ke tepi bawah (`bottom: 0`, `rounded-t-2xl rounded-b-none`, `max-w-full`).
  - Animasi geser naik dari bawah (`translate-y-0` from `translate-y-full`).
  - Header memiliki drag handle/pill di atas judul.
  - Tombol aksi utama (Simpan/Terapkan) sticky di bawah dengan hit-box 44px ramah jempol.

---

## 3. Matriks Komparasi Desain: Sebelum vs Sesudah

| Elemen UI | Kondisi Saat Ini (Desktop-Scaled) | Target Solusi (Compact SaaS & Native Mobile) | Penghematan Ruang |
|---|---|---|---|
| **Padding Konten Halaman (`<main>`)** | `p-3.5` (14px) / `sm:p-4` / `lg:p-5` | Mobile: **`p-2.5` (10px)** / Desktop: `p-4 lg:p-5` | **+28% lebar efektif** |
| **Page Header di Mobile** | Box tersendiri (`p-4`, icon 40px, tinggi ~90px) | **Compact Header bar** terintegrasi / sub-header 40px tanpa card wrapper | **-60px tinggi viewport** |
| **KPI Stat Card Padding** | `16px` – `24px` | **`8px` – `10px`** | **-50% padding** |
| **KPI Value Font Size** | `26px` – `36px` | **`18px` – `20px`** | **-40% tinggi teks** |
| **Grid KPI Mobile** | 1 Kolom (full width stack) | **2 Kolom rapat** (`grid-cols-2 gap-2`) atau horizontal carousel | **-60% tinggi area KPI** |
| **Card Data Tiket (Mobile)** | Multi-row + nested box, tinggi **~200px** | Compact SaaS row tile, tinggi **~78px–86px** | **-60% ruang vertikal** |
| **Card Data Aset (Mobile)** | Grid 3-area, gap 20px, padding 20px, tinggi **~165px** | Linear-style asset row, tinggi **~72px–80px** | **-55% ruang vertikal** |
| **Card Karyawan & User** | Nested DL grid, tinggi **~180px** | User list tile, avatar 32px, tinggi **~68px–76px** | **-58% ruang vertikal** |
| **Search & Filter Toolbar** | Tinggi 44px, gap 12px, margin vertikal lebar | Tinggi **34px–36px**, gap **6px–8px**, sticky kompak | **-20px tinggi toolbar** |
| **AppModal di Mobile** | Pop-up melayang di tengah layar | **Native Bottom Sheet** (`rounded-t-2xl`, drag handle) | **Ergonomi jempol 100%** |
| **Form Inputs di Mobile** | Tinggi 42px–44px, font 16px (anti-zoom) | Tinggi **38px–40px**, font **16px** (tetap anti-iOS zoom) | Proporsional |

---

## 4. Blueprint Teknis & Rekomendasi Solusi per Komponen

### 4.1. Refaktor `StatCard.vue` (SaaS Compact Tile)

Kartu ringkasan statistik yang digunakan di seluruh aplikasi harus memiliki proporsionalitas tinggi tanpa memakan ruang berlebih.

#### Rekomendasi Struktur `frontend/src/components/ui/StatCard.vue`:
```vue
<template>
  <div
    class="bg-white border border-[#E2E8F0] rounded-xl p-2.5 sm:p-3.5 shadow-2xs hover:border-[#CBD5E1] transition-all flex flex-col justify-between min-h-[64px] sm:min-h-[76px]"
  >
    <div class="flex items-center justify-between gap-1.5">
      <span class="text-[10px] sm:text-[11px] font-semibold text-[#5F7089] uppercase tracking-wider truncate">
        {{ title }}
      </span>
      <div
        class="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-md text-[13px] sm:text-[15px]"
        :class="colorClasses[color]"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[14px] sm:text-[16px]">{{ icon }}</span>
      </div>
    </div>

    <div class="mt-1 flex items-baseline justify-between gap-1">
      <span class="font-num text-[17px] sm:text-[22px] font-bold leading-none tracking-tight text-[#1E293B]">
        {{ value }}
      </span>
      <span v-if="subtitle" class="truncate text-[9.5px] sm:text-[10px] font-medium text-[#64748B]">
        {{ subtitle }}
      </span>
    </div>
  </div>
</template>
```

---

### 4.2. Refaktor KPI Grid di `DashboardView.vue`

Hapus pemaksaan 1 kolom di `@media (max-width: 639px)`. Ubah menjadi grid 2 kolom yang kompak:

```css
/* Update pada DashboardView.vue style */
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px; /* di mobile gap 8px */
}

@media (min-width: 768px) {
  .dashboard-stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }
}

@media (min-width: 1280px) {
  .dashboard-stats {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
  }
}

/* Kartu Total Aset tidak perlu span 2 baris penuh di mobile jika bentuknya sudah compact */
.dash-stat-card {
  padding: 10px 12px !important;
  border-radius: 10px !important;
}

.dash-stat-card .stat-number {
  font-size: 20px !important;
  margin: 4px 0 !important;
}
```

---

### 4.3. Refaktor Kartu Tiket Mobile (`TicketsView.vue`)

Gantikan 4 baris yang bertumpuk dengan 2 baris clean SaaS list-tile:

```html
<!-- Native SaaS Compact Ticket Card (Mobile View) -->
<div class="ticket-mobile flex xl:hidden flex-col gap-1.5 p-3 rounded-xl bg-white border border-[#E2E8F0] active:bg-[#F8FAFC]">
  <!-- Baris 1: ID Tiket, Queue, Status, Prioritas & Jam -->
  <div class="flex items-center justify-between gap-1 text-[11px]">
    <div class="flex items-center gap-1.5 min-w-0">
      <span class="font-mono font-bold text-[#0A51B0] bg-[#EDF5FF] px-1.5 py-0.5 rounded text-[10px]">
        {{ ticket.nomor_tiket || `TCK-${ticket.id}` }}
      </span>
      <span class="font-semibold text-slate-600 truncate text-[10.5px]">
        {{ ticket.queue_kode || 'IT' }}
      </span>
      <span class="text-slate-300">·</span>
      <span class="text-slate-500 truncate text-[10.5px]">
        {{ ticket.pelapor_nama || ticket.pelapor || 'User' }}
      </span>
    </div>
    
    <span class="text-[10px] text-[#647281] shrink-0 font-medium">
      {{ formatRelativeTime(ticket.diperbarui_pada || ticket.dibuat_pada) }}
    </span>
  </div>

  <!-- Baris 2: Judul Kendala (Utama) -->
  <h4 class="text-[13px] font-semibold text-[#1E293B] line-clamp-1 leading-snug">
    {{ ticket.judul }}
  </h4>

  <!-- Baris 3: Status Badge, Assignee & Icon Komentar -->
  <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/80">
    <div class="flex items-center gap-1.5">
      <StatusBadge :status="ticket.status_tiket" size="sm" />
      <span
        class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold border"
        :class="getPriorityInfo(ticket.prioritas).class"
      >
        {{ getPriorityInfo(ticket.prioritas).label }}
      </span>
    </div>

    <div class="flex items-center gap-2 text-[10.5px] text-[#647281]">
      <span v-if="ticket.assigned_to_nama" class="truncate max-w-[100px] text-slate-600 font-medium">
        {{ getAssigneeName(ticket.assigned_to_nama) }}
      </span>
      <span v-else class="text-amber-600 font-medium">Unassigned</span>
      
      <span v-if="ticket.total_komentar > 0" class="flex items-center gap-0.5 text-[#0A5DBD]">
        <span class="material-symbols-outlined text-[13px]">chat_bubble</span>
        {{ ticket.total_komentar }}
      </span>
    </div>
  </div>
</div>
```

---

### 4.4. Refaktor Kartu Aset Mobile (`asset-workspace.css` & `AssetsView.vue`)

Perbaiki styling `.laptop-row` untuk layar smartphone (< 768px):

```css
@media (max-width: 767px) {
  .asset-inventory .laptop-list > .laptop-row {
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'icon identity actions'
      'meta meta meta';
    gap: 8px 10px;
    padding: 10px 12px; /* DARI 20px MENJADI 10px 12px */
    border-radius: 10px;
  }

  .laptop-icon {
    width: 32px; /* DARI 42px MENJADI 32px */
    height: 32px;
    border-radius: 8px;
  }
  .laptop-icon span {
    font-size: 17px;
  }

  .laptop-identity h4 {
    font-size: 13px;
    line-height: 1.3;
  }

  .laptop-identity p,
  .laptop-serial {
    font-size: 11px;
    line-height: 1.3;
  }

  /* Baris Meta (Holder, Lokasi, Status dalam 1 baris flex) */
  .laptop-row > .laptop-field,
  .laptop-row > .laptop-state {
    display: none; /* Sembunyikan blok grid terpisah yang boros ruang */
  }

  /* Render baris chip meta compact */
  .laptop-mobile-meta {
    grid-area: meta;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 6px;
    border-top: 1px solid #f1f5f9;
    font-size: 11px;
  }
}
```

---

### 4.5. Refaktor `AppModal.vue` Menjadi Native Mobile Bottom Sheet

Pada mobile mode (< 640px), modal otomatis menempel di bawah layar:

```vue
<!-- Modifikasi template AppModal.vue -->
<div
  ref="panelRef"
  role="dialog"
  aria-modal="true"
  class="modal-panel flex w-full flex-col overflow-hidden bg-white shadow-2xl outline-none
         /* Mobile: Bottom Sheet Style */
         fixed bottom-0 left-0 right-0 max-h-[90dvh] rounded-t-2xl rounded-b-none border-t border-[#E2E8F0]
         /* Tablet & Desktop: Centered Dialog */
         sm:relative sm:bottom-auto sm:left-auto sm:right-auto sm:max-h-[85vh] sm:rounded-2xl sm:border"
  :class="panelSizeClass"
>
  <!-- Mobile Drag Notch / Handlebar -->
  <div class="sm:hidden flex justify-center pt-2 pb-1 bg-white">
    <div class="w-10 h-1 rounded-full bg-slate-300"></div>
  </div>

  <!-- Header Modal -->
  <div class="flex shrink-0 items-center justify-between gap-3 border-b border-[#F1F5F9] px-4 py-3 sm:px-5 sm:py-3.5">
    ...
  </div>
```

---

### 4.6. Penataan Ulang Skala Font & Tipografi Mobile

Berdasarkan audit tipografi, hindari teks sub-pixel (seperti `10.5px`, `11.5px`) dan gunakan skala 4-step standar mobile:

| Elemen UI | Font Size Standar | Line Height | Font Weight | Keterangan |
|---|---|---|---|---|
| **App Bar Title** | `15px` (`0.9375rem`) | `1.25` | `600` (SemiBold) | Header atas mobile |
| **Section Header** | `13px` (`0.8125rem`) | `1.3` | `700` (Bold) | Judul list / heading |
| **Card Primary Text** | `13px` (`0.8125rem`) | `1.35` | `600` | Judul tiket, nama aset, nama karyawan |
| **Card Secondary Text** | `11.5px` – `12px` | `1.4` | `400` – `500` | NIK, serial number, deskripsi singkat |
| **Badge & Meta Pill** | `10px` – `11px` | `1.2` | `600` | Status, prioritas, tag kategori |
| **Input & Form Field** | **`16px` (Mobile)** | `1.4` | `400` | **Wajib 16px di iOS** agar Safari tidak auto-zoom! |
| **Input (Desktop)** | `13px` | `1.5` | `400` | Standar desktop TrackIT |

---

## 5. Rencana Aksi Implementasi Bertahap (Action Plan)

### Fase 1: Reduksi Instan Ukuran Kartu Statistik & Layout Dashboard (Quick Wins)
1. **Perbaiki `StatCard.vue`:** Turunkan padding dari `p-3.5 sm:p-4` menjadi `p-2.5 sm:p-3.5`, perkecil angka dari `26px` menjadi `20px–22px`, perkecil icon container dari `w-7 h-7` menjadi `w-6 h-6`.
2. **Koreksi Grid CSS `DashboardView.vue`:**
   - Hapus `grid-template-columns: minmax(0, 1fr)` pada max-width 639px, gantikan dengan `grid-template-columns: repeat(2, minmax(0, 1fr))` dengan gap `8px–10px`.
   - Ubah padding `.dash-stat-card` di mobile dari `16px–24px` menjadi `10px–12px`.
   - Hasil: Tinggi area statistik berkurang dari ~850px menjadi ~180px (**hemat 78% ruang vertikal!**).

### Fase 2: Transformasi Card Data List (Tiket, Aset, Karyawan, Pengiriman)
1. **Tiket (`TicketsView.vue`):** Desain ulang `.ticket-mobile` menjadi 3-baris compact list tile tanpa kotak nested abu-abu.
2. **Aset (`AssetsView.vue` & `asset-workspace.css`):**
   - Perbaiki `.laptop-row` di mobile menjadi compact tile setinggi ~76px.
   - Singkirkan icon 42px berlebih, ganti icon 30px compact.
3. **Karyawan & User (`EmployeesView.vue`, `UsersView.vue`, `admin-workspace.css`):**
   - Refaktor `.admin-person-cards` dari card bertingkat menjadi clean user row dengan avatar 32px dan 2 baris metadata.
4. **Pengiriman (`ShipmentsView.vue`):**
   - Kompres `.shipment-summary` dari vertikal 1 kolom menjadi 2 baris grid-cols-2.

### Fase 3: Optimasi Navigasi Shell & Penghapusan Header Ganda
1. **Header Konsolidasi:**
   - Buat prop responsive pada `<PageHeader />` atau sembunyikan `<PageHeader />` di viewport mobile (< 768px), lalu delegasikan judul dan aksi tombol utama (e.g. "+ Buat Tiket", "+ Tambah Aset") ke dalam navbar `AppHeader.vue`.
2. **Bottom Nav Polishing:**
   - Tambahkan haptic feedback visual pada `AppBottomNav.vue`.
   - Tambahkan top drag handlebar pada sheet menu "Lainnya".

### Fase 4: Native Bottom Sheet untuk Modal Pop-up (`AppModal.vue`)
1. **Ubah `AppModal.vue`:**
   - Terapkan layout bottom sheet pada `< sm:` breakpoints (`fixed bottom-0 rounded-t-2xl max-h-[90dvh]`).
   - Sticky footer untuk tombol konfirmasi/batal agar selalu terlihat tanpa harus scroll form panjang.

---

## 6. Kesimpulan & Rekomendasi Selanjutnya

Dengan menerapkan rekomendasi ini, aplikasi **TrackIT** akan bertransformasi dari antarmuka desktop yang "dipaksa muat di layar kecil" menjadi aplikasi web berstandar **Modern Enterprise SaaS** dengan pengalaman pengguna (UX) yang setara dengan **Aplikasi Mobile Native**.

Pengguna smartphone tidak lagi disuguhkan scroll tanpa henti untuk menjangkau informasi penting. Setiap layar akan memuat **2x hingga 3x lebih banyak informasi bermakna**, interaksi jempol menjadi nyaman, dan tampilan terlihat rapi, padat, dan profesional layaknya aplikasi SaaS kelas dunia.

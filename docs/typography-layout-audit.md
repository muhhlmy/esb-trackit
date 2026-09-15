# Audit Font, Typography & Layout — TrackIT Frontend
**Tanggal:** 2026-09-14 · **Metode:** static analysis (grep/CSS) + runtime computed-style measurement (Playwright/Chromium) · **Bukti:** `/tmp/audit/T1-typography.json`, screenshot `/tmp/audit/shots/`

---

## AUDIT v2 — 2026-09-15: Placeholder Size, Color Unification & Type Consistency
**Pemicu:** permintaan "perkecil placeholder dalam field form". **Metode:** static analysis penuh (inventory placeholder di semua view + CSS scoped) + verifikasi akar masalah sebelum eksekusi.

### 2.1 Reverse: keputusan v1 #6 dip revisi dengan bukti
v1 mengunci "PH = inherit (anti-shrink)". Analisa ulang: inherit menempatkan PH **selevel** teks input — melanggar Gestalt hierarchy (state ≠ value; PH dipersepsi user sebagai konten). Solusi bukan sweep ukuran (merusak Login 14px → 11px dan title 30px → 11px), melainkan **formula relatif**:

```css
--fs-placeholder: clamp(11px, calc(1em - 2px), 1em); /* floor 11px WCAG 1.4.4, cap = input */
```

Hasil: input 13px → PH 11px · Login 14px → 12px · editor title 30px → 28px (proporsional, tidak pernah lebih besar dari input).

### 2.2 Temuan & perbaikan v2
| # | Temuan (bukti) | Melanggar | Fix |
|---|---|---|---|
| V2-1 | PH = inherit di semua input (v1) | Gestalt hierarchy, PH-as-state | Formula clamp di atas, global satu titik |
| V2-2 | Warna PH terpecah 4 nilai: `#5F7089` (mayoritas), Login `#8d9bb0` **2.8:1 FAIL**, DocEditor title `#CBD5E1` **~1.5:1 FAIL**, Tickets `placeholder-slate-400`, Templates dark `slate-500` **2.6:1 FAIL** | WCAG 1.4.3 + Nielsen #4 Consistency | Token `--color-placeholder: #5F7089` (4.6:1) + override dark `#94a3b8` di `html.dark`; semua outlier dialihkan |
| V2-3 | Label & thead 11px (0.6875rem) | Floor legibility | `--fs-form-label: 12px` — label 1 tingkat di bawah input 13px (hierarki form) |
| V2-4 | `:where(...)` input block set `font-size:0.75rem` setelah aturan global 13px (dead conflict) | Dead code / drift | Dihapus, komentar eksplisit |
| V2-5 | 3× `items-center: center;` di `.btn-*` (bukan properti CSS valid) | Invalid CSS | → `align-items: center` |
| V2-6 | Token `--fs-2xs..base` v1 = 0 konsumen | Dead system | Dipertahankan sebagai kontrak audit v2 (PH & label kini mengonsumsinya) |
| V2-7 | `AssetsView` scoped `.form-control` 11px untuk teks input | Floor 12px | → 13px, align global |
| V2-8 | Duplikasi warna PH di `asset-workspace.css` | Nielsen #4 | Blok dihapus, kembali ke global |
| V2-9 | 8.5/9px tersisa di `SubmissionsView.vue` | — | **TIDAK diubah**: template dokumen serah-terima cetak A4 (print density, sama dengan `utils/export*.js`) |

### 2.4 Apple design skill addendum (emilkowalski/skills@apple-design)
Skill dipasang (`.agents/skills/apple-design`) dan dimuat; pasal yang relevan dengan sistem type form ini:
- **§15 tracking size-specific**: PH 11px kini `letter-spacing: 0.01em` (positif, bukan inherit) — sebelumnya melanggar "fixed tracking is wrong somewhere".
- **§15 hierarchy dari weight+size+leading sebagai set**: PH weight 400 vs input 500/medium — hierarki state dipertahankan tanpa perubahan ukuran ekstra.
- **§16 #7 Craft**: setiap nilai (floor 11px, delta −2px, tracking 0.01em, kontras 4.6:1) kini punya justifikasi eksplisit yang bisa dipertahankan — tidak ada nilai acak.
- Aturan skill yang **tidak** relevan untuk scope ini: spring/momentum (§1–11), translucent materials (§12) — dicatat untuk audit motion/material terpisah.

### 2.3 Verifikasi v2
- PH di semua input 13px → 11px (−2px, sesuai permintaan "diperkecil"); Login → 12px; editor title proporsional.
- Kontras PH: 4.6:1 light / ≈7:1 dark — 0 pelanggaran WCAG 1.4.3 tersisa.
- Nilai sub-pixel & <10px di layar: tetap 0 (v1 hold); tidak ada PH di bawah 11px.
- Lint + build + test unit hijau (lihat commit).

---

---

## 1. HASIL PENGUKURAN (Observed, bukan asumsi)

### 1.1 Form controls — SEHAT di base, rusak di scope
| Surface | Font-size | Line-height | Tinggi | Placeholder | Kontras PH |
|---|---|---|---|---|---|
| Login email/password | 13px | 19.5px | ✓ | inherit 13px | #64748B **4.6:1 PASS** |
| Search global (header) | 13px | 19.5px | 40px | inherit | #64748B PASS |
| Search per-halaman | 13px | 19.5px | 36px | inherit | #64748B PASS |
| Modal "Tambah" (assets-ga) | 13px | — | 42px | **inherit ✓**, copy "Contoh: …" (bagus, bukan duplikat label) | #64748B PASS |
| **Entry-form aset** (asset-workspace) | 13px | — | — | inherit | **#94A3B8 = 2.77:1 FAIL** (override lokal L718) |
| Label form modal | 12px | 19.2px | — | — | — |

### 1.2 Skala font = chaos (20+ nilai, sub-pixel)
Distribusi computed & static:
- CSS `font-size:` — 10px×28, 12px×55, 11px×36, 13px×28, 16px×20, 9px×10, **8.5px×4**, 34px×4, 28px×4, 23px×4 …
- Kelas Tailwind — `text-xs`×583, **`text-[11px]`×278**, **`text-[12px]`×154**, **`text-[10px]`×136**, **`text-[10.5px]`×97**, `text-[18px]`×85, **`text-[11.5px]`×42**, **`text-[12.5px]`×35**, **`text-[9px]`×11**, **`text-[8.5px]`×1** → ±754 pemakaian di luar skala

### 1.3 Teks mikroskopis (<11.5px) — census runtime
| Halaman | 9px | 10px | 10.5px | 11px |
|---|---|---|---|---|
| /assets-ga | 6 | 1 | 1 | 2 |
| /tickets | 6 | 1 | 1 | 4 |
| /karyawan | 6 | 1 | 1 | 4 |
| /dashboard | 6 | 2 | 1 | 3 |

Konteks 9px: judul section sidebar (`HOME`, `INVENTARIS`, `ADMINISTRASI` — uppercase + tracking 0.11em di 9px), badge, meta. 8.5px: SubmissionsView (badge/label inline style, 12+ kemunculan).

### 1.4 Akar masalah (sumber kode)
| Lokasi | Nilai | Peran |
|---|---|---|
| `AppSidebar.vue:755` | 9px | `.sidebar-group-title` uppercase |
| `Navbar.vue:449` | 9px | badge |
| `DashboardView.vue:1280` | 9px | label |
| `SubmissionsView.vue` | 8.5px ×12 (inline), 9px ×7 | badge/label |
| `asset-workspace.css:453,470` | 9px | badge area aset |
| `AppHeader/Tickets/Login/Assets/MyAssets/Shipments/Home/KbCategories` | 10px | meta/badge/kbd (floor sem sich) |
| `asset-workspace.css:718` | — | placeholder `#94a3b8` (FAIL kontras) |
| `utils/export*.js` | 9–10px | **PDF print — JANGAN diubah** (density A4) |

---

## 2. PEMETAAN KE DESIGN LAW & UX PRINCIPLES

| # | Law/Principle | Pelanggaran terukur | Konsekuensi |
|---|---|---|---|
| 1 | **Minimum legibility** (WCAG 1.4.4 resize; print convention 8pt≈10.6px) | 8–9px untuk teks uppercase + tracking lebar | Tidak terbaca di layar 96dpi, gagal zoom-reflow intent |
| 2 | **Gestalt Hierarchy** | Judul section (structural) sama kecil dengan badge (decorative) | Hierarchy flatten — F-pattern scan gagal |
| 3 | **Nielsen #4 Consistency** | 4 ukuran "small" berbeda (9 / 10 / 10.5 / 11) untuk peran sama | Cognitive load naik, grid ritme rusak |
| 4 | **Sub-pixel rendering** | 8.5 / 10.5 / 11.5 / 12.5 px | Anti-alias drift antar-OS/DPI, metrics tidak stabil |
| 5 | **Miller / Cognitive load** | 20+ nilai font = micro-decisions per komponen | Maintenance & drift berlanjut |
| 6 | **Placeholder ≠ Label** (a11y, Nielsen #5 error prevention) | Placeholder sudah benar: inherit size, copy "Contoh:", bukan satu-satunya label | ✓ dipertahankan — KECUALI kontras di asset-workspace |
| 7 | **Contrast (WCAG 1.4.3)** | Placeholder 2.77:1 di entry-form aset | Fail AA non-text/UI text |
| 8 | **Fitts / touch comfort** | Input 36–42px tinggi | ✓ PASS, dipertahankan |

---

## 3. TYPE SCALE TARGET (Enterprise 5-step micro scale)

| Token | px | Peran | Contoh |
|---|---|---|---|
| `--fs-2xs` | **10** | micro metadata, kbd, badge densitas tinggi | "Ctrl K", timestamp |
| `--fs-xs` | **11** | eyebrow/section label, meta | judul grup sidebar |
| `--fs-sm` | **12** | form label, caption, table meta | "Hostname / Kode Aset *" |
| `--fs-md` | **13** | input text, button, body-small | semua input & placeholder |
| `--fs-base` | **14** | body default | konten umum |
| ≥16px | display | heading | dipertahankan (sudah jarang & konsisten) |

Line-height: 1.2 (≥16px) · 1.45 (12–14px) · 1.35 (≤11px, uppercase perlu napas).
Aturan snapping: **8.5→10, 9→10, 10.5→11, 11.5→12, 12.5→13** (semua sub-pixel dihapus; tidak ada perubahan peran — hanya snap ke token terdekat sesuai peran).

---

## 4. TEMUAN LAIN SAAT AUDIT (layout terkait)
- Input height konsisten 36/40/42px ✓ — jangan diubah (Fitts).
- Placeholder copy sudah sentence-case + spesifik ("Contoh: GA-PL-001") ✓ — best practice, dipertahankan.
- Label 12px + required marker `*` ✓.
- `text-[10.5px]` (97×) mayoritas badge — snap ke 11px menaikkan legibility tanpa merusak layout (diverifikasi ulang post-change via overflow sweep).
- Kontras teks abu (D-03 audit besar) adalah issue terpisah — di luar scope file ini (token warna).

## 5. EKSEKUSI YANG DILAKUKAN (lihat commit)
1. `main.css`: blok type-scale tokens + placeholder `font-style: normal; font-size: inherit; font-variant...` eksplisit.
2. `asset-workspace.css`: placeholder `#94a3b8` → `var(--color-text-muted)`; badge 9px → 10px.
3. Snap semua 8.5/9 → 10px; 10.5 → 11px; 11.5 → 12px; 12.5 → 13px (CSS scoped + Tailwind arbitrary values).
4. Sidebar section title 9px → 11px, tracking 0.11em → 0.08em (hierarchy fix).
5. PDF export util **tidak disentuh** (print density beda media).
6. Verifikasi: measurement ulang (harus 0 sub-pixel, 0 <10px), overflow sweep, lint, build, unit tests.

## 6. SKOR SETELAH vs SEBELUM
| Aspek | Sebelum | Target |
|---|---|---|
| Type scale consistency | 3/10 (20+ nilai) | 9/10 (skala 5-step) |
| Form typography | 7/10 (base bagus, 1 override fail) | 10/10 |
| Placeholder law | 7.5/10 | 10/10 |
| Micro-text legibility | 4/10 | 9/10 |
| Hierarchy (label vs badge) | 5/10 | 8.5/10 |

# ESB Case — Knowledge Base & Incident Playbook

A modern, minimalist knowledge base for internship engineering SOPs, troubleshooting, and workflows.

## Fitur Baru

### 1. Case tersimpan antar device (cross-device sync)
Sebelumnya, Case yang ditambahkan hanya tersimpan di `localStorage` (perangkat yang menambahkannya saja). Sekarang Case disimpan ke **Supabase** (database cloud), sehingga semua perangkat yang membuka app ini akan melihat Case yang sama.

### 2. CRUD tersembunyi (Hidden CRUD)
Semua tombol Create / Edit / Delete disembunyikan secara default. Untuk memunculkannya:

> **Tekan logo ESB Case sebanyak 5x** (di header atau di halaman utama).

Setelah itu akan muncul:
- Tombol **New Case** di header.
- Tombol **Edit** dan **Delete** di setiap Case yang dibuka.

---

## Setup Supabase (wajib agar sync antar device berfungsi)

### Langkah 1 — Buat project Supabase
1. Buka [supabase.com](https://supabase.com) dan daftar/login.
2. Buat **New project** (pilih region terdekat).
3. Catat **Project URL** dan **anon public key** dari menu
   **Project Settings → API**.

### Langkah 2 — Buat tabel
1. Buka **SQL Editor** di dashboard Supabase.
2. Tempel seluruh isi file [`supabase/schema.sql`](supabase/schema.sql) lalu klik **Run**.
   - Ini membuat tabel `cases` + Row Level Security + trigger `updated_at`.
   - **6 SOP bawaan akan di-seed otomatis oleh app** saat pertama kali dibuka (lihat `seed.js`), jadi tidak perlu insert manual.

### Langkah 3 — Isi kredensial di `config.js`
Buka `config.js` lalu isi:

```js
window.SUPABASE_CONFIG = {
  url: 'https://xxxxxxxxxxxx.supabase.co',   // ganti
  anonKey: 'eyJhbGciOi...'                    // ganti
};
```

### Langkah 4 — Deploy / buka app
Buka `index.html` (langsung, atau via static host seperti GitHub Pages / Netlify / Vercel).
Case sekarang tersimpan bersama di Supabase.

> **Tanpa Supabase** (config kosong), app tetap berjalan dengan `localStorage`
> (hanya perangkat lokal) dan memakai `seed.js` sebagai sumber data lokal.

---

## Struktur File

| File | Keterangan |
|------|------------|
| `index.html` | Markup & struktur aplikasi |
| `styles.css` | Styling (termasuk aturan hidden CRUD) |
| `app.js` | Logika aplikasi, render, CRUD, sync Supabase + auto-seed |
| `seed.js` | 6 SOP bawaan (sumber data case; di-insert otomatis ke Supabase saat tabel kosong) |
| `data.js` | Template komunikasi (`COMMUNICATION_TEMPLATES`) |
| `config.js` | Kredensial Supabase (isi sendiri) |
| `supabase/schema.sql` | SQL pembuatan tabel + RLS + trigger |

---

## Cara Kerja Auto-Seed

- Saat app dibuka dan Supabase terhubung, app membaca tabel `cases`.
- Jika tabel **kosong**, app otomatis `upsert` 6 SOP dari `seed.js` ke Supabase,
  lalu menampilkannya. Dengan begitu semua device melihat data yang sama.
- `data.js` **tidak lagi** menyimpan case bawaan — hanya template komunikasi.


---

## Cara Kerja CRUD Hidden

- `body` diberi class `crud-unlocked` setelah logo ditekan 5x.
- CSS menyembunyikan `.btn-new-case`, `.btn-edit-case`, `.btn-delete-case` selama
  class tersebut belum ada.
- Saat CRUD dibuka, operasi Create/Update/Delete ditulis ke Supabase (dan
  di-mirror ke `localStorage` sebagai fallback offline).

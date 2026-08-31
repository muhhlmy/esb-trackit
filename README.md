# ESB Case — Knowledge Base & Incident Playbook

Platform Knowledge Base & Incident Playbook modern untuk Standard Operating Procedure (SOP) tim engineering, onboarding perangkat, dan workflow kerja.

---

## 🏗️ Struktur Monorepo & Arsitektur

Proyek telah dimigrasi ke dalam 2 dedicated folder:

```text
esb-case/
├── backend/                  # REST API Server
│   ├── prisma/               # Schema Prisma & Database Seeder
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── config/           # Prisma client singleton & Dotenv
│   │   ├── controllers/      # Handlers (Cases, Auth, Templates, Stats)
│   │   ├── middleware/       # JWT Auth & Error handler Express v5
│   │   ├── routes/           # Express router endpoints
│   │   └── app.js            # Express v5 entry point
│   ├── .env.example
│   └── package.json          # ESM ("type": "module")
│
└── frontend/                 # Client Application
    ├── public/               # Static assets & SVG icons
    ├── src/
    │   ├── assets/           # Tailwind CSS v4 entry
    │   ├── components/       # Reusable UI & Layout components
    │   ├── composables/      # Reactive state management (Cases, Auth, Bookmarks, Theme)
    │   ├── router/           # Vue Router routes
    │   ├── services/         # API fetch client
    │   ├── views/            # Home, Cases Master-Detail, Templates, Analytics
    │   ├── App.vue           # Root component
    │   └── main.js           # Vue entry point
    ├── vite.config.js        # Vite + Tailwind v4 + Vue plugin
    └── package.json
```

---

## 🚀 Panduan Menjalankan Project

### 1. Setup Backend

1. Buka folder `backend/`:
   ```bash
   cd backend
   ```
2. Salin environment file dan sesuaikan kredensial PostgreSQL Anda:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Generate Prisma Client & Push skema database:
   ```bash
   npx prisma generate
   npm run prisma:push
   ```
5. Jalankan database seeder:
   ```bash
   npm run prisma:seed
   ```
6. Jalankan backend development server:
   ```bash
   npm run dev
   ```
   *Backend berjalan pada `http://localhost:5000`*.

---

### 2. Setup Frontend

1. Buka folder `frontend/`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Jalankan Vite development server:
   ```bash
   npm run dev
   ```
   *Frontend berjalan pada `http://localhost:5173`*.

---

## 🔑 Fitur Utama & Akses Admin

- **Pencarian Cepat**: Shortcut keyboard `/` untuk langsung fokus ke kolom pencarian.
- **SOP Master-Detail Split**: Navigasi cepat antar panduan hardware, git, workplace, dan devops.
- **Mode Admin / CRUD Tersembunyi**:
  - Klik **Logo ESB Case sebanyak 5x** untuk membuka tombol Create/Edit/Delete secara cepat.
  - Atau klik ikon **Login Admin** di sudut kanan atas header (Default: `admin` / `admin123`).
- **Templates Hub**: Format komunikasi harian (Daily standup, 15-min stuck rule, PR description, bug report) dengan copy 1-klik.
- **Analytics & Metrics**: Visualisasi data insiden & SOP dengan Chart.js.

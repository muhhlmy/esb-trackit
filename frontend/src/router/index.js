import { createRouter, createWebHistory } from 'vue-router'

import {
  TICKET_ROLES,
  canAccessFrontendFeature,
  findFirstAllowedRoute,
  getTicketEligibility,
} from '../utils/permissionAccess.js'
import { getAuthSnapshot, restoreSession } from '../utils/authStorage.js'

export const allowedRouteMap = [
  { key: 'dashboard', name: 'dashboard' },
  { key: 'my_assets', name: 'my-assets' },
  { key: 'tickets', name: 'tickets' },
  { key: 'assets', name: 'assets' },
  { key: 'assets_ga', name: 'assets-ga' },
  { key: 'assets_ops', name: 'assets-ops' },
  { key: 'karyawan', name: 'karyawan' },
  { key: 'submissions', name: 'submissions' },
  { key: 'shipments', name: 'shipments' },
  { key: 'logs', name: 'logs' },
  { key: 'users', name: 'users' },
  { key: 'knowledge_base', name: 'admin-cases' },
  { key: 'export', name: 'export' },
  { key: 'database', name: 'database' },
]

// Lista semua route aplikasi (Help Center + TrackIT Monitoring)
const page = (path, name, loader, meta, alias) => {
  const route = { path, name, component: loader, meta }
  if (alias) route.alias = alias
  return route
}

const routes = [
  // Public Help Center Routes (Ditampilkan pertama kali saat aplikasi dibuka)
  page('/', 'home', () => import('../views/HomeView.vue'), {
    title: 'Help Center',
    subtitle: 'Pusat Bantuan & Artikel Insiden',
    public: true,
  }),
  page('/cases', 'cases', () => import('../views/CasesView.vue'), {
    title: 'Cases & Artikel',
    subtitle: 'Kumpulan Artikel & Playbook Insiden',
    public: true,
  }),
  page('/cases/:id', 'case-detail', () => import('../views/CasesView.vue'), {
    title: 'Detail Artikel',
    subtitle: 'Detail Artikel Panduan Insiden',
    public: true,
  }),
  // Auth Route
  page('/login', 'login', () => import('../views/LoginView.vue'), {
    title: 'Masuk',
    subtitle: 'Masuk ke akun Anda',
    public: true,
  }),

  // Management Routes (TrackIT Monitoring)
  page('/dashboard', 'dashboard', () => import('../views/DashboardView.vue'), {
    title: 'Dashboard',
    subtitle: 'Overview & analytics',
    permission: 'dashboard',
  }),
  page('/assets', 'assets', () => import('../views/AssetsView.vue'), {
    title: 'Aset IT',
    subtitle: 'Inventaris & status perangkat',
    permission: 'assets',
  }),
  page('/assets-ga', 'assets-ga', () => import('../views/AssetsGaView.vue'), {
    title: 'Aset GA',
    subtitle: 'Kelola aset GA',
    permission: 'assets_ga',
    alias: '/assets/ga',
  }),
  page('/assets-ops', 'assets-ops', () => import('../views/AssetsOpsView.vue'), {
    title: 'Aset Ops',
    subtitle: 'Kelola aset operasional',
    permission: 'assets_ops',
    alias: '/assets/ops',
  }),
  page('/my-assets', 'my-assets', () => import('../views/MyAssetsView.vue'), {
    title: 'Aset Karyawan',
    subtitle: 'Kelola aset karyawan',
    permission: 'my_assets',
    alias: '/assets/karyawan',
  }),
  page('/karyawan', 'karyawan', () => import('../views/EmployeesView.vue'), {
    title: 'Karyawan',
    subtitle: 'Kelola data karyawan',
    permission: 'karyawan',
  }),
  page('/tickets', 'tickets', () => import('../views/TicketsView.vue'), {
    title: 'Tiket',
    subtitle: 'Kelola tiket helpdesk',
    permission: 'tickets',
  }),
  page('/users', 'users', () => import('../views/UsersView.vue'), {
    title: 'Pengguna',
    subtitle: 'Kelola data pengguna',
    permission: 'users',
  }),
  page('/faqs', 'faqs', () => import('../views/FaqAdminView.vue'), {
    title: 'FAQ',
    subtitle: 'Kelola FAQ Help Center',
    permission: 'knowledge_base',
  }),
  page('/submissions', 'submissions', () => import('../views/SubmissionsView.vue'), {
    title: 'Pengajuan',
    subtitle: 'Kelola pengajuan',
    permission: 'submissions',
    alias: '/pengajuan',
  }),
  page('/shipments', 'shipments', () => import('../views/ShipmentsView.vue'), {
    title: 'Pengiriman',
    subtitle: 'Tracker pengiriman barang & aset',
    permission: 'shipments',
    alias: '/pengiriman',
  }),
  page('/logs', 'logs', () => import('../views/LogsView.vue'), {
    title: 'Log Aktivitas',
    subtitle: 'Riwayat aktivitas sistem',
    permission: 'logs',
  }),
  page('/export', 'export', () => import('../views/ExportView.vue'), {
    title: 'Ekspor Data',
    subtitle: 'Ekspor dan kelola data',
    permission: 'export',
    superadminOnly: true,
  }),
  page('/database', 'database', () => import('../views/DatabaseView.vue'), {
    title: 'Database',
    subtitle: 'Backup & restore database',
    superadminOnly: true,
  }),

  // Help Center Admin CMS Routes
  page('/admin/cases', 'admin-cases', () => import('../views/admin/AdminDashboardView.vue'), {
    title: 'Admin CMS',
    subtitle: 'Kelola Artikel Knowledge Base',
    adminOnly: true,
    permission: 'knowledge_base',
  }),
  page(
    '/admin/kb-categories',
    'admin-kb-categories',
    () => import('../views/admin/KbCategoriesView.vue'),
    {
      title: 'Kategori KB',
      subtitle: 'Kelola Topic Cards Help Center',
      adminOnly: true,
      permission: 'knowledge_base',
    },
  ),
  page('/admin/editor/:id?', 'article-editor', () => import('../views/admin/DocEditorView.vue'), {
    title: 'Article Editor',
    subtitle: 'Editor Artikel Knowledge Base',
    adminOnly: true,
    permission: 'knowledge_base',
    alias: '/admin/article-editor/:id?',
  }),

  page('/forbidden', 'forbidden', () => import('../views/AccessDeniedView.vue'), {
    title: 'Akses Ditolak',
    subtitle: 'Anda tidak memiliki izin untuk halaman ini',
    public: true,
  }),
  page('/:pathMatch(.*)*', 'NotFound', () => import('../views/NotFoundView.vue'), {
    title: 'Halaman Tidak Ditemukan',
    subtitle: '404',
    public: true,
  }),
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  let { user, authenticated } = getAuthSnapshot()

  // Cache user hilang (storage dibersihkan / profile terpartisi / tab baru),
  // tetapi cookie sesi HttpOnly mungkin masih valid. Tanya server SEKALI
  // (restoreSession mendedup request paralel) sebelum memutuskan logout.
  if (!authenticated) {
    const restored = await restoreSession()
    if (restored?.user) {
      user = restored.user
      authenticated = true
    } else if (restored?.offline) {
      // Server tidak dapat dijangkau: biarkan navigasi ke halaman publik saja.
      // Halaman terproteksi tetap akan memunculkan 401 global bila sesi mati.
      if (to.meta.public) return
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  // Halaman publik (Help Center landing page, Cases, Templates, Login, dll) dapat diakses tanpa login
  if (to.meta.public) {
    if (to.name === 'login' && authenticated) {
      const firstAllowed = findFirstAllowedRoute(user, allowedRouteMap)
      return { name: firstAllowed?.name || 'dashboard' }
    }
    return
  }

  // Jika halaman terproteksi dan sesi invalid (server 401/403),
  // baru arahkan ke halaman login.
  if (!authenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const ticketEligibility = getTicketEligibility(user)
  const isSuper = ticketEligibility.role === TICKET_ROLES.SUPERADMIN
  const isAdminOrSuper =
    ticketEligibility.role === TICKET_ROLES.ADMIN ||
    ticketEligibility.role === TICKET_ROLES.SUPERADMIN
  const canAccess = (key) => canAccessFrontendFeature(user, key)
  const firstAllowed = findFirstAllowedRoute(user, allowedRouteMap)

  // Guard untuk Superadmin Only
  if (to.meta.superadminOnly && !isSuper) {
    return { name: firstAllowed?.name || 'forbidden' }
  }

  // Guard untuk Admin / Superadmin Only (CMS / Admin routes)
  if (to.meta.adminOnly && !isAdminOrSuper) {
    return { name: firstAllowed?.name || 'forbidden' }
  }

  // Akses halaman tetap mengikuti permission user.
  // Karyawan hanya punya my_assets dan tickets dari hasil import.

  // Evaluasi RBAC untuk fitur manajemen TrackIT
  if (to.meta.permission && !canAccess(to.meta.permission)) {
    if (firstAllowed && firstAllowed.name !== to.name) {
      return { name: firstAllowed.name }
    }
    if (!firstAllowed) return { name: 'forbidden' }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} | ESB TrackIT & Help Center`
    : 'ESB TrackIT & Help Center'
})

router.onError((error, to) => {
  console.error('[Vue Router] Navigation error handled gracefully:', error)

  const errorMessage = error?.message || String(error)
  const isDynamicImportError =
    errorMessage.includes('Failed to fetch dynamically imported module') ||
    errorMessage.includes('Importing a module script failed') ||
    errorMessage.includes('Outdated Optimize Dep') ||
    errorMessage.includes('error loading dynamically imported module')

  if (isDynamicImportError && typeof window !== 'undefined') {
    const storageKey = 'trackit_vite_dynamic_import_reload'
    const lastReload = sessionStorage.getItem(storageKey)
    const now = Date.now()
    // Cegah loop reload tak hingga: reload otomatis maksimal 1 kali dalam 10 detik
    if (!lastReload || now - Number(lastReload) > 10000) {
      sessionStorage.setItem(storageKey, String(now))
      if (to?.fullPath) {
        window.location.href = to.fullPath
      } else {
        window.location.reload()
      }
    }
  }
})

export default router

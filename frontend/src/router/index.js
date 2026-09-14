// ============================================================
// router/index.js - Konfigurasi Routing (Navigasi Halaman Unified)
// ============================================================
import { createRouter, createWebHistory } from 'vue-router'

import {
  TICKET_ROLES,
  canAccessFrontendFeature,
  findFirstAllowedRoute,
  getTicketEligibility,
} from '../utils/permissionAccess.js'
import { getAuthSnapshot } from '../utils/authStorage.js'

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
const routes = [
  // Public Help Center Routes (Ditampilkan pertama kali saat aplikasi dibuka)
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { title: 'Help Center', subtitle: 'Pusat Bantuan & Artikel Insiden', public: true },
  },
  {
    path: '/cases',
    name: 'cases',
    component: () => import('../views/CasesView.vue'),
    meta: {
      title: 'Cases & Artikel',
      subtitle: 'Kumpulan Artikel & Playbook Insiden',
      public: true,
    },
  },
  {
    path: '/cases/:id',
    name: 'case-detail',
    component: () => import('../views/CasesView.vue'),
    meta: { title: 'Detail Artikel', subtitle: 'Detail Artikel Panduan Insiden', public: true },
  },
  {
    path: '/templates',
    name: 'templates',
    component: () => import('../views/TemplatesView.vue'),
    meta: { title: 'Templates Hub', subtitle: 'Template Respon & Komunikasi', public: true },
  },
  {
    path: '/kb-analytics',
    alias: '/analytics',
    name: 'kb-analytics',
    component: () => import('../views/AnalyticsView.vue'),
    meta: {
      title: 'Help Center Analytics',
      subtitle: 'Metrik & Tren Pencarian Artikel',
      public: true,
    },
  },

  // Auth Route
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { title: 'Masuk', subtitle: 'Masuk ke akun Anda', public: true },
  },

  // Management Routes (TrackIT Monitoring)
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { title: 'Dashboard', subtitle: 'Overview & analytics', permission: 'dashboard' },
  },
  {
    path: '/assets',
    name: 'assets',
    component: () => import('../views/AssetsView.vue'),
    meta: { title: 'Aset IT', subtitle: 'Inventaris & status perangkat', permission: 'assets' },
  },
  {
    path: '/assets-ga',
    alias: '/assets/ga',
    name: 'assets-ga',
    component: () => import('../views/AssetsGaView.vue'),
    meta: { title: 'Aset GA', subtitle: 'Kelola aset GA', permission: 'assets_ga' },
  },
  {
    path: '/assets-ops',
    alias: '/assets/ops',
    name: 'assets-ops',
    component: () => import('../views/AssetsOpsView.vue'),
    meta: { title: 'Aset Ops', subtitle: 'Kelola aset operasional', permission: 'assets_ops' },
  },
  {
    path: '/my-assets',
    alias: '/assets/karyawan',
    name: 'my-assets',
    component: () => import('../views/MyAssetsView.vue'),
    meta: { title: 'Aset Karyawan', subtitle: 'Kelola aset karyawan', permission: 'my_assets' },
  },
  {
    path: '/karyawan',
    name: 'karyawan',
    component: () => import('../views/EmployeesView.vue'),
    meta: { title: 'Karyawan', subtitle: 'Kelola data karyawan', permission: 'karyawan' },
  },
  {
    path: '/tickets',
    name: 'tickets',
    component: () => import('../views/TicketsView.vue'),
    meta: { title: 'Tiket', subtitle: 'Kelola tiket helpdesk', permission: 'tickets' },
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('../views/UsersView.vue'),
    meta: { title: 'Pengguna', subtitle: 'Kelola data pengguna', permission: 'users' },
  },
  {
    path: '/faqs',
    name: 'faqs',
    component: () => import('../views/FaqAdminView.vue'),
    meta: { title: 'FAQ', subtitle: 'Kelola FAQ Help Center', permission: 'knowledge_base' },
  },
  {
    path: '/submissions',
    alias: '/pengajuan',
    name: 'submissions',
    component: () => import('../views/SubmissionsView.vue'),
    meta: { title: 'Pengajuan', subtitle: 'Kelola pengajuan', permission: 'submissions' },
  },
  {
    path: '/shipments',
    alias: '/pengiriman',
    name: 'shipments',
    component: () => import('../views/ShipmentsView.vue'),
    meta: {
      title: 'Pengiriman',
      subtitle: 'Tracker pengiriman barang & aset',
      permission: 'shipments',
    },
  },
  {
    path: '/logs',
    name: 'logs',
    component: () => import('../views/LogsView.vue'),
    meta: { title: 'Log Aktivitas', subtitle: 'Riwayat aktivitas sistem', permission: 'logs' },
  },
  {
    path: '/export',
    name: 'export',
    component: () => import('../views/ExportView.vue'),
    meta: {
      title: 'Ekspor Data',
      subtitle: 'Ekspor dan kelola data',
      permission: 'export',
      superadminOnly: true,
    },
  },
  {
    path: '/database',
    name: 'database',
    component: () => import('../views/DatabaseView.vue'),
    meta: {
      title: 'Database',
      subtitle: 'Backup & restore database',
      superadminOnly: true,
    },
  },

  // Help Center Admin CMS Routes
  {
    path: '/admin/cases',
    name: 'admin-cases',
    component: () => import('../views/admin/AdminDashboardView.vue'),
    meta: {
      title: 'Admin CMS',
      subtitle: 'Kelola Artikel Knowledge Base',
      adminOnly: true,
      permission: 'knowledge_base',
    },
  },
  {
    path: '/admin/kb-categories',
    name: 'admin-kb-categories',
    component: () => import('../views/admin/KbCategoriesView.vue'),
    meta: {
      title: 'Kategori KB',
      subtitle: 'Kelola Topic Cards Help Center',
      adminOnly: true,
      permission: 'knowledge_base',
    },
  },
  {
    path: '/admin/editor/:id?',
    alias: '/admin/article-editor/:id?',
    name: 'article-editor',
    component: () => import('../views/admin/DocEditorView.vue'),
    meta: {
      title: 'Article Editor',
      subtitle: 'Editor Artikel Knowledge Base',
      adminOnly: true,
      permission: 'knowledge_base',
    },
  },

  {
    path: '/forbidden',
    name: 'forbidden',
    component: () => import('../views/AccessDeniedView.vue'),
    meta: {
      title: 'Akses Ditolak',
      subtitle: 'Anda tidak memiliki izin untuk halaman ini',
      public: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue'),
    meta: { title: 'Halaman Tidak Ditemukan', subtitle: '404', public: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const { user, authenticated } = getAuthSnapshot()

  // Halaman publik (Help Center landing page, Cases, Templates, Login, dll) dapat diakses tanpa login
  if (to.meta.public) {
    if (to.name === 'login' && authenticated) {
      const firstAllowed = findFirstAllowedRoute(user, allowedRouteMap)
      return { name: firstAllowed?.name || 'dashboard' }
    }
    return
  }

  // Jika halaman terproteksi dan belum login (cache user tidak ada)
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

router.onError((error) => {
  console.error('[Vue Router] Navigation error handled gracefully:', error)
})

export default router

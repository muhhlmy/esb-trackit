import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import CasesView from '../views/CasesView.vue';
import AnalyticsView from '../views/AnalyticsView.vue';
import AdminDashboardView from '../views/admin/AdminDashboardView.vue';
import DocEditorView from '../views/admin/DocEditorView.vue';
import { useToast } from '../composables/useToast.js';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: 'Home — ESB Case' }
  },
  {
    path: '/cases',
    name: 'cases',
    component: CasesView,
    meta: { title: 'Cases & SOPs — ESB Case' }
  },
  {
    path: '/cases/:id',
    name: 'case-detail',
    component: CasesView,
    meta: { title: 'SOP Detail — ESB Case' }
  },
  {
    path: '/analytics',
    name: 'analytics',
    component: AnalyticsView,
    meta: { title: 'Analytics & Metrics — ESB Case' }
  },
  {
    path: '/admin',
    name: 'admin-dashboard',
    component: AdminDashboardView,
    meta: { title: 'Admin CMS — ESB Case', requiresAdmin: true }
  },
  {
    path: '/admin/editor/:id?',
    name: 'doc-editor',
    component: DocEditorView,
    meta: { title: 'DocEditor — Knowledge Base', requiresAdmin: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'ESB Case — Knowledge Base & Incident Playbook';

  // Navigation Guard: Protect admin routes when in non-admin mode
  if (to.meta.requiresAdmin) {
    const isAdminActive = localStorage.getItem('esb_admin_mode') === 'true';
    if (!isAdminActive) {
      const { showToast } = useToast();
      showToast('🔒 Akses Terbatas: Halaman ini memerlukan Mode Admin. Klik logo ESB Case 5 kali untuk membukanya.', 'warning');
      return next('/');
    }
  }

  next();
});

export default router;

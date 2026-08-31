import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import CasesView from '../views/CasesView.vue';
import TemplatesView from '../views/TemplatesView.vue';
import AnalyticsView from '../views/AnalyticsView.vue';
import AdminDashboardView from '../views/admin/AdminDashboardView.vue';
import DocEditorView from '../views/admin/DocEditorView.vue';

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
    path: '/templates',
    name: 'templates',
    component: TemplatesView,
    meta: { title: 'Templates Hub — ESB Case' }
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
    meta: { title: 'Admin CMS — ESB Case' }
  },
  {
    path: '/admin/editor/:id?',
    name: 'doc-editor',
    component: DocEditorView,
    meta: { title: 'DocEditor — Knowledge Base' }
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
  next();
});

export default router;

/**
 * navigationConfig.js — Single source of truth for the application menu.
 *
 * Consumed by:
 *   - components/layout/AppSidebar.vue   (desktop sidebar + mobile drawer)
 *   - components/layout/AppBottomNav.vue (mobile bottom nav + Menu Lainnya)
 *   - components/dashboard/QuickActions.vue (dashboard quick actions)
 *
 * RBAC rules live in composables/useAuth.js + utils/permissionAccess.js and are
 * NOT duplicated here. Each item only declares which gate applies:
 *   - permission: <featureKey>  -> hasPermission(featureKey)
 *   - superadminOnly: true      -> isSuperAdmin
 *   - (neither)                 -> public / always visible
 *
 * ponytail: no framework, no reactivity, no router import — plain data + one
 * pure filter function. Upgrade path: if groups grow, split into per-domain
 * modules and aggregate here.
 */

/**
 * @typedef {Object} NavItem
 * @property {string} to           Route path (matches router/index.js)
 * @property {string} label        Menu label (Indonesian, product terminology)
 * @property {string} icon         Material Symbols Outlined name
 * @property {string|null} [lucide] lucide-vue-next component name (bottom nav)
 * @property {string|null} [permission] featureKey for hasPermission(), null = public
 * @property {boolean} [superadminOnly] superadmin-only routes (export, database)
 * @property {string} [badge]      Optional inline badge text
 */

/** @type {{title: string, items?: NavItem[], parents?: {key: string, label: string, icon: string, items: NavItem[]}[]}[]} */
export const menuGroups = [
  {
    title: 'HOME',
    items: [
      {
        to: '/',
        label: 'Help Center',
        icon: 'help_center',
        lucide: 'Home',
        permission: null,
        badge: 'Artikel',
      },
      {
        to: '/dashboard',
        label: 'Dashboard',
        icon: 'grid_view',
        lucide: 'LayoutDashboard',
        permission: 'dashboard',
      },
    ],
  },
  {
    title: 'KNOWLEDGE BASE',
    parents: [
      {
        key: 'knowledge_base',
        label: 'Help Center & Artikel',
        icon: 'auto_stories',
        items: [
          {
            to: '/cases',
            label: 'Cases & Artikel',
            icon: 'menu_book',
            lucide: 'BookOpen',
            permission: null,
          },
          {
            to: '/admin/cases',
            label: 'Admin CMS',
            icon: 'edit_document',
            lucide: 'FileText',
            permission: 'knowledge_base',
          },
          {
            to: '/faqs',
            label: 'Atur FAQ',
            icon: 'quiz',
            lucide: 'HelpCircle',
            permission: 'knowledge_base',
          },
        ],
      },
    ],
  },
  {
    title: 'INVENTARIS',
    parents: [
      {
        key: 'asset_management',
        label: 'Asset Management',
        icon: 'inventory_2',
        items: [
          {
            to: '/assets',
            label: 'Aset IT',
            icon: 'devices',
            lucide: 'Laptop',
            permission: 'assets',
          },
          {
            to: '/assets-ga',
            label: 'Aset GA',
            icon: 'domain',
            lucide: 'Building2',
            permission: 'assets_ga',
          },
          {
            to: '/assets-ops',
            label: 'Aset Ops',
            icon: 'precision_manufacturing',
            lucide: 'Cog',
            permission: 'assets_ops',
          },
          {
            to: '/my-assets',
            label: 'Aset Karyawan',
            icon: 'badge',
            lucide: 'BadgeCheck',
            permission: 'my_assets',
          },
        ],
      },
    ],
  },
  {
    title: 'TRANSAKSI',
    parents: [
      {
        key: 'helpdesk',
        label: 'Helpdesk',
        icon: 'support_agent',
        items: [
          {
            to: '/tickets',
            label: 'Tiket',
            icon: 'confirmation_number',
            lucide: 'Ticket',
            permission: 'tickets',
            badge: 'New',
          },
          {
            to: '/submissions',
            label: 'BAST/Asset Form',
            icon: 'assignment',
            lucide: 'FilePen',
            permission: 'submissions',
          },
          {
            to: '/shipments',
            label: 'Pengiriman',
            icon: 'local_shipping',
            lucide: 'Truck',
            permission: 'shipments',
          },
        ],
      },
    ],
  },
  {
    title: 'ADMINISTRASI',
    parents: [
      {
        key: 'master_data',
        label: 'Master Data',
        icon: 'folder_shared',
        items: [
          { to: '/users', label: 'Pengguna', icon: 'group', lucide: 'Users', permission: 'users' },
          {
            to: '/karyawan',
            label: 'Karyawan',
            icon: 'person_search',
            lucide: 'UserSearch',
            permission: 'karyawan',
          },
        ],
      },
      {
        key: 'sistem',
        label: 'Sistem',
        icon: 'settings_suggest',
        items: [
          {
            to: '/logs',
            label: 'Log Aktivitas',
            icon: 'receipt_long',
            lucide: 'ScrollText',
            permission: 'logs',
          },
          {
            to: '/export',
            label: 'Ekspor Data',
            icon: 'output',
            lucide: 'FileOutput',
            permission: 'export',
            superadminOnly: true,
          },
          {
            to: '/database',
            label: 'Database',
            icon: 'database',
            lucide: 'Database',
            superadminOnly: true,
          },
        ],
      },
    ],
  },
]

/**
 * Flat list of every navigable leaf item (group title attached for grouping
 * in Menu Lainnya). Order follows menuGroups.
 * @returns {{groupTitle: string, parentLabel: string|null} & NavItem[]}
 */
export function flattenMenu() {
  const flat = []
  for (const group of menuGroups) {
    for (const item of group.items || []) {
      flat.push({ ...item, groupTitle: group.title, parentLabel: null })
    }
    for (const parent of group.parents || []) {
      for (const item of parent.items) {
        flat.push({ ...item, groupTitle: group.title, parentLabel: parent.label })
      }
    }
  }
  return flat
}

/**
 * Primary mobile bottom-nav destinations: high-frequency NAVIGATION only.
 * Actions (create/add) live in the dashboard quick-actions bar, not here.
 *
 * Slot 1 (Home) is a real destination, chosen by permission:
 *   - dashboard permission  -> /dashboard
 *   - otherwise             -> /my-assets (Aset Saya) or / (Help Center)
 *
 * @type {{key: string, to: string, label: string, lucide: string, permission: string|null, home?: boolean}[]}
 */
export const primaryBottomNav = [
  {
    key: 'home',
    home: true,
    label: 'Beranda',
    lucide: 'Home',
    // permission null = public; final `to` resolved by resolveHomeRoute().
    permission: null,
  },
  {
    key: 'tickets',
    to: '/tickets',
    label: 'Tiket',
    lucide: 'Ticket',
    permission: 'tickets',
  },
  {
    key: 'assets',
    to: '/assets',
    label: 'Aset',
    lucide: 'Laptop',
    permission: 'assets',
  },
  {
    key: 'my-assets',
    to: '/my-assets',
    label: 'Aset Saya',
    lucide: 'BadgeCheck',
    permission: 'my_assets',
  },
]

/**
 * RBAC filter shared by sidebar, bottom nav and Menu Lainnya.
 * Mirrors the rules that used to live inline in each component.
 *
 * @param {NavItem} item
 * @param {{hasPermission: (k: string|null) => boolean, isSuperAdmin: boolean}} gate
 * @returns {boolean}
 */
export function isNavItemVisible(item, gate) {
  if (item.superadminOnly) return !!gate.isSuperAdmin
  if (!item.permission) return true
  return !!gate.hasPermission(item.permission)
}

/**
 * Resolve the Home slot of the mobile bottom nav for the current user.
 * Always returns a real destination — the nav must never lose its Home slot.
 *
 * @param {{hasPermission: (k: string|null) => boolean}} gate
 * @returns {{to: string, label: string, lucide: string}}
 */
export function resolveHomeRoute(gate) {
  if (gate.hasPermission('dashboard')) {
    return { to: '/dashboard', label: 'Beranda', lucide: 'Home' }
  }
  if (gate.hasPermission('my_assets')) {
    return { to: '/my-assets', label: 'Aset Saya', lucide: 'BadgeCheck' }
  }
  return { to: '/', label: 'Beranda', lucide: 'Home' }
}

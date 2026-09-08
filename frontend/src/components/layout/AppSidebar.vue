<script setup>
import { onBeforeUnmount, onMounted, ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const props = defineProps({
  isMobileOpen: { type: Boolean, default: false },
  isCollapsed: { type: Boolean, default: false },
})
const emit = defineEmits(['close-mobile', 'toggle-collapse'])
const route = useRoute()
const sidebarRef = ref(null)
const closeButtonRef = ref(null)

const { isSuperAdmin, hasPermission } = useAuth()
// State Expanded Parent Menu
const expandedParents = ref({
  knowledge_base: true,
  asset_management: true,
  helpdesk: true,
  master_data: true,
  sistem: true,
})

// State Teleport Floating Popover & Tooltip (Collapsed Rail Mode)
const activeFlyoutParent = ref(null)
const flyoutPos = ref({ top: 0, left: 0 })

const hoveredTooltipLabel = ref('')
const tooltipPos = ref({ top: 0, left: 0 })

let closeFlyoutTimer = null

const isEffectiveCollapsed = computed(() => props.isCollapsed && !props.isMobileOpen)

function handleParentClick(parent, event) {
  if (isEffectiveCollapsed.value) {
    if (activeFlyoutParent.value?.key === parent.key) {
      activeFlyoutParent.value = null
    } else {
      openFlyout(parent, event)
    }
  } else {
    toggleParent(parent.key)
  }
}

function handleParentMouseEnter(parent, event) {
  if (!isEffectiveCollapsed.value) return
  if (closeFlyoutTimer) clearTimeout(closeFlyoutTimer)
  openFlyout(parent, event)
}

function handleParentMouseLeave() {
  if (!isEffectiveCollapsed.value) return
  closeFlyoutTimer = setTimeout(() => {
    activeFlyoutParent.value = null
  }, 200)
}

function cancelCloseFlyout() {
  if (closeFlyoutTimer) clearTimeout(closeFlyoutTimer)
}

function openFlyout(parent, event) {
  const btn = event.currentTarget
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  flyoutPos.value = {
    top: Math.max(10, Math.min(rect.top, window.innerHeight - 180)),
    left: rect.right + 8,
  }
  activeFlyoutParent.value = parent
}

function handleDirectMouseEnter(item, event) {
  if (!isEffectiveCollapsed.value) return
  const btn = event.currentTarget
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  tooltipPos.value = {
    top: rect.top + rect.height / 2,
    left: rect.right + 10,
  }
  hoveredTooltipLabel.value = item.label
}

function handleDirectMouseLeave() {
  hoveredTooltipLabel.value = ''
}

function toggleParent(key) {
  expandedParents.value[key] = !expandedParents.value[key]
}

function isParentExpanded(key) {
  return !!expandedParents.value[key]
}

function autoExpandActiveParent() {
  const currentPath = route.path
  if (['/cases', '/templates', '/analytics', '/admin/cases', '/admin/kb-categories', '/admin/editor', '/faqs'].some(p => currentPath.startsWith(p))) expandedParents.value.knowledge_base = true
  if (['/assets', '/my-assets'].includes(currentPath)) expandedParents.value.asset_management = true
  if (['/tickets', '/submissions'].includes(currentPath)) expandedParents.value.helpdesk = true
  if (['/users', '/karyawan'].includes(currentPath)) expandedParents.value.master_data = true
  if (['/logs', '/export', '/database'].includes(currentPath)) expandedParents.value.sistem = true
}

watch(
  () => route.path,
  () => {
    autoExpandActiveParent()
    activeFlyoutParent.value = null
    hoveredTooltipLabel.value = ''
  },
  { immediate: true },
)

const menuGroups = computed(() => {
  const groups = [
    {
      title: 'HOME',
      items: [
        {
          to: '/',
          label: 'Help Center',
          icon: 'help_center',
          permission: null,
          badge: 'Artikel',
        },
        {
          to: '/dashboard',
          label: 'Dashboard',
          icon: 'grid_view',
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
              permission: null,
            },
            {
              to: '/templates',
              label: 'Templates Hub',
              icon: 'description',
              permission: null,
            },
            {
              to: '/analytics',
              label: 'KB Analytics',
              icon: 'analytics',
              permission: null,
            },
            {
              to: '/admin/cases',
              label: 'Admin CMS',
              icon: 'edit_document',
              permission: 'users',
            },
            {
              to: '/faqs',
              label: 'Atur FAQ',
              icon: 'quiz',
              permission: 'users',
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
              permission: 'assets',
            },
            {
              to: '/assets-ga',
              label: 'Aset GA',
              icon: 'domain',
              permission: 'assets_ga',
            },
            {
              to: '/assets-ops',
              label: 'Aset Ops',
              icon: 'precision_manufacturing',
              permission: 'assets_ops',
            },
            {
              to: '/my-assets',
              label: 'Aset Karyawan',
              icon: 'badge',
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
              permission: 'tickets',
              badge: 'New',
            },
            {
              to: '/submissions',
              label: 'Pengajuan',
              icon: 'assignment',
              permission: 'submissions',
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
            {
              to: '/users',
              label: 'Pengguna',
              icon: 'group',
              permission: 'users',
            },
            {
              to: '/karyawan',
              label: 'Karyawan',
              icon: 'person_search',
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
              permission: 'logs',
            },
            {
              to: '/export',
              label: 'Ekspor Data',
              icon: 'output',
              permission: 'export',
              superadminOnly: true,
            },
            {
              to: '/database',
              label: 'Database',
              icon: 'database',
              superadminOnly: true,
            },
          ],
        },
      ],
    },
  ]

  return groups
    .map((g) => {
      const validItems = (g.items || []).filter(
        (item) => (!item.superadminOnly || isSuperAdmin.value) && (item.superadminOnly || hasPermission(item.permission)),
      )

      const validParents = (g.parents || [])
        .map((p) => ({
          ...p,
          items: (p.items || []).filter(
            (item) =>
              (!item.superadminOnly || isSuperAdmin.value) && (item.superadminOnly || hasPermission(item.permission)),
          ),
        }))
        .filter((p) => p.items.length > 0)

      return {
        ...g,
        items: validItems,
        parents: validParents,
      }
    })
    .filter((g) => (g.items && g.items.length > 0) || (g.parents && g.parents.length > 0))
})

function getFocusableElements() {
  if (!sidebarRef.value) return []
  return Array.from(
    sidebarRef.value.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  )
}

function handleKeydown(event) {
  if (!props.isMobileOpen) return
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close-mobile')
    return
  }
  if (event.key !== 'Tab') return

  const elements = getFocusableElements()
  const firstElement = elements[0]
  const lastElement = elements.at(-1)
  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault()
    lastElement?.focus()
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault()
    firstElement?.focus()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})

function closeSubmenuAndMobile() {
  activeFlyoutParent.value = null
  emit('close-mobile')
}

</script>

<template>
  <!-- Mobile Backdrop Overlay -->
  <Transition name="sidebar-backdrop">
    <button
      v-if="isMobileOpen"
      type="button"
      aria-label="Tutup navigasi mobile"
      tabindex="-1"
      class="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs lg:hidden"
      @click="emit('close-mobile')"
    ></button>
  </Transition>

  <!-- Sidebar Component (Expanded: 245px, Collapsed Rail: 74px) -->
  <aside
    id="app-navigation"
    ref="sidebarRef"
    :role="isMobileOpen ? 'dialog' : undefined"
    :aria-modal="isMobileOpen ? 'true' : undefined"
    aria-label="Navigasi aplikasi"
    class="fixed inset-y-0 left-0 z-40 flex h-dvh shrink-0 flex-col border-r border-[#E5EAEF] bg-white text-[#2A3547] shadow-xl transition-all duration-300 ease-in-out lg:static lg:z-10 lg:shadow-none select-none"
    :class="[
      isMobileOpen
        ? 'w-[250px] translate-x-0 visible opacity-100'
        : '-translate-x-full lg:translate-x-0',
      isEffectiveCollapsed ? 'lg:w-[74px]' : 'lg:w-[245px]',
    ]"
  >
    <!-- ── Brand Logo Top Header Area ── -->
    <div
      class="relative flex h-[56px] shrink-0 items-center border-b border-[#F1F5F9] transition-all"
      :class="
        isEffectiveCollapsed ? 'justify-center flex-col gap-1 px-0 py-1' : 'justify-between gap-2 px-3.5'
      "
    >
      <!-- Logo saat Expanded -->
      <RouterLink
        v-if="!isEffectiveCollapsed"
        to="/"
        title="Kembali ke Dashboard"
        class="flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
      >
        <img
          src="/ESB Logo.svg"
          alt="ESB Logo"
          class="h-7 w-auto shrink-0 transition-all duration-200"
        />
      </RouterLink>

      <!-- Logo Mark + Control Button saat Collapsed Navigation Rail -->
      <template v-else>
        <div class="flex items-center justify-center gap-1.5 w-full px-1">
          <RouterLink
            to="/"
            title="Kembali ke Dashboard"
            class="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[#ECF2FF] transition-all cursor-pointer shrink-0"
          >
            <img
              src="/ESB Logo.svg"
              alt="ESB Logo"
              class="h-6 w-6 object-left object-cover shrink-0 block"
            />
          </RouterLink>

          <button
            type="button"
            aria-label="Perluas Sidebar"
            title="Perluas Sidebar"
            class="flex h-6 w-6 items-center justify-center rounded-md text-[#7C8BAC] hover:bg-[#ECF2FF] hover:text-[#5D87FF] transition-all cursor-pointer shrink-0"
            @click="emit('toggle-collapse')"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[16px]"
              >chevron_right</span
            >
          </button>
        </div>
      </template>

      <!-- Toggle Button Desktop (Saat Expanded) -->
      <button
        v-if="!isEffectiveCollapsed"
        ref="closeButtonRef"
        type="button"
        aria-label="Ciutkan Sidebar"
        title="Ciutkan Sidebar"
        class="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-[#7C8BAC] hover:bg-[#ECF2FF] hover:text-[#5D87FF] transition-all cursor-pointer shrink-0"
        @click="emit('toggle-collapse')"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[18px]">menu_open</span>
      </button>

      <!-- Close Button Mobile -->
      <button
        type="button"
        aria-label="Tutup navigasi mobile"
        title="Tutup Navigasi"
        class="flex lg:hidden h-7 w-7 items-center justify-center rounded-lg text-[#7C8BAC] hover:bg-[#ECF2FF] hover:text-[#5D87FF] transition-all cursor-pointer shrink-0"
        @click="emit('close-mobile')"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>

    <!-- ── Sidebar Scrollable Menu / Navigation Rail Container ── -->
    <div
      class="relative flex-1 overflow-y-auto py-3 transition-all"
      :class="isEffectiveCollapsed ? 'px-0 space-y-3' : 'px-2.5 space-y-4'"
    >
      <div
        v-for="group in menuGroups"
        :key="group.title"
        :class="isEffectiveCollapsed ? 'space-y-2' : 'space-y-1'"
      >
        <!-- Category Title (Hanya di Expanded Mode) -->
        <p
          v-if="!isEffectiveCollapsed"
          class="px-2 text-[10.5px] font-extrabold uppercase tracking-wider text-[#475569] transition-all"
        >
          {{ group.title }}
        </p>

        <nav :class="isEffectiveCollapsed ? 'flex flex-col items-center gap-1.5' : 'space-y-0.5'">
          <!-- 1. Direct Items (e.g. Dashboard) -->
          <template v-if="group.items && group.items.length">
            <div
              v-for="item in group.items"
              :key="item.to"
              class="relative"
              :class="isEffectiveCollapsed ? 'flex justify-center w-full' : ''"
              @mouseenter="handleDirectMouseEnter(item, $event)"
              @mouseleave="handleDirectMouseLeave"
            >
              <RouterLink
                :to="item.to"
                class="group flex items-center transition-all duration-150 relative cursor-pointer"
                :class="[
                  isEffectiveCollapsed
                    ? 'h-10 w-10 justify-center rounded-xl'
                    : 'w-full gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px]',
                  route.path === item.to
                    ? 'bg-[#5D87FF] text-white shadow-xs font-semibold'
                    : 'text-[#2A3547] hover:bg-[#ECF2FF] hover:text-[#5D87FF] font-medium',
                ]"
                @click="emit('close-mobile')"
              >
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined transition-colors shrink-0"
                  :class="[
                    isEffectiveCollapsed ? 'text-[20px]' : 'text-[18px]',
                    route.path === item.to
                      ? 'text-white'
                      : 'text-[#7C8BAC] group-hover:text-[#5D87FF]',
                  ]"
                >
                  {{ item.icon }}
                </span>

                <span v-if="!isEffectiveCollapsed" class="min-w-0 flex-1 leading-none whitespace-nowrap">
                  {{ item.label }}
                </span>

                <span
                  v-if="item.badge && !isEffectiveCollapsed"
                  class="rounded-full px-1.5 py-0.2 text-[9px] font-bold shrink-0"
                  :class="
                    route.path === item.to
                      ? 'bg-white/20 text-white'
                      : 'bg-[#ECF2FF] text-[#5D87FF]'
                  "
                >
                  {{ item.badge }}
                </span>
              </RouterLink>
            </div>
          </template>

          <!-- 2. Parent Menus (Expandable di Expanded Mode, Floating Popover di Collapsed Mode) -->
          <template v-if="group.parents && group.parents.length">
            <div
              v-for="parent in group.parents"
              :key="parent.key"
              class="relative"
              :class="isEffectiveCollapsed ? 'flex justify-center w-full' : 'space-y-0.5'"
              @mouseenter="handleParentMouseEnter(parent, $event)"
              @mouseleave="handleParentMouseLeave"
            >
              <!-- Parent Menu Trigger Button -->
              <button
                type="button"
                :aria-expanded="!isEffectiveCollapsed ? String(isParentExpanded(parent.key)) : (activeFlyoutParent?.key === parent.key ? 'true' : 'false')"
                :aria-controls="`submenu-${parent.key}`"
                :aria-label="parent.label"
                class="group flex items-center transition-all duration-150 cursor-pointer select-none"
                :class="[
                  isEffectiveCollapsed
                    ? 'h-10 w-10 justify-center rounded-xl'
                    : 'w-full gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-semibold justify-between',
                  parent.items.some((child) => route.path === child.to)
                    ? isEffectiveCollapsed
                      ? 'bg-[#ECF2FF] text-[#5D87FF]'
                      : 'text-[#2A3547] bg-[#F8FAFC]'
                    : 'text-[#2A3547] hover:bg-[#F8FAFC] hover:text-[#5D87FF]',
                ]"
                @click="handleParentClick(parent, $event)"
              >
                <div
                  class="flex items-center gap-2.5 min-w-0"
                  :class="isEffectiveCollapsed ? 'justify-center' : ''"
                >
                  <span
                    aria-hidden="true"
                    class="material-symbols-outlined transition-colors shrink-0"
                    :class="[
                      isEffectiveCollapsed ? 'text-[20px]' : 'text-[18px]',
                      parent.items.some((child) => route.path === child.to)
                        ? 'text-[#5D87FF]'
                        : 'text-[#7C8BAC] group-hover:text-[#5D87FF]',
                    ]"
                  >
                    {{ parent.icon }}
                  </span>

                  <span
                    v-if="!isEffectiveCollapsed"
                    class="min-w-0 flex-1 leading-none whitespace-nowrap text-left"
                  >
                    {{ parent.label }}
                  </span>
                </div>

                <span
                  v-if="!isEffectiveCollapsed"
                  aria-hidden="true"
                  class="material-symbols-outlined text-[16px] text-[#7C8BAC] transition-transform duration-200 shrink-0"
                  :class="{ 'rotate-180': isParentExpanded(parent.key) }"
                >
                  keyboard_arrow_down
                </span>
              </button>

              <!-- Expanded Mode Submenu Items -->
              <div
                v-if="!isEffectiveCollapsed"
                :id="`submenu-${parent.key}`"
                v-show="isParentExpanded(parent.key)"
                role="region"
                :aria-label="parent.label"
                class="pl-5 space-y-0.5 mt-0.5 transition-all"
              >
                <RouterLink
                  v-for="sub in parent.items"
                  :key="sub.to"
                  :to="sub.to"
                  class="group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] transition-all duration-150 relative"
                  :class="
                    route.path === sub.to
                      ? 'bg-[#ECF2FF] text-[#5D87FF] font-bold shadow-2xs border-l-2 border-[#5D87FF] rounded-r-lg'
                      : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#5D87FF] font-medium'
                  "
                  @click="emit('close-mobile')"
                >
                  <span
                    aria-hidden="true"
                    class="material-symbols-outlined text-[16px] transition-colors shrink-0"
                    :class="
                      route.path === sub.to
                        ? 'text-[#5D87FF]'
                        : 'text-[#94A3B8] group-hover:text-[#5D87FF]'
                    "
                  >
                    {{ sub.icon }}
                  </span>

                  <span class="min-w-0 flex-1 leading-none whitespace-nowrap">
                    {{ sub.label }}
                  </span>
                </RouterLink>
              </div>
            </div>
          </template>
        </nav>
      </div>
    </div>

  </aside>

  <!-- ── Teleport Flyout Popovers & Tooltips for Collapsed Navigation Rail ── -->
  <Teleport to="body">
    <!-- Parent Menu Flyout Popover -->
    <div
      v-if="isEffectiveCollapsed && activeFlyoutParent"
      class="fixed z-[9999] w-[195px] rounded-xl border border-[#E2E8F0] bg-white p-2 shadow-2xl transition-all select-none animate-in fade-in zoom-in-95 duration-150"
      :style="{ top: `${flyoutPos.top}px`, left: `${flyoutPos.left}px` }"
      @mouseenter="cancelCloseFlyout"
      @mouseleave="handleParentMouseLeave"
    >
      <div class="px-2 py-1.5 border-b border-[#F1F5F9] mb-1">
        <p class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#7C8BAC]">
          {{ activeFlyoutParent.label }}
        </p>
      </div>
      <div class="space-y-0.5">
        <RouterLink
          v-for="sub in activeFlyoutParent.items"
          :key="sub.to"
          :to="sub.to"
          class="group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11.5px] transition-all cursor-pointer"
          :class="
            route.path === sub.to
              ? 'bg-[#EFF6FF] text-[#2563EB] font-bold'
              : 'text-[#2A3547] hover:bg-[#F8FAFC] hover:text-[#2563EB] font-medium'
          "
          @click="closeSubmenuAndMobile"
        >
          <span
            aria-hidden="true"
            class="material-symbols-outlined text-[16px] shrink-0"
            :class="
              route.path === sub.to ? 'text-[#2563EB]' : 'text-[#7C8BAC] group-hover:text-[#2563EB]'
            "
          >
            {{ sub.icon }}
          </span>
          <span class="truncate">{{ sub.label }}</span>
        </RouterLink>
      </div>
    </div>

    <!-- Direct Item Tooltip -->
    <div
      v-if="isEffectiveCollapsed && hoveredTooltipLabel"
      class="fixed z-[9999] -translate-y-1/2 whitespace-nowrap rounded-md bg-[#1E293B] px-2.5 py-1 text-[11px] font-bold text-white shadow-md pointer-events-none"
      :style="{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left}px` }"
    >
      {{ hoveredTooltipLabel }}
    </div>

  </Teleport>

</template>

<style scoped>
.sidebar-backdrop-enter-active,
.sidebar-backdrop-leave-active {
  transition: opacity 0.2s ease;
}
.sidebar-backdrop-enter-from,
.sidebar-backdrop-leave-to {
  opacity: 0;
}

</style>

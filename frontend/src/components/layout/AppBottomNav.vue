<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import {
  Ticket,
  Laptop,
  Home,
  MoreHorizontal,
  LayoutDashboard,
  Users,
  UserSearch,
  ScrollText,
  HelpCircle,
  FilePen,
  Truck,
  X,
} from 'lucide-vue-next'

const route = useRoute()
const { hasPermission, isAdmin } = useAuth()
const isLainnyaOpen = ref(false)
const dashboardTo = computed(() => (isAdmin.value ? '/dashboard' : '/my-assets'))

const items = computed(() =>
  [
    { to: dashboardTo.value, label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard' },
    { to: '/tickets', label: 'Tiket', icon: Ticket, permission: 'tickets' },
    { to: '/assets', label: 'Aset', icon: Laptop, permission: 'assets' },
  ].filter((item) => !item.permission || hasPermission(item.permission)),
)

const lainnyaItems = computed(() =>
  [
    { to: '/submissions', label: 'Pengajuan', icon: FilePen, permission: 'submissions' },
    { to: '/shipments', label: 'Pengiriman', icon: Truck, permission: 'shipments' },
    { to: '/', label: 'Help Center', icon: Home, permission: null },
    { to: '/my-assets', label: 'Aset Saya', icon: Laptop, permission: 'my_assets' },
    { to: '/users', label: 'Pengguna', icon: Users, permission: 'users' },
    { to: '/karyawan', label: 'Karyawan', icon: UserSearch, permission: 'karyawan' },
    { to: '/logs', label: 'Log Aktivitas', icon: ScrollText, permission: 'logs' },
    { to: '/faqs', label: 'Atur FAQ', icon: HelpCircle, permission: 'users' },
    { to: '/admin/cases', label: 'Admin CMS', icon: FilePen, permission: 'users' },
  ].filter((item) => !item.permission || hasPermission(item.permission)),
)

function isItemActive(itemTo) {
  const target = typeof itemTo === 'string' ? itemTo : itemTo?.value
  if (!target) return false
  if (target === '/dashboard') {
    return route.path === '/dashboard'
  }
  return route.path === target || route.path.startsWith(target + '/')
}

function isLainnyaItemActive(itemTo) {
  if (itemTo === '/admin/cases') {
    return (
      route.path.startsWith('/admin/cases') ||
      route.path.startsWith('/admin/editor') ||
      route.path.startsWith('/admin/article-editor') ||
      route.name === 'article-editor'
    )
  }
  if (itemTo === '/faqs') {
    return route.path.startsWith('/faqs')
  }
  if (itemTo === '/') {
    return route.path === '/'
  }
  return route.path === itemTo || route.path.startsWith(itemTo + '/')
}

const isLainnyaActive = computed(() => {
  return (
    route.path.startsWith('/admin/editor') ||
    route.path.startsWith('/admin/article-editor') ||
    route.name === 'article-editor' ||
    lainnyaItems.value.some((item) => isLainnyaItemActive(item.to))
  )
})

watch(
  () => route.fullPath,
  () => {
    isLainnyaOpen.value = false
  },
)
</script>

<template>
  <nav
    role="navigation"
    aria-label="Navigasi Mobile Bawah"
    class="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg px-2 py-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none shadow-lg shadow-slate-900/5 min-h-[56px]"
  >
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      :aria-label="item.label"
      class="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-w-[52px] min-h-[44px] touch-manipulation active:scale-95"
      :class="
        isItemActive(item.to)
          ? 'text-[#5D87FF] font-bold'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
      "
    >
      <component :is="item.icon" class="w-4 h-4" />
      <span class="text-[10px]">{{ item.label }}</span>
    </RouterLink>

    <button
      type="button"
      aria-label="Menu lainnya"
      :aria-expanded="isLainnyaOpen"
      @click="isLainnyaOpen = !isLainnyaOpen"
      class="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-colors cursor-pointer min-w-[52px] min-h-[44px] touch-manipulation active:scale-95"
      :class="
        isLainnyaOpen || isLainnyaActive
          ? 'text-[#5D87FF] font-bold'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
      "
    >
      <MoreHorizontal class="w-4 h-4" />
      <span class="text-[10px]">Lainnya</span>
    </button>
  </nav>

  <!-- Popup Lainnya -->
  <Teleport to="body">
    <div
      v-if="isLainnyaOpen"
      class="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs"
      @click="isLainnyaOpen = false"
    ></div>

    <div
      v-if="isLainnyaOpen"
      role="menu"
      aria-label="Menu lainnya"
      class="lg:hidden fixed left-2 right-2 bottom-[64px] z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-900/15 p-2 animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <div class="flex items-center justify-between px-2 pt-1 pb-2">
        <span
          class="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500"
          >Menu Lainnya</span
        >
        <button
          type="button"
          aria-label="Tutup menu"
          @click="isLainnyaOpen = false"
          class="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="grid grid-cols-3 gap-1">
        <RouterLink
          v-for="item in lainnyaItems"
          :key="item.to"
          :to="item.to"
          role="menuitem"
          class="flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl transition-colors text-center active:scale-95"
          :class="
            isLainnyaItemActive(item.to)
              ? 'text-[#5D87FF] bg-[#5D87FF]/10 dark:bg-[#5D87FF]/20 font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#5D87FF]'
          "
        >
          <component :is="item.icon" class="w-5 h-5" />
          <span class="text-[10px] font-semibold leading-tight">{{ item.label }}</span>
        </RouterLink>
      </div>
    </div>
  </Teleport>
</template>

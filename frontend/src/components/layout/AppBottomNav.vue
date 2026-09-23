<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import {
  primaryBottomNav,
  flattenMenu,
  isNavItemVisible,
  resolveHomeRoute,
} from '@/config/navigationConfig.js'
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
  BookOpen,
  FileOutput,
  Database,
  Truck,
  X,
  Circle,
  Building2,
  Cog,
  BadgeCheck,
  FileText,
} from 'lucide-vue-next'

// Icons keyed by navigationConfig.js `lucide` names — one map, no star import.
const lucide = {
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
  BookOpen,
  FileOutput,
  Database,
  Truck,
  X,
  Circle,
  Building2,
  Cog,
  BadgeCheck,
  FileText,
}

const route = useRoute()
const { hasPermission, isSuperAdmin } = useAuth()
const isLainnyaOpen = ref(false)

// RBAC gate shared with AppSidebar — one rule, one place.
const gate = computed(() => ({ hasPermission, isSuperAdmin: isSuperAdmin.value }))

// Home slot resolves to a real destination for every role (dashboard for
// admins, Aset Saya for reporters, Help Center as final fallback).
const homeRoute = computed(() => resolveHomeRoute(gate.value))

const items = computed(() => {
  // If Home resolves to /my-assets it would duplicate the standalone my-assets
  // slot — drop the copy so the nav never shows the same route twice.
  const homeDeduped =
    homeRoute.value.to === '/my-assets'
      ? primaryBottomNav.filter((item) => item.key !== 'my-assets')
      : primaryBottomNav

  return homeDeduped
    .map((item) => (item.home ? { ...item, ...homeRoute.value } : item))
    .filter((item) => isNavItemVisible(item, gate.value))
})

// Everything NOT in the primary bottom nav — full sidebar menu, same RBAC,
// grouping preserved for Menu Lainnya.
const primarySet = computed(() => new Set([...items.value.map((i) => i.to), homeRoute.value.to]))
const lainnyaItems = computed(() =>
  flattenMenu()
    .filter((item) => !primarySet.value.has(item.to))
    .filter((item) => isNavItemVisible(item, gate.value)),
)

function isItemActive(itemTo) {
  const target = typeof itemTo === 'string' ? itemTo : itemTo?.value
  if (!target) return false
  // Home slot: match the resolved destination OR the landing route it stands in
  // for (a reporter's Home = /my-assets must highlight on /my-assets).
  if (target === homeRoute.value.to) return route.path === target
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

// Escape closes the drawer (it previously had no keyboard handler at all), and
// body scroll is locked while it is open so the page behind cannot scroll.
// Both are cleaned up on close and on unmount so no stale listener or scroll
// lock survives navigation.
function handleKeydown(event) {
  if (event.key === 'Escape') isLainnyaOpen.value = false
}

watch(isLainnyaOpen, (open) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (open) {
    window.addEventListener('keydown', handleKeydown)
    document.body.style.overflow = 'hidden'
  } else {
    window.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = ''
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', handleKeydown)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isLainnyaOpen"
      class="lg:hidden fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs"
      @click="isLainnyaOpen = false"
    ></div>
    <div class="mobile-navigation lg:hidden fixed bottom-0 left-0 right-0 z-40">
      <nav
        role="navigation"
        aria-label="Navigasi Mobile Bawah"
        class="clean-bottom-nav relative z-10 border-t border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg px-2 py-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none shadow-none min-h-[56px]"
      >
        <RouterLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          :aria-label="item.label"
          :aria-current="isItemActive(item.to) ? 'page' : undefined"
          class="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-w-[52px] min-h-[44px] touch-manipulation active:scale-95"
          :class="
            isItemActive(item.to)
              ? 'text-[#234B83] bg-[#EAF1FC] font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          "
        >
          <component :is="lucide[item.lucide] || Circle" class="w-4 h-4" />
          <span class="text-[10px]">{{ item.label }}</span>
        </RouterLink>

        <button
          type="button"
          aria-label="Menu lainnya"
          aria-controls="mobile-more-menu"
          :aria-expanded="isLainnyaOpen"
          @click="isLainnyaOpen = !isLainnyaOpen"
          class="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl transition-colors cursor-pointer min-w-[52px] min-h-[44px] touch-manipulation active:scale-95"
          :class="
            isLainnyaOpen || isLainnyaActive
              ? 'text-[#333333] font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          "
        >
          <MoreHorizontal class="w-4 h-4" />
          <span class="text-[10px]">Lainnya</span>
        </button>
      </nav>

      <Transition name="more-menu">
        <div
          v-if="isLainnyaOpen"
          id="mobile-more-menu"
          role="navigation"
          aria-label="Menu lainnya"
          class="clean-more-menu absolute left-0 right-0 bottom-full rounded-t-2xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-2"
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

          <div class="grid grid-cols-3 gap-2">
            <RouterLink
              v-for="item in lainnyaItems"
              :key="item.to"
              :to="item.to"
              :aria-current="isLainnyaItemActive(item.to) ? 'page' : undefined"
              class="flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl transition-colors text-center active:scale-95"
              :class="
                isLainnyaItemActive(item.to)
                  ? 'text-[#333333] bg-[#0A51B0]/10 dark:bg-[#0A51B0]/20 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#333333]'
              "
            >
              <component :is="lucide[item.lucide] || Circle" class="w-5 h-5" />
              <span class="text-[10px] font-semibold leading-tight">{{ item.label }}</span>
            </RouterLink>
          </div>

          <p
            v-if="!lainnyaItems.length"
            class="px-2 py-6 text-center text-xs text-slate-400"
            role="status"
          >
            Belum ada menu lain yang tersedia untuk akun Anda.
          </p>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.more-menu-enter-active,
.more-menu-leave-active {
  transition: transform 240ms ease;
}
.more-menu-enter-from,
.more-menu-leave-to {
  transform: translateY(100%);
}
@media (prefers-reduced-motion: reduce) {
  .more-menu-enter-active,
  .more-menu-leave-active {
    transition: none;
  }
}
.clean-bottom-nav {
  background: #fff;
  border-color: #e3e9f1;
  gap: 5px;
  padding-left: 12px;
  padding-right: 12px;
}
.clean-bottom-nav > a,
.clean-bottom-nav > button {
  flex: 1;
  max-width: 112px;
  border-radius: 9px;
  gap: 3px;
  font-weight: 550;
}
.clean-bottom-nav svg {
  width: 18px;
  height: 18px;
  stroke-width: 1.7;
}
.clean-more-menu {
  max-height: calc(100dvh - 100px - env(safe-area-inset-bottom));
  overflow-y: auto;
  padding: 14px;
}
.clean-more-menu > div:first-child {
  padding: 0 4px 10px;
}
.clean-more-menu > div:first-child > span {
  text-transform: none;
  letter-spacing: 0;
  font-size: 13px;
  font-weight: 650;
  color: #333333;
}
.clean-more-menu button {
  min-width: 44px;
  min-height: 44px;
}
.clean-more-menu a {
  border: 1px solid #edf1f6;
  padding: 15px 7px;
  gap: 9px;
}
.clean-bottom-nav :is(a, button):focus-visible,
.clean-more-menu :is(a, button):focus-visible {
  outline: 2px solid #097cde;
  outline-offset: 2px;
}
:global(.dark) .clean-bottom-nav {
  background: #0f172a;
  border-color: #28384e;
}
:global(.dark) .clean-more-menu a {
  border-color: #28384e;
}
:global(.dark) .clean-more-menu > div:first-child > span {
  color: #e2e8f0;
}
</style>

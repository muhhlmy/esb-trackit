<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter, RouterView } from 'vue-router'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppHeader from './components/layout/AppHeader.vue'

// Help Center Layout components
import Navbar from './components/layout/Navbar.vue'
import MobileNav from './components/layout/MobileNav.vue'
import AppBottomNav from './components/layout/AppBottomNav.vue'
import Toast from './components/common/Toast.vue'

import { animatePageEnter, animatePageLeave } from './composables/useGsap.js'
import { getStoredUser, restoreSession } from './utils/authStorage.js'
import { useAuth } from './composables/useAuth.js'
import { initTicketRealtime, stopTicketRealtime } from './composables/useTicketRealtime.js'
import { useCases } from './composables/useCases.js'

const route = useRoute()
const router = useRouter()

function pageKey(currentRoute) {
  // Create-action cleanup must not destroy destination modal state.
  // Keep all other route keys (including BAST detail routes) unchanged.
  const createActions = { '/assets': ['add'], '/karyawan': ['add'], '/tickets': ['new', 'create'] }
  const actions = createActions[currentRoute.path]
  if (
    actions &&
    (currentRoute.query.action === undefined || actions.includes(currentRoute.query.action))
  ) {
    return router.resolve({
      path: currentRoute.path,
      query: { ...currentRoute.query, action: undefined },
      hash: currentRoute.hash,
    }).fullPath
  }
  return currentRoute.fullPath
}
const { fetchCases } = useCases()
const { user, refreshUser } = useAuth()

const isLoginPage = computed(() => {
  return route.name === 'login' || route.path === '/login'
})

const isFullscreenEditor = computed(() => {
  return (
    route.path.startsWith('/admin/editor') ||
    route.path.startsWith('/admin/article-editor') ||
    route.name === 'article-editor'
  )
})

const isHelpCenterView = computed(() => {
  const p = route.path
  // Landing Help Center publik tetap standalone (tanpa sidebar TrackIT).
  if (p === '/') {
    return true
  }
  // Cases & Artikel: user terotentikasi melihatnya di dalam app-shell TrackIT
  // agar sidebar menu tidak hilang & tetap saat scroll; tamu anonim tetap
  // dapat layout Help Center.
  if (p.startsWith('/cases')) {
    return !user.value
  }
  return false
})

// Dual state navigasi (mobile drawer vs desktop collapse)
const isMobileNavigationOpen = ref(false)
const isDesktopSidebarCollapsed = ref(
  typeof window !== 'undefined' ? localStorage.getItem('app_sidebar_collapsed') === 'true' : false,
)

watch(isDesktopSidebarCollapsed, (val) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('app_sidebar_collapsed', String(val))
  }
})

watch(
  () => route.fullPath,
  () => {
    isMobileNavigationOpen.value = false
  },
)

function handleResize() {
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    isMobileNavigationOpen.value = false
  }
}

onMounted(async () => {
  fetchCases()
  // Data pengguna di localStorage hanya cache UI. Selalu cocokkan kembali
  // dengan sesi server saat aplikasi dibuka agar nama/role lama tidak tampil.
  if (getStoredUser() || (await restoreSession())?.user) {
    await refreshUser()
    if (user.value) initTicketRealtime()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize)
  }
})

onUnmounted(() => {
  stopTicketRealtime()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize)
  }
})
</script>

<template>
  <!-- 1. Halaman Login Standalone -->
  <template v-if="isLoginPage">
    <RouterView />
  </template>

  <!-- 2. Halaman Editor Fullscreen (Distraction-Free Editor) -->
  <template v-else-if="isFullscreenEditor">
    <RouterView />
    <Toast />
    <AppBottomNav />
  </template>

  <!-- 3. Halaman Help Center Standalone (Tampilan Persis Branch Help-Center tanpa TrackIT Sidebar & Header) -->
  <template v-else-if="isHelpCenterView">
    <div
      class="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-[#333333] dark:text-slate-100 flex flex-col antialiased selection:bg-[#0A51B0] selection:text-white pb-16 md:pb-0 transition-colors duration-200"
    >
      <Navbar />
      <div class="flex-1 flex flex-col">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </div>
      <MobileNav />
      <Toast />
    </div>
  </template>

  <!-- 3. Halaman Management & Monitoring TrackIT (Dengan AppSidebar & AppHeader) -->
  <template v-else>
    <a
      href="#main-content"
      class="fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-[#111827] px-4 py-2 text-sm font-bold text-white transition-transform focus:translate-y-0"
    >
      Lewati ke konten utama
    </a>

    <div class="app-shell relative flex h-dvh min-h-0 overflow-hidden bg-[#F8FAFC]">
      <AppSidebar
        :is-mobile-open="isMobileNavigationOpen"
        :is-collapsed="isDesktopSidebarCollapsed"
        @close-mobile="isMobileNavigationOpen = false"
        @toggle-collapse="isDesktopSidebarCollapsed = !isDesktopSidebarCollapsed"
      />

      <div class="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          :is-mobile-open="isMobileNavigationOpen"
          :is-collapsed="isDesktopSidebarCollapsed"
          @toggle-mobile="isMobileNavigationOpen = !isMobileNavigationOpen"
          @toggle-collapse="isDesktopSidebarCollapsed = !isDesktopSidebarCollapsed"
        />

        <main
          id="main-content"
          tabindex="-1"
          class="app-main flex-1 overflow-y-auto p-3.5 outline-none sm:p-4 lg:p-5 pb-[calc(56px+0.875rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(56px+1rem+env(safe-area-inset-bottom,0px))] lg:pb-5"
        >
          <div class="mx-auto w-full max-w-[1560px]">
            <RouterView v-slot="{ Component, route: currentRoute }">
              <Transition
                :css="false"
                @enter="animatePageEnter"
                @leave="animatePageLeave"
                mode="out-in"
              >
                <div :key="pageKey(currentRoute)" class="page-transition-wrapper w-full">
                  <component :is="Component" />
                </div>
              </Transition>
            </RouterView>
          </div>
        </main>
      </div>
    </div>

    <AppBottomNav />

    <!-- Shared notifications for the primary app shell. Previously absent here,
         so useToast() calls in FaqAdminView/DocEditorView/useCases never rendered
         and DatabaseView/ExportView had to ship their own private toast. -->
    <Toast />
  </template>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

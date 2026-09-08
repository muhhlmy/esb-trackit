<script setup>
/**
 * MobileBottomNav — Unified bottom navigation for mobile + tablet (<1024px).
 * Single unified bar replaces the old MobileNav / MobileBottomNav split.
 *
 * Design goals:
 * - Native mobile app feel: restrained color, clear active state, no animated dot spam
 * - One consistent set of core items regardless of Help Center vs TrackIT view
 * - Notification badge on Tiket uses unread count (shared via useNotifications)
 * - Safe area padding for notch / home indicator
 */
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import {
  LayoutDashboard,
  Monitor,
  Ticket,
  User,
  Package,
  MoreHorizontal,
  Users,
  ClipboardList,
  FileText,
  Shield,
} from 'lucide-vue-next';
import { useAuth } from '@/composables/useAuth';
import { useNotifications } from '@/composables/useNotifications';

const route = useRoute();
const { user, isAuthenticated, isAdmin, isSuperAdmin } = useAuth();
const { unreadCount } = useNotifications();

// Satu konfigurasi tebal untuk semua view (Help Center + TrackIT).
// Help Center masih punya MobileNav legacy di App.vue, tapi kalau nanti disatukan
// cukup pakai komponen ini juga.
const coreNavItems = computed(() => {
  const items = [];

  // Beranda / Help Center — selalu ada
  items.push({
    name: 'Beranda',
    path: '/',
    icon: LayoutDashboard,
    activeClass: 'text-[#5D87FF] bg-[#EEF4FF]',
    inactiveClass: 'text-slate-500 hover:text-[#5D87FF]',
    show: true,
  });

  // Dashboard — kalau sudah login & punya akses
  if (isAuthenticated.value) {
    items.push({
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      activeClass: 'text-[#5D87FF] bg-[#EEF4FF]',
      inactiveClass: 'text-slate-500 hover:text-[#5D87FF]',
      show: hasPermissionLocal('dashboard'),
    });
  }

  // Aset — beda path tergantung role
  if (isAuthenticated.value) {
    const assetPath = (isAdmin.value || isSuperAdmin.value) ? '/assets' : '/my-assets';
    items.push({
      name: 'Aset',
      path: assetPath,
      icon: Monitor,
      activeClass: 'text-[#5D87FF] bg-[#EEF4FF]',
      inactiveClass: 'text-slate-500 hover:text-[#5D87FF]',
      show: true,
    });
  }

  // Tiket — selalu ada untuk yang login; badge pakai unread count shared
  if (isAuthenticated.value) {
    items.push({
      name: 'Tiket',
      path: '/tickets',
      icon: Ticket,
      activeClass: 'text-[#5D87FF] bg-[#EEF4FF]',
      inactiveClass: 'text-slate-500 hover:text-[#5D87FF]',
      show: true,
      badge: unreadCount.value > 0,
      badgeCount: Math.min(unreadCount.value, 99),
    });
  }

  // Profil / Karyawan — admin lihat karyawan, user lihat my-assets/profil
  if (isAuthenticated.value) {
    const profilePath = (isAdmin.value || isSuperAdmin.value) ? '/karyawan' : '/my-assets';
    items.push({
      name: 'Profil',
      path: profilePath,
      icon: User,
      activeClass: 'text-[#5D87FF] bg-[#EEF4FF]',
      inactiveClass: 'text-slate-500 hover:text-[#5D87FF]',
      show: true,
    });
  }

  // Menu lainnya
  items.push({
    name: 'Lainnya',
    path: '#more',
    icon: MoreHorizontal,
    activeClass: 'text-[#5D87FF] bg-[#EEF4FF]',
    inactiveClass: 'text-slate-500 hover:text-[#5D87FF]',
    show: true,
    isMore: true,
  });

  return items.filter(Boolean);
});

// Helpers izin lokal (mencegah import berlebihan)
function hasPermissionLocal(key) {
  return useAuth().hasPermission(key);
}

function isActive(path) {
  if (path === '#more') return false;
  return route.path === path || route.path.startsWith(path + '/');
}

// Item di dalam drawer "Lainnya"
const moreItems = computed(() => {
  const role = user.value?.role || 'user';
  const items = [];

  if (isAdmin.value || isSuperAdmin.value) {
    items.push(
      { name: 'Users', path: '/users', icon: Users },
      { name: 'Submissions', path: '/submissions', icon: ClipboardList },
      { name: 'Logs', path: '/logs', icon: FileText },
    );
  }

  if (isSuperAdmin.value) {
    items.push(
      { name: 'Export', path: '/export', icon: Package },
      { name: 'Database', path: '/database', icon: Shield },
    );
  }

  items.push({ name: 'My Assets', path: '/my-assets', icon: Package });

  return items;
});
</script>

<template>
  <!-- Bottom Nav — muncul di mobile + tablet (<1024px), tersembunyi di desktop -->
  <nav
    v-if="isAuthenticated"
    role="navigation"
    aria-label="Navigasi Utama Mobile"
    class="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none shadow-lg shadow-slate-900/5"
  >
    <template v-for="item in coreNavItems" :key="item.path">
      <!-- Tombol biasa -->
      <RouterLink
        v-if="!item.isMore"
        :to="item.path"
        :aria-label="item.name"
        class="relative flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl min-w-[56px] min-h-[48px] touch-manipulation active:scale-90 transition-all duration-150"
        :class="[
          isActive(item.path)
            ? [item.activeClass, 'font-semibold']
            : [item.inactiveClass]
        ]"
      >
        <component
          :is="item.icon"
          class="w-5 h-5 shrink-0 transition-transform duration-150"
          :class="isActive(item.path) ? 'scale-110' : 'scale-100'"
        />
        <span class="text-[11px] leading-tight shrink-0">{{ item.name }}</span>

        <!-- Badge notifikasi angka -->
        <span
          v-if="item.badge && item.badgeCount !== undefined && item.badgeCount > 0"
          class="absolute -top-0.5 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#2563EB] px-1 text-[9.5px] font-bold text-white shadow-2xs"
          >{{ item.badgeCount > 9 ? '9+' : item.badgeCount }}</span
        >
      </RouterLink>

      <!-- Tombol "Lainnya" (buka drawer) -->
      <button
        v-else
        type="button"
        :aria-label="item.name"
        @click="$emit('toggle-more')"
        class="relative flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl min-w-[56px] min-h-[48px] touch-manipulation active:scale-90 transition-all duration-150"
        :class="[
          isActive(item.path)
            ? [item.activeClass, 'font-semibold']
            : [item.inactiveClass]
        ]"
      >
        <MoreHorizontal class="w-5 h-5 shrink-0" />
        <span class="text-[11px] leading-tight shrink-0">{{ item.name }}</span>
      </button>
    </template>
  </nav>

  <!-- Drawer "Lainnya" -> slide-up dari bawah -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showMoreDrawer"
        class="lg:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
        @click="$emit('close-more')"
      />
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="showMoreDrawer"
        class="lg:hidden fixed bottom-0 left-0 right-0 z-[61] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <!-- Handle -->
        <div class="flex justify-center py-3">
          <div class="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        <div class="px-5 pb-3">
          <h3 class="text-base font-semibold text-slate-900 dark:text-white">Menu Lainnya</h3>
        </div>

        <div class="px-3 pb-6 grid grid-cols-4 gap-2">
          <RouterLink
            v-for="item in moreItems"
            :key="item.path"
            :to="item.path"
            @click="$emit('close-more')"
            class="flex flex-col items-center gap-1.5 p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <component :is="item.icon" class="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <span class="text-[11px] text-slate-600 dark:text-slate-400 text-center leading-tight">
              {{ item.name }}
            </span>
          </RouterLink>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  props: {
    showMoreDrawer: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['toggle-more', 'close-more'],
};
</script>

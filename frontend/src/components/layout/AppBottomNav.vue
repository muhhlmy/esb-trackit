<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
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
  X,
} from 'lucide-vue-next';

const route = useRoute();
const { hasPermission, isAdmin } = useAuth();
const isLainnyaOpen = ref(false);
const dashboardTo = computed(() => (isAdmin.value ? '/dashboard' : '/my-assets'));

const items = computed(() =>
  [
    { to: dashboardTo, label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard' },
    { to: '/tickets', label: 'Tiket', icon: Ticket, permission: 'tickets' },
    { to: '/assets', label: 'Aset', icon: Laptop, permission: 'assets' },
  ].filter((item) => !item.permission || hasPermission(item.permission)),
);

const lainnyaItems = computed(() =>
  [
    { to: '/submissions', label: 'Pengajuan', icon: FilePen, permission: 'submissions' },
    { to: '/', label: 'Help Center', icon: Home, permission: null },
    { to: '/my-assets', label: 'Aset Saya', icon: Laptop, permission: 'my_assets' },
    { to: '/users', label: 'Pengguna', icon: Users, permission: 'users' },
    { to: '/karyawan', label: 'Karyawan', icon: UserSearch, permission: 'karyawan' },
    { to: '/logs', label: 'Log Aktivitas', icon: ScrollText, permission: 'logs' },
    { to: '/faqs', label: 'Atur FAQ', icon: HelpCircle, permission: 'users' },
    { to: '/admin/cases', label: 'Admin CMS', icon: FilePen, permission: 'users' },
  ].filter((item) => !item.permission || hasPermission(item.permission)),
);

watch(
  () => route.fullPath,
  () => {
    isLainnyaOpen.value = false;
  },
);
</script>

<template>
  <nav
    role="navigation"
    aria-label="Navigasi Mobile Bawah"
    class="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/90 bg-white/95 backdrop-blur-lg px-2 py-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none shadow-lg shadow-slate-900/5 min-h-[56px]"
  >
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      :aria-label="item.label"
      class="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl text-slate-500 hover:text-slate-900 transition-colors min-w-[52px] min-h-[44px] touch-manipulation active:scale-95"
      active-class="text-[#5D87FF] font-bold"
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
      :class="isLainnyaOpen ? 'text-[#5D87FF] font-bold' : 'text-slate-500 hover:text-slate-900'"
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
      class="lg:hidden fixed left-2 right-2 bottom-[64px] z-50 rounded-2xl bg-white border border-slate-200 shadow-2xl shadow-slate-900/15 p-2 animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <div class="flex items-center justify-between px-2 pt-1 pb-2">
        <span class="text-[11px] font-black uppercase tracking-wider text-slate-400">Menu Lainnya</span>
        <button
          type="button"
          aria-label="Tutup menu"
          @click="isLainnyaOpen = false"
          class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
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
          class="flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-[#5D87FF] transition-colors text-center active:scale-95"
          active-class="text-[#5D87FF] bg-[#5D87FF]/5 font-bold"
        >
          <component :is="item.icon" class="w-5 h-5" />
          <span class="text-[10px] font-semibold leading-tight">{{ item.label }}</span>
        </RouterLink>
      </div>
    </div>
  </Teleport>
</template>

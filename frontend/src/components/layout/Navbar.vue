<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useCases } from '@/composables/useCases';
import { useAuth } from '@/composables/useAuth';
import { useTheme } from '@/composables/useTheme';
import {
  Search,
  FolderOpen,
  FileText,
  BarChart3,
  Sun,
  Moon,
  LogIn,
  LogOut,
  UserCheck,
  X,
  LayoutDashboard,
  HelpCircle,
  ShieldCheck
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const { cases, searchQuery, setSearch, clearSearch } = useCases();
const { isAuthenticated, isCrudUnlocked, currentUser, logout } = useAuth();
const { isDark, toggleTheme } = useTheme();

const searchInputRef = ref(null);

function handleLogoClick() {
  router.push('/');
}

function onSearchInput(e) {
  setSearch(e.target.value);
  if (route.path !== '/cases' && route.path !== '/') {
    router.push('/cases');
  }
}

function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    searchInputRef.value?.focus();
  } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
    e.preventDefault();
    searchInputRef.value?.focus();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <header class="sticky top-0 z-40 w-full border-b border-[#E2E8F0] bg-white dark:bg-slate-900 transition-colors shadow-2xs">
    <div class="max-w-[1560px] mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4">
      
      <!-- Brand Logo & Main Links -->
      <div class="flex items-center gap-6">
        <button
          @click="handleLogoClick"
          class="flex items-center gap-2.5 group focus:outline-none select-none text-left cursor-pointer"
        >
          <img src="/ESB Logo Only.svg" alt="ESB Logo" class="h-7 w-auto object-contain group-hover:scale-105 transition-transform" />
          <div class="flex flex-col">
            <div class="flex items-center gap-1.5">
              <span class="font-extrabold text-[#0F172A] dark:text-white tracking-tight text-sm group-hover:text-[#2563EB] transition-colors">ESB TrackIT</span>
              <span class="px-1.5 py-0.2 text-[9.5px] font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#2563EB] dark:bg-slate-800 dark:text-blue-400 rounded border border-[#2563EB]/20">
                Help Center
              </span>
            </div>
            <span class="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 -mt-0.5 hidden sm:inline">Pusat Bantuan & Incident Playbook</span>
          </div>
        </button>

        <!-- Navigation Tabs Nav -->
        <nav class="hidden lg:flex items-center gap-1 pl-4 border-l border-[#E2E8F0] dark:border-slate-800">
          <RouterLink
            to="/"
            class="px-3 py-1.5 rounded-lg text-xs font-bold text-[#2A3547] dark:text-slate-300 hover:text-[#2563EB] hover:bg-[#EFF6FF] dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
            exact-active-class="bg-[#EFF6FF] text-[#2563EB] dark:bg-slate-800 dark:text-blue-400 font-extrabold"
          >
            <HelpCircle class="w-4 h-4 text-[#2563EB]" />
            <span>Beranda KB</span>
          </RouterLink>

          <RouterLink
            to="/cases"
            class="px-3 py-1.5 rounded-lg text-xs font-bold text-[#2A3547] dark:text-slate-300 hover:text-[#2563EB] hover:bg-[#EFF6FF] dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
            active-class="bg-[#EFF6FF] text-[#2563EB] dark:bg-slate-800 dark:text-blue-400 font-extrabold"
          >
            <FolderOpen class="w-4 h-4" />
            <span>Cases & SOPs</span>
            <span class="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#E2E8F0] text-[#475569] dark:bg-slate-700 dark:text-slate-300">
              {{ cases.length }}
            </span>
          </RouterLink>

          <RouterLink
            to="/templates"
            class="px-3 py-1.5 rounded-lg text-xs font-bold text-[#2A3547] dark:text-slate-300 hover:text-[#2563EB] hover:bg-[#EFF6FF] dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
            active-class="bg-[#EFF6FF] text-[#2563EB] dark:bg-slate-800 dark:text-blue-400 font-extrabold"
          >
            <FileText class="w-4 h-4" />
            <span>Templates Hub</span>
          </RouterLink>

          <RouterLink
            to="/analytics"
            class="px-3 py-1.5 rounded-lg text-xs font-bold text-[#2A3547] dark:text-slate-300 hover:text-[#2563EB] hover:bg-[#EFF6FF] dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
            active-class="bg-[#EFF6FF] text-[#2563EB] dark:bg-slate-800 dark:text-blue-400 font-extrabold"
          >
            <BarChart3 class="w-4 h-4" />
            <span>Analitik KB</span>
          </RouterLink>

          <RouterLink
            v-if="isCrudUnlocked"
            to="/admin/cases"
            class="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 transition-all flex items-center gap-1.5"
            active-class="bg-amber-100 dark:bg-amber-900/50 font-extrabold"
          >
            <ShieldCheck class="w-4 h-4 text-amber-600" />
            <span>Admin CMS</span>
          </RouterLink>
        </nav>
      </div>

      <!-- Right Header Actions Bar -->
      <div class="flex items-center gap-3">
        
        <!-- Live Search Box -->
        <div class="relative hidden sm:block w-44 md:w-56 lg:w-64">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B] dark:text-slate-400 pointer-events-none" />
          <input
            ref="searchInputRef"
            type="text"
            :value="searchQuery"
            @input="onSearchInput"
            placeholder="Cari SOP, playbook..."
            class="w-full bg-[#F8FAFC] dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-800 rounded-lg pl-9 pr-9 py-1.5 text-xs text-[#0F172A] dark:text-white placeholder-[#94A3B8] focus:bg-white focus:border-[#2563EB] focus:outline-none transition-all shadow-2xs"
          />
          <div class="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
            <button
              v-if="searchQuery"
              @click="clearSearch"
              class="p-0.5 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white rounded"
            >
              <X class="w-3.5 h-3.5" />
            </button>
            <kbd v-else class="px-1.5 py-0.5 text-[9px] font-mono text-[#64748B] dark:text-slate-400 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded shadow-2xs">
              /
            </kbd>
          </div>
        </div>

        <!-- IT Dashboard Switch Button -->
        <RouterLink
          to="/dashboard"
          class="inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <LayoutDashboard class="w-3.5 h-3.5" />
          <span>IT Dashboard</span>
        </RouterLink>

        <!-- User Session / Login Button -->
        <div class="flex items-center">
          <button
            v-if="!isAuthenticated"
            @click="router.push('/login')"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#2A3547] dark:text-slate-200 hover:bg-[#F8FAFC] transition-all cursor-pointer"
          >
            <LogIn class="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Masuk</span>
          </button>

          <div v-else class="flex items-center gap-1.5">
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFF6FF] dark:bg-indigo-950/40 border border-[#2563EB]/20 text-xs">
              <UserCheck class="w-3.5 h-3.5 text-[#2563EB]" />
              <span class="font-bold text-[#2563EB] dark:text-indigo-300">{{ currentUser?.nama || currentUser?.username || 'User' }}</span>
            </div>
            <button
              @click="logout"
              class="p-1.5 rounded-lg text-[#64748B] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Theme Toggle Button -->
        <button
          @click="toggleTheme"
          class="p-1.5 rounded-lg text-[#64748B] hover:text-[#2563EB] dark:text-slate-400 dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Toggle Light/Dark Theme"
        >
          <Sun v-if="isDark" class="w-4 h-4 text-amber-400" />
          <Moon v-else class="w-4 h-4 text-[#2563EB]" />
        </button>

      </div>

    </div>
  </header>
</template>

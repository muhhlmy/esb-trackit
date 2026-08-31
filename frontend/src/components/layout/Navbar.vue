<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useCases } from '@/composables/useCases';
import { useAuth } from '@/composables/useAuth';
import { useTheme } from '@/composables/useTheme';
import { 
  Search, 
  Plus, 
  Moon, 
  Sun, 
  FileText, 
  BarChart3, 
  FolderOpen, 
  UserCheck, 
  LogIn, 
  LogOut,
  X 
} from 'lucide-vue-next';

const router = useRouter();
const { cases, searchQuery, setSearch, clearSearch } = useCases();
const { isCrudUnlocked, isAuthenticated, currentUser, registerLogoClick, isLoginModalOpen, logout } = useAuth();
const { isDark, toggleTheme } = useTheme();

const searchInputRef = ref(null);

function handleKeydown(e) {
  if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault();
    searchInputRef.value?.focus();
  }
}

function onSearchInput(e) {
  setSearch(e.target.value);
  if (router.currentRoute.value.path !== '/cases') {
    router.push('/cases');
  }
}

function handleLogoClick() {
  registerLogoClick();
  if (router.currentRoute.value.path !== '/') {
    router.push('/');
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
  <header class="sticky top-0 z-40 w-full border-b border-[#e2e2e4] dark:border-slate-800 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md transition-colors">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
      
      <!-- Brand & Navigation -->
      <div class="flex items-center gap-6">
        <button
          @click="handleLogoClick"
          class="flex items-center gap-3 group focus:outline-none select-none text-left cursor-pointer"
          title="Kembali ke Beranda (Klik 5x untuk toggle mode Admin/CRUD)"
        >
          <div class="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-[#f2f1ff] dark:bg-indigo-500/10 border border-[#c4c5d9] dark:border-indigo-500/20 group-hover:scale-105 transition-transform">
            <img src="/ESB Case.svg" alt="ESB Case" class="w-6 h-6 object-contain" />
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-[#1a1c1d] dark:text-slate-100 group-hover:text-[#0040e5] dark:group-hover:text-indigo-400 transition-colors tracking-tight text-base">ESB Case</span>
              <span 
                v-if="isCrudUnlocked" 
                class="px-1.5 py-0.2 text-[10px] uppercase font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded"
              >
                Admin
              </span>
            </div>
            <p class="text-[10px] text-[#575d7a] dark:text-slate-400 -mt-0.5 hidden sm:block">Incident & Playbook</p>
          </div>
        </button>

        <!-- Desktop Navigation Tabs -->
        <nav class="hidden md:flex items-center gap-1">
          <RouterLink
            to="/cases"
            class="px-3 py-1.5 rounded-lg text-xs font-medium text-[#575d7a] dark:text-slate-300 hover:text-[#0040e5] dark:hover:text-white hover:bg-[#f3f3f5] dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
            active-class="bg-[#f2f1ff] text-[#0040e5] font-semibold dark:bg-slate-800 dark:text-indigo-400"
          >
            <FolderOpen class="w-3.5 h-3.5" />
            Cases
            <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-[#edeef0] dark:bg-slate-800 text-[#575d7a] dark:text-slate-400 border border-[#e2e2e4] dark:border-slate-700/50">
              {{ cases.length }}
            </span>
          </RouterLink>

          <RouterLink
            to="/analytics"
            class="px-3 py-1.5 rounded-lg text-xs font-medium text-[#575d7a] dark:text-slate-300 hover:text-[#0040e5] dark:hover:text-white hover:bg-[#f3f3f5] dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
            active-class="bg-[#f2f1ff] text-[#0040e5] font-semibold dark:bg-slate-800 dark:text-indigo-400"
          >
            <BarChart3 class="w-3.5 h-3.5" />
            Analytics
          </RouterLink>

          <!-- Admin CMS Link -->
          <RouterLink
            v-if="isCrudUnlocked"
            to="/admin"
            class="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors flex items-center gap-1.5"
            active-class="bg-amber-100/80 dark:bg-amber-900/40 font-bold"
          >
            <FileText class="w-3.5 h-3.5 text-amber-600" />
            <span>DocEditor CMS</span>
          </RouterLink>
        </nav>
      </div>

      <!-- Right Controls: Global Search & Actions -->
      <div class="flex items-center gap-3">
        
        <!-- Global Search Bar -->
        <div class="relative hidden sm:block w-48 md:w-64 lg:w-80">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#575d7a] dark:text-slate-400" />
          <input
            ref="searchInputRef"
            type="text"
            :value="searchQuery"
            @input="onSearchInput"
            placeholder="Cari case, SOP, command..."
            class="w-full bg-[#f3f3f5] dark:bg-slate-900 border border-[#e2e2e4] dark:border-slate-800 rounded-xl pl-9 pr-12 py-1.5 text-xs text-[#1a1c1d] dark:text-slate-100 placeholder-[#64748b] dark:placeholder-slate-500 focus:outline-none focus:border-[#0040e5] focus:ring-1 focus:ring-[#0040e5] transition-all shadow-xs"
          />
          <div class="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              v-if="searchQuery"
              @click="clearSearch"
              class="p-0.5 text-[#575d7a] hover:text-[#1a1c1d] dark:text-slate-400 dark:hover:text-white rounded"
            >
              <X class="w-3.5 h-3.5" />
            </button>
            <kbd v-else class="px-1.5 py-0.5 text-[10px] font-mono text-[#575d7a] dark:text-slate-400 bg-white dark:bg-slate-800 border border-[#e2e2e4] dark:border-slate-700 rounded shadow-2xs">
              /
            </kbd>
          </div>
        </div>

        <!-- Open DocEditor Button (visible when unlocked) -->
        <RouterLink
          v-if="isCrudUnlocked"
          to="/admin/editor"
          class="inline-flex items-center gap-1.5 bg-[#0040e5] hover:bg-[#0034bf] text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-md shadow-[#0040e5]/20 transition-all cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">DocEditor</span>
        </RouterLink>

        <!-- Ticketing Portal Log In / User Session -->
        <div class="flex items-center">
          <button
            v-if="!isAuthenticated"
            @click="isLoginModalOpen = true"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0040e5] hover:bg-[#0034bf] text-white shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95"
            title="Log in ke Ticketing & Helpdesk Portal"
          >
            <LogIn class="w-3.5 h-3.5" />
            <span>Log In</span>
          </button>

          <div v-else class="flex items-center gap-1.5">
            <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#f2f1ff] dark:bg-indigo-950/40 border border-[#c4c5d9] dark:border-indigo-500/30 text-xs">
              <UserCheck class="w-3.5 h-3.5 text-[#0040e5] dark:text-indigo-400" />
              <span class="font-semibold text-[#0040e5] dark:text-indigo-300">{{ currentUser?.name || currentUser?.username || 'Employee' }}</span>
            </div>
            <button
              @click="logout"
              class="p-1.5 rounded-lg text-[#575d7a] hover:text-rose-600 hover:bg-[#f3f3f5] dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Theme Toggle -->
        <button
          @click="toggleTheme"
          class="p-2 rounded-xl text-[#575d7a] hover:text-[#0040e5] dark:text-slate-400 dark:hover:text-white hover:bg-[#f3f3f5] dark:hover:bg-slate-800 transition-colors"
          title="Toggle Theme"
        >
          <Sun v-if="isDark" class="w-4 h-4 text-amber-400" />
          <Moon v-else class="w-4 h-4 text-[#0040e5]" />
        </button>

      </div>

    </div>
  </header>
</template>

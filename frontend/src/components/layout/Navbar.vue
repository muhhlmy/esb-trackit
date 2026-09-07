<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useCases } from '@/composables/useCases';
import { useAuth } from '@/composables/useAuth';
import { useTheme } from '@/composables/useTheme';
import { useLanguage } from '@/composables/useLanguage';
import {
  Search,
  Sun,
  Moon,
  LogIn,
  LogOut,
  ShieldCheck,
  Ticket,
  LayoutDashboard,
  ChevronDown,
  Laptop,
  Globe
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const { setSearch } = useCases();
const { isAuthenticated, user, isAdmin, isSuperAdmin, hasPermission, logout } = useAuth();
const { isDark, toggleTheme } = useTheme();
const { currentLang, setLanguage, t } = useLanguage();

const isProfileOpen = ref(false);

function handleLogoClick() {
  router.push('/');
}

function toggleProfileMenu() {
  isProfileOpen.value = !isProfileOpen.value;
}

function closeProfileMenu() {
  isProfileOpen.value = false;
}

function handleLogout() {
  closeProfileMenu();
  logout();
  router.push('/login');
}

function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    router.push('/cases');
  } else if (e.key === 'Escape') {
    closeProfileMenu();
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
  <header class="sticky top-0 z-40 w-full border-b border-[#E5EAEF] dark:border-slate-800 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md text-[#0F172A] dark:text-white transition-colors duration-200 px-4 sm:px-6 lg:px-8 select-none">
    <div class="max-w-[1200px] mx-auto w-full h-16 flex items-center justify-between gap-4">
      
      <!-- Left Branding: ESB TrackIT Help Center -->
      <div class="flex items-center gap-4">
        <button
          @click="handleLogoClick"
          class="flex items-center gap-2.5 group focus:outline-none select-none text-left cursor-pointer"
        >
          <img src="/ESB Logo Only.svg" alt="ESB Logo" class="h-5 w-auto object-contain group-hover:scale-105 transition-transform" />
          <div class="flex items-center gap-2">
            <span class="font-extrabold text-[#0F172A] dark:text-white tracking-tight text-xs group-hover:text-[#5D87FF] transition-colors">ESB TrackIT</span>
            <span class="text-[10px] text-[#64748B] dark:text-slate-400 font-extrabold uppercase tracking-wider bg-[#F1F5F9] dark:bg-slate-800 px-2 py-0.5 rounded border border-[#E5EAEF] dark:border-slate-700/80">
              Help Center
            </span>
          </div>
        </button>
      </div>

      <!-- Right Actions: Quick Search, Auth Profile / Sign In, Theme Toggle -->
      <div class="flex items-center gap-3">
        
        <!-- Search Trigger Hint -->
        <RouterLink
          to="/cases"
          class="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/80 border border-[#E5EAEF] dark:border-slate-700 text-[#64748B] dark:text-slate-400 text-xs hover:border-[#5D87FF] transition-all"
        >
          <Search class="w-3.5 h-3.5" />
          <span>{{ t('search_placeholder_nav', 'Cari panduan & artikel...') }}</span>
          <kbd class="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-slate-700 rounded border border-[#E5EAEF] dark:border-slate-600 text-[#64748B] dark:text-slate-300">Ctrl K</kbd>
        </RouterLink>

        <!-- Theme Switcher -->
        <button
          @click="toggleTheme"
          class="p-2 rounded-xl text-[#64748B] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer"
          :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          <Sun v-if="isDark" class="w-4 h-4 text-amber-400" />
          <Moon v-else class="w-4 h-4" />
        </button>

        <!-- AUTH STATE DEPENDENT PROFILE / SIGN IN BUTTON -->
        
        <!-- 1. VISITOR / NOT LOGGED IN: Sign In Button -->
        <template v-if="!isAuthenticated">
          <RouterLink
            :to="{ path: '/login', query: { redirect: route.fullPath } }"
            class="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#5D87FF] hover:bg-[#4570EA] text-white shadow-md shadow-[#5D87FF]/20 hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogIn class="w-3.5 h-3.5" />
            <span>{{ t('sign_in', 'Sign In') }}</span>
          </RouterLink>
        </template>

        <!-- 2. AUTHENTICATED USER / ADMIN: Identity Dropdown -->
        <template v-else>
          <div class="relative">
            <button
              @click="toggleProfileMenu"
              class="flex items-center gap-2 p-1.5 pr-2.5 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer text-xs group"
            >
              <!-- Avatar Circle -->
              <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-[#5D87FF] to-[#3662E3] text-white text-[11px] font-black flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                {{ (user?.nama || user?.name) ? (user?.nama || user?.name).charAt(0).toUpperCase() : 'U' }}
              </div>
              
              <span class="font-semibold text-slate-800 dark:text-slate-200 max-w-[130px] truncate hidden sm:inline-block tracking-tight">
                {{ user?.nama || user?.name || 'User' }}
              </span>

              <!-- Admin Indicator Badge -->
              <span v-if="isAdmin" class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 dark:border-amber-400/20">
                <ShieldCheck class="w-2.5 h-2.5" />
                <span>Admin</span>
              </span>

              <ChevronDown class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200" :class="isProfileOpen ? 'rotate-180 text-[#5D87FF]' : ''" />
            </button>

            <!-- Profile Dropdown Menu -->
            <div
              v-if="isProfileOpen"
              class="absolute right-0 mt-2.5 w-60 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xl shadow-slate-900/10 p-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <!-- User Identity Header -->
              <div class="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 mb-1 space-y-0.5">
                <p class="font-extrabold text-xs text-slate-900 dark:text-white truncate tracking-tight">{{ user?.nama || user?.name }}</p>
                <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate leading-tight">{{ user?.email }}</p>
                <div class="pt-1.5 flex items-center gap-1">
                  <span
                    class="px-2 py-0.5 rounded-md text-[9.5px] font-black tracking-wider uppercase inline-block"
                    :class="isAdmin ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'"
                  >
                    Role: {{ user?.role || 'User' }}
                  </span>
                </div>
              </div>

              <!-- Menu Items -->
              <div class="space-y-0.5 py-1">
                <!-- 1. ADMIN / SUPER ADMIN ROLE: Dashboard only -->
                <template v-if="isAdmin">
                  <RouterLink
                    to="/dashboard"
                    @click="closeProfileMenu"
                    class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white transition-all duration-150 group"
                  >
                    <LayoutDashboard class="w-4 h-4 text-[#5D87FF] group-hover:scale-110 transition-transform" />
                    <span>{{ t('dashboard', 'Dashboard') }}</span>
                  </RouterLink>
                </template>

                <!-- 2. REGULAR USER ROLE: My Asset & My Tickets -->
                <template v-else>
                  <RouterLink
                    to="/my-assets"
                    @click="closeProfileMenu"
                    class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white transition-all duration-150 group"
                  >
                    <Laptop class="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:scale-110 transition-transform" />
                    <span>{{ t('my_asset', 'My Asset') }}</span>
                  </RouterLink>

                  <RouterLink
                    to="/tickets"
                    @click="closeProfileMenu"
                    class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white transition-all duration-150 group"
                  >
                    <Ticket class="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:scale-110 transition-transform" />
                    <span>{{ t('my_tickets', 'My Tickets') }}</span>
                  </RouterLink>
                </template>
              </div>

              <!-- Sign Out -->
              <div class="pt-1 mt-0.5 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  @click="handleLogout"
                  class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 transition-all duration-150 cursor-pointer text-left group"
                >
                  <LogOut class="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>{{ t('sign_out', 'Sign Out') }}</span>
                </button>
              </div>
            </div>

            <!-- Click Outside Overlay -->
            <div
              v-if="isProfileOpen"
              @click="closeProfileMenu"
              class="fixed inset-0 z-40"
            ></div>
          </div>
        </template>

      </div>

    </div>
  </header>

  <!-- Floating Bottom-Right Language Switcher Pill -->
  <div
    v-if="route.path === '/'"
    class="fixed bottom-6 right-6 z-50 flex items-center p-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-[#E5EAEF] dark:border-slate-800 shadow-xl shadow-slate-900/15 text-xs font-black transition-all hover:scale-[1.03] select-none"
  >
    <div class="flex items-center gap-1.5 pl-2 pr-1.5 text-[#5D87FF] shrink-0">
      <Globe class="w-4 h-4" />
    </div>
    <div class="flex items-center p-0.5 rounded-full bg-[#F1F5F9] dark:bg-slate-800">
      <button
        @click="setLanguage('id')"
        class="px-2.5 py-1 rounded-full transition-all cursor-pointer text-[11px]"
        :class="currentLang === 'id' ? 'bg-[#5D87FF] text-white shadow-2xs' : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'"
        title="Bahasa Indonesia"
      >
        ID
      </button>
      <button
        @click="setLanguage('en')"
        class="px-2.5 py-1 rounded-full transition-all cursor-pointer text-[11px]"
        :class="currentLang === 'en' ? 'bg-[#5D87FF] text-white shadow-2xs' : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'"
        title="English"
      >
        EN
      </button>
    </div>
  </div>
</template>

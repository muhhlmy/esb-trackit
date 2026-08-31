<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute, RouterLink } from 'vue-router';
import { useCases } from '@/composables/useCases';
import { useAuth } from '@/composables/useAuth';
import { useTheme } from '@/composables/useTheme';
import {
  Search,
  Sun,
  Moon,
  LogIn,
  LogOut,
  User,
  ShieldCheck,
  Ticket,
  LayoutDashboard,
  ChevronDown
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const { setSearch } = useCases();
const { isAuthenticated, user, isAdmin, isSuperAdmin, logout } = useAuth();
const { isDark, toggleTheme } = useTheme();

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
          <span>Cari panduan SOP...</span>
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
            <span>Sign In</span>
          </RouterLink>
        </template>

        <!-- 2. AUTHENTICATED USER / ADMIN: Identity Dropdown -->
        <template v-else>
          <div class="relative">
            <button
              @click="toggleProfileMenu"
              class="flex items-center gap-2 p-1 pl-2 rounded-xl border border-[#E5EAEF] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/80 hover:bg-[#F1F5F9] dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
            >
              <!-- Avatar Circle -->
              <div class="w-6 h-6 rounded-full bg-[#5D87FF] text-white text-[11px] font-extrabold flex items-center justify-center shadow-2xs">
                {{ user?.name ? user.name.charAt(0).toUpperCase() : 'U' }}
              </div>
              
              <span class="font-bold text-[#0F172A] dark:text-slate-200 max-w-[120px] truncate hidden sm:inline-block">
                {{ user?.name || 'User' }}
              </span>

              <!-- Admin Indicator Badge -->
              <span v-if="isAdmin" class="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <ShieldCheck class="w-2.5 h-2.5" />
                Admin
              </span>

              <ChevronDown class="w-3.5 h-3.5 text-[#64748B] dark:text-slate-400" />
            </button>

            <!-- Profile Dropdown Menu -->
            <div
              v-if="isProfileOpen"
              class="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 shadow-xl py-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <!-- User Identity Header -->
              <div class="px-4 py-2.5 border-b border-[#E5EAEF] dark:border-slate-800 space-y-0.5">
                <p class="font-extrabold text-[#0F172A] dark:text-white truncate">{{ user?.name }}</p>
                <p class="text-[11px] text-[#64748B] dark:text-slate-400 truncate">{{ user?.email }}</p>
                <div class="pt-1 flex items-center gap-1">
                  <span
                    class="px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase inline-block"
                    :class="isAdmin ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'"
                  >
                    Role: {{ user?.role || 'User' }}
                  </span>
                </div>
              </div>

              <!-- Menu Items -->
              <div class="py-1">
                <RouterLink
                  to="/tickets"
                  @click="closeProfileMenu"
                  class="flex items-center gap-2 px-4 py-2 text-[#334155] dark:text-slate-300 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:text-[#5D87FF] transition-colors"
                >
                  <Ticket class="w-4 h-4 text-[#5D87FF]" />
                  <span>My Tickets</span>
                </RouterLink>

                <RouterLink
                  to="/profile"
                  @click="closeProfileMenu"
                  class="flex items-center gap-2 px-4 py-2 text-[#334155] dark:text-slate-300 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 hover:text-[#5D87FF] transition-colors"
                >
                  <User class="w-4 h-4 text-[#64748B]" />
                  <span>My Profile</span>
                </RouterLink>

                <!-- Admin CMS Portal Link for Admin users -->
                <RouterLink
                  v-if="isAdmin"
                  to="/admin/cases"
                  @click="closeProfileMenu"
                  class="flex items-center gap-2 px-4 py-2 text-amber-700 dark:text-amber-400 font-bold hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                >
                  <LayoutDashboard class="w-4 h-4 text-amber-600" />
                  <span>Admin Portal</span>
                </RouterLink>
              </div>

              <!-- Sign Out -->
              <div class="pt-1 border-t border-[#E5EAEF] dark:border-slate-800">
                <button
                  @click="handleLogout"
                  class="w-full flex items-center gap-2 px-4 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold transition-colors text-left cursor-pointer"
                >
                  <LogOut class="w-4 h-4" />
                  <span>Sign Out</span>
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
</template>

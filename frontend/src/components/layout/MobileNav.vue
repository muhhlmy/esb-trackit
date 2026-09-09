<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { Home, Ticket, LogIn, LayoutDashboard } from 'lucide-vue-next'

const router = useRouter()
const { isAuthenticated, isAdmin } = useAuth()
</script>

<template>
  <nav
    role="navigation"
    aria-label="Navigasi Mobile Bawah"
    class="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg px-2 py-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none shadow-lg shadow-slate-900/5 min-h-[56px]"
  >
    <RouterLink
      to="/"
      aria-label="Halaman Beranda"
      class="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors min-w-[56px] min-h-[44px] touch-manipulation active:scale-95"
      active-class="text-[#5D87FF] dark:text-indigo-400 font-bold"
    >
      <Home class="w-4 h-4" />
      <span class="text-[10px]">Home</span>
    </RouterLink>

    <!-- Authenticated Nav Links -->
    <template v-if="isAuthenticated">
      <RouterLink
        to="/tickets"
        aria-label="Daftar Tiket"
        class="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors min-w-[56px] min-h-[44px] touch-manipulation active:scale-95"
        active-class="text-[#5D87FF] dark:text-indigo-400 font-bold"
      >
        <Ticket class="w-4 h-4" />
        <span class="text-[10px]">Tickets</span>
      </RouterLink>

      <RouterLink
        :to="isAdmin ? '/dashboard' : '/my-assets'"
        aria-label="Dashboard"
        class="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors min-w-[56px] min-h-[44px] touch-manipulation active:scale-95"
        active-class="text-[#5D87FF] dark:text-indigo-400 font-bold"
      >
        <LayoutDashboard class="w-4 h-4" />
        <span class="text-[10px]">Dashboard</span>
      </RouterLink>
    </template>

    <!-- Visitor Sign In Link -->
    <button
      v-else
      type="button"
      aria-label="Masuk ke Akun"
      @click="router.push('/login')"
      class="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl text-[#5D87FF] font-bold hover:text-[#4570EA] transition-colors cursor-pointer min-w-[56px] min-h-[44px] touch-manipulation active:scale-95"
    >
      <LogIn class="w-4 h-4" />
      <span class="text-[10px]">Sign In</span>
    </button>
  </nav>
</template>

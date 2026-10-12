<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useLanguage } from '@/composables/useLanguage'
import { Home, Ticket, LogIn, LayoutDashboard } from 'lucide-vue-next'

const router = useRouter()
const { isAuthenticated, isAdmin } = useAuth()
const { currentLang } = useLanguage()
</script>

<template>
  <nav
    role="navigation"
    aria-label="Navigasi Mobile Bawah"
    class="clean-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg px-2 py-1 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none shadow-none min-h-[48px]"
  >
    <RouterLink
      to="/"
      :aria-label="currentLang === 'en' ? 'Home Page' : 'Halaman Beranda'"
      class="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors min-w-[56px] min-h-[44px] touch-manipulation"
      active-class="bg-[#EAF1FC] text-[#234B83] dark:text-indigo-400 font-semibold"
    >
      <Home class="w-4 h-4" />
      <span class="text-[10.5px] sm:text-[11px] font-medium leading-tight">{{ currentLang === 'en' ? 'Home' : 'Beranda' }}</span>
    </RouterLink>

    <!-- Authenticated Nav Links -->
    <template v-if="isAuthenticated">
      <RouterLink
        to="/tickets"
        :aria-label="currentLang === 'en' ? 'Ticket List' : 'Daftar Tiket'"
        class="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors min-w-[56px] min-h-[44px] touch-manipulation"
        active-class="text-[#333333] dark:text-indigo-400 font-bold"
      >
        <Ticket class="w-4 h-4" />
        <span class="text-[10.5px] sm:text-[11px] font-medium leading-tight">{{ currentLang === 'en' ? 'Tickets' : 'Tiket' }}</span>
      </RouterLink>

      <RouterLink
        :to="isAdmin ? '/dashboard' : '/my-assets'"
        :aria-label="currentLang === 'en' ? 'Dashboard' : 'Dashboard'"
        class="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors min-w-[56px] min-h-[44px] touch-manipulation"
        active-class="text-[#333333] dark:text-indigo-400 font-bold"
      >
        <LayoutDashboard class="w-4 h-4" />
        <span class="text-[10.5px] sm:text-[11px] font-medium leading-tight">Dashboard</span>
      </RouterLink>
    </template>

    <!-- Visitor Sign In Link -->
    <button
      v-else
      type="button"
      :aria-label="currentLang === 'en' ? 'Sign In to Account' : 'Masuk ke Akun'"
      @click="router.push('/login')"
      class="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl text-[#333333] font-bold hover:text-[#0A4391] transition-colors cursor-pointer min-w-[56px] min-h-[44px] touch-manipulation"
    >
      <LogIn class="w-4 h-4" />
      <span class="text-[10.5px] sm:text-[11px] font-medium leading-tight">{{ currentLang === 'en' ? 'Sign In' : 'Masuk' }}</span>
    </button>
  </nav>
</template>

<style scoped>
.clean-bottom-nav {
  gap: 6px;
  padding-left: 14px;
  padding-right: 14px;
  border-color: #e3e9f1;
}
.clean-bottom-nav > a,
.clean-bottom-nav > button {
  flex: 1;
  max-width: 140px;
  border-radius: 9px;
  gap: 3px;
}
.clean-bottom-nav > a.router-link-active,
.clean-bottom-nav > a.router-link-exact-active {
  color: #17345d !important;
}
.clean-bottom-nav svg {
  width: 18px;
  height: 18px;
  stroke-width: 1.7;
}
</style>

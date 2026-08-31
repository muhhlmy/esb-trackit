<script setup>
import { RouterLink, useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { Home, Ticket, LogIn, User, LayoutDashboard } from 'lucide-vue-next';

const router = useRouter();
const { isAuthenticated, isAdmin, user } = useAuth();
</script>

<template>
  <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg px-2 py-1 flex items-center justify-around select-none">
    <RouterLink
      to="/"
      class="flex flex-col items-center gap-0.5 p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      active-class="text-[#5D87FF] dark:text-indigo-400 font-bold"
    >
      <Home class="w-4 h-4" />
      <span class="text-[10px]">Home</span>
    </RouterLink>



    <!-- Authenticated Nav Links -->
    <template v-if="isAuthenticated">
      <RouterLink
        to="/tickets"
        class="flex flex-col items-center gap-0.5 p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        active-class="text-[#5D87FF] dark:text-indigo-400 font-bold"
      >
        <Ticket class="w-4 h-4" />
        <span class="text-[10px]">Tickets</span>
      </RouterLink>

      <RouterLink
        v-if="isAdmin"
        to="/dashboard"
        class="flex flex-col items-center gap-0.5 p-1.5 rounded-xl text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors"
        active-class="font-bold text-amber-600 dark:text-amber-300"
      >
        <LayoutDashboard class="w-4 h-4" />
        <span class="text-[10px]">Admin</span>
      </RouterLink>

      <RouterLink
        v-else
        to="/my-assets"
        class="flex flex-col items-center gap-0.5 p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        active-class="text-[#5D87FF] dark:text-indigo-400 font-bold"
      >
        <User class="w-4 h-4" />
        <span class="text-[10px]">Profile</span>
      </RouterLink>
    </template>

    <!-- Visitor Sign In Link -->
    <button
      v-else
      @click="router.push('/login')"
      class="flex flex-col items-center gap-0.5 p-1.5 rounded-xl text-[#5D87FF] font-bold hover:text-[#4570EA] transition-colors"
    >
      <LogIn class="w-4 h-4" />
      <span class="text-[10px]">Sign In</span>
    </button>
  </nav>
</template>

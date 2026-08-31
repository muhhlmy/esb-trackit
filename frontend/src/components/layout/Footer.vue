<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <footer class="bg-[#f3f3f5] dark:bg-slate-900/80 border-t border-[#c4c5d9] dark:border-slate-800 mt-auto w-full transition-colors">
    <div class="flex flex-col md:flex-row justify-between items-center px-4 sm:px-6 md:px-12 max-w-6xl mx-auto py-4 md:h-16 gap-4 md:gap-0 text-xs">
      
      <RouterLink to="/" class="font-bold text-[#0040e5] dark:text-indigo-400 hover:underline flex items-center gap-1.5">
        <span>&copy; {{ new Date().getFullYear() }} ESB Case</span>
        <span class="text-[#575d7a] dark:text-slate-400 font-normal">&bull; IT Infrastructure</span>
      </RouterLink>

      <div class="flex items-center gap-6 font-medium text-[#434656] dark:text-slate-400">
        <RouterLink to="/cases" class="hover:text-[#0040e5] dark:hover:text-white underline transition-colors">
          Knowledge Directory
        </RouterLink>
        <RouterLink to="/templates" class="hover:text-[#0040e5] dark:hover:text-white underline transition-colors">
          Communication Hub
        </RouterLink>
        <RouterLink to="/analytics" class="hover:text-[#0040e5] dark:hover:text-white underline transition-colors">
          Portal Status &amp; Analytics
        </RouterLink>
      </div>

    </div>
  </footer>
</template>

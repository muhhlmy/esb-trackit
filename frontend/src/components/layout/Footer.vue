<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <footer class="bg-white dark:bg-slate-900 border-t border-[#E2E8F0] dark:border-slate-800 mt-auto w-full transition-colors">
    <div class="flex flex-col md:flex-row justify-between items-center px-4 sm:px-6 md:px-8 max-w-[1560px] mx-auto py-3.5 gap-3 text-xs">
      
      <div class="flex items-center gap-2 text-[#64748B]">
        <span class="font-bold text-[#0F172A] dark:text-white">&copy; {{ new Date().getFullYear() }} ESB TrackIT</span>
        <span>&bull; Help Center &amp; Playbook SOP Insiden</span>
      </div>

      <div class="flex items-center gap-5 font-bold text-[#475569] dark:text-slate-400 text-[11.5px]">
        <RouterLink to="/cases" class="hover:text-[#2563EB] transition-colors">
          Direktori SOP
        </RouterLink>
        <RouterLink to="/templates" class="hover:text-[#2563EB] transition-colors">
          Templates Hub
        </RouterLink>
        <RouterLink to="/analytics" class="hover:text-[#2563EB] transition-colors">
          Analitik KB
        </RouterLink>
        <RouterLink to="/dashboard" class="hover:text-[#2563EB] transition-colors text-[#2563EB]">
          IT Monitoring Dashboard
        </RouterLink>
      </div>

    </div>
  </footer>
</template>

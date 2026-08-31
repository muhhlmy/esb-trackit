<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <footer class="global-page-footer bg-white dark:bg-[#0F172A] text-[#64748B] dark:text-slate-400 border-t border-[#E5EAEF] dark:border-slate-800 w-full transition-colors duration-200 py-6 px-4">
    <div class="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-3 text-xs font-medium">
      
      <div class="flex items-center gap-2">
        <span class="font-extrabold text-[#0F172A] dark:text-white">&copy; {{ new Date().getFullYear() }} ESB TrackIT</span>
        <span class="text-[#64748B] dark:text-slate-400">&bull; Platform Portal &amp; Playbook SOP Insiden</span>
      </div>

      <div class="flex items-center gap-5 font-bold text-[#475569] dark:text-slate-300 text-xs">
        <RouterLink to="/cases" class="hover:text-[#5D87FF] transition-colors">
          Direktori SOP
        </RouterLink>
        <RouterLink to="/templates" class="hover:text-[#5D87FF] transition-colors">
          Templates Hub
        </RouterLink>
        <RouterLink to="/analytics" class="hover:text-[#5D87FF] transition-colors">
          Analitik KB
        </RouterLink>
        <RouterLink to="/assets" class="hover:text-[#5D87FF] transition-colors">
          Asset Management
        </RouterLink>
        <RouterLink to="/tickets" class="hover:text-[#5D87FF] transition-colors">
          Ticketing System
        </RouterLink>
        <RouterLink to="/dashboard" class="hover:text-[#5D87FF] text-[#5D87FF] font-extrabold transition-colors">
          IT Dashboard
        </RouterLink>
      </div>

    </div>
  </footer>
</template>

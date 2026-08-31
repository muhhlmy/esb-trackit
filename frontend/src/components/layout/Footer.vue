<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

// Hapus/sembunyikan footer pada halaman /cases agar layout full-screen Notion reader tidak terpotong/memiliki double scrollbar
const isFooterHidden = computed(() => {
  return route.path.startsWith('/cases');
});
</script>

<template>
  <footer
    v-if="!isFooterHidden"
    class="global-page-footer bg-white dark:bg-[#0F172A] text-[#64748B] dark:text-slate-400 border-t border-[#E5EAEF] dark:border-slate-800 w-full transition-colors duration-200 py-6 px-4 sm:px-6 lg:px-8"
  >
    <div class="max-w-[1200px] mx-auto w-full flex flex-col sm:flex-row justify-between items-center gap-3 text-xs sm:text-sm font-medium">
      
      <!-- LEFT: ESB TrackIT Help Center (Clean whitespace hierarchy) -->
      <div class="flex items-center gap-2">
        <span class="font-extrabold text-[#0F172A] dark:text-white">ESB TrackIT</span>
        <span class="text-[#64748B] dark:text-slate-400 font-semibold">Help Center</span>
      </div>

      <!-- RIGHT: © 2026 ESB TrackIT  Privacy  Terms -->
      <div class="flex items-center gap-4 text-xs text-[#94A3B8] dark:text-slate-500 font-normal">
        <span>&copy; {{ new Date().getFullYear() }} ESB TrackIT</span>
        <span class="hover:text-[#5D87FF] cursor-pointer transition-colors">Privacy</span>
        <span class="hover:text-[#5D87FF] cursor-pointer transition-colors">Terms</span>
      </div>

    </div>
  </footer>
</template>

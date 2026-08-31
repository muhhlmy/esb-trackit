<script setup>
import { RouterLink } from 'vue-router';
import { useCases } from '@/composables/useCases';
import { useAuth } from '@/composables/useAuth';
import { Home, FolderOpen, FileText, BarChart3, Plus } from 'lucide-vue-next';

const { openCreateDrawer } = useCases();
const { isCrudUnlocked } = useAuth();
</script>

<template>
  <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur-lg px-2 py-1 flex items-center justify-around">
    <RouterLink
      to="/"
      class="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-400 hover:text-white transition-colors"
      active-class="text-indigo-400 font-semibold"
    >
      <Home class="w-4 h-4" />
      <span class="text-[10px]">Home</span>
    </RouterLink>

    <RouterLink
      to="/cases"
      class="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-400 hover:text-white transition-colors"
      active-class="text-indigo-400 font-semibold"
    >
      <FolderOpen class="w-4 h-4" />
      <span class="text-[10px]">Cases</span>
    </RouterLink>

    <button
      v-if="isCrudUnlocked"
      @click="openCreateDrawer"
      class="flex flex-col items-center justify-center -mt-4 w-11 h-11 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 hover:bg-indigo-500 transition-transform active:scale-95"
      title="Create New Case"
    >
      <Plus class="w-5 h-5" />
    </button>

    <RouterLink
      to="/templates"
      class="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-400 hover:text-white transition-colors"
      active-class="text-indigo-400 font-semibold"
    >
      <FileText class="w-4 h-4" />
      <span class="text-[10px]">Templates</span>
    </RouterLink>

    <RouterLink
      to="/analytics"
      class="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-400 hover:text-white transition-colors"
      active-class="text-indigo-400 font-semibold"
    >
      <BarChart3 class="w-4 h-4" />
      <span class="text-[10px]">Analytics</span>
    </RouterLink>
  </nav>
</template>

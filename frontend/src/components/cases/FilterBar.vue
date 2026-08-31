<script setup>
import { useCases } from '@/composables/useCases';
import { Layers, ShieldAlert } from 'lucide-vue-next';

const { selectedCategory, selectedSeverity, setCategory, setSeverity, filteredCases } = useCases();

const categories = [
  { id: 'all', label: 'All Categories' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'git', label: 'Git' },
  { id: 'backend', label: 'Backend' },
  { id: 'environment', label: 'Environment' },
  { id: 'workplace', label: 'Workplace' },
  { id: 'devops', label: 'DevOps' }
];

const severities = [
  { id: 'all', label: 'All Severities' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' }
];
</script>

<template>
  <div class="border-b border-[#e2e2e4] dark:border-slate-800 bg-white/60 dark:bg-slate-950/40 backdrop-blur-sm py-3 px-4 sm:px-6 transition-colors">
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
      
      <!-- Category Pills -->
      <div class="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="setCategory(cat.id)"
          class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
          :class="selectedCategory === cat.id
            ? 'bg-[#0040e5] text-white shadow-xs shadow-[#0040e5]/20'
            : 'bg-[#f3f3f5] dark:bg-slate-900 text-[#575d7a] dark:text-slate-400 hover:text-[#1a1c1d] dark:hover:text-slate-200 border border-[#e2e2e4] dark:border-slate-800'"
        >
          {{ cat.label }}
        </button>
      </div>

      <!-- Severity Filter & Count -->
      <div class="flex items-center justify-between w-full md:w-auto gap-3">
        <div class="relative flex items-center">
          <ShieldAlert class="absolute left-2.5 w-3.5 h-3.5 text-[#575d7a] dark:text-slate-400 pointer-events-none" />
          <select
            :value="selectedSeverity"
            @change="setSeverity($event.target.value)"
            class="bg-[#f3f3f5] dark:bg-slate-900 border border-[#e2e2e4] dark:border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-[#1a1c1d] dark:text-slate-200 focus:outline-none focus:border-[#0040e5] transition-colors appearance-none cursor-pointer"
          >
            <option v-for="sev in severities" :key="sev.id" :value="sev.id">
              {{ sev.label }}
            </option>
          </select>
        </div>

        <span class="text-xs text-[#575d7a] dark:text-slate-400 font-mono">
          <strong class="text-[#1a1c1d] dark:text-slate-200">{{ filteredCases.length }}</strong> SOPs
        </span>
      </div>

    </div>
  </div>
</template>

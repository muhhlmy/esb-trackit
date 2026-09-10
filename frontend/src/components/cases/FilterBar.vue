<script setup>
import { useCases } from '@/composables/useCases'
import CustomSelect from '@/components/ui/CustomSelect.vue'

const { selectedCategory, selectedSeverity, setCategory, setSeverity, filteredCases } = useCases()

const categories = [
  { id: 'all', label: 'All Categories' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'git', label: 'Git' },
  { id: 'backend', label: 'Backend' },
  { id: 'environment', label: 'Environment' },
  { id: 'workplace', label: 'Workplace' },
  { id: 'devops', label: 'DevOps' },
]

const severityOptions = [
  { value: 'all', label: 'All Severities' },
  { value: 'high', label: 'High', dot: 'bg-rose-500' },
  { value: 'medium', label: 'Medium', dot: 'bg-amber-500' },
  { value: 'low', label: 'Low', dot: 'bg-emerald-500' },
]
</script>

<template>
  <div
    class="border-b border-[#e2e2e4] dark:border-slate-800 bg-white/60 dark:bg-slate-950/40 backdrop-blur-sm py-3 px-4 sm:px-6 transition-colors"
  >
    <div
      class="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
    >
      <!-- Category Pills -->
      <div
        class="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none"
      >
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="setCategory(cat.id)"
          class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
          :class="
            selectedCategory === cat.id
              ? 'bg-[#0040e5] text-white shadow-xs shadow-[#0040e5]/20'
              : 'bg-[#f3f3f5] dark:bg-slate-900 text-[#575d7a] dark:text-slate-400 hover:text-[#1a1c1d] dark:hover:text-slate-200 border border-[#e2e2e4] dark:border-slate-800'
          "
        >
          {{ cat.label }}
        </button>
      </div>

      <!-- Severity Filter & Count -->
      <div class="flex items-center justify-between w-full md:w-auto gap-3">
        <div class="w-40">
          <CustomSelect
            :model-value="selectedSeverity"
            :options="severityOptions"
            aria-label="Severity"
            placeholder="All Severities"
            :block="true"
            height-class="h-9"
            @update:model-value="setSeverity"
          />
        </div>

        <span class="text-xs text-[#575d7a] dark:text-slate-400 font-mono">
          <strong class="text-[#1a1c1d] dark:text-slate-200">{{ filteredCases.length }}</strong>
          Artikel
        </span>
      </div>
    </div>
  </div>
</template>

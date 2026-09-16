<script setup>
import { ref, onMounted } from 'vue'
import { useCases } from '@/composables/useCases'
import AnalyticsCharts from '@/components/charts/AnalyticsCharts.vue'
import { BarChart3, RefreshCw } from 'lucide-vue-next'

const { cases, fetchCases } = useCases()

const statsData = ref({
  summary: {
    totalCases: 0,
    totalTemplates: 4,
    customCasesCount: 0,
    builtInCasesCount: 6,
  },
  categories: {},
  severities: { high: 0, medium: 0, low: 0 },
})

const isLoading = ref(false)

async function loadStats() {
  isLoading.value = true

  const cats = {}
  const sevs = { high: 0, medium: 0, low: 0 }
  let custom = 0

  cases.value.forEach((c) => {
    cats[c.category] = (cats[c.category] || 0) + 1
    const sev = (c.severity || 'medium').toLowerCase()
    if (sevs[sev] !== undefined) sevs[sev]++
    if (c.isCustom) custom++
  })

  statsData.value = {
    summary: {
      totalCases: cases.value.length,
      totalTemplates: 4,
      customCasesCount: custom,
      builtInCasesCount: cases.value.length - custom,
    },
    categories: cats,
    severities: sevs,
  }

  isLoading.value = false
}

onMounted(async () => {
  await fetchCases()
  await loadStats()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-slate-200 pb-6">
      <div>
        <div
          class="flex items-center gap-2 text-indigo-700 font-semibold text-xs uppercase tracking-wider mb-1"
        >
          <BarChart3 class="w-4 h-4" />
          <span>Analytics & Metrics</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Statistik Incident Playbook
        </h1>
        <p class="text-xs sm:text-sm text-slate-600 mt-1">
          Metrik distribusi artikel, klasifikasi severity, dan efektivitas dokumentasi insiden.
        </p>
      </div>

      <button
        @click="loadStats"
        class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 transition-colors cursor-pointer"
        title="Refresh Data"
      >
        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
        <span class="hidden sm:inline">Refresh</span>
      </button>
    </div>

    <!-- Charts and KPIs -->
    <AnalyticsCharts :stats="statsData" />
  </div>
</template>

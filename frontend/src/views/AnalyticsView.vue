<script setup>
import { ref, onMounted } from 'vue';
import { api } from '@/services/api';
import { useCases } from '@/composables/useCases';
import AnalyticsCharts from '@/components/charts/AnalyticsCharts.vue';
import { BarChart3, RefreshCw } from 'lucide-vue-next';

const { cases } = useCases();

const statsData = ref({
  summary: {
    totalCases: 0,
    totalFaqs: 5,
    customCasesCount: 0,
    builtInCasesCount: 6
  },
  categories: {},
  severities: { high: 0, medium: 0, low: 0 }
});

const isLoading = ref(false);

async function loadStats() {
  isLoading.value = true;
  try {
    const res = await api.getStats();
    if (res?.data) {
      statsData.value = res.data;
      return;
    }
  } catch {
    // calculate from local cases
  }

  // Fallback calculation
  const cats = {};
  const sevs = { high: 0, medium: 0, low: 0 };
  let custom = 0;

  cases.value.forEach((c) => {
    cats[c.category] = (cats[c.category] || 0) + 1;
    const sev = (c.severity || 'medium').toLowerCase();
    if (sevs[sev] !== undefined) sevs[sev]++;
    if (c.isCustom) custom++;
  });

  statsData.value = {
    summary: {
      totalCases: cases.value.length,
      totalFaqs: 5,
      customCasesCount: custom,
      builtInCasesCount: cases.value.length - custom
    },
    categories: cats,
    severities: sevs
  };

  isLoading.value = false;
}

onMounted(() => {
  loadStats();
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
    
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-slate-800 pb-6">
      <div>
        <div class="flex items-center gap-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1">
          <BarChart3 class="w-4 h-4" />
          <span>Analytics & Metrics</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-100">
          Statistik Incident Playbook
        </h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1">
          Metrik distribusi SOP, klasifikasi severity, dan efektivitas dokumentasi insiden.
        </p>
      </div>

      <button
        @click="loadStats"
        class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
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

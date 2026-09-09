<script setup>
import { computed } from 'vue'
import { Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement)

const props = defineProps({
  stats: {
    type: Object,
    required: true,
  },
})

// Category distribution Chart
const categoryChartData = computed(() => {
  const categories = props.stats.categories || {}
  const labels = Object.keys(categories)
  const data = Object.values(categories)

  return {
    labels: labels.map((l) => l.toUpperCase()),
    datasets: [
      {
        label: 'Jumlah Artikel',
        backgroundColor: [
          '#6366f1', // Indigo
          '#06b6d4', // Cyan
          '#10b981', // Emerald
          '#f59e0b', // Amber
          '#ec4899', // Pink
          '#8b5cf6', // Purple
        ],
        borderRadius: 8,
        data,
      },
    ],
  }
})

// Severity distribution Chart
const severityChartData = computed(() => {
  const sev = props.stats.severities || {}
  return {
    labels: ['High', 'Medium', 'Low'],
    datasets: [
      {
        backgroundColor: [
          '#f43f5e', // Rose
          '#f59e0b', // Amber
          '#10b981', // Emerald
        ],
        borderColor: '#0f172a',
        borderWidth: 3,
        hoverOffset: 6,
        data: [sev.high || 0, sev.medium || 0, sev.low || 0],
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#94a3b8',
        font: {
          family: 'Plus Jakarta Sans',
          size: 11,
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#94a3b8' },
      grid: { color: '#1e293b' },
    },
    y: {
      ticks: { color: '#94a3b8', stepSize: 1 },
      grid: { color: '#1e293b' },
    },
  },
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#94a3b8',
        font: {
          family: 'Plus Jakarta Sans',
          size: 11,
        },
      },
    },
  },
}
</script>

<template>
  <div class="space-y-6">
    <!-- Top Summary KPI Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Total Artikel / Cases
        </p>
        <p class="text-3xl font-extrabold text-slate-100 mt-2">
          {{ stats.summary?.totalCases || 0 }}
        </p>
      </div>

      <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <p class="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Total Kategori</p>
        <p class="text-3xl font-extrabold text-indigo-300 mt-2">
          {{ Object.keys(stats.categories || {}).length }}
        </p>
      </div>

      <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <p class="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Templates Hub</p>
        <p class="text-3xl font-extrabold text-emerald-300 mt-2">
          {{ stats.summary?.totalTemplates || 0 }}
        </p>
      </div>

      <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <p class="text-xs font-semibold text-amber-400 uppercase tracking-wider">Custom Artikel</p>
        <p class="text-3xl font-extrabold text-amber-300 mt-2">
          {{ stats.summary?.customCasesCount || 0 }}
        </p>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Category Breakdown (Bar) -->
      <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 class="text-sm font-bold text-slate-200">Distribusi Artikel berdasarkan Kategori</h3>
        <div class="h-64 relative">
          <Bar :data="categoryChartData" :options="chartOptions" />
        </div>
      </div>

      <!-- Severity Breakdown (Doughnut) -->
      <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 class="text-sm font-bold text-slate-200">Tingkat Keparahan (Severity Breakdown)</h3>
        <div class="h-64 relative">
          <Doughnut :data="severityChartData" :options="doughnutOptions" />
        </div>
      </div>
    </div>
  </div>
</template>

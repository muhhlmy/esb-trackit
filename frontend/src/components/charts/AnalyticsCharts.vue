<script setup>
import { computed } from 'vue';
import { Doughnut, Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement);

const props = defineProps({
  stats: {
    type: Object,
    required: true
  }
});

// Category distribution Bar Chart
const categoryChartData = computed(() => {
  const categories = props.stats.categories || {};
  const labels = Object.keys(categories);
  const data = Object.values(categories);

  return {
    labels: labels.map((l) => l.toUpperCase()),
    datasets: [
      {
        label: 'Jumlah Artikel FAQ',
        backgroundColor: [
          '#6366f1', // Indigo
          '#06b6d4', // Cyan
          '#10b981', // Emerald
          '#f59e0b', // Amber
          '#ec4899', // Pink
          '#8b5cf6'  // Purple
        ],
        borderRadius: 8,
        data
      }
    ]
  };
});

// Category Share Doughnut Chart
const categoryShareData = computed(() => {
  const categories = props.stats.categories || {};
  const labels = Object.keys(categories);
  const data = Object.values(categories);

  return {
    labels: labels.map((l) => l.charAt(0).toUpperCase() + l.slice(1)),
    datasets: [
      {
        backgroundColor: [
          '#6366f1',
          '#06b6d4',
          '#10b981',
          '#f59e0b',
          '#ec4899',
          '#8b5cf6'
        ],
        borderColor: '#0f172a',
        borderWidth: 3,
        hoverOffset: 6,
        data
      }
    ]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#94a3b8',
        font: {
          family: 'Plus Jakarta Sans',
          size: 11
        }
      }
    }
  },
  scales: {
    x: {
      ticks: { color: '#94a3b8' },
      grid: { color: '#1e293b' }
    },
    y: {
      ticks: { color: '#94a3b8', stepSize: 1 },
      grid: { color: '#1e293b' }
    }
  }
};

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
          size: 11
        }
      }
    }
  }
};
</script>

<template>
  <div class="space-y-6">
    
    <!-- Top Summary KPI Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Artikel FAQ</p>
        <p class="text-3xl font-extrabold text-slate-100 mt-2">{{ stats.summary?.totalCases || 0 }}</p>
      </div>

      <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <p class="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Total Kategori</p>
        <p class="text-3xl font-extrabold text-indigo-300 mt-2">{{ Object.keys(stats.categories || {}).length }}</p>
      </div>

      <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <p class="text-xs font-semibold text-amber-400 uppercase tracking-wider">FAQ di Homepage</p>
        <p class="text-3xl font-extrabold text-amber-300 mt-2">{{ stats.summary?.totalFaqs || 0 }}</p>
      </div>

      <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <p class="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Custom FAQ Articles</p>
        <p class="text-3xl font-extrabold text-emerald-300 mt-2">{{ stats.summary?.customCasesCount || 0 }}</p>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <!-- Category Breakdown (Bar) -->
      <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 class="text-sm font-bold text-slate-200">Distribusi Artikel per Kategori</h3>
        <div class="h-64 relative">
          <Bar :data="categoryChartData" :options="chartOptions" />
        </div>
      </div>

      <!-- Category Share (Doughnut) -->
      <div class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 class="text-sm font-bold text-slate-200">Proporsi Kategori Solusi</h3>
        <div class="h-64 relative">
          <Doughnut :data="categoryShareData" :options="doughnutOptions" />
        </div>
      </div>

    </div>

  </div>
</template>

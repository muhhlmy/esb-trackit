<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'
import { useChartTheme } from '@/composables/useChartTheme'
import BaseChartCard from './BaseChartCard.vue'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
  data: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  height: { type: Number, default: 260 },
  embedded: { type: Boolean, default: false },
})

const { chartColors, fontStack } = useChartTheme()

const isEmpty = computed(() => !props.data || props.data.length === 0)

const chartData = computed(() => ({
  labels: props.data.map((d) => d.device_type || d.tipe || d.type || 'Tanpa Tipe'),
  datasets: [
    {
      label: 'Jumlah Unit',
      data: props.data.map((d) => Number(d.count) || 0),
      // Satu aksen brand; bar paling tinggi disorot lebih pekat.
      backgroundColor: (context) => {
        const value = context.parsed?.y ?? 0
        const max = Math.max(...props.data.map((d) => Number(d.count) || 0), 1)
        return value === max ? chartColors.primary : 'rgba(10, 81, 176, 0.55)'
      },
      hoverBackgroundColor: chartColors.secondary,
      borderRadius: 7,
      borderSkipped: false,
      maxBarThickness: 44,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  animations: { colors: true },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0F172A',
      titleColor: '#FFFFFF',
      bodyColor: '#E2E8F0',
      borderColor: 'rgba(9, 124, 222, 0.45)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 10,
      displayColors: false,
      titleFont: { family: fontStack, size: 12, weight: '700' },
      bodyFont: { family: fontStack, size: 13, weight: '600' },
      callbacks: {
        label: (ctx) => ` ${ctx.parsed.y} unit`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: chartColors.mutedText,
        font: { family: fontStack, size: 10, weight: '600' },
        maxRotation: 45,
        minRotation: 0,
        autoSkip: true,
      },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: chartColors.gridLine },
      ticks: {
        color: chartColors.mutedText,
        font: { family: fontStack, size: 10 },
        precision: 0,
        maxTicksLimit: 6,
      },
    },
  },
}))
</script>

<template>
  <BaseChartCard
    title="Sebaran Aset Berdasarkan Tipe"
    subtitle="Distribusi perangkat berdasarkan jenis (laptop, server, printer, dll.)"
    :loading="loading"
    :empty="isEmpty"
    :error="error"
    :height="height"
    :embedded="embedded"
  >
    <div class="h-full w-full">
      <Bar
        :data="chartData"
        :options="chartOptions"
        aria-label="Bar chart showing asset types by category"
      />
    </div>
  </BaseChartCard>
</template>

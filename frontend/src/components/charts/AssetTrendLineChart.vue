<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
} from 'chart.js'
import { useChartTheme } from '@/composables/useChartTheme'
import BaseChartCard from './BaseChartCard.vue'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
)

const props = defineProps({
  data: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  height: { type: Number, default: 260 },
  embedded: { type: Boolean, default: false },
})

const { chartColors, fontStack } = useChartTheme()

const isEmpty = computed(() => !props.data || props.data.length === 0)

// Gradient vertikal lembut di bawah garis — dihitung dari konteks canvas.
const gradientFill = (context) => {
  const { ctx, chartArea } = context.chart
  if (!chartArea) return chartColors.primaryLight
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  gradient.addColorStop(0, 'rgba(10, 81, 176, 0.22)')
  gradient.addColorStop(0.75, 'rgba(10, 81, 176, 0.02)')
  gradient.addColorStop(1, 'rgba(10, 81, 176, 0)')
  return gradient
}

const chartData = computed(() => ({
  labels: props.data.map((d) => d.label || d.month || d.period || ''),
  datasets: [
    {
      label: 'Penambahan Aset IT',
      data: props.data.map((d) => (d.added !== undefined ? d.added : d.count || 0)),
      borderColor: chartColors.primary,
      backgroundColor: gradientFill,
      borderWidth: 2.5,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: '#FFFFFF',
      pointBorderColor: chartColors.primary,
      pointBorderWidth: 2,
      pointHoverBackgroundColor: chartColors.primary,
      pointHoverBorderColor: '#FFFFFF',
      pointHoverBorderWidth: 2.5,
      fill: true,
      tension: 0.35,
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
        label: (context) => ` +${context.parsed.y} unit baru`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: chartColors.mutedText,
        font: { family: fontStack, size: 10 },
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 12,
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
    title="Tren Penambahan Aset IT"
    subtitle="Jumlah unit aset baru terdaftar per bulan (12 bulan terakhir)"
    :loading="loading"
    :empty="isEmpty"
    :error="error"
    :height="height"
    :embedded="embedded"
  >
    <div class="h-full w-full">
      <Line
        :data="chartData"
        :options="chartOptions"
        aria-label="Line chart showing asset trend over time"
      />
    </div>
  </BaseChartCard>
</template>

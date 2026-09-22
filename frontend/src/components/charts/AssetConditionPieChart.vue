<script setup>
import { computed } from 'vue'
import { Pie } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { useChartTheme } from '@/composables/useChartTheme'
import BaseChartCard from './BaseChartCard.vue'

ChartJS.register(Title, Tooltip, Legend, ArcElement)

const props = defineProps({
  data: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  height: { type: Number, default: 260 },
  embedded: { type: Boolean, default: false },
})

const { chartColors, fontStack } = useChartTheme()

const isEmpty = computed(() => !props.data || props.data.length === 0)

// Peta warna kondisi: hijau = sehat, biru = normal, amber/oranye = bermasalah.
// Semua warna punya kontras cukup di atas putih.
const conditionColorMap = {
  baru: '#0E9F6E',
  normal: '#0A51B0',
  baik: '#0A51B0',
  'rusak ringan': '#D97706',
  'rusak sedang': '#EA580C',
  'rusak berat': '#DC2626',
  rusak: '#DC2626',
}

const chartData = computed(() => {
  const labels = props.data.map((d) => d.condition || 'Tidak diketahui')
  const bgColors = props.data.map((d) => {
    const key = (d.condition || '').toLowerCase()
    return conditionColorMap[key] || chartColors.gray
  })

  return {
    labels,
    datasets: [
      {
        data: props.data.map((d) => Number(d.count) || 0),
        backgroundColor: bgColors,
        hoverBackgroundColor: bgColors,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        hoverOffset: 10,
        hoverBorderWidth: 3,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: {
        color: chartColors.darkText,
        font: { family: fontStack, size: 11, weight: '600' },
        padding: 14,
        usePointStyle: true,
        pointStyle: 'circle',
        boxWidth: 8,
        boxHeight: 8,
      },
    },
    tooltip: {
      backgroundColor: '#0F172A',
      titleColor: '#FFFFFF',
      bodyColor: '#E2E8F0',
      borderColor: 'rgba(9, 124, 222, 0.45)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 10,
      boxPadding: 6,
      usePointStyle: true,
      titleFont: { family: fontStack, size: 12, weight: '700' },
      bodyFont: { family: fontStack, size: 13, weight: '600' },
      callbacks: {
        label: (ctx) => {
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
          const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0
          return ` ${ctx.label}: ${ctx.parsed} unit (${pct}%)`
        },
      },
    },
  },
}))
</script>

<template>
  <BaseChartCard
    title="Kondisi Fisik Aset"
    subtitle="Persentase kondisi kesehatan fisik seluruh perangkat"
    :loading="loading"
    :empty="isEmpty"
    :error="error"
    :height="height"
    :embedded="embedded"
  >
    <div class="h-full w-full">
      <Pie
        :data="chartData"
        :options="chartOptions"
        aria-label="Pie chart showing asset condition distribution"
      />
    </div>
  </BaseChartCard>
</template>

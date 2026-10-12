<script setup>
// ============================================================
// CsatDashboardSection.vue - Section CSAT/CASP di dashboard.
// Kartu rata-rata kepuasan + Bar chart distribusi + Line chart CSAT per bulan.
// ============================================================
import { computed, onMounted, ref } from 'vue'
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
import { useApi } from '@/composables/useApi'
import { useChartTheme } from '@/composables/useChartTheme'
import { useLanguage } from '@/composables/useLanguage'
import CsatStars from '../tickets/CsatStars.vue'
import CsatTrendLineChart from './CsatTrendLineChart.vue'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const { get } = useApi()
const { chartColors } = useChartTheme()
const { t } = useLanguage()

const stats = ref({ averageRating: 0, totalRatings: 0, distribution: [] })
const trendData = ref([])
const isLoading = ref(true)
const isTrendLoading = ref(true)
const error = ref('')
const trendError = ref('')

const isEmpty = computed(() => stats.value.totalRatings === 0)

// Label deskriptif untuk rata-rata.
const ratingLabel = computed(() => {
  const avg = stats.value.averageRating
  if (avg >= 4.5) return t('csat_very_satisfied')
  if (avg >= 3.5) return t('csat_satisfied')
  if (avg >= 2.5) return t('csat_neutral')
  if (avg >= 1.5) return t('csat_unsatisfied')
  if (avg > 0) return t('csat_very_unsatisfied')
  return t('csat_no_ratings')
})

// Warna tiap bar: gradasi dari merah (rating 1) ke hijau (rating 5).
const barColors = ['#EF4444', '#FA896B', '#FFAE1F', '#84CC16', '#13DEB9']
const ratingLabels = computed(() => ({
  1: t('csat_very_unsatisfied'),
  2: t('csat_unsatisfied'),
  3: t('csat_neutral'),
  4: t('csat_satisfied'),
  5: t('csat_very_satisfied'),
}))

const chartData = computed(() => ({
  labels: stats.value.distribution.map((d) => `${d.rating}★`),
  datasets: [
    {
      label: t('tickets_csat_rating_count'),
      data: stats.value.distribution.map((d) => d.count),
      backgroundColor: barColors,
      borderRadius: 8,
      borderSkipped: false,
      maxBarThickness: 60,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1E293B',
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        title: (items) => {
          const r = Number(String(items[0].label).replace('★', ''))
          return `${r} ${t('tickets_star_label')}: ${ratingLabels.value[r] || ''}`
        },
        label: (ctx) => ` ${ctx.parsed.y} ${t('csat_ratings_count')}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: chartColors.mutedText,
        font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '700' },
      },
    },
    y: {
      beginAtZero: true,
      grid: { color: chartColors.gridLine },
      ticks: { color: chartColors.mutedText, precision: 0 },
    },
  },
}))

async function fetchStats() {
  isLoading.value = true
  error.value = ''
  try {
    const data = await get('/api/tickets/casp/stats')
    stats.value = {
      averageRating: Number(data?.averageRating) || 0,
      totalRatings: Number(data?.totalRatings) || 0,
      distribution: Array.isArray(data?.distribution) ? data.distribution : [],
    }
  } catch (e) {
    error.value = t('tickets_csat_load_failed')
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

async function fetchTrend() {
  isTrendLoading.value = true
  trendError.value = ''
  try {
    const data = await get('/api/tickets/casp/trend')
    trendData.value = Array.isArray(data) ? data : []
  } catch (e) {
    trendError.value = t('tickets_csat_trend_load_failed')
    console.error(e)
  } finally {
    isTrendLoading.value = false
  }
}

onMounted(() => {
  fetchStats()
  fetchTrend()
})
</script>

<template>
  <div class="csat-section flex flex-col gap-3">
    <!-- Header CSAT Section -->
    <div class="csat-heading flex items-center justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-sm font-bold tracking-tight text-[#1E293B] leading-tight">
          {{ t('csat_title') }}
        </h3>
        <p class="mt-0.5 text-xs font-medium text-[#5B6B84]">
          {{ t('csat_subtitle') }}
        </p>
      </div>
      <span
        class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1 text-[11px] font-bold text-[#92400E]"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[15px] fill-1">star</span>
        {{ t('csat_analytics') }}
      </span>
    </div>

    <!-- Row 1: Kartu Rata-rata CSAT + Bar Chart Distribusi -->
    <div class="csat-grid grid grid-cols-1 lg:grid-cols-12 gap-3">
      <!-- Kartu Rata-rata CSAT -->
      <div
        class="csat-panel rounded-[6px] border border-[#E2E8F0] bg-white p-3 flex flex-col justify-between lg:col-span-5"
      >
        <div class="flex items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-[#1E293B] leading-tight">
              {{ t('csat_average_title') }}
            </h3>
            <p class="mt-0.5 text-[11px] font-medium text-[#5B6B84]">
              {{ t('csat_average_desc') }}
            </p>
          </div>
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#B45309]"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[20px] fill-1"
              >star</span
            >
          </span>
        </div>

        <!-- Loading -->
        <div
          v-if="isLoading"
          class="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-[#66728d]"
        >
          <div
            class="h-8 w-8 animate-spin rounded-full border-[3px] border-[#E5EAEF] border-t-[#FFAE1F]"
          ></div>
          <span class="text-[12px] font-medium">{{ t('loading') }}</span>
        </div>

        <!-- Error -->
        <div
          v-else-if="error"
          class="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-[#FA896B]"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[28px]">error</span>
          <p class="text-[12px] font-semibold">{{ error }}</p>
          <button
            type="button"
            class="csat-retry mt-1 bg-[#FDEDE8] px-3 py-1.5 text-[11px] font-bold text-[#FA896B] hover:bg-[#FA896B] hover:text-white transition-all"
            @click="fetchStats"
          >
            {{ t('retry') }}
          </button>
        </div>

        <!-- Empty -->
        <div
          v-else-if="isEmpty"
          class="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-[#687281]"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[34px]">reviews</span>
          <p class="text-[12px] font-semibold text-center">
            {{ t('csat_no_data') }}
          </p>
        </div>

        <!-- Content -->
        <div v-else class="flex flex-1 flex-col justify-center">
          <div class="flex items-end gap-2 mt-4">
            <p
              class="font-num text-[22px] font-extrabold leading-none tracking-tight text-[#1E293B]"
            >
              {{ stats.averageRating.toFixed(1) }}
            </p>
            <p class="mb-0.5 text-[11px] font-bold text-[#5B6B84]">/ 5.0</p>
          </div>
          <div class="mt-2">
            <CsatStars :value="stats.averageRating" size="22px" />
          </div>
          <div class="mt-3 flex items-center gap-2">
            <span
              class="inline-flex items-center rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-bold text-[#047857]"
            >
              {{ ratingLabel }}
            </span>
            <span class="text-[11px] font-medium text-[#5B6B84]"
              >{{ stats.totalRatings }} {{ t('csat_ratings_count') }}</span
            >
          </div>
        </div>
      </div>

      <!-- Bar Chart Distribusi Rating -->
      <div
        class="csat-panel flex flex-col rounded-[6px] border border-[#E2E8F0] bg-white p-3 lg:col-span-7"
      >
        <div class="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4">
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-[#1E293B] leading-tight">{{ t('csat_rating_distribution') }}</h3>
            <p class="mt-0.5 text-[11px] font-medium text-[#5B6B84]">
              {{ t('csat_dist_desc') }}
            </p>
          </div>
        </div>

        <!-- Tinggi tetap: Chart.js (maintainAspectRatio:false) butuh parent berukuran pasti -->
        <div class="relative flex items-center justify-center" style="height: 240px">
          <!-- Loading Skeleton -->
          <div v-if="isLoading" class="flex flex-col items-center gap-2 text-[#66728d]">
            <div
              class="h-8 w-8 animate-spin rounded-full border-[3px] border-[#E5EAEF] border-t-[#0A51B0]"
            ></div>
            <span class="text-[12px] font-medium">{{ t('loading_data') }}</span>
          </div>

          <!-- Error State -->
          <div
            v-else-if="error"
            class="flex flex-col items-center gap-2 text-[#FA896B] p-3 text-center"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[32px]">error</span>
            <p class="text-[12px] font-semibold">{{ error }}</p>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="isEmpty"
            class="flex flex-col items-center gap-2 text-[#687281] p-3 text-center"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[36px]"
              >bar_chart_off</span
            >
            <p class="text-[12px] font-semibold">{{ t('tickets_csat_no_chart_data') }}</p>
          </div>

          <!-- Chart -->
          <div v-else class="h-full w-full">
            <Bar
              :data="chartData"
              :options="chartOptions"
              :aria-label="t('tickets_csat_chart_aria')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Row 2: Line Chart CSAT Monitoring Perbulan -->
    <CsatTrendLineChart
      class="csat-trend"
      :data="trendData"
      :loading="isTrendLoading"
      :error="trendError"
      :height="260"
    />
  </div>
</template>

<style scoped>
.csat-section {
  gap: 12px;
  min-width: 0;
}
.csat-heading {
  flex-wrap: wrap;
  gap: 10px;
}
.csat-heading h3 {
  font-size: 14px;
  line-height: 1.35;
  font-weight: 650;
}
.csat-heading p {
  margin-top: 2px;
  line-height: 1.45;
}
.csat-grid {
  gap: 12px;
}
.csat-panel,
.csat-trend {
  min-width: 0;
  padding: 10px 12px;
  border-radius: 6px;
  box-shadow: none;
}
.csat-panel h3 {
  font-size: 14px;
  font-weight: 650;
  line-height: 1.35;
}
.csat-panel > div:first-child {
  padding-bottom: 10px;
}
.csat-panel > div:first-child p {
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.45;
}
.csat-retry {
  min-width: 100px;
  min-height: 30px;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}
.csat-retry:focus-visible {
  outline: 2px solid #0a51b0;
  outline-offset: 3px;
}
@media (max-width: 767px) {
  .csat-section {
    gap: 10px;
  }
  .csat-grid {
    gap: 10px;
  }
  .csat-panel,
  .csat-trend {
    padding: 10px 12px;
    border-radius: 6px;
  }
}
</style>

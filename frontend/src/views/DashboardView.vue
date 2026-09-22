<script setup>
// ============================================================
// DashboardView.vue — Dashboard monitoring bergaya Fynix
// Data real dari endpoint /api/assets/stats
// ============================================================
import { ref, computed, nextTick, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useAuth } from '../composables/useAuth.js'
import { onTicketEvent } from '../composables/useTicketRealtime.js'
import AppBadge from '../components/ui/AppBadge.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import QuickActions from '../components/dashboard/QuickActions.vue'
import { getAssetStatusLabel } from '../utils/assetStatus.js'
import { normalizeLocation } from '../utils/locationNormalizer.js'
import { animateStagger } from '../composables/useGsap.js'
import BaseSkeleton from '../components/ui/skeleton/BaseSkeleton.vue'
import SkeletonCard from '../components/ui/skeleton/SkeletonCard.vue'
import SkeletonChart from '../components/ui/skeleton/SkeletonChart.vue'

// Chart.js (~80 kB gzip) is only needed once the charts render, so the four
// chart components load asynchronously. That keeps Chart.js out of the
// Dashboard's initial chunk and lets the KPI cards paint first; each chart
// streams in behind the same skeleton already used for its loading state.
const AssetTrendLineChart = defineAsyncComponent({
  loader: () => import('../components/charts/AssetTrendLineChart.vue'),
  loadingComponent: SkeletonChart,
  delay: 150,
})
const AssetTypeBarChart = defineAsyncComponent({
  loader: () => import('../components/charts/AssetTypeBarChart.vue'),
  loadingComponent: SkeletonChart,
  delay: 150,
})
const AssetConditionPieChart = defineAsyncComponent({
  loader: () => import('../components/charts/AssetConditionPieChart.vue'),
  loadingComponent: SkeletonChart,
  delay: 150,
})
const CsatDashboardSection = defineAsyncComponent({
  loader: () => import('../components/charts/CsatDashboardSection.vue'),
  loadingComponent: SkeletonChart,
  delay: 150,
})

const { get } = useApi()
const { hasPermission } = useAuth()
const canReadAssets = computed(() => hasPermission('assets'))
const canReadTickets = computed(() => hasPermission('tickets'))

// ── State ────────────────────────────────────────────────────
const stats = ref(null)
const recentTickets = ref([])
const isLoading = ref(true)
const error = ref('')

// ── Computed: status breakdown ───────────────────────────────
const knownStatusKeys = new Set([
  'digunakan',
  'in use',
  'tersedia',
  'stock',
  'maintenance',
  'in service',
  'rusak',
  'damaged',
  'disposal',
])

function toCount(value) {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
}

function normalizeLabel(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('id-ID')
}

const totalAssets = computed(() => toCount(stats.value?.totalAssets))

const statusMap = computed(() => {
  if (!Array.isArray(stats.value?.byStatus)) return {}

  const map = {}
  for (const row of stats.value.byStatus) {
    const status = normalizeLabel(row?.status)
    map[status] = (map[status] || 0) + toCount(row?.count)
  }
  return map
})

const countDipakai = computed(
  () => (statusMap.value['in use'] || 0) + (statusMap.value['digunakan'] || 0),
)
const countTersedia = computed(
  () => (statusMap.value['stock'] || 0) + (statusMap.value['tersedia'] || 0),
)
const countMaintenance = computed(
  () => (statusMap.value['in service'] || 0) + (statusMap.value['maintenance'] || 0),
)
const countRusak = computed(
  () => (statusMap.value['damaged'] || 0) + (statusMap.value['rusak'] || 0),
)
const countDisposal = computed(() => statusMap.value['disposal'] || 0)
const countKnownStatuses = computed(
  () =>
    countDipakai.value +
    countTersedia.value +
    countMaintenance.value +
    countRusak.value +
    countDisposal.value,
)
const countReportedStatuses = computed(() =>
  Object.values(statusMap.value).reduce((total, count) => total + count, 0),
)
const countUnknownStatuses = computed(() =>
  Object.entries(statusMap.value).reduce(
    (total, [status, count]) => total + (knownStatusKeys.has(status) ? 0 : count),
    0,
  ),
)
const countLainnya = computed(() => {
  const unreported = Math.max(totalAssets.value - countReportedStatuses.value, 0)
  return countUnknownStatuses.value + unreported
})
const statusChartTotal = computed(() => countKnownStatuses.value + countLainnya.value)

function percentage(count, total = totalAssets.value) {
  return total > 0 ? Math.min(Math.round((count / total) * 100), 100) : 0
}

// Persentase penggunaan untuk bar dan kartu ringkasan.
const pctDipakai = computed(() => percentage(countDipakai.value, statusChartTotal.value))
const pctTersedia = computed(() => percentage(countTersedia.value, statusChartTotal.value))
const pctMaintenance = computed(() => percentage(countMaintenance.value, statusChartTotal.value))
const pctRusak = computed(() => percentage(countRusak.value, statusChartTotal.value))

// Kondisi sehat dihitung dari aset berkondisi Baru + Baik, bukan dari status penggunaan.
// ── Computed: tipe breakdown ─────────────────────────────────
const locationBreakdown = computed(() => {
  if (!Array.isArray(stats.value?.byLocation)) return []

  const locMap = new Map()
  for (const row of stats.value.byLocation) {
    const raw = row?.location
    const norm = raw && String(raw).trim() ? normalizeLocation(raw) : 'Belum ditentukan'
    const cnt = toCount(row?.count)
    locMap.set(norm, (locMap.get(norm) || 0) + cnt)
  }

  return Array.from(locMap.entries()).map(([label, count]) => ({
    label,
    count,
    pct: percentage(count),
  }))
})

// ── Computed: 5 aset terbaru ─────────────────────────────────
const recentAssets = computed(() => {
  if (!Array.isArray(stats.value?.recentAssets)) return []
  return stats.value.recentAssets.map((asset) => ({
    ...asset,
    lokasi_kerja: normalizeLocation(asset.lokasi_kerja) || asset.lokasi_kerja || '—',
  }))
})

// ── Fetch data ───────────────────────────────────────────────
async function fetchStats() {
  isLoading.value = true
  error.value = ''
  try {
    const ticketStatsRequest = canReadTickets.value
      ? get('/api/tickets/stats').catch(() => null)
      : Promise.resolve(null)
    const [statsRes, ticketStatsRes] = await Promise.all([
      get('/api/assets/stats'),
      ticketStatsRequest,
    ])
    stats.value = statsRes
    if (ticketStatsRes && Array.isArray(ticketStatsRes.recentTickets)) {
      recentTickets.value = ticketStatsRes.recentTickets
    }
  } catch (e) {
    error.value =
      e instanceof Error && e.message ? e.message : 'Gagal memuat statistik. Silakan coba lagi.'
    console.error(e)
  } finally {
    isLoading.value = false
    await nextTick()
    animateStagger('.dash-stat-card', { y: 12, duration: 0.3, stagger: 0.05 })
  }
}

// ── Helpers ──────────────────────────────────────────────────
function getStatusBadgeType(status) {
  const s = (status || '').toLowerCase()
  // 'Digunakan' = aset aktif dipakai → netral info biru; hijau dipakai untuk
  // kondisi 'Baik', bukan status penggunaan (lihat kondisi di baris tabel).
  if (s === 'digunakan' || s === 'in use') return 'info'
  if (s === 'tersedia' || s === 'stok' || s === 'stock') return 'success'
  if (s === 'maintenance' || s === 'dalam perawatan' || s === 'in service') return 'warning'
  if (s === 'rusak' || s === 'damaged') return 'danger'
  return 'default'
}

// Helper untuk Status Asset card
function getSortedByStatus() {
  const combined = {
    digunakan: { status: 'Digunakan', rawStatus: 'In Use', count: 0 },
    stok: { status: 'Stok', rawStatus: 'Stock', count: 0 },
    'dalam perawatan': { status: 'Dalam Perawatan', rawStatus: 'In Service', count: 0 },
    rusak: { status: 'Rusak', rawStatus: 'Damaged', count: 0 },
  }

  if (Array.isArray(stats.value?.byStatus)) {
    stats.value.byStatus.forEach((item) => {
      const rawStatus = (item?.status || '').trim()
      const label = getAssetStatusLabel(rawStatus)
      const key = label.toLowerCase()
      if (!combined[key]) {
        combined[key] = { status: label, rawStatus, count: 0 }
      }
      combined[key].count += Number(item?.count || 0)
    })
  }

  const statusOrder = [
    'digunakan',
    'in use',
    'stok',
    'stock',
    'dalam perawatan',
    'maintenance',
    'in service',
    'rusak',
    'damaged',
    'disposal',
  ]

  const sorted = Object.values(combined).sort((a, b) => {
    const aIdx = statusOrder.indexOf(a.rawStatus.toLowerCase())
    const bIdx = statusOrder.indexOf(b.rawStatus.toLowerCase())
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    if (aIdx !== -1) return -1
    if (bIdx !== -1) return 1
    return a.status.localeCompare(b.status)
  })

  return sorted
}

function getStatusColorClass(status) {
  const s = (status || '').toLowerCase()
  // Map to Tailwind color classes matching stat cards
  if (['digunakan', 'in use'].includes(s)) return 'bg-[#13DEB9]'
  if (['stok', 'tersedia', 'stock'].includes(s)) return 'bg-[#49BEFF]'
  if (['dalam perawatan', 'maintenance', 'in service'].includes(s)) return 'bg-[#FFAE1F]'
  if (['rusak', 'damaged'].includes(s)) return 'bg-[#FA896B]'
  if (['disposal'].includes(s)) return 'bg-[#8B5CF6]'
  return 'bg-[#687281]'
}

function getStatusPercentage(status) {
  const sorted = getSortedByStatus()
  const total = sorted.reduce((acc, curr) => acc + curr.count, 0) || stats.value?.totalAssets || 0
  if (total === 0) return 0
  const item = sorted.find((i) => i.status.toLowerCase() === status.toLowerCase())
  if (!item) return 0
  return Math.min(Math.round((item.count / total) * 100), 100)
}

function getTicketStatusBadgeType(status) {
  const s = (status || '').toLowerCase()
  if (s === 'open') return 'success'
  if (s === 'pending') return 'warning'
  if (s === 'closed') return 'default'
  return 'info'
}

function getPriorityBadgeType(prio) {
  const p = (prio || '').toLowerCase()
  if (p === 'urgent') return 'danger'
  if (p === 'high') return 'warning'
  if (p === 'medium') return 'info'
  return 'default'
}

function formatDate(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Realtime SSE: update recent tickets tanpa full refresh ───
let unsubTicketCreated = null
let unsubTicketUpdated = null

// Debounced refetch ticket stats untuk dashboard
let ticketStatsRefreshTimer = null
function scheduleTicketStatsRefresh() {
  if (ticketStatsRefreshTimer) clearTimeout(ticketStatsRefreshTimer)
  ticketStatsRefreshTimer = setTimeout(async () => {
    ticketStatsRefreshTimer = null
    if (!canReadTickets.value) return
    try {
      const ticketStatsRes = await get('/api/tickets/stats')
      if (ticketStatsRes && Array.isArray(ticketStatsRes.recentTickets)) {
        recentTickets.value = ticketStatsRes.recentTickets
      }
    } catch {
      // Silent fail; akan di-refresh di fetchStats berikutnya
    }
  }, 800)
}

onMounted(() => {
  fetchStats()

  // Subscribe ke SSE events (koneksi global dikelola di App.vue)
  if (canReadTickets.value) {
    unsubTicketCreated = onTicketEvent('TICKET_CREATED', () => {
      // Tiket baru → refetch recent tickets list
      scheduleTicketStatsRefresh()
    })
    unsubTicketUpdated = onTicketEvent('TICKET_UPDATED', (data) => {
      if (!data) return
      // Patch tiket di recentTickets jika ada
      const idx = recentTickets.value.findIndex((t) => t.id === data.id)
      if (idx >= 0) {
        recentTickets.value[idx] = {
          ...recentTickets.value[idx],
          ...data,
          // Pertahankan field yang tidak ada di payload
          pelapor: recentTickets.value[idx].pelapor,
          assigned_to: recentTickets.value[idx].assigned_to,
        }
      }
      // Tetap refetch untuk konsistensi (debounced)
      scheduleTicketStatsRefresh()
    })
  }
})

onUnmounted(() => {
  if (ticketStatsRefreshTimer) clearTimeout(ticketStatsRefreshTimer)
  unsubTicketCreated?.()
  unsubTicketUpdated?.()
})
</script>

<template>
  <div class="dashboard-view" :data-testid="!isLoading ? 'page-ready' : undefined">
    <!-- ═══════════════════════════════════════════
         LOADING
         ═══════════════════════════════════════════ -->
    <div v-if="isLoading" class="space-y-4" role="status" aria-live="polite" aria-busy="true">
      <!-- Row 1: 5 Stat Cards Skeleton -->
      <div class="dashboard-stats dashboard-stat-skeleton">
        <SkeletonCard v-for="i in 5" :key="i" variant="summary" />
      </div>

      <!-- Row 2: Monthly Trend (8 col) + Status Donut (4 col) Skeleton -->
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-3.5">
        <div class="xl:col-span-8">
          <SkeletonChart type="line" height="200px" />
        </div>
        <div class="xl:col-span-4">
          <SkeletonChart type="donut" height="200px" />
        </div>
      </div>

      <!-- Row 3: Asset Type (6 col) + Condition (6 col) Skeleton -->
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-3.5">
        <div class="lg:col-span-6">
          <SkeletonChart type="bar" height="220px" />
        </div>
        <div class="lg:col-span-6">
          <SkeletonChart type="pie" height="220px" />
        </div>
      </div>

      <!-- Row 4: Recent Tables Skeletons (Exact match to Dashboard tables) -->
      <div class="space-y-3.5">
        <!-- Aset Terbaru Skeleton Table / Card List -->
        <div
          class="shadow-sm rounded-xl border border-[#E2E8F0] bg-white overflow-hidden p-3.5 sm:p-4"
        >
          <div class="mb-3 flex items-center justify-between">
            <BaseSkeleton width="120px" height="16px" radius="md" />
            <BaseSkeleton width="80px" height="24px" radius="full" />
          </div>

          <!-- Mobile Skeleton (Cards) -->
          <div class="block xl:hidden space-y-3">
            <div
              v-for="r in 3"
              :key="'recent-asset-mob-skel-' + r"
              class="p-3 bg-slate-50/70 rounded-lg space-y-2 border border-slate-100"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <BaseSkeleton width="32px" height="32px" radius="md" />
                  <div class="space-y-1">
                    <BaseSkeleton width="110px" height="13px" radius="sm" />
                    <BaseSkeleton width="60px" height="10px" radius="sm" />
                  </div>
                </div>
                <BaseSkeleton width="60px" height="18px" radius="full" />
              </div>
              <div class="grid grid-cols-2 gap-2 pt-1">
                <BaseSkeleton width="100%" height="24px" radius="sm" />
                <BaseSkeleton width="100%" height="24px" radius="sm" />
              </div>
            </div>
          </div>

          <!-- Desktop Skeleton (Table) -->
          <div class="hidden xl:block overflow-x-auto">
            <table class="w-full text-left min-w-[760px]">
              <thead class="bg-slate-50/60 border-b border-slate-100">
                <tr>
                  <th
                    scope="col"
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[32%]"
                  >
                    Perangkat
                  </th>
                  <th
                    scope="col"
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[20%]"
                  >
                    Merek &amp; Tipe
                  </th>
                  <th
                    scope="col"
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[18%]"
                  >
                    Serial
                  </th>
                  <th
                    scope="col"
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[10%]"
                  >
                    Kondisi
                  </th>
                  <th
                    scope="col"
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[10%]"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    class="py-2.5 px-4 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[10%]"
                  >
                    Ditambahkan
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100/80">
                <tr v-for="r in 3" :key="'recent-asset-skel-' + r">
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                      <BaseSkeleton width="32px" height="32px" radius="md" />
                      <div class="space-y-1">
                        <BaseSkeleton width="130px" height="13px" radius="sm" />
                        <BaseSkeleton width="50px" height="10px" radius="sm" />
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <div class="space-y-1">
                      <BaseSkeleton width="90px" height="13px" radius="sm" />
                      <BaseSkeleton width="60px" height="10px" radius="sm" />
                    </div>
                  </td>
                  <td class="py-3 px-4"><BaseSkeleton width="90px" height="12px" radius="sm" /></td>
                  <td class="py-3 px-4"><BaseSkeleton width="60px" height="14px" radius="sm" /></td>
                  <td class="py-3 px-4">
                    <BaseSkeleton width="65px" height="20px" radius="full" />
                  </td>
                  <td class="py-3 px-4 text-right">
                    <BaseSkeleton width="75px" height="12px" radius="sm" class="ml-auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tiket Terbaru Skeleton Table / Card List -->
        <div
          class="shadow-sm rounded-xl border border-[#E2E8F0] bg-white overflow-hidden p-3.5 sm:p-4"
        >
          <div class="mb-3 flex items-center justify-between">
            <BaseSkeleton width="120px" height="16px" radius="md" />
            <BaseSkeleton width="80px" height="24px" radius="full" />
          </div>

          <!-- Mobile Skeleton (Cards) -->
          <div class="block xl:hidden space-y-3">
            <div
              v-for="r in 3"
              :key="'recent-ticket-mob-skel-' + r"
              class="p-3 bg-slate-50/70 rounded-lg space-y-2 border border-slate-100"
            >
              <div class="flex items-center justify-between">
                <BaseSkeleton width="80px" height="18px" radius="sm" />
                <div class="flex gap-1.5">
                  <BaseSkeleton width="50px" height="16px" radius="full" />
                  <BaseSkeleton width="50px" height="16px" radius="full" />
                </div>
              </div>
              <BaseSkeleton width="160px" height="14px" radius="sm" />
              <div class="flex items-center justify-between pt-1 border-t border-slate-100">
                <BaseSkeleton width="100px" height="12px" radius="sm" />
                <BaseSkeleton width="70px" height="12px" radius="sm" />
              </div>
            </div>
          </div>

          <!-- Desktop Skeleton (Table) -->
          <div class="hidden xl:block overflow-x-auto">
            <table class="w-full text-left min-w-[780px]">
              <thead class="bg-slate-50/60 border-b border-slate-100">
                <tr>
                  <th
                    scope="col"
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[14%]"
                  >
                    No. Tiket
                  </th>
                  <th
                    scope="col"
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[38%]"
                  >
                    Judul
                  </th>
                  <th
                    scope="col"
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[18%]"
                  >
                    Assigned To
                  </th>
                  <th
                    scope="col"
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[10%]"
                  >
                    Prioritas
                  </th>
                  <th
                    scope="col"
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[10%]"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    class="py-2.5 px-4 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[10%]"
                  >
                    Tanggal
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100/80">
                <tr v-for="r in 3" :key="'recent-ticket-skel-' + r">
                  <td class="py-3 px-4"><BaseSkeleton width="90px" height="18px" radius="md" /></td>
                  <td class="py-3 px-4">
                    <div class="space-y-1">
                      <BaseSkeleton width="180px" height="13px" radius="sm" />
                      <BaseSkeleton width="70px" height="10px" radius="sm" />
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <BaseSkeleton width="100px" height="13px" radius="sm" />
                  </td>
                  <td class="py-3 px-4">
                    <BaseSkeleton width="55px" height="20px" radius="full" />
                  </td>
                  <td class="py-3 px-4">
                    <BaseSkeleton width="65px" height="20px" radius="full" />
                  </td>
                  <td class="py-3 px-4 text-right">
                    <BaseSkeleton width="75px" height="12px" radius="sm" class="ml-auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════
         ERROR
         ═══════════════════════════════════════════ -->
    <div
      v-else-if="error"
      class="bg-[#FEF3F2] border border-[#FECACA]/40 text-[#DC2626] rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between gap-3"
      role="alert"
    >
      <div class="flex items-center gap-2.5">
        <span aria-hidden="true" class="material-symbols-outlined text-[18px]">error</span>
        <span>{{ error }}</span>
      </div>
      <button
        type="button"
        class="rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-[#DC2626] border border-[#FECACA]/40 hover:bg-[#DC2626] hover:text-white transition-all duration-200"
        @click="fetchStats"
      >
        Coba lagi
      </button>
    </div>

    <!-- ═══════════════════════════════════════════
         DASHBOARD CONTENT
         ═══════════════════════════════════════════ -->
    <template v-else-if="stats">
      <PageHeader
        title="Ringkasan aset & tiket"
        subtitle="Kondisi aset, status penggunaan, dan aktivitas tiket IT terbaru."
        icon="grid_view"
      >
        <QuickActions />
      </PageHeader>
      <div class="dashboard-stats">
        <div class="dash-stat-card stat-total">
          <div class="stat-label">
            <span class="stat-label-text">Total Aset</span>
            <span class="material-symbols-outlined" aria-hidden="true">inventory_2</span>
          </div>
          <p class="stat-number">{{ totalAssets }}</p>
          <span class="stat-caption">Perangkat terdaftar</span>
        </div>
        <div
          v-for="item in [
            {
              label: 'Digunakan',
              count: countDipakai,
              pct: pctDipakai,
              icon: 'check_circle',
              tone: 'green',
            },
            {
              label: 'Stok tersedia',
              count: countTersedia,
              pct: pctTersedia,
              icon: 'inventory',
              tone: 'blue',
            },
            {
              label: 'Rusak',
              count: countRusak,
              pct: pctRusak,
              icon: 'report_problem',
              tone: 'red',
            },
            {
              label: 'Dalam perawatan',
              count: countMaintenance,
              pct: pctMaintenance,
              icon: 'build',
              tone: 'amber',
            },
          ]"
          :key="item.label"
          class="dash-stat-card"
          :class="'stat-' + item.tone"
        >
          <div class="stat-label">
            <span class="stat-label-text">{{ item.label }}</span>
            <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
          </div>
          <p class="stat-number">{{ item.count }}</p>
          <div class="stat-bottom">
            <span class="stat-progress"><span :style="{ width: item.pct + '%' }"></span></span
            ><span>{{ item.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- ─── ROW 2: Line Chart (8 col) + Donut Chart (4 col) ── -->
      <div class="dashboard-chart-grid grid grid-cols-1 xl:grid-cols-12">
        <div class="xl:col-span-8 dashboard-panel">
          <div class="flex items-center justify-between">
            <h3>Tren Aset Bulanan</h3>
          </div>
          <AssetTrendLineChart
            class="w-full"
            :data="stats.monthlyTrend || []"
            :loading="isLoading"
            :error="error"
            :height="200"
            embedded
          />
        </div>
        <div class="xl:col-span-4 dashboard-panel">
          <div class="flex items-center justify-between">
            <h3>Status Aset</h3>
          </div>

          <!-- Empty State -->
          <template v-if="!stats?.byStatus || stats.byStatus.length === 0">
            <div class="py-6 text-center">
              <p class="text-xs text-[#5B6B84]">Belum ada data status.</p>
            </div>
          </template>

          <!-- Status Content -->
          <template v-else>
            <!-- Horizontal Stacked Progress Bar -->
            <div class="mb-4">
              <div class="h-2 flex rounded-lg overflow-hidden bg-[#F1F5F9]">
                <div
                  v-for="item in getSortedByStatus()"
                  :key="item.status"
                  class="h-full transition-all duration-300"
                  :class="getStatusColorClass(item.status)"
                  :style="{ width: getStatusPercentage(item.status) + '%' }"
                  :title="`${item.status}: ${item.count} unit (${getStatusPercentage(item.status)}%)`"
                ></div>
              </div>
            </div>

            <!-- Status Rows: menyebar vertikal agar sejajar dengan panel chart -->
            <div class="flex flex-1 flex-col justify-center gap-2.5">
              <div
                v-for="item in getSortedByStatus()"
                :key="item.status"
                class="flex items-center gap-2.5"
              >
                <!-- Status Indicator -->
                <div
                  class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  :class="getStatusColorClass(item.status)"
                ></div>

                <!-- Label • count • persentase (satu baris, tidak bertumpuk) -->
                <div class="flex flex-1 min-w-0 items-center justify-between gap-2">
                  <span class="text-xs font-semibold text-[#475569] truncate">{{
                    item.status
                  }}</span>
                  <span class="flex shrink-0 items-baseline gap-1.5 font-num">
                    <span class="text-xs font-bold text-[#1E293B]">{{ item.count }}</span>
                    <span class="text-[10px] font-medium text-[#5B6B84]"
                      >{{ getStatusPercentage(item.status) }}%</span
                    >
                  </span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- ─── ROW 3: Bar Chart (7 col) + Pie Chart (5 col) ── -->
      <div class="dashboard-chart-grid grid grid-cols-1 xl:grid-cols-12">
        <div class="xl:col-span-7 dashboard-panel">
          <div class="flex items-center justify-between">
            <h3>Aset Per Tipe</h3>
          </div>
          <AssetTypeBarChart
            class="w-full"
            :data="stats.byType || []"
            :loading="isLoading"
            :error="error"
            :height="220"
            embedded
          />
        </div>
        <div class="xl:col-span-5 dashboard-panel">
          <div class="flex items-center justify-between">
            <h3>Kondisi Aset</h3>
          </div>
          <AssetConditionPieChart
            class="w-full"
            :data="stats.byCondition || []"
            :loading="isLoading"
            :error="error"
            :height="220"
            embedded
          />
        </div>
      </div>

      <!-- ─── ROW 4: CSAT / Kepuasan Penanganan Tiket ────────── -->
      <CsatDashboardSection v-if="canReadTickets" class="dashboard-csat" />

      <!-- ─── ROW 5: Lokasi Aset ─────────────────────────────── -->
      <div class="dashboard-panel location-panel">
        <div class="flex items-center justify-between mb-3 pb-3 border-b border-[#F1F5F9]">
          <div>
            <h3 class="text-sm font-semibold text-[#1E293B]">Sebaran Lokasi Aset</h3>
            <p class="text-xs text-[#5B6B84] mt-1">Lokasi penempatan perangkat saat ini</p>
          </div>
          <span
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A51B0] bg-[#EDF5FF] px-3 py-1.5 rounded-full"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[16px]"
              >location_on</span
            >
            {{ locationBreakdown.length }} Lokasi
          </span>
        </div>

        <div
          v-if="locationBreakdown.length"
          class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
        >
          <div v-for="location in locationBreakdown" :key="location.label" class="location-card">
            <div class="flex items-center justify-between gap-3 mb-3">
              <span class="truncate text-sm font-semibold text-[#1E293B]" :title="location.label">
                {{ location.label }}
              </span>
              <span class="shrink-0 text-sm font-bold text-[#0A51B0] font-num">{{
                location.count
              }}</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-[#E2E8F0] mb-2">
              <div
                class="h-full rounded-full bg-[#0A51B0]"
                :style="{ width: `${location.pct}%` }"
              ></div>
            </div>
            <p class="text-right text-xs font-medium text-[#5B6B84]">{{ location.pct }}%</p>
          </div>
        </div>
        <div v-else class="py-8 text-center">
          <p class="text-sm text-[#5B6B84]">Belum ada data lokasi.</p>
        </div>
      </div>

      <!-- ─── ROW 6: Tabel 5 Aset Terbaru ────────────────────── -->
      <div v-if="canReadAssets" class="dashboard-table">
        <div class="flex items-center justify-between border-b border-slate-100 bg-white">
          <div class="min-w-0 pr-3">
            <h3 class="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              Aset Terbaru
            </h3>
            <p class="text-[12px] sm:text-xs text-slate-500 mt-0.5 truncate">
              Lima perangkat terbaru yang terdaftar di sistem
            </p>
          </div>
          <RouterLink to="/assets" class="table-link touch-manipulation">
            <span>Lihat Semua</span>
            <span aria-hidden="true" class="material-symbols-outlined text-[15px]"
              >arrow_forward</span
            >
          </RouterLink>
        </div>

        <!-- Mobile Card List View (Clean, Readable & Zero Horizontal Scroll on < md) -->
        <div class="dashboard-recent-cards block xl:hidden divide-y divide-[#F1F5F9]">
          <div
            v-for="asset in recentAssets"
            :key="'mob-asset-' + asset.id_aset"
            class="p-3.5 sm:p-4 hover:bg-[#F8FAFC] transition-colors flex flex-col gap-2.5"
          >
            <!-- Top Row: Icon + Label & ID + Status Badge -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="w-8 h-8 rounded-lg bg-blue-50 text-[#0A51B0] flex items-center justify-center shrink-0"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[18px]">
                    {{
                      asset.tipe_perangkat?.toLowerCase().includes('laptop')
                        ? 'laptop_mac'
                        : asset.tipe_perangkat?.toLowerCase().includes('server')
                          ? 'dns'
                          : asset.tipe_perangkat?.toLowerCase().includes('printer')
                            ? 'print'
                            : 'computer'
                    }}
                  </span>
                </div>
                <div class="min-w-0">
                  <p class="text-xs sm:text-sm font-bold text-[#1E293B] truncate leading-tight">
                    {{ asset.label_aset }}
                  </p>
                  <p class="text-[11px] text-[#5B6B84] font-mono mt-0.5">ID #{{ asset.id_aset }}</p>
                </div>
              </div>

              <AppBadge
                :type="getStatusBadgeType(asset.status_aset)"
                :text="getAssetStatusLabel(asset.status_aset)"
                class="shrink-0 text-[11px] whitespace-nowrap"
              />
            </div>

            <!-- Mid Row: Metadata specs (Merek & Tipe, Serial) -->
            <div
              class="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 p-2.5 rounded-lg border border-slate-100"
            >
              <div class="min-w-0">
                <span class="block text-[10px] uppercase font-semibold text-[#5B6B84]"
                  >Merek &amp; Tipe</span
                >
                <span class="font-medium text-[#1E293B] truncate block text-[12px]">
                  {{ asset.merek || '—' }}
                  <span v-if="asset.tipe_perangkat" class="text-slate-400 font-normal"
                    >({{ asset.tipe_perangkat }})</span
                  >
                </span>
              </div>
              <div class="min-w-0">
                <span class="block text-[10px] uppercase font-semibold text-[#5B6B84]">Serial</span>
                <span class="font-mono text-[11px] text-[#5B6B84] truncate block font-medium">
                  {{ asset.nomor_seri || '—' }}
                </span>
              </div>
            </div>

            <!-- Bottom Row: Kondisi & Tanggal Ditambahkan -->
            <div class="flex items-center justify-between text-[11px] text-[#5B6B84] pt-0.5">
              <div class="flex items-center gap-1.5">
                <span class="text-[#5B6B84]">Kondisi:</span>
                <span class="font-semibold text-[#1E293B]">{{
                  asset.kondisi_aset || 'Normal'
                }}</span>
              </div>
              <div class="flex items-center gap-1 text-[11px] text-[#5B6B84]">
                <span aria-hidden="true" class="material-symbols-outlined text-[13px]"
                  >calendar_today</span
                >
                <span>{{ formatDate(asset.dibuat_pada) }}</span>
              </div>
            </div>
          </div>

          <div v-if="recentAssets.length === 0" class="py-7 text-center">
            <p class="text-xs text-[#5B6B84]">Belum ada aset terdaftar.</p>
          </div>
        </div>

        <!-- Desktop Table View (>= md) -->
        <div class="hidden xl:block overflow-x-auto">
          <table class="w-full text-left min-w-[760px]">
            <thead class="bg-slate-50/60 border-b border-slate-100">
              <tr>
                <th
                  scope="col"
                  class="w-[32%] min-w-[220px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Perangkat
                </th>
                <th
                  scope="col"
                  class="w-[20%] min-w-[140px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Merek &amp; Tipe
                </th>
                <th
                  scope="col"
                  class="w-[18%] min-w-[130px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Serial
                </th>
                <th
                  scope="col"
                  class="w-[10%] min-w-[90px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Kondisi
                </th>
                <th
                  scope="col"
                  class="w-[10%] min-w-[90px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Status
                </th>
                <th
                  scope="col"
                  class="w-[10%] min-w-[90px] text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Ditambahkan
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100/80">
              <tr
                v-for="asset in recentAssets"
                :key="asset.id_aset"
                class="hover:bg-slate-100/80 transition-colors duration-150 group"
              >
                <td class="py-3 px-4 align-middle">
                  <div class="flex items-center gap-3 min-w-0">
                    <div
                      class="w-8 h-8 rounded-lg bg-slate-100/80 text-blue-600 flex items-center justify-center shrink-0 border border-slate-200/60 group-hover:border-blue-200 group-hover:bg-blue-50/60 transition-colors"
                    >
                      <span aria-hidden="true" class="material-symbols-outlined text-[17px]">
                        {{
                          asset.tipe_perangkat?.toLowerCase().includes('laptop')
                            ? 'laptop_mac'
                            : asset.tipe_perangkat?.toLowerCase().includes('server')
                              ? 'dns'
                              : asset.tipe_perangkat?.toLowerCase().includes('printer')
                                ? 'print'
                                : 'computer'
                        }}
                      </span>
                    </div>
                    <div class="min-w-0 pr-2">
                      <p
                        class="text-xs sm:text-[13px] font-semibold text-slate-900 leading-snug truncate group-hover:text-blue-600 transition-colors"
                        :title="asset.label_aset"
                      >
                        {{ asset.label_aset }}
                      </p>
                      <p class="text-[11px] font-mono text-slate-400 mt-0.5">
                        ID #{{ asset.id_aset }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="py-3 px-4 align-middle">
                  <div class="min-w-0">
                    <p
                      class="text-xs font-medium text-slate-800 truncate"
                      :title="asset.merek || '—'"
                    >
                      {{ asset.merek || '—' }}
                    </p>
                    <p
                      v-if="asset.tipe_perangkat"
                      class="text-[11px] text-slate-400 truncate mt-0.5"
                    >
                      {{ asset.tipe_perangkat }}
                    </p>
                  </div>
                </td>
                <td class="py-3 px-4 align-middle">
                  <span
                    class="font-mono text-xs text-slate-600 font-medium truncate block"
                    :title="asset.nomor_seri || '—'"
                  >
                    {{ asset.nomor_seri || '—' }}
                  </span>
                </td>
                <td class="py-3 px-4 align-middle whitespace-nowrap">
                  <span class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <span
                      class="w-1.5 h-1.5 rounded-full shrink-0"
                      :class="
                        asset.kondisi_aset?.toLowerCase() === 'baik'
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      "
                    />
                    {{ asset.kondisi_aset || '—' }}
                  </span>
                </td>
                <td class="py-3 px-4 align-middle whitespace-nowrap">
                  <AppBadge
                    :type="getStatusBadgeType(asset.status_aset)"
                    :text="getAssetStatusLabel(asset.status_aset)"
                    class="whitespace-nowrap"
                  />
                </td>
                <td class="py-3 px-4 align-middle text-right whitespace-nowrap">
                  <span class="text-xs font-medium text-slate-400">
                    {{ formatDate(asset.dibuat_pada) }}
                  </span>
                </td>
              </tr>
              <tr v-if="recentAssets.length === 0">
                <td colspan="6" class="py-8 text-center">
                  <p class="text-xs text-slate-400">Belum ada aset terdaftar.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ─── ROW 7: Tabel Tiket Permintaan Terbaru ────────────────── -->
      <div v-if="canReadTickets" class="dashboard-table">
        <div class="flex items-center justify-between border-b border-slate-100 bg-white">
          <div class="min-w-0 pr-3">
            <h3 class="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              Tiket Terbaru
            </h3>
            <p class="text-[12px] sm:text-xs text-slate-500 mt-0.5 truncate">
              Lima laporan kendala &amp; permintaan IT terbaru
            </p>
          </div>
          <RouterLink to="/tickets" class="table-link touch-manipulation">
            <span>Lihat Semua</span>
            <span aria-hidden="true" class="material-symbols-outlined text-[15px]"
              >arrow_forward</span
            >
          </RouterLink>
        </div>

        <!-- Mobile Card List View (Clean, Readable & Zero Horizontal Scroll on < md) -->
        <div class="block xl:hidden divide-y divide-[#F1F5F9]">
          <div
            v-for="ticket in recentTickets"
            :key="'mob-ticket-' + ticket.id"
            class="p-3.5 sm:p-4 hover:bg-[#F8FAFC] transition-colors flex flex-col gap-2"
          >
            <!-- Top Row: No. Tiket + Badges (Prioritas & Status) -->
            <div class="flex items-center justify-between gap-2">
              <span
                class="font-mono text-xs font-bold text-[#0A51B0] bg-blue-50/70 border border-blue-100 px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap"
              >
                {{ ticket.nomor_tiket || `TCK-#${ticket.id}` }}
              </span>

              <div class="flex items-center gap-1.5 shrink-0">
                <AppBadge
                  :type="getPriorityBadgeType(ticket.prioritas)"
                  :text="ticket.prioritas"
                  class="text-[10px] whitespace-nowrap shrink-0"
                />
                <AppBadge
                  :type="getTicketStatusBadgeType(ticket.status_tiket)"
                  :text="ticket.status_tiket"
                  class="text-[10px] whitespace-nowrap shrink-0"
                />
              </div>
            </div>

            <!-- Mid: Judul Tiket -->
            <div>
              <p class="text-xs sm:text-sm font-bold text-[#1E293B] leading-snug">
                {{ ticket.judul }}
              </p>
            </div>

            <!-- Bottom Row: Pelapor, Assigned To & Tanggal -->
            <div
              class="flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 text-[11px] text-[#5B6B84] pt-1 border-t border-slate-50"
            >
              <div class="flex items-center gap-1 min-w-0">
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[14px] text-[#5B6B84] shrink-0"
                  >person</span
                >
                <span class="truncate">
                  <span class="text-slate-400">Ditangani:</span>
                  <strong class="font-semibold text-slate-700 ml-0.5">{{
                    ticket.assigned_to || 'Belum ditugaskan'
                  }}</strong>
                </span>
              </div>

              <div class="flex items-center gap-1 text-[11px] text-[#5B6B84] shrink-0">
                <span aria-hidden="true" class="material-symbols-outlined text-[13px]"
                  >calendar_today</span
                >
                <span>{{ formatDate(ticket.dibuat_pada) }}</span>
              </div>
            </div>
          </div>

          <div v-if="recentTickets.length === 0" class="py-7 text-center">
            <p class="text-xs text-[#5B6B84]">Belum ada tiket masuk.</p>
          </div>
        </div>

        <!-- Desktop Table View (>= md) -->
        <div class="hidden xl:block overflow-x-auto">
          <table class="w-full text-left min-w-[780px]">
            <thead class="bg-slate-50/60 border-b border-slate-100">
              <tr>
                <th
                  scope="col"
                  class="w-[14%] min-w-[125px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  No. Tiket
                </th>
                <th
                  scope="col"
                  class="w-[38%] min-w-[250px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Judul
                </th>
                <th
                  scope="col"
                  class="w-[18%] min-w-[135px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Assigned To
                </th>
                <th
                  scope="col"
                  class="w-[10%] min-w-[85px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Prioritas
                </th>
                <th
                  scope="col"
                  class="w-[10%] min-w-[95px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Status
                </th>
                <th
                  scope="col"
                  class="w-[10%] min-w-[90px] text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Tanggal
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100/80">
              <tr
                v-for="ticket in recentTickets"
                :key="ticket.id"
                class="hover:bg-slate-100/80 transition-colors duration-150 group"
              >
                <td class="py-3 px-4 align-middle whitespace-nowrap">
                  <span
                    class="font-mono text-xs font-semibold text-blue-600 bg-blue-50/70 border border-blue-100 px-2 py-0.5 rounded-md inline-block whitespace-nowrap"
                  >
                    {{ ticket.nomor_tiket || `TCK-#${ticket.id}` }}
                  </span>
                </td>
                <td class="py-3 px-4 align-middle">
                  <div class="min-w-0 pr-2">
                    <p
                      class="text-xs sm:text-[13px] font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors"
                      :title="ticket.judul"
                    >
                      {{ ticket.judul }}
                    </p>
                    <p class="text-[11px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                      <span>Pelapor:</span>
                      <span class="font-medium text-slate-600">{{ ticket.pelapor || 'User' }}</span>
                    </p>
                  </div>
                </td>
                <td class="py-3 px-4 align-middle">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span
                      aria-hidden="true"
                      class="material-symbols-outlined text-[16px] shrink-0"
                      :class="ticket.assigned_to ? 'text-slate-400' : 'text-amber-500'"
                    >
                      {{ ticket.assigned_to ? 'person' : 'person_off' }}
                    </span>
                    <span
                      class="text-xs truncate"
                      :class="
                        ticket.assigned_to
                          ? 'font-medium text-slate-700'
                          : 'font-semibold text-amber-700'
                      "
                      :title="ticket.assigned_to || 'Belum ditugaskan'"
                    >
                      {{ ticket.assigned_to || 'Belum ditugaskan' }}
                    </span>
                  </div>
                </td>
                <td class="py-3 px-4 align-middle whitespace-nowrap">
                  <AppBadge
                    :type="getPriorityBadgeType(ticket.prioritas)"
                    :text="ticket.prioritas"
                    class="whitespace-nowrap"
                  />
                </td>
                <td class="py-3 px-4 align-middle whitespace-nowrap">
                  <AppBadge
                    :type="getTicketStatusBadgeType(ticket.status_tiket)"
                    :text="ticket.status_tiket"
                    class="whitespace-nowrap"
                  />
                </td>
                <td class="py-3 px-4 align-middle text-right whitespace-nowrap">
                  <span class="text-xs font-medium text-slate-400">
                    {{ formatDate(ticket.dibuat_pada) }}
                  </span>
                </td>
              </tr>
              <tr v-if="recentTickets.length === 0">
                <td colspan="6" class="py-8 text-center">
                  <p class="text-xs text-slate-400">Belum ada tiket masuk.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 1500px;
  margin: 0 auto;
  padding: 4px 0 16px;
  color: #1e293b;
}
.dashboard-intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 5px 0 2px;
}
.dashboard-intro h2 {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.3;
}
.dashboard-intro h2 + p {
  font-size: 12px;
  color: #5b6b84;
  line-height: 1.6;
  margin-top: 6px;
}
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}
.dash-stat-card {
  --stat-color: #4d7fc2;
  min-width: 0;
  padding: 15px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.1s ease;
}
.dash-stat-card:hover {
  border-color: var(--stat-color);
  box-shadow: 0 3px 12px rgba(10, 81, 176, 0.08);
}
.stat-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  font-size: 11px;
  font-weight: 550;
  color: #5b6b84;
  line-height: 1.5;
}
.stat-label > .material-symbols-outlined {
  font-size: 18px;
  color: var(--stat-color);
  flex-shrink: 0;
}
.stat-number {
  font-size: 19px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: #1e293b;
  margin: 10px 0 8px;
}
.stat-caption {
  font-size: 11px;
  color: #5b6b84;
}
.stat-total {
  background: #0a51b0;
  border-color: #0a51b0;
}
.stat-total .stat-number {
  color: white;
}
.stat-total .stat-label,
.stat-total .stat-label > .material-symbols-outlined {
  color: #d9e7fb;
}
.stat-green {
  --stat-color: #047857;
}
.stat-blue {
  --stat-color: #0a51b0;
}
.stat-red {
  --stat-color: #b91c1c;
}
.stat-amber {
  --stat-color: #b45309;
}
.stat-bottom {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 10px;
  color: #5b6b84;
  font-variant-numeric: tabular-nums;
}
.stat-progress > span {
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.stat-progress {
  display: block;
  height: 4px;
  background: #edf1f6;
  flex: 1;
  overflow: hidden;
  border-radius: 4px;
}
.stat-progress > span {
  display: block;
  height: 100%;
  background: var(--stat-color);
  border-radius: inherit;
}
.dashboard-chart-grid {
  gap: 14px;
}
.dashboard-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: white;
  padding: 16px 18px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}
.dashboard-panel > div:first-child {
  flex-shrink: 0;
}
.dashboard-panel h3 {
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: #1e293b;
}
.dashboard-panel > div:first-child {
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.dashboard-panel :deep(canvas) {
  max-width: 100%;
}
.location-card {
  border: 1px solid #e7ecf3;
  border-radius: 9px;
  background: #f8fafc;
  padding: 16px;
}
.dashboard-table {
  min-width: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}
.dashboard-table > div:first-child {
  gap: 10px;
}
.dashboard-table h3 {
  font-size: 14px;
  font-weight: 650;
}
.dashboard-table table thead {
  background: #f8fafc;
}
.dashboard-table table th {
  font-weight: 600;
  font-size: 10px;
  color: #7b8aa0;
}
.dashboard-table table td {
  padding-top: 11px;
  padding-bottom: 11px;
}
.dashboard-csat :deep(.shadow-card) {
  box-shadow: none;
  border-radius: 12px;
  border-color: #e2e8f0;
}
.dashboard-csat :deep(.shadow-card h3) {
  font-size: 14px;
  font-weight: 650;
  color: #1e293b;
}
.dashboard-csat > div > h3 {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}
.dashboard-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

@media (max-width: 1199px) {
  .dashboard-stats {
    gap: 10px;
  }

  .dash-stat-card {
    padding: 14px 12px;
  }

  .stat-label {
    font-size: 11px;
  }

  .stat-number {
    font-size: 18px;
  }
}
@media (max-width: 767px) {
  .dashboard-view {
    gap: 18px;
  }
  .dashboard-intro {
    flex-wrap: wrap;
    gap: 12px;
  }
  .dashboard-intro h2 {
    font-size: 19px;
  }
  .dashboard-intro h2 + p {
    font-size: 11px;
    max-width: 310px;
  }
  .dashboard-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .stat-total,
  .dashboard-stat-skeleton > :first-child {
    grid-column: 1 / -1;
  }
  .stat-total {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 5px 20px;
  }
  .stat-total .stat-label {
    justify-content: flex-start;
    gap: 10px;
  }
  .stat-total .stat-number {
    grid-column: 2;
    grid-row: 1 / 3;
    margin: 0;
    font-size: 34px;
  }
  .dash-stat-card {
    padding: 14px;
  }
  .stat-number {
    font-size: 24px;
    margin: 13px 0 12px;
  }
  .dashboard-panel {
    padding: 14px;
  }
  .dashboard-chart-grid {
    gap: 14px;
  }
  .dashboard-panel > div:first-child {
    margin-bottom: 16px;
  }
  .location-card {
    padding: 14px;
  }
  .dashboard-table > div:first-child {
    padding: 16px;
  }
  .dashboard-table > div:first-child a {
    min-height: 44px;
  }
  .dashboard-table > div:first-child p {
    white-space: normal;
    line-height: 1.6;
  }
  .dashboard-csat :deep(.shadow-card) {
    padding: 14px;
  }
}
/* ── Konsolidasi layer (menggantikan style block duplikat) ───────── */

/* Kartu intro: elevated + gradient CTA sama dengan stat-total */
.dashboard-intro {
  padding: 16px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}

/* Ikon stat-label: chip dengan latar lembut, konsisten di semua kartu */
.stat-label > .material-symbols-outlined {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #f1f5f9;
}
.stat-label-text {
  min-width: 0;
}
.stat-total {
  background: linear-gradient(125deg, #0a51b0, #097cde);
}
.stat-total .stat-label > .material-symbols-outlined {
  background: rgba(255, 255, 255, 0.12);
}
.stat-total .stat-label,
.stat-total .stat-label > .material-symbols-outlined {
  color: #d9e7fb;
}
.stat-total .stat-caption {
  color: #9dbde4;
}

/* Heading panel: satu ukuran, satu gaya untuk semua kartu grafik */
.dashboard-panel h3,
.dashboard-table h3 {
  font-size: 14px;
  font-weight: 650;
  color: #1e293b;
}
.dashboard-panel > div:first-child {
  margin-bottom: 14px;
}

/* Tabel dashboard: header sentence-case, baris lega, link aksi konsisten */
.dashboard-table table th {
  text-transform: none;
  letter-spacing: 0;
  font-size: 11px;
  font-weight: 600;
  color: #5b6b84;
}
.dashboard-table table td {
  padding-block: 11px;
}
.dashboard-table > div:first-child {
  padding: 14px 18px;
}
.dashboard-table > div:first-child :is(h3, p) {
  white-space: normal;
}
.table-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #dbeafe;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
  touch-action: manipulation;
}
.table-link:hover {
  background: #0a51b0;
  color: #ffffff;
  border-color: #0a51b0;
}
.table-link:active {
  background: #0a4391;
  border-color: #0a4391;
  transform: scale(0.97);
}

/* Kartu lokasi & recent-cards */
.location-card {
  background: #fafbfd;
  border-radius: 10px;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}
.location-card:hover {
  border-color: #0a51b0;
  background: #f4f8fe;
}
.dashboard-recent-cards > div {
  transition: background-color 0.15s ease;
}
.dashboard-recent-cards > div:hover {
  background: #f4f8fe;
}
.dashboard-recent-cards > div {
  padding: 18px;
  gap: 12px;
}
.dashboard-recent-cards > div > div:first-child {
  flex-wrap: wrap;
  gap: 10px;
}

/* Aksesibilitas: fokus terlihat untuk semua kontrol */
.dashboard-view :is(button, a):focus-visible {
  outline: 2px solid #097cde;
  outline-offset: 3px;
}

/* Tablet 768–1279: 4 kolom stat, recent cards 2 kolom */
@media (min-width: 768px) and (max-width: 1279px) {
  .dashboard-stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .stat-total {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }
  .stat-total .stat-number {
    margin: 0;
  }
  .dashboard-recent-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .dashboard-recent-cards > div {
    border: 1px solid #edf1f6;
  }
}

@media (max-width: 767px) {
  .dashboard-table > div:first-child {
    padding: 16px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .dashboard-table > div:first-child > div {
    padding-right: 0;
  }
  .dashboard-recent-cards > div {
    padding: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-view * {
    transition: none !important;
  }
}
</style>

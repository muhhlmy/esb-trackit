<script setup>
// ============================================================
// DashboardView.vue — Dashboard monitoring bergaya Fynix
// Data real dari endpoint /api/assets/stats
// ============================================================
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import { useAuth } from '../composables/useAuth.js'
import { onTicketEvent } from '../composables/useTicketRealtime.js'
import AppBadge from '../components/ui/AppBadge.vue'
import AssetTrendLineChart from '../components/charts/AssetTrendLineChart.vue'
import AssetTypeBarChart from '../components/charts/AssetTypeBarChart.vue'
import AssetConditionPieChart from '../components/charts/AssetConditionPieChart.vue'
import CsatDashboardSection from '../components/charts/CsatDashboardSection.vue'
import { getAssetStatusLabel } from '../utils/assetStatus.js'
import { normalizeLocation } from '../utils/locationNormalizer.js'
import { animateStagger } from '../composables/useGsap.js'
import BaseSkeleton from '../components/ui/skeleton/BaseSkeleton.vue'
import SkeletonCard from '../components/ui/skeleton/SkeletonCard.vue'
import SkeletonChart from '../components/ui/skeleton/SkeletonChart.vue'

const { get } = useApi()
const { hasPermission, hasWritePermission } = useAuth()
const router = useRouter()
const canReadAssets = computed(() => hasPermission('assets'))
const canWriteAssets = computed(() => hasWritePermission('assets'))
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

// ── Dashboard Actions ────────────────────────────────────────
function goToAddAsset() {
  if (!canWriteAssets.value) return
  router.push({ path: '/assets', query: { action: 'add' } })
}

// ── Helpers ──────────────────────────────────────────────────
function getStatusBadgeType(status) {
  const s = (status || '').toLowerCase()
  if (s === 'digunakan') return 'success'
  if (s === 'tersedia') return 'info'
  if (s === 'maintenance') return 'warning'
  if (s === 'rusak') return 'danger'
  if (s === 'disposal') return 'default'
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
  return 'bg-[#94A3B8]'
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
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        <div class="lg:col-span-8">
          <SkeletonChart type="line" height="260px" />
        </div>
        <div class="lg:col-span-4">
          <SkeletonChart type="donut" height="260px" />
        </div>
      </div>

      <!-- Row 3: Asset Type (6 col) + Condition (6 col) Skeleton -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        <div class="lg:col-span-6">
          <SkeletonChart type="bar" height="240px" />
        </div>
        <div class="lg:col-span-6">
          <SkeletonChart type="pie" height="240px" />
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
          <div class="block md:hidden space-y-3">
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
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full text-left min-w-[760px]">
              <thead class="bg-slate-50/60 border-b border-slate-100">
                <tr>
                  <th
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[32%]"
                  >
                    Perangkat
                  </th>
                  <th
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[20%]"
                  >
                    Merek &amp; Tipe
                  </th>
                  <th
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[18%]"
                  >
                    Serial
                  </th>
                  <th
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[10%]"
                  >
                    Kondisi
                  </th>
                  <th
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[10%]"
                  >
                    Status
                  </th>
                  <th
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
          <div class="block md:hidden space-y-3">
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
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full text-left min-w-[780px]">
              <thead class="bg-slate-50/60 border-b border-slate-100">
                <tr>
                  <th
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[14%]"
                  >
                    No. Tiket
                  </th>
                  <th
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[38%]"
                  >
                    Judul
                  </th>
                  <th
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[18%]"
                  >
                    Assigned To
                  </th>
                  <th
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[10%]"
                  >
                    Prioritas
                  </th>
                  <th
                    class="py-2.5 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-[10%]"
                  >
                    Status
                  </th>
                  <th
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
        <span class="material-symbols-outlined text-[18px]">error</span>
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
      <div class="dashboard-intro">
        <div>
          <p class="dashboard-eyebrow">RINGKASAN OPERASIONAL</p>
          <h2>Inventaris & layanan</h2>
          <p>Pantau penggunaan aset, kondisi perangkat, dan permintaan terbaru.</p>
        </div>
        <button v-if="canWriteAssets" type="button" class="dashboard-add" @click="goToAddAsset">
          <span class="material-symbols-outlined" aria-hidden="true">add</span>Tambah aset
        </button>
      </div>
      <div class="dashboard-stats">
        <div class="dash-stat-card stat-total">
          <div class="stat-label">
            Total aset<span class="material-symbols-outlined" aria-hidden="true">inventory_2</span>
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
            {{ item.label
            }}<span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
          </div>
          <p class="stat-number">{{ item.count }}</p>
          <div class="stat-bottom">
            <span class="stat-progress"><span :style="{ width: item.pct + '%' }"></span></span
            ><span>{{ item.pct }}%</span>
          </div>
        </div>
      </div>

      <!-- ─── ROW 2: Line Chart (8 col) + Donut Chart (4 col) ── -->
      <div class="dashboard-chart-grid grid grid-cols-1 lg:grid-cols-12">
        <div class="lg:col-span-8 dashboard-panel">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-[#333333]">Tren Aset Bulanan</h3>
            <span class="text-[10px] font-medium text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md"
              >Per Bulan</span
            >
          </div>
          <AssetTrendLineChart
            class="w-full"
            :data="stats.monthlyTrend || []"
            :loading="isLoading"
            :error="error"
          />
        </div>
        <div class="lg:col-span-4 dashboard-panel">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-[#333333]">Status Aset</h3>
            <span class="text-[10px] font-medium text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md"
              >Distribusi</span
            >
          </div>

          <!-- Empty State -->
          <template v-if="!stats?.byStatus || stats.byStatus.length === 0">
            <div class="py-6 text-center">
              <p class="text-xs text-[#94A3B8]">Belum ada data status aset.</p>
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

            <!-- Status Rows -->
            <div class="space-y-2.5">
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

                <!-- Label & Count -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-semibold text-[#475569] truncate">{{
                      item.status
                    }}</span>
                    <span class="text-xs font-bold text-[#333333] font-num">{{ item.count }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-2 mt-1">
                    <span class="text-[10px] text-[#94A3B8]"
                      >{{ getStatusPercentage(item.status) }}%</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- ─── ROW 3: Bar Chart (7 col) + Pie Chart (5 col) ── -->
      <div class="dashboard-chart-grid grid grid-cols-1 lg:grid-cols-12">
        <div class="lg:col-span-7 dashboard-panel">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-[#333333]">Aset Per Tipe</h3>
            <span class="text-xs font-medium text-[#64748B] bg-[#F1F5F9] px-2.5 py-1 rounded-lg"
              >Kategori</span
            >
          </div>
          <AssetTypeBarChart
            class="w-full"
            :data="stats.byType || []"
            :loading="isLoading"
            :error="error"
          />
        </div>
        <div class="lg:col-span-5 dashboard-panel">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-[#333333]">Kondisi Aset</h3>
            <span class="text-xs font-medium text-[#64748B] bg-[#F1F5F9] px-2.5 py-1 rounded-lg"
              >Persentase</span
            >
          </div>
          <AssetConditionPieChart
            class="w-full"
            :data="stats.byCondition || []"
            :loading="isLoading"
            :error="error"
          />
        </div>
      </div>

      <!-- ─── ROW 4: CSAT / Kepuasan Penanganan Tiket ────────── -->
      <CsatDashboardSection v-if="canReadTickets" class="dashboard-csat" />

      <!-- ─── ROW 5: Lokasi Aset ─────────────────────────────── -->
      <div class="dashboard-panel location-panel">
        <div class="flex items-center justify-between mb-5 pb-4 border-b border-[#F1F5F9]">
          <div>
            <h3 class="text-sm font-semibold text-[#333333]">Sebaran Lokasi Aset</h3>
            <p class="text-xs text-[#64748B] mt-1">Lokasi penempatan perangkat saat ini</p>
          </div>
          <span
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B82F6] bg-[#EFF6FF] px-3 py-1.5 rounded-full"
          >
            <span class="material-symbols-outlined text-[16px]" style="opacity: 0.7"
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
              <span class="truncate text-sm font-semibold text-[#333333]" :title="location.label">
                {{ location.label }}
              </span>
              <span class="shrink-0 text-sm font-bold text-[#3B82F6] font-num">{{
                location.count
              }}</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-[#E2E8F0] mb-2">
              <div
                class="h-full rounded-full bg-[#638dcc]"
                :style="{ width: `${location.pct}%` }"
              ></div>
            </div>
            <p class="text-right text-xs font-medium text-[#64748B]">{{ location.pct }}%</p>
          </div>
        </div>
        <div v-else class="py-8 text-center">
          <p class="text-sm text-[#64748B]">Belum ada data lokasi aset.</p>
        </div>
      </div>

      <!-- ─── ROW 6: Tabel 5 Aset Terbaru ────────────────────── -->
      <div v-if="canReadAssets" class="dashboard-table">
        <div
          class="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 bg-white"
        >
          <div class="min-w-0 pr-3">
            <h3 class="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              Aset Terbaru
            </h3>
            <p class="text-[11.5px] sm:text-xs text-slate-500 mt-0.5 truncate">
              5 Perangkat IT paling baru dalam sistem
            </p>
          </div>
          <RouterLink
            to="/assets"
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50/70 hover:bg-blue-100/80 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100/60 transition-all duration-150 shrink-0 active:scale-95 touch-manipulation"
          >
            <span>Lihat Semua</span>
            <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
          </RouterLink>
        </div>

        <!-- Mobile Card List View (Clean, Readable & Zero Horizontal Scroll on < md) -->
        <div class="block md:hidden divide-y divide-[#F1F5F9]">
          <div
            v-for="asset in recentAssets"
            :key="'mob-asset-' + asset.id_aset"
            class="p-3.5 sm:p-4 hover:bg-[#F8FAFC] transition-colors flex flex-col gap-2.5"
          >
            <!-- Top Row: Icon + Label & ID + Status Badge -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="w-8 h-8 rounded-lg bg-blue-50 text-[#3B82F6] flex items-center justify-center shrink-0"
                >
                  <span class="material-symbols-outlined text-[18px]">
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
                  <p class="text-xs sm:text-sm font-bold text-[#333333] truncate leading-tight">
                    {{ asset.label_aset }}
                  </p>
                  <p class="text-[11px] text-[#64748B] font-mono mt-0.5">ID #{{ asset.id_aset }}</p>
                </div>
              </div>

              <AppBadge
                :type="getStatusBadgeType(asset.status_aset)"
                :text="asset.status_aset || 'Available'"
                class="shrink-0 text-[10.5px] whitespace-nowrap"
              />
            </div>

            <!-- Mid Row: Metadata specs (Merek & Tipe, Serial) -->
            <div
              class="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 p-2.5 rounded-lg border border-slate-100"
            >
              <div class="min-w-0">
                <span class="block text-[10px] uppercase font-semibold text-[#94A3B8]"
                  >Merek &amp; Tipe</span
                >
                <span class="font-medium text-[#333333] truncate block text-[11.5px]">
                  {{ asset.merek || '—' }}
                  <span v-if="asset.tipe_perangkat" class="text-slate-400 font-normal"
                    >({{ asset.tipe_perangkat }})</span
                  >
                </span>
              </div>
              <div class="min-w-0">
                <span class="block text-[10px] uppercase font-semibold text-[#94A3B8]">Serial</span>
                <span class="font-mono text-[11px] text-[#64748B] truncate block font-medium">
                  {{ asset.nomor_seri || '—' }}
                </span>
              </div>
            </div>

            <!-- Bottom Row: Kondisi & Tanggal Ditambahkan -->
            <div class="flex items-center justify-between text-[11px] text-[#64748B] pt-0.5">
              <div class="flex items-center gap-1.5">
                <span class="text-[#94A3B8]">Kondisi:</span>
                <span class="font-semibold text-[#333333]">{{
                  asset.kondisi_aset || 'Normal'
                }}</span>
              </div>
              <div class="flex items-center gap-1 text-[10.5px] text-[#94A3B8]">
                <span class="material-symbols-outlined text-[13px]">calendar_today</span>
                <span>{{ formatDate(asset.dibuat_pada) }}</span>
              </div>
            </div>
          </div>

          <div v-if="recentAssets.length === 0" class="py-7 text-center">
            <p class="text-xs text-[#64748B]">Belum ada data aset.</p>
          </div>
        </div>

        <!-- Desktop Table View (>= md) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left min-w-[760px]">
            <thead class="bg-slate-50/60 border-b border-slate-100">
              <tr>
                <th
                  class="w-[32%] min-w-[220px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Perangkat
                </th>
                <th
                  class="w-[20%] min-w-[140px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Merek &amp; Tipe
                </th>
                <th
                  class="w-[18%] min-w-[130px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Serial
                </th>
                <th
                  class="w-[10%] min-w-[90px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Kondisi
                </th>
                <th
                  class="w-[10%] min-w-[90px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Status
                </th>
                <th
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
                class="hover:bg-slate-50/60 transition-colors duration-150 group"
              >
                <td class="py-3 px-4 align-middle">
                  <div class="flex items-center gap-3 min-w-0">
                    <div
                      class="w-8 h-8 rounded-lg bg-slate-100/80 text-blue-600 flex items-center justify-center shrink-0 border border-slate-200/60 group-hover:border-blue-200 group-hover:bg-blue-50/60 transition-colors"
                    >
                      <span class="material-symbols-outlined text-[17px]">
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
                    :text="asset.status_aset"
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
                  <p class="text-xs text-slate-400">Belum ada data aset.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ─── ROW 7: Tabel Tiket Permintaan Terbaru ────────────────── -->
      <div v-if="canReadTickets" class="dashboard-table">
        <div
          class="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 bg-white"
        >
          <div class="min-w-0 pr-3">
            <h3 class="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              Tiket Terbaru
            </h3>
            <p class="text-[11.5px] sm:text-xs text-slate-500 mt-0.5 truncate">
              5 Laporan kendala &amp; permintaan IT terbaru
            </p>
          </div>
          <RouterLink
            to="/tickets"
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50/70 hover:bg-blue-100/80 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100/60 transition-all duration-150 shrink-0 active:scale-95 touch-manipulation"
          >
            <span>Lihat Semua</span>
            <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
          </RouterLink>
        </div>

        <!-- Mobile Card List View (Clean, Readable & Zero Horizontal Scroll on < md) -->
        <div class="block md:hidden divide-y divide-[#F1F5F9]">
          <div
            v-for="ticket in recentTickets"
            :key="'mob-ticket-' + ticket.id"
            class="p-3.5 sm:p-4 hover:bg-[#F8FAFC] transition-colors flex flex-col gap-2"
          >
            <!-- Top Row: No. Tiket + Badges (Prioritas & Status) -->
            <div class="flex items-center justify-between gap-2">
              <span
                class="font-mono text-xs font-bold text-[#3B82F6] bg-blue-50/70 border border-blue-100 px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap"
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
              <p class="text-xs sm:text-sm font-bold text-[#333333] leading-snug">
                {{ ticket.judul }}
              </p>
            </div>

            <!-- Bottom Row: Pelapor, Assigned To & Tanggal -->
            <div
              class="flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 text-[11px] text-[#64748B] pt-1 border-t border-slate-50"
            >
              <div class="flex items-center gap-1 min-w-0">
                <span class="material-symbols-outlined text-[14px] text-[#94A3B8] shrink-0"
                  >person</span
                >
                <span class="truncate">
                  <span class="text-slate-400">Kepada:</span>
                  <strong class="font-semibold text-slate-700 ml-0.5">{{
                    ticket.assigned_to || 'Belum ditugaskan'
                  }}</strong>
                </span>
              </div>

              <div class="flex items-center gap-1 text-[10.5px] text-[#94A3B8] shrink-0">
                <span class="material-symbols-outlined text-[13px]">calendar_today</span>
                <span>{{ formatDate(ticket.dibuat_pada) }}</span>
              </div>
            </div>
          </div>

          <div v-if="recentTickets.length === 0" class="py-7 text-center">
            <p class="text-xs text-[#64748B]">Belum ada tiket permintaan.</p>
          </div>
        </div>

        <!-- Desktop Table View (>= md) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left min-w-[780px]">
            <thead class="bg-slate-50/60 border-b border-slate-100">
              <tr>
                <th
                  class="w-[14%] min-w-[125px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  No. Tiket
                </th>
                <th
                  class="w-[38%] min-w-[250px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Judul
                </th>
                <th
                  class="w-[18%] min-w-[135px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Assigned To
                </th>
                <th
                  class="w-[10%] min-w-[85px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Prioritas
                </th>
                <th
                  class="w-[10%] min-w-[95px] text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-2.5 px-4 whitespace-nowrap"
                >
                  Status
                </th>
                <th
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
                class="hover:bg-slate-50/60 transition-colors duration-150 group"
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
                  <p class="text-xs text-slate-400">Belum ada tiket permintaan.</p>
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
  gap: 22px;
  width: 100%;
  max-width: 1500px;
  margin: 0 auto;
  padding: 4px 0 16px;
  color: #333333;
}
.dashboard-intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 5px 0 2px;
}
.dashboard-eyebrow {
  color: #7b8aa0;
  font-size: 9px;
  letter-spacing: 0.13em;
  font-weight: 650;
  margin-bottom: 7px;
}
.dashboard-intro h2 {
  font-size: 25px;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.3;
}
.dashboard-intro h2 + p {
  font-size: 12px;
  color: #6d7d93;
  line-height: 1.7;
  margin-top: 7px;
}
.dashboard-add {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
  gap: 7px;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 8px;
  background: #0A51B0;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.dashboard-add:hover {
  background: #0A4391;
}
.dashboard-add span {
  font-size: 18px;
}
.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}
.dash-stat-card {
  --stat-color: #4d7fc2;
  min-width: 0;
  padding: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 13px;
  background: white;
}
.stat-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  font-size: 11px;
  font-weight: 550;
  color: #63748e;
  line-height: 1.5;
}
.stat-label > span {
  font-size: 18px;
  color: var(--stat-color);
  flex-shrink: 0;
}
.stat-number {
  font-size: 32px;
  line-height: 1.15;
  font-weight: 650;
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums;
  color: #333333;
  margin: 18px 0 13px;
}
.stat-caption {
  font-size: 10px;
  color: #bdcce1;
}
.stat-total {
  background: #0A51B0;
  border-color: #0A51B0;
}
.stat-total .stat-number {
  color: white;
}
.stat-total .stat-label,
.stat-total .stat-label > span {
  color: #d3e1f6;
}
.stat-green {
  --stat-color: #369580;
}
.stat-blue {
  --stat-color: #548acd;
}
.stat-red {
  --stat-color: #ce7180;
}
.stat-amber {
  --stat-color: #c09951;
}
.stat-bottom {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 10px;
  color: #71829b;
  font-variant-numeric: tabular-nums;
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
  gap: 18px;
}
.dashboard-panel {
  min-width: 0;
  background: white;
  padding: 22px;
  border: 1px solid #e2e8f0;
  border-radius: 13px;
}
.dashboard-panel h3 {
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.dashboard-panel > div:first-child {
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
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
  border-radius: 13px;
  overflow: hidden;
}
.dashboard-table > div:first-child {
  gap: 10px;
}
.dashboard-table > div:first-child a {
  min-height: 40px;
  background: transparent;
  border-color: transparent;
  padding: 0 4px;
  font-size: 11px;
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
  padding-top: 15px;
  padding-bottom: 15px;
}
.dashboard-csat :deep(.shadow-card) {
  box-shadow: none;
  border-radius: 13px;
  border-color: #e2e8f0;
  padding: 22px;
}
.dashboard-csat :deep(h3) {
  font-size: 14px;
  font-weight: 650;
}
.dashboard-csat :deep(h2) {
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.025em;
}
@media (max-width: 1199px) and (min-width: 768px) {
  .dashboard-stats {
    gap: 10px;
  }
  .dash-stat-card {
    padding: 16px 13px;
  }
  .stat-label {
    font-size: 10px;
  }
  .stat-number {
    font-size: 28px;
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
    font-size: 22px;
  }
  .dashboard-intro h2 + p {
    font-size: 11px;
    max-width: 310px;
  }
  .dashboard-add {
    min-height: 44px;
    font-size: 11px;
    padding: 0 13px;
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
    padding: 17px;
  }
  .stat-number {
    font-size: 28px;
    margin: 13px 0 12px;
  }
  .dashboard-panel {
    padding: 17px;
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
    padding: 17px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .dashboard-view * {
    transition: none !important;
  }
}
</style>

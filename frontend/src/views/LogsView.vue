<script setup>
// ============================================================
// LogsView.vue — Menampilkan Log Riwayat Aset & Audit Log Login
// Fitur: Dua tab navigasi, pencarian, filter aksi, gaya glassmorphism
// ============================================================
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useAuth } from '../composables/useAuth.js'
import { animateStagger } from '../composables/useGsap.js'
import AppBadge from '../components/ui/AppBadge.vue'
import AppPagination from '../components/ui/AppPagination.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import SkeletonTable from '../components/ui/skeleton/SkeletonTable.vue'

const { get } = useApi()
const { isSuperAdmin } = useAuth()

// ── State Utama ──────────────────────────────────────────────
const assetLogs = ref([])
const auditLogs = ref([])
const isLoading = ref(true)
const pageError = ref('')
const activeTab = ref('assets') // 'assets' | 'audit'

const currentPageAssets = ref(1)
const currentPageAudit = ref(1)
const itemsPerPage = ref(10)

// ── Filter State ─────────────────────────────────────────────
const searchQuery = ref('')
const filterAction = ref('') // Untuk log aset ('TAMBAH' | 'UBAH' | 'HAPUS')
const filterActivity = ref('') // Untuk log audit ('LOGIN' | 'LOGOUT' | 'GAGAL_LOGIN')

// ── Ambil Data ───────────────────────────────────────────────
async function fetchLogs() {
  isLoading.value = true
  pageError.value = ''
  try {
    const requests = [get('/api/logs/assets')]
    if (isSuperAdmin.value) {
      requests.push(get('/api/logs/audit'))
    }

    const [assetsData, auditData = []] = await Promise.all(requests)
    assetLogs.value = Array.isArray(assetsData) ? assetsData : []
    auditLogs.value = Array.isArray(auditData) ? auditData : []
  } catch (error) {
    pageError.value = error.message || 'Gagal memuat data log dari server.'
    console.error(error)
  } finally {
    isLoading.value = false
    await nextTick()
    animateStagger('tbody tr')
  }
}

onMounted(() => {
  fetchLogs()
})

// ── Log Riwayat Aset Terfilter ──────────────────────────────
const filteredAssetLogs = computed(() => {
  return assetLogs.value.filter((log) => {
    const query = searchQuery.value.trim().toLowerCase()
    const matchSearch =
      !query ||
      String(log.label_aset || '')
        .toLowerCase()
        .includes(query) ||
      String(log.perubahan || '')
        .toLowerCase()
        .includes(query) ||
      String(log.oleh_pengguna || '')
        .toLowerCase()
        .includes(query)

    const matchAction = !filterAction.value || log.aksi === filterAction.value
    return matchSearch && matchAction
  })
})

// ── Log Audit Login Terfilter ───────────────────────────────
const filteredAuditLogs = computed(() => {
  return auditLogs.value.filter((log) => {
    const query = searchQuery.value.trim().toLowerCase()
    const matchSearch =
      !query ||
      String(log.nama_pengguna || '')
        .toLowerCase()
        .includes(query) ||
      String(log.email || '')
        .toLowerCase()
        .includes(query) ||
      String(log.ip_address || '')
        .toLowerCase()
        .includes(query) ||
      String(log.browser || '')
        .toLowerCase()
        .includes(query)

    const matchActivity = !filterActivity.value || log.aktifitas === filterActivity.value
    return matchSearch && matchActivity
  })
})

watch([searchQuery, filterAction, filterActivity, activeTab], () => {
  currentPageAssets.value = 1
  currentPageAudit.value = 1
})

const paginatedAssetLogs = computed(() => {
  const start = (currentPageAssets.value - 1) * itemsPerPage.value
  return filteredAssetLogs.value.slice(start, start + itemsPerPage.value)
})

const paginatedAuditLogs = computed(() => {
  const start = (currentPageAudit.value - 1) * itemsPerPage.value
  return filteredAuditLogs.value.slice(start, start + itemsPerPage.value)
})

// ── Helper Badge Aksi / Aktifitas ───────────────────────────
function getActionBadgeType(action) {
  if (action === 'TAMBAH') return 'success'
  if (action === 'UBAH') return 'warning'
  if (action === 'HAPUS') return 'danger'
  return 'default'
}

function getActionIcon(action) {
  if (action === 'TAMBAH') return 'add_circle'
  if (action === 'UBAH') return 'edit_note'
  if (action === 'HAPUS') return 'delete'
  return 'info'
}

function getActionColor(action) {
  if (action === 'TAMBAH') return 'text-[#059669] bg-[#ECFDF5]'
  if (action === 'UBAH') return 'text-[#D97706] bg-[#FFF8E6]'
  if (action === 'HAPUS') return 'text-[#DC2626] bg-[#FEF2F2]'
  return 'text-[#6B7280] bg-[#F3F4F6]'
}

function getActivityBadgeType(activity) {
  if (activity === 'LOGIN' || activity === 'BERHASIL_LOGIN') return 'success'
  if (activity === 'GAGAL_LOGIN') return 'danger'
  if (activity === 'LOGOUT') return 'default'
  if (activity === 'RESET_PASSWORD') return 'cyan'
  if (activity === 'UBAH_PASSWORD') return 'purple'
  return 'default'
}

function getActivityBadgeText(activity) {
  if (activity === 'LOGIN' || activity === 'BERHASIL_LOGIN') return 'Berhasil Login'
  if (activity === 'GAGAL_LOGIN') return 'Gagal Login'
  if (activity === 'LOGOUT') return 'Logout'
  if (activity === 'RESET_PASSWORD') return 'Reset Sandi (OTP)'
  if (activity === 'UBAH_PASSWORD') return 'Ubah Kata Sandi'
  return activity || '—'
}

// Format Tanggal
function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function displayValue(val) {
  if (!val || val === '(kosong)') return '—'
  return val
}

function parsePerubahan(perubahan, aksi) {
  if (!perubahan) return []

  if (aksi === 'UBAH' && perubahan.startsWith('Perubahan data: ')) {
    const body = perubahan.replace('Perubahan data: ', '')
    const parts = body.split(/,\s*(?=[A-Z])/)
    return parts
      .map((part) => {
        const arrowIdx = part.indexOf(' -> ')
        if (arrowIdx === -1) return { field: part, old: '', new: '' }
        const colonIdx = part.indexOf(': ')
        if (colonIdx === -1) return { field: part, old: '', new: '' }
        const field = part.substring(0, colonIdx).trim()
        const oldVal = part.substring(colonIdx + 2, arrowIdx).trim()
        const newVal = part.substring(arrowIdx + 4).trim()
        return { field, old: oldVal, new: newVal }
      })
      .filter((r) => r.field)
  }

  if (aksi === 'TAMBAH' && perubahan.startsWith('Aset baru didaftarkan')) {
    const items = []
    const match = perubahan.match(/nomor seri (.+?),/)
    if (match) items.push({ field: 'Nomor Seri', value: match[1] })
    const pairs = perubahan.matchAll(/(?:tipe|merek|status|kondisi):\s*([^,.]+)/gi)
    for (const m of pairs) {
      const label = perubahan.substring(m.index, perubahan.indexOf(':', m.index)).trim()
      items.push({ field: label.charAt(0).toUpperCase() + label.slice(1), value: m[1].trim() })
    }
    return items
  }

  return [{ field: null, value: perubahan }]
}
</script>

<template>
  <div
    class="logs-page flex min-w-0 flex-col gap-4"
    :data-testid="!isLoading ? 'page-ready' : undefined"
  >
    <!-- Simplified SaaS Header Container -->
    <div
      class="flex flex-col gap-3.5 bg-white p-3.5 sm:p-4.5 rounded-2xl border border-[#E2E8F0]/80 shadow-2xs"
    >
      <div>
        <h2 class="text-lg font-bold text-[#0F172A] tracking-tight">
          Audit Log &amp; Riwayat Aktivitas
        </h2>
        <p class="text-xs text-[#64748B] mt-0.5 leading-normal">
          {{
            isSuperAdmin
              ? 'Melihat rekam jejak perubahan sistem & audit login pengguna'
              : 'Melihat rekam jejak perubahan aset'
          }}
        </p>
      </div>
    </div>

    <!-- Error state -->
    <div
      v-if="pageError"
      role="alert"
      class="shadow-card flex flex-wrap items-center gap-2 rounded-[20px] border border-red-200 bg-red-50/60 px-5 py-4 text-[13px] text-red-700 backdrop-blur-xl"
    >
      <span aria-hidden="true" class="material-symbols-outlined text-[18px]">error</span>
      <span class="min-w-0 flex-1 wrap-anywhere">{{ pageError }}</span>
      <button
        @click="fetchLogs"
        type="button"
        class="min-h-11 px-2 ml-auto text-xs font-extrabold uppercase tracking-wider text-red-800 hover:underline"
      >
        Coba Lagi
      </button>
    </div>

    <!-- Tab Selection Navigation -->
    <div
      class="grid sm:flex border-b border-[#E2E8F0]/80"
      :class="isSuperAdmin ? 'grid-cols-2' : 'grid-cols-1'"
      aria-label="Jenis log"
    >
      <button
        type="button"
        :aria-pressed="activeTab === 'assets'"
        @click="activeTab = 'assets'"
        class="flex min-w-0 min-h-11 items-center justify-center sm:justify-start gap-2 px-2 sm:px-5 py-3.5 text-xs leading-relaxed text-left font-bold transition-all duration-150 border-b-2 -mb-[2px]"
        :class="
          activeTab === 'assets'
            ? 'border-brand text-brand font-black'
            : 'border-transparent text-[#64748B] hover:text-[#172033]'
        "
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[18px]">history</span>
        Riwayat Perubahan Aset
      </button>
      <button
        v-if="isSuperAdmin"
        type="button"
        :aria-pressed="activeTab === 'audit'"
        @click="activeTab = 'audit'"
        class="flex min-w-0 min-h-11 items-center justify-center sm:justify-start gap-2 px-2 sm:px-5 py-3.5 text-xs leading-relaxed text-left font-bold transition-all duration-150 border-b-2 -mb-[2px]"
        :class="
          activeTab === 'audit'
            ? 'border-brand text-brand font-black'
            : 'border-transparent text-[#64748B] hover:text-[#172033]'
        "
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[18px]">security</span>
        Audit Aktivitas Login
      </button>
    </div>

    <!-- Filters Bar Card -->
    <div
      class="logs-filters shadow-card flex flex-col sm:flex-row min-w-0 flex-wrap items-stretch sm:items-center gap-3 rounded-2xl border border-[#E8EDF3] bg-white p-3"
    >
      <!-- Search -->
      <div class="relative min-w-0 sm:flex-1 sm:min-w-[200px]">
        <span
          aria-hidden="true"
          class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#94A3B8] pointer-events-none"
        >
          search
        </span>
        <input
          v-model="searchQuery"
          aria-label="Cari kata kunci log"
          type="text"
          placeholder="Cari kata kunci log..."
          class="h-11 sm:h-10 w-full rounded-xl border border-[#DCE3EC] bg-white pl-10 pr-3 text-[11px] font-semibold text-[#334155] outline-none transition-all focus:border-brand focus:ring-1 focus:ring-brand/10"
        />
      </div>

      <!-- Filter + Refresh grouped (kept together) -->
      <div class="grid grid-cols-1 min-w-0 gap-2 sm:flex sm:items-center">
        <!-- Action Filter (Asset Tab only) -->
        <div v-if="activeTab === 'assets'" class="min-w-0 sm:w-36">
          <CustomSelect
            v-model="filterAction"
            :options="[
              { value: '', label: 'Semua Aksi' },
              { value: 'TAMBAH', label: 'Tambah Aset' },
              { value: 'UBAH', label: 'Ubah Aset' },
              { value: 'HAPUS', label: 'Hapus Aset' },
            ]"
            aria-label="Filter aksi"
            height-class="h-11 sm:h-9"
            block
          />
        </div>

        <!-- Activity Filter (Audit Tab only) -->
        <div v-if="activeTab === 'audit'" class="min-w-0 sm:w-44">
          <CustomSelect
            v-model="filterActivity"
            :options="[
              { value: '', label: 'Semua Aktifitas' },
              { value: 'LOGIN', label: 'Berhasil Login' },
              { value: 'GAGAL_LOGIN', label: 'Gagal Login' },
              { value: 'RESET_PASSWORD', label: 'Reset Sandi (OTP)' },
              { value: 'UBAH_PASSWORD', label: 'Ubah Kata Sandi' },
              { value: 'LOGOUT', label: 'Logout' },
            ]"
            aria-label="Filter aktivitas"
            height-class="h-11 sm:h-9"
            block
          />
        </div>

        <!-- Refresh button -->
        <button
          type="button"
          @click="fetchLogs"
          :disabled="isLoading"
          class="flex h-11 sm:h-10 items-center justify-center gap-2 rounded-xl border border-[#DCE3EC] bg-white/50 px-4 text-[12px] font-bold text-[#334155] shadow-sm hover:bg-[#F8FAFC] disabled:opacity-50"
        >
          <span
            aria-hidden="true"
            class="material-symbols-outlined text-[18px]"
            :class="{ 'animate-spin': isLoading }"
            >refresh</span
          >
          Segarkan
        </button>
      </div>
    </div>

    <!-- Content Container -->
    <div class="shadow-card overflow-hidden rounded-[20px] border border-[#E8EDF3] bg-white">
      <!-- Loading State -->
      <div v-if="isLoading" aria-busy="true">
        <SkeletonTable preset="logs" :rows="6" />
      </div>

      <!-- ── TAB 1: Asset History Log ──────────────────────────── -->
      <div v-else-if="activeTab === 'assets'">
        <!-- Empty State -->
        <div
          v-if="filteredAssetLogs.length === 0"
          class="flex flex-col items-center justify-center px-4 py-10 sm:py-20 gap-3 text-center"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[40px] text-[#D1D5DB]"
            >history_toggle_off</span
          >
          <p class="text-[13px] font-semibold text-[#64748B]">
            Tidak ada riwayat perubahan aset ditemukan.
          </p>
        </div>

        <!-- Timeline Log Cards -->
        <div v-else class="divide-y divide-[#F3F4F6]">
          <div
            v-for="log in paginatedAssetLogs"
            :key="log.id"
            class="group flex min-w-0 gap-4 px-3.5 sm:px-5 py-4 hover:bg-[#FAFBFD] transition-colors"
          >
            <!-- Left: Icon + Timeline connector -->
            <div class="hidden sm:flex flex-col items-center pt-0.5">
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                :class="getActionColor(log.aksi)"
              >
                <span aria-hidden="true" class="material-symbols-outlined text-[18px]">{{
                  getActionIcon(log.aksi)
                }}</span>
              </div>
            </div>

            <!-- Middle: Main content -->
            <div class="flex-1 min-w-0 wrap-anywhere">
              <!-- Top row: Badge + Label + Time -->
              <div class="flex flex-wrap items-center gap-2 mb-3 sm:mb-2">
                <AppBadge :type="getActionBadgeType(log.aksi)" :text="log.aksi" />
                <span
                  class="w-full sm:w-auto min-w-0 text-sm sm:text-[13px] font-extrabold text-[#111827] font-mono tracking-tight"
                  >{{ log.label_aset }}</span
                >
                <span
                  class="text-[10px] text-[#94A3B8] font-medium ml-auto shrink-0 hidden sm:inline"
                >
                  <span
                    aria-hidden="true"
                    class="material-symbols-outlined text-[12px] align-text-bottom mr-0.5"
                    >schedule</span
                  >
                  {{ formatDateTime(log.dibuat_pada) }}
                </span>
              </div>

              <!-- UBAH: Changes detail with clean diff style -->
              <div
                v-if="
                  log.aksi === 'UBAH' &&
                  parsePerubahan(log.perubahan, log.aksi).length &&
                  parsePerubahan(log.perubahan, log.aksi)[0].old !== undefined
                "
                class="space-y-3 sm:space-y-1.5"
              >
                <div
                  v-for="(row, idx) in parsePerubahan(log.perubahan, log.aksi)"
                  :key="idx"
                  class="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-2 text-[13px] sm:text-[11px]"
                >
                  <span
                    class="sm:w-28 shrink-0 text-xs sm:text-[10px] font-bold text-[#6B7280] uppercase tracking-wide"
                    >{{ row.field }}</span
                  >
                  <span
                    class="flex flex-col items-start sm:flex-row sm:items-center gap-1.5 min-w-0 max-w-full flex-wrap"
                  >
                    <span
                      class="inline-block max-w-full rounded-md bg-[#FEF2F2] px-2 py-0.5 text-[13px] sm:text-[10px] font-semibold text-[#991B1B] line-through decoration-[#FECACA]"
                      ><span class="sr-only">Sebelum: </span>{{ displayValue(row.old) }}</span
                    >
                    <span
                      aria-hidden="true"
                      class="material-symbols-outlined rotate-90 sm:rotate-0 text-[16px] sm:text-[12px] text-[#64748B] sm:text-[#CBD5E1] shrink-0"
                      >arrow_forward</span
                    >
                    <span
                      class="inline-block max-w-full rounded-md bg-[#F0FDF4] px-2 py-0.5 text-[13px] sm:text-[10px] font-bold text-[#166534]"
                      ><span class="sr-only">Sesudah: </span>{{ displayValue(row.new) }}</span
                    >
                  </span>
                </div>
              </div>

              <!-- TAMBAH: Key-value pairs -->
              <div
                v-else-if="
                  log.aksi === 'TAMBAH' && parsePerubahan(log.perubahan, log.aksi).length > 1
                "
                class="grid grid-cols-1 sm:flex sm:flex-wrap gap-x-4 gap-y-2 sm:gap-y-1"
              >
                <span
                  v-for="(row, idx) in parsePerubahan(log.perubahan, log.aksi)"
                  :key="idx"
                  class="text-[13px] sm:text-[10px] text-[#6B7280]"
                >
                  <span class="font-bold uppercase tracking-wide">{{ row.field }}:</span>
                  <span class="ml-1 font-semibold text-[#374151]">{{
                    displayValue(row.value)
                  }}</span>
                </span>
              </div>

              <!-- Fallback text -->
              <p
                v-else
                class="text-[13px] sm:text-[11px] font-medium text-[#64748B] leading-relaxed whitespace-pre-line"
              >
                {{ log.perubahan }}
              </p>

              <!-- Mobile timestamp + Author -->
              <div
                class="flex flex-col items-start sm:flex-row sm:items-center gap-1.5 sm:gap-3 mt-3 sm:mt-2"
              >
                <span class="text-xs text-[#64748B] font-medium sm:hidden">
                  {{ formatDateTime(log.dibuat_pada) }}
                </span>
                <span
                  class="text-xs sm:text-[10px] font-semibold sm:font-bold text-[#64748B] sm:text-[#94A3B8]"
                >
                  <span
                    aria-hidden="true"
                    class="material-symbols-outlined text-[11px] align-text-bottom mr-0.5"
                    >person</span
                  >
                  {{ log.oleh_pengguna }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Pagination Assets -->
        <AppPagination
          mobile-compact
          v-if="filteredAssetLogs.length > 0"
          v-model:currentPage="currentPageAssets"
          :total-items="filteredAssetLogs.length"
          :items-per-page="itemsPerPage"
        />
      </div>

      <!-- ── TAB 2: Login Audit Log Table ────────────────────── -->
      <div v-else-if="activeTab === 'audit'">
        <div v-if="filteredAuditLogs.length === 0" class="px-4 py-10 text-center lg:hidden">
          <span aria-hidden="true" class="material-symbols-outlined text-[40px] text-[#D1D5DB]"
            >shield_person</span
          >
          <p class="mt-3 text-[13px] font-semibold text-[#64748B]">
            Tidak ada audit aktivitas login ditemukan.
          </p>
        </div>
        <ul v-else class="divide-y divide-[#F3F4F6] lg:hidden" aria-label="Audit aktivitas login">
          <li
            v-for="log in paginatedAuditLogs"
            :key="log.id"
            class="min-w-0 space-y-3 p-3.5 sm:p-4 wrap-anywhere"
          >
            <AppBadge
              :type="getActivityBadgeType(log.aktifitas)"
              :text="getActivityBadgeText(log.aktifitas)"
            />
            <div class="space-y-1">
              <h3 class="text-sm font-bold leading-relaxed text-[#111827]">
                {{ log.nama_pengguna }}
              </h3>
              <p class="text-[13px] leading-relaxed text-[#374151]">{{ log.email }}</p>
            </div>
            <dl class="text-xs leading-relaxed text-[#64748B]">
              <dt class="font-semibold">Waktu aktivitas</dt>
              <dd>{{ formatDateTime(log.dibuat_pada) }}</dd>
            </dl>
          </li>
        </ul>
        <div
          class="hidden lg:block overflow-x-auto"
          tabindex="0"
          aria-label="Tabel log audit login"
        >
          <table class="w-full min-w-[700px]">
            <caption class="sr-only">
              Tabel log audit login aktivitas pengguna
            </caption>
            <thead>
              <tr class="text-left border-b border-[#F3F4F6]">
                <th
                  class="px-5 py-3 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider w-48"
                >
                  Waktu Login
                </th>
                <th class="px-5 py-3 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                  Nama Pengguna
                </th>
                <th class="px-5 py-3 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                  Email
                </th>
                <th
                  class="px-5 py-3 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider w-36"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#F9FAFB]">
              <tr
                v-for="log in paginatedAuditLogs"
                :key="log.id"
                class="hover:bg-[#F9FAFB]/50 transition-colors"
              >
                <td class="px-5 py-3.5 text-[11px] font-semibold text-[#374151] font-mono">
                  {{ formatDateTime(log.dibuat_pada) }}
                </td>
                <td class="px-5 py-3.5 text-[12px] font-bold text-[#111827]">
                  {{ log.nama_pengguna }}
                </td>
                <td class="px-5 py-3.5 text-[11px] text-[#374151] font-mono">
                  {{ log.email }}
                </td>
                <td class="px-5 py-3.5">
                  <AppBadge
                    :type="getActivityBadgeType(log.aktifitas)"
                    :text="getActivityBadgeText(log.aktifitas)"
                  />
                </td>
              </tr>
              <tr v-if="filteredAuditLogs.length === 0">
                <td colspan="4" class="px-5 py-12 text-center">
                  <div class="flex flex-col items-center gap-3">
                    <span
                      aria-hidden="true"
                      class="material-symbols-outlined text-[40px] text-[#D1D5DB]"
                      >shield_person</span
                    >
                    <p class="text-[13px] font-semibold text-[#64748B]">
                      Tidak ada audit aktivitas login ditemukan.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer Pagination Audit -->
        <AppPagination
          mobile-compact
          v-if="filteredAuditLogs.length > 0"
          v-model:currentPage="currentPageAudit"
          :total-items="filteredAuditLogs.length"
          :items-per-page="itemsPerPage"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (width < 40rem) {
  .logs-page input {
    font-size: 1rem;
  }
  .logs-filters :deep([role='option']) {
    height: auto;
    min-height: 2.75rem;
    padding-block: 0.5rem;
  }
  .logs-filters :deep(.truncate) {
    white-space: normal;
    overflow-wrap: anywhere;
  }
}
</style>

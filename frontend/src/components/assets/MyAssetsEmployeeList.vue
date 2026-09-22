<script setup>
import { computed, ref } from 'vue'
import AppPagination from '../ui/AppPagination.vue'
import SkeletonTable from '../ui/skeleton/SkeletonTable.vue'
import { normalizeLocation } from '../../utils/locationNormalizer.js'
import { useViewMode } from '../../composables/useViewMode.js'
import AppViewToggle from '../ui/AppViewToggle.vue'

const { viewMode } = useViewMode('my-assets', 'table')

const props = defineProps({
  filteredEmployees: { type: Array, default: () => [] },
  paginatedEmployees: { type: Array, default: () => [] },
  employeesWithAssets: { type: Array, default: () => [] },
  totalEmployeesHoldingAssets: { type: Number, default: 0 },
  totalAssignedAssetsCount: { type: Number, default: 0 },
  recentlyAssignedCount: { type: Number, default: 0 },
  employeeSearch: { type: String, default: '' },
  filterDepartemen: { type: String, default: '' },
  filterLokasi: { type: String, default: '' },
  departemenFilterOptions: { type: Array, default: () => [] },
  lokasiFilterOptions: { type: Array, default: () => [] },
  currentPageEmployees: { type: Number, default: 1 },
  itemsPerPage: { type: Number, default: 10 },
  isLoadingEmployees: { type: Boolean, default: false },
  employeeError: { type: String, default: '' },
  canBrowseOtherAssets: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update:employeeSearch',
  'update:filterDepartemen',
  'update:filterLokasi',
  'update:currentPageEmployees',
  'select-employee',
  'refresh',
])

const showFilterModal = ref(false)
function goToLevel2(employee) {
  emit('select-employee', employee)
}
function fetchEmployees() {
  emit('refresh')
}

const search = computed({
  get: () => props.employeeSearch,
  set: (v) => emit('update:employeeSearch', v),
})
const page = computed({
  get: () => props.currentPageEmployees,
  set: (v) => emit('update:currentPageEmployees', v),
})

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
function getAvatarGradient(index) {
  const gradients = [
    'from-[#003d9b] to-[#0052cc]',
    'from-[#0052cc] to-[#0066ff]',
    'from-[#0c56d0] to-[#4f5f7b]',
    'from-[#4f5f7b] to-[#737685]',
  ]
  return gradients[index % gradients.length]
}
function getDeviceIcon(tipe) {
  const map = {
    laptop: 'laptop',
    notebook: 'laptop',
    pc: 'desktop_windows',
    desktop: 'desktop_windows',
    monitor: 'monitor',
    printer: 'print',
    scanner: 'scanner',
    network: 'router',
    router: 'router',
    switch: 'router',
    phone: 'smartphone',
    smartphone: 'smartphone',
    tablet: 'tablet',
    headphone: 'headset',
    headset: 'headset',
    camera: 'photo_camera',
    storage: 'storage',
    hdd: 'storage',
    ssd: 'storage',
    ups: 'battery_charging_full',
  }
  if (!tipe) return 'devices'
  const key = tipe.toLowerCase().trim()
  return map[key] || 'devices'
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Enterprise Header & Title -->
    <div
      class="employee-assets-heading flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 class="text-lg sm:text-xl font-bold tracking-tight text-[#333333]">Aset Karyawan</h1>
        <p class="mt-0.5 text-xs text-[#5F7089]">
          Karyawan yang sedang memegang aset IT perusahaan
        </p>
      </div>
    </div>
    <div class="employee-kpis">
      <div
        v-for="(item, index) in [
          {
            label: 'Karyawan dengan aset',
            value: totalEmployeesHoldingAssets,
            caption: 'Pemegang aktif',
            icon: 'badge',
          },
          {
            label: 'Aset ditugaskan',
            value: totalAssignedAssetsCount,
            caption: 'Unit digunakan',
            icon: 'devices',
          },
          {
            label: 'Penugasan baru',
            value: recentlyAssignedCount,
            caption: '30 hari terakhir',
            icon: 'assignment_turned_in',
          },
        ]"
        :key="item.label"
        class="employee-kpi"
        :class="{ 'employee-kpi-primary': index === 0 }"
      >
        <div class="employee-kpi-label">
          {{ item.label
          }}<span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
        </div>
        <strong>{{ item.value }}</strong
        ><span class="employee-kpi-caption">{{ item.caption }}</span>
      </div>
    </div>
    <!-- Toolbar: Elegant Single Search & Compact Filters (sticky mengikuti scroll) -->
    <div
      v-if="canBrowseOtherAssets"
      class="employee-assets-toolbar ws-toolbar-sticky grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-2xs"
    >
      <div class="relative h-9 w-full sm:flex-1 sm:min-w-[200px]">
        <label for="emp-search" class="sr-only">Cari karyawan dengan aset</label>
        <span
          aria-hidden="true"
          class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#687281] pointer-events-none"
          >search</span
        >
        <input
          id="emp-search"
          v-model="search"
          type="text"
          placeholder="Cari nama karyawan, NIK, atau departemen…"
          class="h-full w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-8 text-xs text-[#333333] placeholder-[#687281] focus:border-[#0A51B0] focus:bg-white focus:outline-none transition-all"
        />
        <!-- Inline Clear Button -->
        <button
          v-if="search"
          type="button"
          @click="search = ''"
          aria-label="Bersihkan pencarian"
          class="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-[#687281] hover:bg-[#F1F5F9] hover:text-[#333333] transition-all cursor-pointer touch-manipulation"
          title="Bersihkan"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[15px]">close</span>
        </button>
      </div>

      <button
        type="button"
        @click="showFilterModal = true"
        class="h-9 shrink-0 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-semibold text-[#5F7089] hover:bg-white"
      >
        <span aria-hidden="true" class="material-symbols-outlined mr-1 align-middle text-[16px]"
          >filter_alt</span
        >Filter
      </button>

      <AppViewToggle v-model="viewMode" />
    </div>
    <!-- Main Hybrid Employee Table/List -->
    <div
      class="employee-list rounded-xl border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden"
    >
      <!-- Loading State -->
      <div v-if="isLoadingEmployees" aria-busy="true">
        <SkeletonTable preset="employees" :rows="5" />
      </div>

      <!-- Error State -->
      <div v-else-if="employeeError" class="p-6 text-center text-rose-600 text-xs">
        <p class="font-semibold">{{ employeeError }}</p>
        <button
          type="button"
          @click="fetchEmployees"
          class="mt-2 font-bold underline cursor-pointer"
        >
          Coba muat ulang
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredEmployees.length === 0" class="p-12 text-center text-[#5F7089]">
        <span aria-hidden="true" class="material-symbols-outlined text-[36px] text-[#CBD5E1]"
          >person_search</span
        >
        <h3 class="mt-2 font-semibold text-sm text-[#333333]">Tidak Ada Karyawan Memegang Aset</h3>
        <p class="text-xs text-[#5F7089] mt-1 max-w-sm mx-auto">
          Tidak ditemukan karyawan yang sedang memegang aset IT sesuai kriteria pencarian.
        </p>
      </div>

      <!-- Data Presentation (Responsive: Desktop Table >= 768px, Mobile Cards < 768px) -->
      <div v-else class="w-full max-w-full">
        <!-- Desktop Table (≥ 1280px, mode Tabel) -->
        <div v-if="viewMode === 'table'" class="hidden xl:block w-full max-w-full overflow-hidden">
          <table class="w-full max-w-full text-left border-collapse table-fixed">
            <colgroup>
              <col class="w-[27%]" />
              <col class="w-[21%]" />
              <col class="w-[14%]" />
              <col class="w-[10%]" />
              <col class="w-[20%]" />
              <col class="w-[8%]" />
            </colgroup>
            <thead>
              <tr
                class="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#5F7089] uppercase tracking-wider select-none whitespace-nowrap"
              >
                <th class="py-3 pl-4 pr-3 text-left whitespace-nowrap">Karyawan</th>
                <th class="py-3 px-3 text-left whitespace-nowrap">Departemen & Lokasi</th>
                <th class="py-3 px-3 text-left whitespace-nowrap">Kategori Aset</th>
                <th class="py-3 px-2 text-center whitespace-nowrap">Total Aset</th>
                <th class="py-3 px-3 text-center whitespace-nowrap">Penugasan Terakhir</th>
                <th class="py-3 pr-4 pl-2 text-center whitespace-nowrap">Detail</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#F1F5F9] text-xs">
              <tr
                v-for="(employee, idx) in paginatedEmployees"
                :key="employee.id_karyawan || employee.nik"
                @click="goToLevel2(employee)"
                class="group hover:bg-[#F8FAFC] transition-colors duration-150 cursor-pointer select-none"
              >
                <!-- Avatar & Employee Info -->
                <td class="py-3.5 pl-4 pr-3 overflow-hidden">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[11px] font-bold text-white shadow-2xs"
                      :class="getAvatarGradient(idx)"
                    >
                      {{ getInitials(employee.nama_karyawan) }}
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span
                        class="text-xs font-semibold text-[#333333] group-hover:text-[#333333] transition-colors truncate block"
                        :title="employee.nama_karyawan"
                      >
                        {{ employee.nama_karyawan }}
                      </span>
                      <span
                        class="font-mono text-[11px] text-[#5F7089] truncate block"
                        :title="`NIK: ${employee.nik}`"
                        >NIK: {{ employee.nik }}</span
                      >
                    </div>
                  </div>
                </td>

                <!-- Departemen & Lokasi -->
                <td class="py-3.5 px-3 overflow-hidden">
                  <div class="flex flex-col min-w-0">
                    <span
                      class="font-semibold text-[#333333] truncate block"
                      :title="employee.departemen || '—'"
                      >{{ employee.departemen || '—' }}</span
                    >
                    <span
                      class="text-[11px] text-[#5F7089] flex items-center gap-1 truncate mt-0.5"
                      :title="normalizeLocation(employee.lokasi_kerja) || '—'"
                    >
                      <span
                        aria-hidden="true"
                        class="material-symbols-outlined text-[13px] text-[#687281] shrink-0"
                        >location_on</span
                      >
                      <span class="truncate block">{{
                        normalizeLocation(employee.lokasi_kerja) || '—'
                      }}</span>
                    </span>
                  </div>
                </td>

                <!-- Asset Type Chips -->
                <td class="py-3.5 px-3 overflow-hidden">
                  <div class="flex items-center gap-1 min-w-0 overflow-hidden">
                    <template v-if="employee.asset_types && employee.asset_types.length > 0">
                      <span
                        v-for="tipe in employee.asset_types.slice(0, 2)"
                        :key="tipe"
                        class="inline-flex items-center gap-1 rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-medium text-[#475569] border border-[#E2E8F0] shrink min-w-0 overflow-hidden"
                      >
                        <span
                          aria-hidden="true"
                          class="material-symbols-outlined text-[12px] text-[#333333] shrink-0"
                          >{{ getDeviceIcon(tipe) }}</span
                        >
                        <span class="truncate">{{ tipe }}</span>
                      </span>
                      <span
                        v-if="employee.asset_types.length > 2"
                        class="text-[10px] font-semibold text-[#687281] shrink-0"
                      >
                        +{{ employee.asset_types.length - 2 }}
                      </span>
                    </template>
                    <span v-else class="text-[11px] text-[#687281] truncate">Aset IT</span>
                  </div>
                </td>

                <!-- Total Aset Badge -->
                <td class="py-3.5 px-2 text-center overflow-hidden">
                  <span
                    class="inline-flex items-center justify-center rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-bold text-[#333333] border border-[#BFDBFE]/60 whitespace-nowrap"
                  >
                    {{ employee.jumlah_aset || 0 }} Aset
                  </span>
                </td>

                <!-- Last Assignment Date -->
                <td class="py-3.5 px-4 text-[#5F7089] overflow-hidden text-center">
                  <span
                    class="text-xs font-medium truncate block"
                    :title="formatDate(employee.last_assignment_date)"
                    >{{ formatDate(employee.last_assignment_date) }}</span
                  >
                </td>

                <!-- Action Chevron -->
                <td class="py-3.5 pr-5 pl-4 text-center overflow-hidden">
                  <span
                    aria-hidden="true"
                    class="material-symbols-outlined text-[18px] text-[#687281] group-hover:text-[#333333] group-hover:translate-x-0.5 transition-all inline-block"
                    >chevron_right</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Kartu (< 1280px, atau saat mode Kartu dipilih) -->
        <div :class="viewMode === 'card' ? '' : 'xl:hidden'" class="divide-y divide-[#F1F5F9]">
          <div
            v-for="(employee, idx) in paginatedEmployees"
            :key="'mob-' + (employee.id_karyawan || employee.nik)"
            @click="goToLevel2(employee)"
            class="p-3.5 hover:bg-[#F8FAFC] active:bg-[#F1F5F9] transition-colors cursor-pointer select-none"
          >
            <!-- Card Header: Avatar, Name, NIK, Total Aset Badge & Chevron -->
            <div class="flex items-center justify-between gap-2.5">
              <div class="flex items-center gap-2.5 min-w-0 flex-1">
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-bold text-white shadow-2xs"
                  :class="getAvatarGradient(idx)"
                >
                  {{ getInitials(employee.nama_karyawan) }}
                </div>
                <div class="flex flex-col min-w-0 flex-1">
                  <span class="text-[13.5px] font-bold text-[#333333] truncate block">
                    {{ employee.nama_karyawan }}
                  </span>
                  <span class="font-mono text-[11px] text-[#5F7089] truncate block">
                    NIK: {{ employee.nik }}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <span
                  class="inline-flex items-center justify-center rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-bold text-[#333333] border border-[#BFDBFE]/60 whitespace-nowrap"
                >
                  {{ employee.jumlah_aset || 0 }} Aset
                </span>
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[18px] text-[#687281]"
                  >chevron_right</span
                >
              </div>
            </div>

            <!-- Subtle Divider -->
            <div class="border-t border-[#F1F5F9] my-2"></div>

            <!-- 2x2 Metadata Grid -->
            <div class="grid grid-cols-2 gap-2 text-left">
              <!-- 1. Departemen -->
              <div class="flex flex-col min-w-0 overflow-hidden">
                <span class="text-[10px] font-semibold uppercase text-[#687281] tracking-wider"
                  >Departemen</span
                >
                <span
                  class="text-[12px] font-semibold text-[#333333] mt-0.5 truncate block"
                  :title="employee.departemen || '—'"
                >
                  {{ employee.departemen || '—' }}
                </span>
              </div>

              <!-- 2. Lokasi -->
              <div class="flex flex-col min-w-0 overflow-hidden">
                <span class="text-[10px] font-semibold uppercase text-[#687281] tracking-wider"
                  >Lokasi</span
                >
                <span
                  class="text-[12px] font-normal text-[#333333] mt-0.5 truncate flex items-center gap-1"
                  :title="normalizeLocation(employee.lokasi_kerja) || '—'"
                >
                  <span
                    aria-hidden="true"
                    class="material-symbols-outlined text-[12px] text-[#687281] shrink-0"
                    >location_on</span
                  >
                  <span class="truncate">{{
                    normalizeLocation(employee.lokasi_kerja) || '—'
                  }}</span>
                </span>
              </div>

              <!-- 3. Kategori Aset -->
              <div class="flex flex-col min-w-0 overflow-hidden">
                <span class="text-[10px] font-semibold uppercase text-[#687281] tracking-wider"
                  >Kategori Aset</span
                >
                <div class="flex items-center gap-1 min-w-0 overflow-hidden mt-0.5">
                  <template v-if="employee.asset_types && employee.asset_types.length > 0">
                    <span
                      v-for="tipe in employee.asset_types.slice(0, 2)"
                      :key="'mob-tip-' + tipe"
                      class="inline-flex items-center gap-1 rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-medium text-[#475569] border border-[#E2E8F0] shrink min-w-0 overflow-hidden"
                    >
                      <span
                        aria-hidden="true"
                        class="material-symbols-outlined text-[12px] text-[#333333] shrink-0"
                        >{{ getDeviceIcon(tipe) }}</span
                      >
                      <span class="truncate">{{ tipe }}</span>
                    </span>
                    <span
                      v-if="employee.asset_types.length > 2"
                      class="text-[10px] font-semibold text-[#687281] shrink-0"
                    >
                      +{{ employee.asset_types.length - 2 }}
                    </span>
                  </template>
                  <span v-else class="text-[11px] text-[#687281] truncate">Aset IT</span>
                </div>
              </div>

              <!-- 4. Penugasan Terakhir -->
              <div class="flex flex-col min-w-0 overflow-hidden">
                <span class="text-[10px] font-semibold uppercase text-[#687281] tracking-wider"
                  >Penugasan Terakhir</span
                >
                <span
                  class="text-[12px] font-medium text-[#5F7089] mt-0.5 truncate block"
                  :title="formatDate(employee.last_assignment_date)"
                >
                  {{ formatDate(employee.last_assignment_date) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AppPagination
        v-if="!isLoadingEmployees && !employeeError && employeesWithAssets.length > 0"
        v-model:currentPage="page"
        :total-items="filteredEmployees.length"
        :items-per-page="itemsPerPage"
      />
    </div>
  </div>
</template>
<style scoped src="../../assets/ws-table.css"></style>
<style scoped>
/* Header tidak sticky di modul Inventaris (Aset Karyawan) — scroll
   bersama konten. HARUS setelah import ws-table.css agar menang. */
.ws-toolbar-sticky {
  position: static;
  z-index: auto;
  top: auto;
}

.employee-assets-heading {
  padding: 4px 0;
}
.employee-assets-heading h1 {
  font-size: 25px;
  letter-spacing: -0.04em;
  font-weight: 650;
}
.employee-assets-heading p {
  margin-top: 7px;
  color: #637288;
  line-height: 1.7;
}
.employee-kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.employee-kpi {
  padding: 22px;
  border: 1px solid #e2e8f0;
  border-radius: 13px;
  background: white;
}
.employee-kpi-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: #5f7089;
  font-weight: 500;
}
.employee-kpi-label span {
  font-size: 19px;
  color: #6486b5;
}
.employee-kpi strong {
  display: block;
  font-size: 32px;
  line-height: 1.2;
  font-weight: 650;
  letter-spacing: -0.04em;
  margin: 16px 0 8px;
  font-variant-numeric: tabular-nums;
}
.employee-kpi-caption {
  font-size: 11px;
  color: #637288;
}
.employee-kpi-primary {
  background: #0a51b0;
  border-color: #0a51b0;
  color: white;
}
.employee-kpi-primary :is(.employee-kpi-label, .employee-kpi-caption, .employee-kpi-label span) {
  color: #c0d1eb;
}
.employee-assets-toolbar {
  padding: 16px;
  border-radius: 12px;
  box-shadow: none;
  gap: 12px;
  flex-wrap: wrap;
}
.employee-assets-toolbar input {
  border-radius: 8px;
}
.employee-assets-toolbar > div:first-child {
  flex-basis: 260px;
}
.employee-assets-toolbar > div:last-child > button {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #5f7089;
}
.employee-list {
  border-radius: 13px;
  box-shadow: none;
}
.employee-list th {
  font-size: 10px;
  font-weight: 600;
  color: #637288;
}
.employee-list td {
  padding-top: 18px;
  padding-bottom: 18px;
}
.employee-list tr {
  border-color: #edf1f6;
}
.employee-list tbody tr:hover {
  background: #f7f9fc;
}
.employee-assets-page [tabindex='0']:focus-visible {
  outline: 2px solid #097cde;
  outline-offset: 3px;
}
@media (max-width: 767px) {
  .employee-assets-heading h1 {
    font-size: 22px;
  }
  .employee-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .employee-kpi {
    padding: 16px;
  }
  .employee-kpi-primary {
    grid-column: 1/-1;
  }
  .employee-kpi-primary strong {
    margin-top: 12px;
  }
  .employee-kpi-label {
    font-size: 11px;
    align-items: flex-start;
  }
  .employee-kpi-label span {
    font-size: 17px;
  }
  .employee-kpi strong {
    font-size: 28px;
  }
  .employee-kpi-caption {
    font-size: 10px;
  }
  .employee-assets-toolbar {
    padding: 14px;
  }
  .employee-assets-toolbar > div:first-child {
    flex-basis: auto;
  }
  .employee-assets-toolbar input {
    height: 100%;
    min-height: 0;
    font-size: 16px;
  }
}
</style>

<script setup>
import { computed, ref, watch } from 'vue'
import AppPagination from '../ui/AppPagination.vue'
import StatCard from '../ui/StatCard.vue'
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
  currentUser: { type: Object, default: () => ({}) },
  isSuperAdmin: { type: Boolean, default: false },
  allEmployees: { type: Array, default: () => [] },
  mySubordinates: { type: Array, default: () => [] },
  hasSubordinates: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update:employeeSearch',
  'update:filterDepartemen',
  'update:filterLokasi',
  'update:currentPageEmployees',
  'select-employee',
  'refresh',
  'open-filter',
])

function goToLevel2(employee) {
  emit('select-employee', employee)
}
function openFilter() {
  emit('open-filter')
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

// ── State Mode Tampilan Direktori: 'org-chart' (Bagan Organisasi) atau 'list' (Daftar Tabel/Kartu) ──
const directoryMode = ref(props.hasSubordinates && !props.isSuperAdmin ? 'org-chart' : 'list')

watch(
  () => [props.hasSubordinates, props.isSuperAdmin],
  ([hasSubs, isSuper]) => {
    if (hasSubs && !isSuper) {
      directoryMode.value = 'org-chart'
    }
  },
)

// Set untuk melacak node hierarki bawahan yang di-expand
const expandedNodes = ref(new Set())
function toggleNode(nik) {
  if (expandedNodes.value.has(nik)) {
    expandedNodes.value.delete(nik)
  } else {
    expandedNodes.value.add(nik)
  }
}

// Departemen filter khusus Org Chart (terutama untuk Super Admin)
const orgDepartment = ref('')
const availableOrgDepartments = computed(() => {
  const depts = new Set()
  for (const emp of props.allEmployees) {
    if (emp.departemen && emp.departemen.trim()) {
      depts.add(emp.departemen.trim())
    }
  }
  return Array.from(depts).sort()
})

// Pencarian bawahan langsung dari NIK tertentu
function getDirectSubordinates(nik) {
  if (!nik) return []
  const cleanNik = String(nik).trim()
  return props.allEmployees.filter(
    (e) => e.nik_atasan_langsung && String(e.nik_atasan_langsung).trim() === cleanNik,
  )
}

// Hitung total bawahan secara rekursif
function countRecursiveTeam(nik) {
  const direct = getDirectSubordinates(nik)
  let count = direct.length
  for (const sub of direct) {
    count += countRecursiveTeam(sub.nik)
  }
  return count
}

// Hitung total aset tim secara rekursif
function countRecursiveAssets(nik) {
  const direct = getDirectSubordinates(nik)
  let assets = direct.reduce((acc, sub) => acc + (Number(sub.jumlah_aset) || 0), 0)
  for (const sub of direct) {
    assets += countRecursiveAssets(sub.nik)
  }
  return assets
}

// Profil Manager untuk pengguna saat ini
const currentManagerInfo = computed(() => {
  const u = props.currentUser || {}
  const emp = u.employee || {}
  const nik = emp.nik || u.nik || ''
  return {
    nik,
    nama_karyawan: emp.nama_karyawan || u.nama || 'Saya',
    title: emp.title || emp.jabatan || u.title || u.jabatan || 'Manajer / Team Lead',
    departemen: emp.departemen || u.departemen || '-',
    lokasi_kerja: normalizeLocation(emp.lokasi_kerja || u.lokasi_kerja || ''),
    status: emp.status || 'Active',
    directCount: props.mySubordinates.length,
    teamCount: countRecursiveTeam(nik),
    teamAssets: countRecursiveAssets(nik),
  }
})

// Data atasan langsung jika user tidak punya bawahan dan bukan Super Admin
const myDirectSupervisor = computed(() => {
  const u = props.currentUser || {}
  const emp = u.employee || {}
  const supervisorNik = emp.nik_atasan_langsung || u.nik_atasan_langsung
  if (!supervisorNik) return null
  return (
    props.allEmployees.find((e) => String(e.nik).trim() === String(supervisorNik).trim()) || null
  )
})


// Untuk Super Admin: Struktur hierarki per departemen / pimpinan teratas
const companyOrgRoots = computed(() => {
  const list = props.allEmployees
  if (!list.length) return []

  const targetDept = orgDepartment.value.trim()
  const pool = targetDept
    ? list.filter((e) => (e.departemen || '').trim() === targetDept)
    : list

  const nset = new Set(pool.map((e) => String(e.nik).trim()))
  const roots = pool.filter((e) => {
    const parentNik = e.nik_atasan_langsung ? String(e.nik_atasan_langsung).trim() : null
    return !parentNik || !nset.has(parentNik)
  })

  // Prioritaskan pimpinan yang memiliki bawahan
  return roots.sort((a, b) => {
    const aSubs = getDirectSubordinates(a.nik).length
    const bSubs = getDirectSubordinates(b.nik).length
    if (aSubs !== bSubs) return bSubs - aSubs
    return (a.nama_karyawan || '').localeCompare(b.nama_karyawan || '')
  })
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
  <div class="flex flex-col gap-3">
    <!-- Subheader with Mode Switcher (Org Chart vs Daftar Karyawan) -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E2E8F0] dark:border-slate-800 pb-2.5"
    >
      <div>
        <h2 class="text-xs sm:text-[13px] font-bold text-[#333333] dark:text-white flex items-center gap-1.5">
          <span
            aria-hidden="true"
            class="material-symbols-outlined text-[16px] text-[#0A51B0] dark:text-blue-400"
            >{{ directoryMode === 'org-chart' ? 'account_tree' : 'group' }}</span
          >
          <span>
            {{
              directoryMode === 'org-chart'
                ? isSuperAdmin
                  ? 'Bagan Organisasi Perusahaan'
                  : 'Bagan Organisasi Tim (Org Chart)'
                : 'Direktori Aset Seluruh Karyawan'
            }}
          </span>
        </h2>
        <p class="text-[9.5px] sm:text-[10px] text-[#5F7089] dark:text-slate-400 mt-0.5">
          {{
            directoryMode === 'org-chart'
              ? isSuperAdmin
                ? 'Struktur hierarki tim perusahaan dan distribusi perangkat IT per divisi'
                : 'Struktur hierarki tim dan penugasan perangkat IT di bawah supervisi Anda'
              : 'Daftar pemegang perangkat IT aktif di seluruh perusahaan'
          }}
        </p>
      </div>

      <!-- Segmented Mode Control: Bagan Organisasi vs Daftar Karyawan -->
      <div class="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 p-0.5">
        <button
          type="button"
          @click="directoryMode = 'org-chart'"
          class="inline-flex h-6 sm:h-6.5 items-center gap-1 rounded px-2 text-[9.5px] sm:text-[10px] font-semibold transition-all cursor-pointer"
          :class="
            directoryMode === 'org-chart'
              ? 'bg-white dark:bg-slate-700 text-[#0A51B0] dark:text-sky-400 shadow-2xs border border-[#D7E3F2] dark:border-slate-600'
              : 'text-[#5F7089] dark:text-slate-400 hover:text-[#333333] dark:hover:text-white'
          "
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[13px] sm:text-[14px]">account_tree</span>
          <span>Bagan Organisasi</span>
          <span
            v-if="hasSubordinates && !isSuperAdmin"
            class="ml-0.5 px-1 py-0.2 rounded-full text-[8px] font-bold bg-blue-100 dark:bg-blue-900/60 text-[#0A51B0] dark:text-sky-300"
          >
            {{ mySubordinates.length }}
          </span>
        </button>

        <button
          type="button"
          @click="directoryMode = 'list'"
          class="inline-flex h-6 sm:h-6.5 items-center gap-1 rounded px-2 text-[9.5px] sm:text-[10px] font-semibold transition-all cursor-pointer"
          :class="
            directoryMode === 'list'
              ? 'bg-white dark:bg-slate-700 text-[#0A51B0] dark:text-sky-400 shadow-2xs border border-[#D7E3F2] dark:border-slate-600'
              : 'text-[#5F7089] dark:text-slate-400 hover:text-[#333333] dark:hover:text-white'
          "
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[13px] sm:text-[14px]">table_rows</span>
          <span>Daftar Karyawan</span>
        </button>
      </div>
    </div>

    <!-- Quick Metrics Grid -->
    <div
      v-if="directoryMode === 'list' || isSuperAdmin"
      class="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2"
    >
      <StatCard
        title="Karyawan dengan aset"
        :value="totalEmployeesHoldingAssets"
        icon="badge"
        color="primary"
        subtitle="Pemegang aktif"
        is-total
      />
      <StatCard
        title="Aset ditugaskan"
        :value="totalAssignedAssetsCount"
        icon="devices"
        color="neutral"
        subtitle="Unit digunakan"
      />
      <StatCard
        title="Penugasan baru"
        :value="recentlyAssignedCount"
        icon="assignment_turned_in"
        color="success"
        subtitle="30 hari terakhir"
      />
    </div>

    <!-- Team Metrics Grid for Manager in Org Chart mode -->
    <div
      v-else-if="directoryMode === 'org-chart' && hasSubordinates && !isSuperAdmin"
      class="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2"
    >
      <StatCard
        title="Bawahan langsung"
        :value="mySubordinates.length"
        icon="group"
        color="primary"
        subtitle="Direct reports aktif"
        is-total
      />
      <StatCard
        title="Total anggota tim"
        :value="currentManagerInfo.teamCount"
        icon="diversity_3"
        color="neutral"
        subtitle="Seluruh hierarki tim"
      />
      <StatCard
        title="Aset dikelola tim"
        :value="currentManagerInfo.teamAssets"
        icon="devices"
        color="success"
        subtitle="Perangkat di tim Anda"
      />
    </div>

    <!-- ========================================================================= -->
    <!-- 1. MODE BAGAN ORGANISASI (ORG CHART)                                     -->
    <!-- ========================================================================= -->
    <div v-if="directoryMode === 'org-chart'" class="flex flex-col gap-3">
      <!-- A. SUPER ADMIN VIEW: Akses global tanpa bawahan operasional langsung -->
      <div
        v-if="isSuperAdmin"
        class="rounded-[6px] border border-[#BFDBFE] dark:border-blue-950 bg-[#EFF6FF] dark:bg-slate-900/80 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shadow-2xs"
      >
        <div class="flex items-start gap-2.5">
          <span aria-hidden="true" class="material-symbols-outlined text-[20px] text-[#0A51B0] dark:text-sky-400 shrink-0 mt-0.5">shield_person</span>
          <div>
            <h3 class="text-xs font-bold text-[#1E3A8A] dark:text-sky-200">
              Akses Pengawasan Organisasi Global (Super Admin)
            </h3>
            <p class="text-[9.5px] text-[#3B82F6] dark:text-slate-400 mt-0.5 leading-relaxed">
              Akun Super Admin memegang mandat sistem tertinggi tanpa relasi atasan atau bawahan operasional langsung. Anda dapat meninjau struktur hierarki tim per divisi di bawah ini.
            </p>
          </div>
        </div>

        <!-- Filter Departemen untuk Super Admin -->
        <div class="flex items-center gap-1.5 shrink-0">
          <label for="org-dept-select" class="text-[9.5px] font-semibold text-[#1E3A8A] dark:text-slate-300">Divisi:</label>
          <select
            id="org-dept-select"
            v-model="orgDepartment"
            class="h-7 rounded-[4px] border border-[#BFDBFE] dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-[9.5px] font-medium text-[#333333] dark:text-white focus:outline-none focus:border-[#0A51B0]"
          >
            <option value="">Semua Departemen ({{ availableOrgDepartments.length }})</option>
            <option v-for="dept in availableOrgDepartments" :key="dept" :value="dept">
              {{ dept }}
            </option>
          </select>
        </div>
      </div>

      <!-- Loading / Error States -->
      <div v-if="isLoadingEmployees" aria-busy="true">
        <SkeletonTable preset="employees" :rows="4" />
      </div>

      <div v-else-if="employeeError" class="p-3 text-center text-rose-600 text-[10px] sm:text-[10.5px]">
        <p class="font-semibold">{{ employeeError }}</p>
        <button type="button" @click="fetchEmployees" class="mt-1 font-bold underline cursor-pointer">
          Coba muat ulang
        </button>
      </div>

      <!-- B. USER WITH SUBORDINATES (ORG CHART TREE) -->
      <div
        v-else-if="hasSubordinates && !isSuperAdmin"
        class="flex flex-col items-center gap-0 w-full max-w-full overflow-x-auto pb-4 pt-1"
      >
        <!-- Root Node: The Logged In Manager -->
        <div
          class="relative flex flex-col items-center rounded-[8px] border-2 border-[#0A51B0] dark:border-blue-500 bg-white dark:bg-slate-900 p-3 shadow-sm min-w-[240px] max-w-[320px] text-center"
        >
          <div class="absolute -top-2.5 px-2 py-0.5 rounded-full bg-[#0A51B0] text-white text-[8px] font-bold uppercase tracking-wider shadow-2xs">
            Anda (Atasan Tim)
          </div>

          <div
            class="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#0A51B0] to-[#0A4391] text-xs font-bold text-white shadow-2xs"
          >
            {{ getInitials(currentManagerInfo.nama_karyawan) }}
          </div>

          <h3 class="text-xs font-bold text-[#333333] dark:text-white mt-1.5 truncate max-w-full">
            {{ currentManagerInfo.nama_karyawan }}
          </h3>
          <p class="text-[9.5px] font-semibold text-[#0A51B0] dark:text-sky-400 mt-0.5">
            {{ currentManagerInfo.title }}
          </p>
          <p class="text-[8.5px] text-[#5F7089] dark:text-slate-400 mt-0.2">
            NIK: {{ currentManagerInfo.nik || '-' }} &bull; {{ currentManagerInfo.departemen }}
          </p>

          <div class="mt-2 pt-1.5 border-t border-[#F1F5F9] dark:border-slate-800 flex items-center justify-center gap-2 text-[8.5px] text-[#5F7089] dark:text-slate-300 w-full">
            <span class="inline-flex items-center gap-0.5 font-semibold text-[#0A51B0] dark:text-sky-300">
              <span aria-hidden="true" class="material-symbols-outlined text-[11px]">group</span>
              {{ mySubordinates.length }} Bawahan Langsung
            </span>
            <span>&bull;</span>
            <span class="inline-flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <span aria-hidden="true" class="material-symbols-outlined text-[11px]">devices</span>
              {{ currentManagerInfo.teamAssets }} Aset Tim
            </span>
          </div>
        </div>

        <!-- Vertical Stem from Manager -->
        <div class="w-0.5 h-6 bg-[#0A51B0] dark:bg-blue-500"></div>

        <!-- Horizontal Distribution Bar & Connector Dropdowns -->
        <div class="w-full flex flex-col items-center">
          <div class="w-3/4 max-w-2xl h-0.5 bg-[#CBD5E1] dark:bg-slate-700 hidden sm:block"></div>

          <!-- Direct Reports Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-5xl mt-2 sm:mt-0">
            <div
              v-for="(sub, idx) in mySubordinates"
              :key="'sub-' + (sub.id_karyawan || sub.nik)"
              class="relative flex flex-col rounded-[6px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-2xs hover:border-[#0A51B0]/50 transition-all"
            >
              <!-- Card Top Header -->
              <div class="flex items-start justify-between gap-1.5">
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-gradient-to-br text-[10px] font-bold text-white shadow-2xs"
                    :class="getAvatarGradient(idx)"
                  >
                    {{ getInitials(sub.nama_karyawan) }}
                  </div>
                  <div class="flex flex-col min-w-0 flex-1">
                    <span class="text-[10.5px] sm:text-[11px] font-bold text-[#333333] dark:text-white truncate block">
                      {{ sub.nama_karyawan }}
                    </span>
                    <span class="font-mono text-[8.5px] text-[#5F7089] dark:text-slate-400 truncate block">
                      NIK: {{ sub.nik }}
                    </span>
                  </div>
                </div>

                <span
                  class="inline-flex items-center justify-center rounded-full bg-[#EFF6FF] dark:bg-blue-950 px-1.5 py-0.2 text-[8.5px] font-bold text-[#0A51B0] dark:text-sky-300 border border-[#BFDBFE]/60 dark:border-blue-900 whitespace-nowrap shrink-0"
                >
                  {{ sub.jumlah_aset || 0 }} Aset
                </span>
              </div>

              <!-- Metadata Details -->
              <div class="mt-2 pt-1.5 border-t border-[#F1F5F9] dark:border-slate-800 grid grid-cols-2 gap-1 text-[8.5px]">
                <div>
                  <span class="text-[#687281] dark:text-slate-400 block uppercase font-medium">Jabatan</span>
                  <span class="font-semibold text-[#333333] dark:text-white truncate block mt-0.2" :title="sub.jabatan || sub.title || '-'">
                    {{ sub.jabatan || sub.title || '-' }}
                  </span>
                </div>
                <div>
                  <span class="text-[#687281] dark:text-slate-400 block uppercase font-medium">Lokasi</span>
                  <span class="font-normal text-[#333333] dark:text-slate-200 truncate block mt-0.2" :title="normalizeLocation(sub.lokasi_kerja) || '-'">
                    {{ normalizeLocation(sub.lokasi_kerja) || '-' }}
                  </span>
                </div>
              </div>

              <!-- Device Chips -->
              <div class="mt-1.5 flex items-center gap-1 min-w-0 overflow-hidden">
                <template v-if="sub.asset_types && sub.asset_types.length > 0">
                  <span
                    v-for="tipe in sub.asset_types.slice(0, 2)"
                    :key="'sub-tip-' + tipe"
                    class="inline-flex items-center gap-0.5 rounded bg-[#F1F5F9] dark:bg-slate-800 px-1 py-0.2 text-[8px] font-medium text-[#475569] dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700 shrink min-w-0 overflow-hidden"
                  >
                    <span aria-hidden="true" class="material-symbols-outlined text-[10px] text-[#333333] dark:text-white shrink-0">
                      {{ getDeviceIcon(tipe) }}
                    </span>
                    <span class="truncate">{{ tipe }}</span>
                  </span>
                  <span v-if="sub.asset_types.length > 2" class="text-[8px] font-semibold text-[#687281] dark:text-slate-400 shrink-0">
                    +{{ sub.asset_types.length - 2 }}
                  </span>
                </template>
                <span v-else class="text-[8.5px] text-[#687281] dark:text-slate-400 truncate">Tanpa perangkat</span>
              </div>

              <!-- Nested Subordinates (Jika bawahan ini juga punya bawahan) -->
              <div v-if="getDirectSubordinates(sub.nik).length > 0" class="mt-2 pt-1 border-t border-[#F1F5F9] dark:border-slate-800">
                <button
                  type="button"
                  @click="toggleNode(sub.nik)"
                  class="w-full flex items-center justify-between text-[8.5px] font-semibold text-[#0A51B0] dark:text-sky-400 hover:underline py-0.5 cursor-pointer"
                >
                  <span class="flex items-center gap-0.5">
                    <span aria-hidden="true" class="material-symbols-outlined text-[11px]">account_tree</span>
                    <span>Sub-Tim: {{ getDirectSubordinates(sub.nik).length }} bawahan</span>
                  </span>
                  <span aria-hidden="true" class="material-symbols-outlined text-[13px]">
                    {{ expandedNodes.has(sub.nik) ? 'expand_less' : 'expand_more' }}
                  </span>
                </button>

                <!-- Sub-team expanded list -->
                <div v-if="expandedNodes.has(sub.nik)" class="mt-1 pl-2 border-l-2 border-[#BFDBFE] dark:border-slate-700 flex flex-col gap-1">
                  <div
                    v-for="sub2 in getDirectSubordinates(sub.nik)"
                    :key="'sub2-' + sub2.nik"
                    @click="goToLevel2(sub2)"
                    class="p-1 rounded bg-[#F8FAFC] dark:bg-slate-800/80 hover:bg-[#EFF6FF] dark:hover:bg-slate-700 flex items-center justify-between gap-1 cursor-pointer"
                  >
                    <span class="text-[8.5px] font-medium text-[#333333] dark:text-white truncate">
                      {{ sub2.nama_karyawan }}
                    </span>
                    <span class="text-[8px] text-[#5F7089] dark:text-slate-400 font-mono">
                      {{ sub2.jumlah_aset || 0 }} unit
                    </span>
                  </div>
                </div>
              </div>

              <!-- Card Action -->
              <div class="mt-2 pt-1.5 border-t border-[#F1F5F9] dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  @click="goToLevel2(sub)"
                  class="inline-flex items-center gap-1 rounded bg-[#F8FAFC] dark:bg-slate-800 hover:bg-[#0A51B0] hover:text-white dark:hover:bg-blue-600 border border-[#E2E8F0] dark:border-slate-700 px-2 py-0.5 text-[8.5px] font-semibold text-[#0A51B0] dark:text-sky-400 transition-colors cursor-pointer"
                >
                  <span>Lihat Detail Aset</span>
                  <span aria-hidden="true" class="material-symbols-outlined text-[12px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- C. SUPER ADMIN ORG CHART TREES PER DEPARTMENT -->
      <div v-else-if="isSuperAdmin && companyOrgRoots.length > 0" class="flex flex-col gap-4">
        <div
          v-for="rootLeader in companyOrgRoots"
          :key="'root-' + rootLeader.nik"
          class="rounded-[6px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs"
        >
          <!-- Leader Header Node -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-[#F1F5F9] dark:border-slate-800">
            <div class="flex items-center gap-2.5 min-w-0">
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-gradient-to-br from-[#0A51B0] to-[#0A4391] text-[11px] font-bold text-white shadow-2xs"
              >
                {{ getInitials(rootLeader.nama_karyawan) }}
              </div>
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h4 class="text-xs font-bold text-[#333333] dark:text-white truncate">
                    {{ rootLeader.nama_karyawan }}
                  </h4>
                  <span class="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-[#0A51B0] dark:text-sky-300 text-[8px] font-bold">
                    {{ rootLeader.departemen || 'Umum' }}
                  </span>
                </div>
                <span class="text-[9.5px] text-[#5F7089] dark:text-slate-400">
                  {{ rootLeader.jabatan || rootLeader.title || 'Pimpinan Divisi' }} &bull; NIK: {{ rootLeader.nik }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2 self-end sm:self-center">
              <span class="text-[9px] font-semibold text-[#5F7089] dark:text-slate-400">
                {{ getDirectSubordinates(rootLeader.nik).length }} Bawahan Langsung
              </span>
              <button
                type="button"
                @click="goToLevel2(rootLeader)"
                class="inline-flex items-center gap-1 rounded bg-[#F8FAFC] dark:bg-slate-800 hover:bg-[#0A51B0] hover:text-white border border-[#E2E8F0] dark:border-slate-700 px-2 py-1 text-[9px] font-semibold text-[#0A51B0] dark:text-sky-400 transition-colors cursor-pointer"
              >
                <span>Lihat Profil</span>
                <span aria-hidden="true" class="material-symbols-outlined text-[12px]">chevron_right</span>
              </button>
            </div>
          </div>

          <!-- Direct Reports Under This Root -->
          <div v-if="getDirectSubordinates(rootLeader.nik).length > 0" class="mt-2.5">
            <h5 class="text-[9px] font-bold uppercase tracking-wider text-[#687281] dark:text-slate-400 mb-1.5 flex items-center gap-1">
              <span aria-hidden="true" class="material-symbols-outlined text-[12px]">subdirectory_arrow_right</span>
              <span>Struktur Bawahan Langsung</span>
            </h5>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              <div
                v-for="sub in getDirectSubordinates(rootLeader.nik)"
                :key="'root-sub-' + sub.nik"
                @click="goToLevel2(sub)"
                class="rounded-[5px] border border-[#F1F5F9] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/60 p-2 hover:bg-[#EFF6FF] dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <div class="flex items-center justify-between gap-1">
                  <span class="text-[10px] font-bold text-[#333333] dark:text-white truncate">
                    {{ sub.nama_karyawan }}
                  </span>
                  <span class="text-[8px] font-bold px-1 rounded bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 text-[#0A51B0] dark:text-sky-300">
                    {{ sub.jumlah_aset || 0 }} unit
                  </span>
                </div>
                <div class="text-[8.5px] text-[#5F7089] dark:text-slate-400 mt-0.5 truncate">
                  {{ sub.jabatan || sub.title || '-' }} &bull; NIK: {{ sub.nik }}
                </div>
              </div>
            </div>
          </div>
          <div v-else class="mt-2 text-[9px] text-[#687281] dark:text-slate-500 italic">
            Belum ada staf bawahan langsung yang terdata untuk posisi ini.
          </div>
        </div>
      </div>

      <!-- D. REGULAR USER WITHOUT SUBORDINATES -->
      <div
        v-else
        class="rounded-[6px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-[#5F7089]"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[32px] text-[#CBD5E1] dark:text-slate-600">
          diversity_3
        </span>
        <h3 class="mt-2 font-bold text-xs sm:text-[13px] text-[#333333] dark:text-white">
          Belum Memiliki Bawahan Langsung
        </h3>
        <p class="text-[9.5px] sm:text-[10px] text-[#5F7089] dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
          Akun Anda saat ini tidak memiliki staf atau bawahan langsung yang terdaftar di struktur organisasi.
        </p>

        <!-- Informasi Atasan Langsung Pengguna -->
        <div
          v-if="myDirectSupervisor"
          class="mt-4 pt-3 border-t border-[#F1F5F9] dark:border-slate-800 max-w-sm mx-auto text-left rounded-[6px] bg-[#F8FAFC] dark:bg-slate-800/80 p-2.5"
        >
          <span class="text-[8.5px] font-bold uppercase tracking-wider text-[#687281] dark:text-slate-400 block mb-1">
            Atasan Langsung Anda:
          </span>
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <div
                class="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-[4px] bg-[#0A51B0] text-[9.5px] font-bold text-white"
              >
                {{ getInitials(myDirectSupervisor.nama_karyawan) }}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-[10.5px] font-bold text-[#333333] dark:text-white truncate">
                  {{ myDirectSupervisor.nama_karyawan }}
                </span>
                <span class="text-[8.5px] text-[#5F7089] dark:text-slate-400 truncate">
                  {{ myDirectSupervisor.jabatan || myDirectSupervisor.title || 'Manajer' }} &bull; NIK: {{ myDirectSupervisor.nik }}
                </span>
              </div>
            </div>

            <button
              v-if="canBrowseOtherAssets"
              type="button"
              @click="goToLevel2(myDirectSupervisor)"
              class="text-[8.5px] font-semibold text-[#0A51B0] hover:underline shrink-0"
            >
              Lihat Aset
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- 2. MODE DAFTAR KARYAWAN (TABEL / KARTU)                                   -->
    <!-- ========================================================================= -->
    <div v-if="directoryMode === 'list'" class="flex flex-col gap-3">
      <!-- Toolbar: Elegant Single Search & Compact Filters (sticky mengikuti scroll) -->
      <div
        v-if="canBrowseOtherAssets"
        class="employee-assets-toolbar ws-toolbar-sticky grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[6px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-2 sm:p-2.5 shadow-2xs"
      >
        <div class="relative h-7.5 sm:h-8 w-full sm:flex-1 sm:min-w-[180px]">
          <label for="emp-search" class="sr-only">Cari karyawan dengan aset</label>
          <span
            aria-hidden="true"
            class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px] text-[#687281] dark:text-slate-400 pointer-events-none"
            >search</span
          >
          <input
            id="emp-search"
            v-model="search"
            type="text"
            placeholder="Cari nama karyawan, NIK, atau departemen…"
            class="h-full w-full rounded-[5px] border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800 pl-7.5 pr-7 text-[10px] sm:text-[10.5px] text-[#333333] dark:text-white placeholder-[#687281] dark:placeholder-slate-400 focus:border-[#0A51B0] focus:bg-white dark:focus:bg-slate-800 focus:outline-none transition-all"
          />
          <!-- Inline Clear Button -->
          <button
            v-if="search"
            type="button"
            @click="search = ''"
            aria-label="Bersihkan pencarian"
            class="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-4.5 w-4.5 items-center justify-center rounded-full text-[#687281] dark:text-slate-400 hover:bg-[#F1F5F9] dark:hover:bg-slate-700 hover:text-[#333333] dark:hover:text-white transition-all cursor-pointer touch-manipulation"
            title="Bersihkan"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[13px]">close</span>
          </button>
        </div>

        <button
          type="button"
          @click="openFilter"
          class="h-7.5 sm:h-8 shrink-0 rounded-[5px] border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 px-2.5 text-[10px] sm:text-[10.5px] font-semibold text-[#5F7089] dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
        >
          <span aria-hidden="true" class="material-symbols-outlined mr-1 align-middle text-[14px]"
            >filter_alt</span
          >Filter
        </button>

        <AppViewToggle v-model="viewMode" />
      </div>

      <!-- Main Hybrid Employee Table/List -->
      <div
        class="employee-list rounded-[6px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden"
      >
        <!-- Loading State -->
        <div v-if="isLoadingEmployees" aria-busy="true">
          <SkeletonTable preset="employees" :rows="5" />
        </div>

        <!-- Error State -->
        <div v-else-if="employeeError" class="p-2.5 text-center text-rose-600 text-[10px] sm:text-[10.5px]">
          <p class="font-semibold">{{ employeeError }}</p>
          <button
            type="button"
            @click="fetchEmployees"
            class="mt-1 font-bold underline cursor-pointer"
          >
            Coba muat ulang
          </button>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredEmployees.length === 0" class="p-5 text-center text-[#5F7089]">
          <span aria-hidden="true" class="material-symbols-outlined text-[28px] text-[#CBD5E1]"
            >person_search</span
          >
          <h3 class="mt-1.5 font-semibold text-xs sm:text-[13px] text-[#333333] dark:text-white">Tidak Ada Karyawan Memegang Aset</h3>
          <p class="text-[9.5px] sm:text-[10px] text-[#5F7089] dark:text-slate-400 mt-0.5 max-w-sm mx-auto">
            Tidak ditemukan karyawan yang sedang memegang aset IT sesuai kriteria pencarian.
          </p>
        </div>

        <!-- Data Presentation (Responsive: Desktop & Mobile switch between Table and Card) -->
        <div v-else class="w-full max-w-full">
          <!-- Mode Tabel (Scrollable horizontal di mobile) -->
          <div v-if="viewMode === 'table'" class="w-full max-w-full overflow-x-auto">
            <table class="w-full min-w-[650px] text-left border-collapse table-fixed">
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
                  class="border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800 text-[9px] sm:text-[9.5px] font-semibold text-[#5F7089] dark:text-slate-400 uppercase tracking-wider select-none whitespace-nowrap"
                >
                  <th class="py-2.5 pl-3.5 pr-2.5 text-left whitespace-nowrap">Karyawan</th>
                  <th class="py-2.5 px-2.5 text-left whitespace-nowrap">Departemen & Lokasi</th>
                  <th class="py-2.5 px-2.5 text-left whitespace-nowrap">Kategori Aset</th>
                  <th class="py-2.5 px-2 text-center whitespace-nowrap">Total Aset</th>
                  <th class="py-2.5 px-2.5 text-center whitespace-nowrap">Penugasan Terakhir</th>
                  <th class="py-2.5 pr-3.5 pl-2 text-center whitespace-nowrap">Detail</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#F1F5F9] dark:divide-slate-800 text-[10px] sm:text-[10.5px]">
                <tr
                  v-for="(employee, idx) in paginatedEmployees"
                  :key="employee.id_karyawan || employee.nik"
                  @click="goToLevel2(employee)"
                  class="group hover:bg-[#F8FAFC] dark:hover:bg-slate-800/60 transition-colors duration-150 cursor-pointer select-none"
                >
                  <!-- Avatar & Employee Info -->
                  <td class="py-2.5 pl-3.5 pr-2.5 overflow-hidden">
                    <div class="flex items-center gap-2 min-w-0">
                      <div
                        class="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-[5px] bg-gradient-to-br text-[10px] font-bold text-white shadow-2xs"
                        :class="getAvatarGradient(idx)"
                      >
                        {{ getInitials(employee.nama_karyawan) }}
                      </div>
                      <div class="flex flex-col min-w-0">
                        <span
                          class="text-[10.5px] sm:text-[11px] font-semibold text-[#333333] dark:text-white group-hover:text-[#0A51B0] dark:group-hover:text-sky-400 transition-colors truncate block"
                          :title="employee.nama_karyawan"
                        >
                          {{ employee.nama_karyawan }}
                        </span>
                        <span
                          class="font-mono text-[9px] sm:text-[9.5px] text-[#5F7089] dark:text-slate-400 truncate block"
                          :title="`NIK: ${employee.nik}`"
                          >NIK: {{ employee.nik }}</span
                        >
                      </div>
                    </div>
                  </td>

                  <!-- Departemen & Lokasi -->
                  <td class="py-2.5 px-2.5 overflow-hidden">
                    <div class="flex flex-col min-w-0">
                      <span
                        class="font-semibold text-[#333333] dark:text-white truncate block"
                        :title="employee.departemen || '-'"
                        >{{ employee.departemen || '-' }}</span
                      >
                      <span
                        class="text-[9px] sm:text-[9.5px] text-[#5F7089] dark:text-slate-400 flex items-center gap-0.5 truncate mt-0.5"
                        :title="normalizeLocation(employee.lokasi_kerja) || '-'"
                      >
                        <span
                          aria-hidden="true"
                          class="material-symbols-outlined text-[11px] text-[#687281] shrink-0"
                          >location_on</span
                        >
                        <span class="truncate block">{{
                          normalizeLocation(employee.lokasi_kerja) || '-'
                        }}</span>
                      </span>
                    </div>
                  </td>

                  <!-- Asset Type Chips -->
                  <td class="py-2.5 px-2.5 overflow-hidden">
                    <div class="flex items-center gap-1 min-w-0 overflow-hidden">
                      <template v-if="employee.asset_types && employee.asset_types.length > 0">
                        <span
                          v-for="tipe in employee.asset_types.slice(0, 2)"
                          :key="tipe"
                          class="inline-flex items-center gap-0.5 rounded bg-[#F1F5F9] dark:bg-slate-800 px-1 py-0.2 text-[8.5px] sm:text-[9px] font-medium text-[#475569] dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700 shrink min-w-0 overflow-hidden"
                        >
                          <span
                            aria-hidden="true"
                            class="material-symbols-outlined text-[11px] text-[#333333] dark:text-white shrink-0"
                            >{{ getDeviceIcon(tipe) }}</span
                          >
                          <span class="truncate">{{ tipe }}</span>
                        </span>
                        <span
                          v-if="employee.asset_types.length > 2"
                          class="text-[8.5px] font-semibold text-[#687281] dark:text-slate-400 shrink-0"
                        >
                          +{{ employee.asset_types.length - 2 }}
                        </span>
                      </template>
                      <span v-else class="text-[9.5px] text-[#687281] dark:text-slate-400 truncate">Aset IT</span>
                    </div>
                  </td>

                  <!-- Total Aset Badge -->
                  <td class="py-2.5 px-2 text-center overflow-hidden">
                    <span
                      class="inline-flex items-center justify-center rounded-full bg-[#EFF6FF] dark:bg-blue-950 px-1.5 py-0.2 text-[9px] sm:text-[9.5px] font-bold text-[#0A51B0] dark:text-sky-300 border border-[#BFDBFE]/60 dark:border-blue-900 whitespace-nowrap"
                    >
                      {{ employee.jumlah_aset || 0 }} Aset
                    </span>
                  </td>

                  <!-- Last Assignment Date -->
                  <td class="py-2.5 px-2.5 text-[#5F7089] dark:text-slate-400 overflow-hidden text-center">
                    <span
                      class="text-[9.5px] sm:text-[10px] font-medium truncate block"
                      :title="formatDate(employee.last_assignment_date)"
                      >{{ formatDate(employee.last_assignment_date) }}</span
                    >
                  </td>

                  <!-- Action Chevron -->
                  <td class="py-2.5 pr-3.5 pl-2 text-center overflow-hidden">
                    <span
                      aria-hidden="true"
                      class="material-symbols-outlined text-[15px] text-[#687281] group-hover:text-[#0A51B0] dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all inline-block"
                      >chevron_right</span
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mode Kartu -->
          <div v-if="viewMode === 'card'" class="divide-y divide-[#F1F5F9] dark:divide-slate-800">
            <div
              v-for="(employee, idx) in paginatedEmployees"
              :key="'mob-' + (employee.id_karyawan || employee.nik)"
              @click="goToLevel2(employee)"
              class="p-2.5 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/60 active:bg-[#F1F5F9] dark:active:bg-slate-800 transition-colors cursor-pointer select-none"
            >
              <!-- Card Header: Avatar, Name, NIK, Total Aset Badge & Chevron -->
              <div class="flex items-center justify-between gap-1.5">
                <div class="flex items-center gap-1.5 min-w-0 flex-1">
                  <div
                    class="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-[5px] bg-gradient-to-br text-[9.5px] sm:text-[10px] font-bold text-white shadow-2xs"
                    :class="getAvatarGradient(idx)"
                  >
                    {{ getInitials(employee.nama_karyawan) }}
                  </div>
                  <div class="flex flex-col min-w-0 flex-1">
                    <span class="text-[10.5px] sm:text-[11px] font-bold text-[#333333] dark:text-white truncate block">
                      {{ employee.nama_karyawan }}
                    </span>
                    <span class="font-mono text-[8.5px] sm:text-[9px] text-[#5F7089] dark:text-slate-400 truncate block">
                      NIK: {{ employee.nik }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <span
                    class="inline-flex items-center justify-center rounded-full bg-[#EFF6FF] dark:bg-blue-950 px-1.5 py-0.2 text-[8.5px] sm:text-[9px] font-bold text-[#0A51B0] dark:text-sky-300 border border-[#BFDBFE]/60 dark:border-blue-900 whitespace-nowrap"
                  >
                    {{ employee.jumlah_aset || 0 }} Aset
                  </span>
                  <span
                    aria-hidden="true"
                    class="material-symbols-outlined text-[14px] text-[#687281] dark:text-slate-400"
                    >chevron_right</span
                  >
                </div>
              </div>

              <!-- Subtle Divider -->
              <div class="border-t border-[#F1F5F9] dark:border-slate-800 my-1"></div>

              <!-- 2x2 Metadata Grid -->
              <div class="grid grid-cols-2 gap-1 text-left">
                <!-- 1. Departemen -->
                <div class="flex flex-col min-w-0 overflow-hidden">
                  <span class="text-[8px] sm:text-[8.5px] font-semibold uppercase text-[#687281] dark:text-slate-400 tracking-wider"
                    >Departemen</span
                  >
                  <span
                    class="text-[9.5px] sm:text-[10px] font-semibold text-[#333333] dark:text-white mt-0.5 truncate block"
                    :title="employee.departemen || '-'"
                  >
                    {{ employee.departemen || '-' }}
                  </span>
                </div>

                <!-- 2. Lokasi -->
                <div class="flex flex-col min-w-0 overflow-hidden">
                  <span class="text-[8px] sm:text-[8.5px] font-semibold uppercase text-[#687281] dark:text-slate-400 tracking-wider"
                    >Lokasi</span
                  >
                  <span
                    class="text-[9.5px] sm:text-[10px] font-normal text-[#333333] dark:text-slate-200 mt-0.5 truncate flex items-center gap-0.5"
                    :title="normalizeLocation(employee.lokasi_kerja) || '-'"
                  >
                    <span
                      aria-hidden="true"
                      class="material-symbols-outlined text-[10px] text-[#687281] dark:text-slate-400 shrink-0"
                      >location_on</span
                    >
                    <span class="truncate">{{
                      normalizeLocation(employee.lokasi_kerja) || '-'
                    }}</span>
                  </span>
                </div>

                <!-- 3. Kategori Aset -->
                <div class="flex flex-col min-w-0 overflow-hidden">
                  <span class="text-[8px] sm:text-[8.5px] font-semibold uppercase text-[#687281] dark:text-slate-400 tracking-wider"
                    >Kategori Aset</span
                  >
                  <div class="flex items-center gap-0.5 min-w-0 overflow-hidden mt-0.5">
                    <template v-if="employee.asset_types && employee.asset_types.length > 0">
                      <span
                        v-for="tipe in employee.asset_types.slice(0, 2)"
                        :key="'mob-tip-' + tipe"
                        class="inline-flex items-center gap-0.5 rounded bg-[#F1F5F9] dark:bg-slate-800 px-1 py-0.2 text-[8.5px] font-medium text-[#475569] dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700 shrink min-w-0 overflow-hidden"
                      >
                        <span
                          aria-hidden="true"
                          class="material-symbols-outlined text-[10px] text-[#333333] dark:text-white shrink-0"
                          >{{ getDeviceIcon(tipe) }}</span
                        >
                        <span class="truncate">{{ tipe }}</span>
                      </span>
                      <span
                        v-if="employee.asset_types.length > 2"
                        class="text-[8px] font-semibold text-[#687281] dark:text-slate-400 shrink-0"
                      >
                        +{{ employee.asset_types.length - 2 }}
                      </span>
                    </template>
                    <span v-else class="text-[9px] text-[#687281] dark:text-slate-400 truncate">Aset IT</span>
                  </div>
                </div>

                <!-- 4. Penugasan Terakhir -->
                <div class="flex flex-col min-w-0 overflow-hidden">
                  <span class="text-[8px] sm:text-[8.5px] font-semibold uppercase text-[#687281] dark:text-slate-400 tracking-wider"
                    >Penugasan Terakhir</span
                  >
                  <span
                    class="text-[9.5px] sm:text-[10px] font-medium text-[#5F7089] dark:text-slate-400 mt-0.5 truncate block"
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
  </div>
</template>
<style scoped src="../../assets/ws-table.css"></style>
<style scoped>
/* Header tidak sticky di modul Inventaris (Aset Karyawan) - scroll
   bersama konten. HARUS setelah import ws-table.css agar menang. */
.ws-toolbar-sticky {
  position: static;
  z-index: auto;
  top: auto;
}

.employee-assets-heading {
  padding: 4px 0;
}
/* Judul halaman mengikuti skala global main.css (h1 18px / 16px mobile). */
.employee-assets-heading h1 {
  letter-spacing: -0.02em;
  font-weight: 650;
}
.employee-assets-heading p {
  margin-top: 4px;
  color: #637288;
  line-height: 1.5;
}
.employee-assets-toolbar {
  box-shadow: none;
}
.employee-assets-toolbar input {
  border-radius: 6px;
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
  border-radius: 6px;
  box-shadow: none;
}
.employee-list th {
  font-size: 11px;
  font-weight: 600;
  color: #637288;
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
  .employee-assets-toolbar {
    padding: 10px;
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

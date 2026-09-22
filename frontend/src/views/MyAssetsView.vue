<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useAuth } from '../composables/useAuth.js'
import { formatStatusPill } from '../utils/assetStatus.js'
import { normalizeLocation } from '../utils/locationNormalizer.js'
import AppModal from '../components/ui/AppModal.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import MyAssetsEmployeeList from '../components/assets/MyAssetsEmployeeList.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import FilterModal from '../components/ui/FilterModal.vue'
import StatCard from '../components/ui/StatCard.vue'

const { get } = useApi()
const { isAdmin, isSuperAdmin, user, refreshUser, hasPermission } = useAuth()
const canBrowseOtherAssets = computed(
  () => isSuperAdmin.value || (isAdmin.value && hasPermission('assets')),
)

// ── State Level Navigasi (1 = Listing Karyawan, 2 = Detail Karyawan, 3 = Detail & Audit History Aset) ──
const currentLevel = ref(canBrowseOtherAssets.value ? 1 : 2)

// ── State: Data Karyawan & Aset ───────────────────────────────────────────────
const employees = ref([])
const isLoadingEmployees = ref(false)
const employeeError = ref('')
const employeeSearch = ref('')
const filterDepartemen = ref('')
const filterLokasi = ref('')

// State Karyawan & Aset Terpilih
const selectedEmployee = ref(null)
const selectedAsset = ref(null)

const myAssets = ref([])
const isLoadingAssets = ref(false)
const assetError = ref('')
const assetSearch = ref('')
const filterTipe = ref('')
const showFilterModal = ref(false)

const showSpecificationModal = ref(false)
const activeModalAsset = ref(null)

// State Device Cycle & Real Audit Logs
const deviceCycle = ref([])
const realAssetLogs = ref([])
const isLoadingCycle = ref(false)
const isLoadingLogs = ref(false)

// ── Page-level loading state (aggregates all loading flags) ──────────────────
const isLoading = computed(
  () =>
    isLoadingEmployees.value ||
    isLoadingAssets.value ||
    isLoadingCycle.value ||
    isLoadingLogs.value,
)

// ── Level 1: Filtered Employees (Rule: STRICTLY ONLY employees with assets > 0) ──
const employeesWithAssets = computed(() => {
  return employees.value.filter((e) => parseInt(e.jumlah_aset || 0) > 0)
})

// ── Level 1 KPI Calculations ───────────────────────────────────────────────────
const totalEmployeesHoldingAssets = computed(() => employeesWithAssets.value.length)

const totalAssignedAssetsCount = computed(() => {
  return employeesWithAssets.value.reduce((acc, emp) => acc + parseInt(emp.jumlah_aset || 0), 0)
})

const recentlyAssignedCount = computed(() => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  return employeesWithAssets.value.filter((e) => {
    if (!e.last_assignment_date) return false
    const assignDate = new Date(e.last_assignment_date)
    return !isNaN(assignDate.getTime()) && assignDate >= thirtyDaysAgo
  }).length
})

// ── Filter Options & Filtering for Level 1 ─────────────────────────────────────
const departemenOptions = computed(() => {
  const deps = [...new Set(employeesWithAssets.value.map((e) => e.departemen).filter(Boolean))]
  return deps.sort()
})

const lokasiOptions = computed(() => {
  const locs = [
    ...new Set(
      employeesWithAssets.value.map((e) => normalizeLocation(e.lokasi_kerja)).filter(Boolean),
    ),
  ]
  return locs.sort()
})

const departemenFilterOptions = computed(() => [
  { value: '', label: 'Semua Departemen' },
  ...departemenOptions.value.map((dep) => ({ value: dep, label: dep })),
])

const lokasiFilterOptions = computed(() => [
  { value: '', label: 'Semua Lokasi' },
  ...lokasiOptions.value.map((loc) => ({ value: loc, label: loc })),
])

const tipeFilterOptions = computed(() => {
  const employeeAssetTypes = employeesWithAssets.value.flatMap((employee) =>
    Array.isArray(employee.asset_types) ? employee.asset_types : [],
  )
  const loadedAssetTypes = myAssets.value.map((asset) => asset.tipe_perangkat).filter(Boolean)
  const types = [...new Set([...employeeAssetTypes, ...loadedAssetTypes].filter(Boolean))].sort()

  return [
    { value: '', label: 'Semua Tipe Perangkat' },
    ...types.map((type) => ({ value: type, label: type })),
  ]
})

const currentPageEmployees = ref(1)
const currentPageAssets = ref(1)
const itemsPerPage = ref(10)

watch([employeeSearch, filterDepartemen, filterLokasi], () => {
  currentPageEmployees.value = 1
})

watch([assetSearch, filterTipe, selectedEmployee], () => {
  currentPageAssets.value = 1
})

const filteredEmployees = computed(() => {
  const q = employeeSearch.value.trim().toLowerCase()
  return employeesWithAssets.value.filter((e) => {
    const text = [e.nik, e.nama_karyawan, e.email_kantor, e.departemen, e.jabatan, e.lokasi_kerja]
      .join(' ')
      .toLowerCase()
    return (
      (!q || text.includes(q)) &&
      (!filterDepartemen.value || e.departemen === filterDepartemen.value) &&
      (!filterLokasi.value || e.lokasi_kerja === filterLokasi.value)
    )
  })
})

const paginatedEmployees = computed(() => {
  const start = (currentPageEmployees.value - 1) * itemsPerPage.value
  return filteredEmployees.value.slice(start, start + itemsPerPage.value)
})

// ── Level 2: Filter & Pagination Aset Karyawan ─────────────────────────────────
const filteredAssets = computed(() => {
  const q = assetSearch.value.trim().toLowerCase()
  return myAssets.value.filter((asset) => {
    const text = [
      asset.id_aset,
      asset.nomor_seri,
      asset.label_aset,
      asset.spesifikasi,
      asset.lokasi_aset,
      asset.tipe_perangkat,
      asset.merek,
      asset.model,
      asset.status_aset,
      asset.kondisi_aset,
    ]
      .join(' ')
      .toLowerCase()
    return (
      (!q || text.includes(q)) && (!filterTipe.value || asset.tipe_perangkat === filterTipe.value)
    )
  })
})

const paginatedAssets = computed(() => {
  const start = (currentPageAssets.value - 1) * itemsPerPage.value
  return filteredAssets.value.slice(start, start + itemsPerPage.value)
})

// ── Level 2 Summary Metrics ────────────────────────────────────────────────────
const employeeAssignedSince = computed(() => {
  if (myAssets.value.length === 0) return '—'
  const dates = myAssets.value
    .map((a) => a.created_at || a.dibuat_pada)
    .filter(Boolean)
    .map((d) => new Date(d).getTime())
    .filter((t) => !isNaN(t))
  if (dates.length === 0) return '—'
  const minTimestamp = Math.min(...dates)
  return formatDate(new Date(minTimestamp).toISOString())
})

// ── Level 3: Audit & History Log Timeline ──────────────────────────────────────
const assetHistoryTimeline = computed(() => {
  if (!selectedAsset.value) return []

  const list = []
  const asset = selectedAsset.value
  const emp = selectedEmployee.value

  // 1. Real Audit Logs from log_riwayat_aset (/api/logs/assets/:id)
  if (realAssetLogs.value.length > 0) {
    realAssetLogs.value.forEach((log) => {
      let icon = 'edit'
      let type = 'status_change'
      let actionTitle =
        log.aksi === 'TAMBAH'
          ? 'Aset Didaftarkan ke Sistem'
          : log.aksi === 'UBAH'
            ? 'Pembaruan Informasi Aset'
            : 'Aset Dihapus'

      if (log.aksi === 'TAMBAH') {
        icon = 'add_circle'
        type = 'creation'
      } else if (log.aksi === 'HAPUS') {
        icon = 'delete'
        type = 'deletion'
      } else if (
        log.perubahan?.includes('NIK Pemegang') ||
        log.perubahan?.includes('nama_karyawan') ||
        log.perubahan?.includes('Pemegang')
      ) {
        icon = 'person_add'
        type = 'assignment'
        actionTitle = 'Penugasan Aset Diperbarui'
      } else if (log.perubahan?.includes('Lokasi')) {
        icon = 'pin_drop'
        type = 'relocation'
        actionTitle = 'Lokasi Aset Dipindahkan'
      }

      list.push({
        date: log.dibuat_pada || log.created_at,
        action: actionTitle,
        actor: log.oleh_pengguna || log.nama_user || log.username || 'Super Administrator',
        status: log.aksi,
        detail: log.perubahan || 'Perubahan data aset tercatat oleh sistem',
        icon,
        type,
      })
    })
  }

  // 2. Usage Cycles from riwayat_pemakaian_aset
  const cycles = deviceCycle.value.filter(
    (c) =>
      c.nomor_seri === asset.nomor_seri ||
      c.id_aset === asset.id_aset ||
      c.label_aset === asset.label_aset,
  )

  cycles.forEach((c) => {
    list.push({
      date: c.tanggal_mulai,
      action: `Aset ditugaskan kepada ${emp?.nama_karyawan || 'Karyawan'}`,
      actor: 'Admin IT System',
      status: c.status_pemakaian || 'Aktif',
      detail: `Catatan Penugasan: ${c.catatan || 'Aset aktif digunakan oleh pemegang'}`,
      icon: 'person_pin',
      type: 'assignment',
    })
    if (c.tanggal_selesai) {
      list.push({
        date: c.tanggal_selesai,
        action: 'Penugasan aset selesai / dikembalikan',
        actor: 'Admin IT System',
        status: 'Selesai',
        detail: 'Aset telah dikembalikan ke stok inventaris IT',
        icon: 'assignment_return',
        type: 'return',
      })
    }
  })

  // 3. Fallback entry if no logs or cycles exist
  if (list.length === 0) {
    list.push({
      date: asset.created_at || new Date().toISOString(),
      action: `Aset ditugaskan kepada ${emp?.nama_karyawan || 'Karyawan'}`,
      actor: 'Sistem Inventory IT',
      status: asset.status_aset || 'In Use',
      detail: `Pemegang Aktif: ${emp?.nama_karyawan || 'Karyawan'} (NIK: ${emp?.nik || '—'})`,
      icon: 'person_check',
      type: 'assignment',
    })
  }

  return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
})

// ── Navigasi Helper ────────────────────────────────────────────────────────────
function goToLevel1() {
  if (!canBrowseOtherAssets.value) return
  currentLevel.value = 1
  selectedEmployee.value = null
  selectedAsset.value = null
  myAssets.value = []
  deviceCycle.value = []
  realAssetLogs.value = []
}

function normalizeAsset(a) {
  if (!a || typeof a !== 'object') return a
  const hostname = a.hostname || a.label_aset || ''
  const serial_number = a.serial_number || a.nomor_seri || ''
  const nik = a.nik_pemegang_asset || a.nik || ''
  const nama = a.nama_karyawan_pemegang_asset || a.nama_karyawan || ''
  const dept = a.departemen_pemegang_asset || a.departemen || ''
  const rawLokasi = a.lokasi_asset || a.lokasi_aset || a.lokasi_kerja || a.lokasi || ''
  const lokasi = normalizeLocation(rawLokasi)
  const status = a.status || a.status_aset || 'In Use'
  const kondisi = a.kondisi || a.kondisi_aset || 'Normal'
  const note = a.note_asset || a.catatan_aset || ''
  const brand = a.brand_merek || a.merek || ''

  return {
    ...a,
    id_aset: a.id_aset || a.id,
    id: a.id || a.id_aset,
    hostname,
    label_aset: hostname,
    serial_number,
    nomor_seri: serial_number,
    nik_pemegang_asset: nik,
    nik,
    nama_karyawan_pemegang_asset: nama,
    nama_karyawan: nama,
    departemen_pemegang_asset: dept,
    departemen: dept,
    lokasi_asset: lokasi,
    lokasi_aset: lokasi,
    lokasi_kerja: lokasi,
    lokasi,
    brand_merek: brand,
    merek: brand,
    status,
    status_aset: status,
    kondisi,
    kondisi_aset: kondisi,
    note_asset: note,
    catatan_aset: note,
  }
}

async function goToLevel2(employee) {
  selectedEmployee.value = employee
  selectedAsset.value = null
  currentLevel.value = 2
  assetSearch.value = ''
  filterTipe.value = ''
  myAssets.value = []
  deviceCycle.value = []
  realAssetLogs.value = []
  assetError.value = ''

  isLoadingAssets.value = true
  try {
    const nik = employee.nik || ''
    const assetData = await get(`/api/assets/my?nik=${encodeURIComponent(nik)}`)
    myAssets.value = Array.isArray(assetData) ? assetData.map(normalizeAsset) : []

    if (canBrowseOtherAssets.value && nik) {
      isLoadingCycle.value = true
      try {
        const cycleData = await get(`/api/assets/cycle/${encodeURIComponent(nik)}`)
        deviceCycle.value = Array.isArray(cycleData) ? cycleData : []
      } catch {
        deviceCycle.value = []
      } finally {
        isLoadingCycle.value = false
      }
    }
  } catch (err) {
    assetError.value = err.message || 'Gagal memuat data aset karyawan.'
  } finally {
    isLoadingAssets.value = false
  }
}

async function goToLevel3(asset) {
  selectedAsset.value = normalizeAsset(asset)
  currentLevel.value = 3
  await fetchAssetLogs(selectedAsset.value.id_aset || selectedAsset.value.id)
}

async function fetchAssetLogs(idAset) {
  if (!idAset) {
    realAssetLogs.value = []
    return
  }
  isLoadingLogs.value = true
  try {
    const data = await get(`/api/logs/assets/${idAset}`)
    realAssetLogs.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching real asset logs:', error)
    realAssetLogs.value = []
  } finally {
    isLoadingLogs.value = false
  }
}

// ── Data Fetching ─────────────────────────────────────────────────────────────
async function fetchEmployees() {
  if (!canBrowseOtherAssets.value) return

  isLoadingEmployees.value = true
  employeeError.value = ''
  try {
    const data = await get('/api/karyawan/with-assets')
    employees.value = Array.isArray(data) ? data : []
  } catch (err) {
    employeeError.value = err.message || 'Gagal memuat daftar karyawan.'
  } finally {
    isLoadingEmployees.value = false
  }
}

async function loadMyOwnAssets() {
  isLoadingAssets.value = true
  assetError.value = ''
  try {
    const freshUser = await refreshUser()
    const currentUser = freshUser || user.value
    const empData = currentUser?.employee || (currentUser?.nik ? currentUser : null)

    if (empData && empData.nik) {
      selectedEmployee.value = {
        id_karyawan: empData.id || empData.id_karyawan,
        nik: empData.nik,
        nama_karyawan: empData.nama_karyawan || currentUser?.nama || 'Saya',
        title:
          empData.title || empData.jabatan || currentUser?.title || currentUser?.jabatan || 'Staff',
        jabatan:
          empData.jabatan || empData.title || currentUser?.jabatan || currentUser?.title || 'Staff',
        departemen: empData.departemen || currentUser?.departemen || '',
        directorate: empData.directorate || currentUser?.directorate || '',
        lokasi_kerja: normalizeLocation(empData.lokasi_kerja || currentUser?.lokasi_kerja || ''),
        status_karyawan: empData.status || 'Active',
        email_kantor: empData.email_kantor || currentUser?.email || '',
        hasEmployeeRecord: true,
      }
      currentLevel.value = 2
      const assetData = await get('/api/assets/my')
      myAssets.value = Array.isArray(assetData) ? assetData.map(normalizeAsset) : []
    } else {
      selectedEmployee.value = {
        nik: '',
        nama_karyawan: currentUser?.nama || 'Pengguna',
        title: currentUser?.role || 'User',
        jabatan: currentUser?.role || 'User',
        departemen: '—',
        lokasi_kerja: '—',
        email_kantor: currentUser?.email || '',
        hasEmployeeRecord: false,
      }
      currentLevel.value = 2
      myAssets.value = []
    }
  } catch (err) {
    assetError.value = err.message || 'Gagal memuat data aset Anda.'
  } finally {
    isLoadingAssets.value = false
  }
}

function resetEmployeeFilters() {
  employeeSearch.value = ''
  filterDepartemen.value = ''
  filterLokasi.value = ''
  filterTipe.value = ''
}

function openSpecification(asset) {
  activeModalAsset.value = asset
  showSpecificationModal.value = true
}

function closeModal() {
  showSpecificationModal.value = false
  activeModalAsset.value = null
}

// ── UI Helper Utilities ───────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return (
    d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) +
    ' ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  )
}

function getStatusBadgeType(status) {
  const s = (status || '').toLowerCase()
  if (['digunakan', 'in use'].includes(s)) return 'success'
  if (['tersedia', 'stok', 'stock'].includes(s)) return 'info'
  if (['maintenance', 'in service', 'dalam perawatan'].includes(s)) return 'warning'
  if (['rusak', 'damaged'].includes(s)) return 'danger'
  return 'default'
}

function getDeviceIcon(type) {
  const v = (type || '').toLowerCase()
  if (v.includes('laptop') || v.includes('macbook')) return 'laptop'
  if (v.includes('server')) return 'dns'
  if (v.includes('printer')) return 'print'
  if (v.includes('monitor') || v.includes('display')) return 'monitor'
  if (v.includes('handheld') || v.includes('phone') || v.includes('mobile')) return 'smartphone'
  if (v.includes('router') || v.includes('switch') || v.includes('network')) return 'router'
  return 'devices'
}

function getInitials(name) {
  return (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

onMounted(() => {
  if (canBrowseOtherAssets.value) {
    fetchEmployees()
  } else {
    loadMyOwnAssets()
  }
})
</script>
<template>
  <div
    class="employee-assets-page flex min-w-0 flex-col gap-5"
    :data-testid="!isLoading ? 'page-ready' : undefined"
  >
    <MyAssetsEmployeeList
      v-if="currentLevel === 1 && canBrowseOtherAssets"
      :filtered-employees="filteredEmployees"
      :paginated-employees="paginatedEmployees"
      :employees-with-assets="employeesWithAssets"
      :total-employees-holding-assets="totalEmployeesHoldingAssets"
      :total-assigned-assets-count="totalAssignedAssetsCount"
      :recently-assigned-count="recentlyAssignedCount"
      :employee-search="employeeSearch"
      :filter-departemen="filterDepartemen"
      :filter-lokasi="filterLokasi"
      :departemen-filter-options="departemenFilterOptions"
      :lokasi-filter-options="lokasiFilterOptions"
      :current-page-employees="currentPageEmployees"
      :items-per-page="itemsPerPage"
      :is-loading-employees="isLoadingEmployees"
      :employee-error="employeeError"
      :can-browse-other-assets="canBrowseOtherAssets"
      @update:employee-search="employeeSearch = $event"
      @update:filter-departemen="filterDepartemen = $event"
      @update:filter-lokasi="filterLokasi = $event"
      @update:current-page-employees="currentPageEmployees = $event"
      @select-employee="goToLevel2"
      @refresh="fetchEmployees"
    />

    <template v-else-if="currentLevel === 2 && selectedEmployee">
      <!-- Interactive Breadcrumb & Back Navigation -->
      <div class="flex items-center justify-between gap-2.5 min-w-0">
        <nav
          class="flex items-center gap-1.5 text-xs min-w-0 overflow-hidden"
          aria-label="Breadcrumb"
        >
          <button
            v-if="canBrowseOtherAssets"
            type="button"
            @click="goToLevel1"
            class="font-medium text-[#5F7089] hover:text-[#333333] transition-colors shrink-0"
          >
            Aset Karyawan
          </button>
          <span v-else class="font-medium text-[#5F7089] shrink-0">Aset Saya</span>
          <span
            aria-hidden="true"
            class="material-symbols-outlined text-[14px] text-[#CBD5E1] shrink-0"
            >chevron_right</span
          >
          <span class="font-bold text-[#333333] truncate">{{
            selectedEmployee.nama_karyawan
          }}</span>
        </nav>

        <button
          v-if="canBrowseOtherAssets"
          type="button"
          @click="goToLevel1"
          class="flex items-center gap-1 shrink-0 rounded-lg border border-[#E2E8F0] bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#333333] active:scale-95 transition-all cursor-pointer shadow-2xs touch-manipulation"
          title="Kembali ke Daftar Karyawan"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[16px]">arrow_back</span>
          <span class="hidden xs:inline">Kembali</span>
        </button>
      </div>

      <!-- Employee Hero Profile Identity Header -->
      <div
        class="employee-profile rounded-xl border border-[#E2E8F0] bg-white p-3.5 sm:p-5 shadow-2xs flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
          <div
            class="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A51B0] to-[#0A4391] text-sm font-bold text-white shadow-2xs"
          >
            {{ getInitials(selectedEmployee.nama_karyawan) }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-base sm:text-lg font-bold text-[#333333] tracking-tight truncate">
                {{ selectedEmployee.nama_karyawan }}
              </h2>
              <AppBadge
                v-if="selectedEmployee.status_karyawan || selectedEmployee.status"
                :type="
                  (selectedEmployee.status_karyawan || selectedEmployee.status) === 'Active'
                    ? 'success'
                    : 'warning'
                "
                :text="selectedEmployee.status_karyawan || selectedEmployee.status"
              />
            </div>
            <p class="text-xs font-medium text-[#475569] mt-0.5 truncate">
              {{ selectedEmployee.jabatan || selectedEmployee.title || 'Staff' }}
            </p>
            <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[#5F7089]">
              <span
                class="inline-flex items-center h-6 px-2.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] font-mono font-medium text-[#333333] leading-none"
              >
                NIK: {{ selectedEmployee.nik }}
              </span>
              <span
                v-if="selectedEmployee.departemen"
                class="inline-flex items-center h-6 px-2.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] leading-none"
              >
                {{ selectedEmployee.departemen }}
              </span>
              <span
                v-if="selectedEmployee.lokasi_kerja"
                class="inline-flex items-center gap-1 h-6 px-2.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] leading-none"
              >
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[13px] text-[#687281] leading-none shrink-0"
                  >location_on</span
                >
                {{ selectedEmployee.lokasi_kerja }}
              </span>
              <span
                v-if="selectedEmployee.email_kantor"
                class="inline-flex items-center h-6 px-2.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] leading-none truncate max-w-[200px]"
              >
                {{ selectedEmployee.email_kantor }}
              </span>
            </div>
          </div>
        </div>

        <!-- Employee Summary Stat Badges -->
        <div
          class="grid grid-cols-2 sm:flex sm:items-stretch gap-2.5 shrink-0 border-t border-[#F1F5F9] pt-3 sm:border-t-0 sm:pt-0"
        >
          <div
            class="flex flex-col justify-center h-[54px] sm:h-[58px] min-w-[110px] sm:min-w-[125px] rounded-xl bg-[#F8FAFC] px-3.5 py-2 border border-[#E2E8F0] text-center sm:text-right shadow-2xs"
          >
            <span
              class="block text-[10px] font-bold uppercase tracking-wider text-[#5F7089] leading-tight"
              >Total Aset</span
            >
            <span
              class="font-num text-sm sm:text-base font-bold text-[#333333] leading-snug mt-0.5 block"
              >{{ myAssets.length }} Unit</span
            >
          </div>
          <div
            class="flex flex-col justify-center h-[54px] sm:h-[58px] min-w-[110px] sm:min-w-[125px] rounded-xl bg-[#F8FAFC] px-3.5 py-2 border border-[#E2E8F0] text-center sm:text-right shadow-2xs"
          >
            <span
              class="block text-[10px] font-bold uppercase tracking-wider text-[#5F7089] leading-tight"
              >Penugasan Awal</span
            >
            <span
              class="font-num text-xs sm:text-[13px] font-semibold text-[#333333] leading-snug mt-0.5 block truncate"
              >{{ employeeAssignedSince }}</span
            >
          </div>
        </div>
      </div>

      <!-- KPI Cards: MyAssets Summary -->
      <div class="myassets-kpi-grid grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <StatCard
          title="Total Aset Saya"
          :value="myAssets.length"
          icon="devices"
          color="primary"
          subtitle="Semua perangkat terdaftar"
        />
        <StatCard
          title="Status"
          :value="
            myAssets.filter((a) =>
              ['digunakan', 'in use'].includes((a.status_aset || '').toLowerCase()),
            ).length
          "
          icon="check_circle"
          color="success"
          subtitle="Aset sedang digunakan"
        />
        <StatCard
          title="Stok Tersedia"
          :value="
            filteredAssets.filter((a) =>
              ['tersedia', 'stok', 'stock'].includes((a.status_aset || '').toLowerCase()),
            ).length
          "
          icon="inventory"
          color="info"
          subtitle="Aset dalam stok"
        />
      </div>

      <!-- Section: Assigned Assets -->
      <div class="flex flex-col gap-3">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div class="flex items-center gap-2">
            <span aria-hidden="true" class="material-symbols-outlined text-[20px] text-[#333333]"
              >inventory_2</span
            >
            <h3 class="text-sm font-bold text-[#333333]">Aset yang ditugaskan</h3>
            <span class="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-bold text-[#333333]">
              {{ myAssets.length }}
            </span>
          </div>

          <!-- Quick Search Assets inside Employee -->
          <div v-if="myAssets.length > 0" class="relative w-full sm:w-auto sm:min-w-[220px]">
            <span
              aria-hidden="true"
              class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-[#687281] pointer-events-none"
              >search</span
            >
            <input
              v-model="assetSearch"
              type="text"
              placeholder="Cari label / serial…"
              class="h-8.5 w-full rounded-lg border border-[#E2E8F0] bg-white pl-8 pr-8 text-xs text-[#333333] focus:border-[#0A51B0] focus:outline-none shadow-2xs"
            />
            <button
              v-if="assetSearch"
              type="button"
              @click="assetSearch = ''"
              aria-label="Bersihkan"
              class="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-[#687281] hover:bg-[#F1F5F9] hover:text-[#333333] cursor-pointer"
            >
              <span aria-hidden="true" class="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        </div>

        <!-- Loading Assets -->
        <div
          v-if="isLoadingAssets"
          class="flex flex-col items-center justify-center py-12 text-[#5F7089] rounded-xl border border-[#E2E8F0] bg-white"
        >
          <div
            class="h-6 w-6 animate-spin rounded-full border-2 border-[#0A51B0] border-t-transparent mb-2"
          ></div>
          <p class="text-xs font-semibold">Memuat aset terassigned...</p>
        </div>

        <!-- Error Assets -->
        <div
          v-else-if="assetError"
          class="p-6 text-center text-rose-600 text-xs rounded-xl border border-[#E2E8F0] bg-white"
        >
          <p class="font-semibold">{{ assetError }}</p>
          <button
            type="button"
            @click="goToLevel2(selectedEmployee)"
            class="mt-1 font-bold underline cursor-pointer"
          >
            Coba lagi
          </button>
        </div>

        <!-- Empty State: Unlinked Employee -->
        <div
          v-else-if="selectedEmployee.hasEmployeeRecord === false"
          class="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center rounded-xl border border-[#FEF3C7] bg-[#FFFBEB]"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[32px] text-[#D97706]"
            >account_box_off</span
          >
          <h4 class="text-sm font-bold text-[#92400E]">
            Akun Belum Terhubung dengan Data Karyawan
          </h4>
          <p class="max-w-md text-xs text-[#B45309]">
            Akun Anda (<strong>{{ selectedEmployee.email_kantor }}</strong
            >) belum terhubung ke Master Data Karyawan. Silakan hubungi Administrator IT untuk
            mendaftarkan email Anda.
          </p>
        </div>

        <!-- Empty State: No Assets -->
        <div
          v-else-if="myAssets.length === 0"
          class="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center rounded-xl border border-[#E2E8F0] bg-white"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[32px] text-[#CBD5E1]"
            >devices_off</span
          >
          <h4 class="text-sm font-semibold text-[#333333]">Belum Ada Aset yang ditugaskan</h4>
          <p class="max-w-xs text-xs text-[#5F7089]">
            Tidak ada aset IT yang terdaftar atas nama {{ selectedEmployee.nama_karyawan }}.
          </p>
        </div>

        <!-- Assigned Asset Cards Grid -->
        <div
          v-else
          class="assigned-assets-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4"
        >
          <div
            v-for="asset in paginatedAssets"
            :key="asset.id_aset"
            @click="goToLevel3(asset)"
            tabindex="0"
            @keydown.enter.self="goToLevel3(asset)"
            @keydown.space.prevent.self="goToLevel3(asset)"
            aria-label="Lihat detail dan riwayat aset"
            class="assigned-asset-card group relative flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-3.5 sm:p-4 shadow-2xs hover:border-[#0A51B0] hover:shadow-md active:scale-[0.99] transition-all duration-200 cursor-pointer touch-manipulation"
          >
            <div>
              <!-- Top Row: Device Icon & Status Pill -->
              <div class="flex items-center justify-between gap-2 mb-3">
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#333333]"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[20px]">{{
                    getDeviceIcon(asset.tipe_perangkat)
                  }}</span>
                </div>
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all select-none"
                  :class="[
                    formatStatusPill(asset.status_aset).bg,
                    formatStatusPill(asset.status_aset).text,
                    formatStatusPill(asset.status_aset).border,
                  ]"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full shrink-0"
                    :class="formatStatusPill(asset.status_aset).dot"
                  ></span>
                  {{ formatStatusPill(asset.status_aset).label }}
                </span>
              </div>

              <!-- Asset Label & Serial Number -->
              <h4
                class="text-sm font-bold text-[#333333] leading-snug group-hover:text-[#333333] transition-colors truncate"
              >
                {{
                  asset.label_aset ||
                  [asset.merek, asset.model].filter(Boolean).join(' ') ||
                  'Aset IT'
                }}
              </h4>
              <div class="mt-1 flex items-center justify-between text-xs text-[#5F7089]">
                <span class="font-mono font-medium truncate"
                  >SN: {{ asset.nomor_seri || '—' }}</span
                >
                <span class="font-mono text-[11px] text-[#687281] shrink-0"
                  >AST-IT-{{ String(asset.id_aset).padStart(5, '0') }}</span
                >
              </div>

              <!-- Specs Grid -->
              <div class="mt-3 pt-3 border-t border-[#F1F5F9] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="block text-[10px] font-semibold uppercase text-[#687281]">Tipe</span>
                  <span class="font-medium text-[#333333] truncate block mt-0.5">{{
                    asset.tipe_perangkat || '—'
                  }}</span>
                </div>
                <div>
                  <span class="block text-[10px] font-semibold uppercase text-[#687281]"
                    >Merek / Model</span
                  >
                  <span class="font-medium text-[#333333] truncate block mt-0.5">{{
                    [asset.merek, asset.model].filter(Boolean).join(' ') || '—'
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Bottom Trigger link -->
            <div
              class="mt-3.5 pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between text-xs font-semibold text-[#333333]"
            >
              <span>Lihat detail & riwayat</span>
              <span
                aria-hidden="true"
                class="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform"
                >arrow_forward</span
              >
            </div>
          </div>
        </div>

        <AppPagination
          v-if="!isLoadingAssets && !assetError && myAssets.length > 0"
          v-model:currentPage="currentPageAssets"
          :total-items="filteredAssets.length"
          :items-per-page="itemsPerPage"
        />
      </div>
    </template>

    <template v-else-if="currentLevel === 3 && selectedAsset && selectedEmployee">
      <!-- Breadcrumb Navigation -->
      <div class="flex items-center justify-between gap-2.5 min-w-0">
        <!-- Desktop Breadcrumb (>= sm) -->
        <nav
          class="hidden sm:flex items-center gap-2 text-xs min-w-0 overflow-hidden"
          aria-label="Breadcrumb"
        >
          <button
            v-if="canBrowseOtherAssets"
            type="button"
            @click="goToLevel1"
            class="font-medium text-[#5F7089] hover:text-[#333333] transition-colors shrink-0"
          >
            Aset Karyawan
          </button>
          <button
            type="button"
            @click="currentLevel = 2"
            class="font-medium text-[#5F7089] hover:text-[#333333] transition-colors shrink-0"
          >
            {{ selectedEmployee.nama_karyawan }}
          </button>
          <span
            aria-hidden="true"
            class="material-symbols-outlined text-[14px] text-[#CBD5E1] shrink-0"
            >chevron_right</span
          >
          <span class="font-bold text-[#333333] truncate">{{
            selectedAsset.label_aset || selectedAsset.nomor_seri
          }}</span>
          <span
            aria-hidden="true"
            class="material-symbols-outlined text-[14px] text-[#CBD5E1] shrink-0"
            >chevron_right</span
          >
          <span class="font-semibold text-[#5F7089] shrink-0">Audit History</span>
        </nav>

        <!-- Mobile Breadcrumb / Back Button (< sm) -->
        <button
          type="button"
          @click="currentLevel = 2"
          class="sm:hidden flex items-center gap-1 text-xs font-semibold text-[#333333] truncate"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[16px]">arrow_back</span>
          <span class="truncate">Kembali ke {{ selectedEmployee.nama_karyawan }}</span>
        </button>

        <button
          type="button"
          @click="currentLevel = 2"
          class="hidden sm:flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#333333] active:scale-95 transition-all cursor-pointer shadow-2xs touch-manipulation shrink-0"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Kembali ke Detail Karyawan</span>
        </button>
      </div>

      <!-- Asset Title Header Banner -->
      <div
        class="asset-profile-banner rounded-xl border border-[#E2E8F0] bg-white p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5"
      >
        <div class="flex items-start sm:items-center gap-3.5 min-w-0">
          <div
            class="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#333333]"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[24px]">{{
              getDeviceIcon(selectedAsset.tipe_perangkat)
            }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-base sm:text-lg font-bold text-[#333333] tracking-tight truncate">
                {{
                  selectedAsset.label_aset ||
                  [selectedAsset.merek, selectedAsset.model].filter(Boolean).join(' ') ||
                  'Aset IT'
                }}
              </h2>
              <AppBadge
                :type="getStatusBadgeType(selectedAsset.status_aset)"
                :text="selectedAsset.status_aset || 'In Use'"
              />
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-[#5F7089]">
              <span
                class="inline-flex items-center font-mono font-medium px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#333333]"
              >
                AST-IT-{{ String(selectedAsset.id_aset).padStart(5, '0') }}
              </span>
              <span
                class="inline-flex items-center font-mono px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569]"
              >
                SN: {{ selectedAsset.nomor_seri || '—' }}
              </span>
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569]"
              >
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[12px] text-[#687281]"
                  >person</span
                >
                {{ selectedEmployee.nama_karyawan }}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          @click="openSpecification(selectedAsset)"
          class="w-full sm:w-auto h-9 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 text-xs font-semibold text-[#333333] hover:bg-[#EFF6FF] active:scale-95 cursor-pointer transition-colors shadow-2xs touch-manipulation shrink-0"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[16px]">description</span>
          <span>Lihat Spesifikasi</span>
        </button>
      </div>

      <!-- Main Two-Column View: Specs Grid (Left) & Audit Timeline (Right) -->
      <div class="asset-audit-layout grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        <!-- LEFT COLUMN: Asset Metadata Grid (lg:col-span-6) -->
        <div class="lg:col-span-6 flex flex-col gap-4">
          <!-- Information Card -->
          <div class="rounded-xl border border-[#E2E8F0] bg-white p-3.5 sm:p-4 shadow-2xs">
            <div class="flex items-center gap-2 pb-2.5 mb-3 border-b border-[#F1F5F9]">
              <span aria-hidden="true" class="material-symbols-outlined text-[18px] text-[#333333]"
                >info</span
              >
              <h3 class="text-xs font-bold uppercase tracking-wider text-[#333333]">
                Informasi Perangkat
              </h3>
            </div>

            <dl class="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt class="text-[10px] font-semibold uppercase text-[#687281]">Tipe Perangkat</dt>
                <dd class="mt-0.5 font-semibold text-[#333333] truncate">
                  {{ selectedAsset.tipe_perangkat || '—' }}
                </dd>
              </div>

              <div>
                <dt class="text-[10px] font-semibold uppercase text-[#687281]">Brand / Merek</dt>
                <dd class="mt-0.5 font-semibold text-[#333333] truncate">
                  {{ selectedAsset.merek || '—' }}
                </dd>
              </div>

              <div>
                <dt class="text-[10px] font-semibold uppercase text-[#687281]">Model</dt>
                <dd class="mt-0.5 font-semibold text-[#333333] truncate">
                  {{ selectedAsset.model || '—' }}
                </dd>
              </div>

              <div>
                <dt class="text-[10px] font-semibold uppercase text-[#687281]">Serial Number</dt>
                <dd class="mt-0.5 font-mono font-medium text-[#333333] truncate">
                  {{ selectedAsset.nomor_seri || '—' }}
                </dd>
              </div>

              <div>
                <dt class="text-[10px] font-semibold uppercase text-[#687281]">Kode / ID Aset</dt>
                <dd class="mt-0.5 font-mono font-medium text-[#333333] truncate">
                  AST-IT-{{ String(selectedAsset.id_aset).padStart(5, '0') }}
                </dd>
              </div>

              <div>
                <dt class="text-[10px] font-semibold uppercase text-[#687281]">Lokasi Aset</dt>
                <dd class="mt-0.5 font-semibold text-[#333333] truncate">
                  {{ selectedAsset.lokasi_aset || selectedEmployee.lokasi_kerja || '—' }}
                </dd>
              </div>

              <div>
                <dt class="text-[10px] font-semibold uppercase text-[#687281]">Status Pemakaian</dt>
                <dd class="mt-0.5">
                  <AppBadge
                    :type="getStatusBadgeType(selectedAsset.status_aset)"
                    :text="selectedAsset.status_aset || '—'"
                  />
                </dd>
              </div>

              <div>
                <dt class="text-[10px] font-semibold uppercase text-[#687281]">
                  Kondisi Perangkat
                </dt>
                <dd class="mt-0.5 font-semibold text-[#333333] truncate">
                  {{ selectedAsset.kondisi_aset || 'Normal' }}
                </dd>
              </div>
            </dl>
          </div>

          <!-- Current Holder Identity Card -->
          <div class="rounded-xl border border-[#E2E8F0] bg-white p-3.5 sm:p-4 shadow-2xs">
            <div class="flex items-center justify-between pb-2.5 mb-3 border-b border-[#F1F5F9]">
              <div class="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[18px] text-[#059669]"
                  >person_pin</span
                >
                <h3 class="text-xs font-bold uppercase tracking-wider text-[#333333]">
                  Pemegang Aktif saat ini
                </h3>
              </div>
              <span
                class="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[10px] font-semibold text-[#059669]"
                >Active Holder</span
              >
            </div>

            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0A51B0] to-[#0A4391] text-xs font-bold text-white shadow-2xs"
              >
                {{ getInitials(selectedEmployee.nama_karyawan) }}
              </div>
              <div class="min-w-0 flex-1 text-xs">
                <h4 class="font-bold text-[#333333] truncate">
                  {{ selectedEmployee.nama_karyawan }}
                </h4>
                <p class="text-[#5F7089] font-medium text-[11px] truncate">
                  {{ selectedEmployee.jabatan || 'Staff' }} ·
                  {{ selectedEmployee.departemen || '—' }}
                </p>
                <p class="font-mono text-[11px] text-[#687281] mt-0.5">
                  NIK: {{ selectedEmployee.nik }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Modern SaaS Audit Timeline (lg:col-span-6) -->
        <div
          class="lg:col-span-6 rounded-xl border border-[#E2E8F0] bg-white p-3.5 sm:p-4 shadow-2xs"
        >
          <div class="flex items-center justify-between pb-2.5 mb-3.5 border-b border-[#F1F5F9]">
            <div class="flex items-center gap-2">
              <span aria-hidden="true" class="material-symbols-outlined text-[18px] text-[#7C3AED]"
                >history</span
              >
              <h3 class="text-xs font-bold uppercase tracking-wider text-[#333333]">
                Audit Timeline & Log History
              </h3>
            </div>
            <span class="text-[11px] font-semibold text-[#5F7089]"
              >{{ assetHistoryTimeline.length }} Peristiwa</span
            >
          </div>

          <!-- Loading logs indicator -->
          <div v-if="isLoadingLogs" class="py-8 text-center text-xs text-[#5F7089]">
            <div
              class="h-5 w-5 animate-spin rounded-full border-2 border-[#7C3AED] border-t-transparent mx-auto mb-2"
            ></div>
            Memuat riwayat log...
          </div>

          <!-- Audit Timeline Activity Stream -->
          <div v-else class="relative border-l border-[#E2E8F0] pl-4 ml-2 sm:ml-3 space-y-3.5">
            <div v-for="(log, idx) in assetHistoryTimeline" :key="idx" class="relative group">
              <!-- Timeline Node Dot -->
              <div
                class="absolute -left-[21.5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white ring-2 ring-white"
                :class="[
                  log.type === 'assignment'
                    ? 'bg-[#0A51B0]'
                    : log.type === 'relocation'
                      ? 'bg-[#D97706]'
                      : log.type === 'creation'
                        ? 'bg-[#059669]'
                        : 'bg-[#7C3AED]',
                ]"
              ></div>

              <!-- Log Item Card -->
              <div class="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs">
                <div
                  class="flex items-center justify-between gap-2 text-[11px] text-[#5F7089] mb-1"
                >
                  <span class="font-medium">{{ formatDateTime(log.date) }}</span>
                  <span class="font-semibold text-[#475569] truncate">Oleh: {{ log.actor }}</span>
                </div>

                <h4 class="font-bold text-[#333333] leading-snug">
                  {{ log.action }}
                </h4>

                <p class="text-[11px] text-[#475569] mt-1 leading-relaxed">
                  {{ log.detail }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <FilterModal
      :is-open="showFilterModal"
      title="Filter Aset Karyawan"
      @close="showFilterModal = false"
      @apply="showFilterModal = false"
      @reset="resetEmployeeFilters"
    >
      <CustomSelect
        v-model="filterDepartemen"
        :options="departemenFilterOptions"
        aria-label="Filter departemen"
        :block="true"
      />
      <CustomSelect
        v-model="filterLokasi"
        :options="lokasiFilterOptions"
        aria-label="Filter lokasi"
        :block="true"
      />
      <CustomSelect
        v-model="filterTipe"
        :options="tipeFilterOptions"
        aria-label="Filter tipe perangkat"
        :block="true"
      />
    </FilterModal>
    <!-- ── Modal Spesifikasi Perangkat ── -->
    <AppModal
      :is-open="showSpecificationModal"
      title="Spesifikasi Perangkat"
      size="md"
      @close="closeModal"
    >
      <div v-if="activeModalAsset" class="space-y-4">
        <div class="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#333333]"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[20px]">{{
              getDeviceIcon(activeModalAsset.tipe_perangkat)
            }}</span>
          </div>
          <div class="min-w-0">
            <h4 class="font-bold text-xs text-[#333333] truncate">
              {{ activeModalAsset.label_aset || activeModalAsset.merek || 'Aset IT' }}
            </h4>
            <p class="font-mono text-[11px] text-[#5F7089] mt-0.5">
              SN: {{ activeModalAsset.nomor_seri || '—' }}
            </p>
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-semibold uppercase text-[#5F7089] mb-1.5">
            Spesifikasi Detail
          </label>
          <div
            class="min-h-24 whitespace-pre-wrap rounded-lg border border-[#E2E8F0] bg-white p-3 text-xs text-[#333333] leading-relaxed"
          >
            {{
              activeModalAsset.spesifikasi ||
              'Belum ada catatan spesifikasi detail untuk perangkat ini.'
            }}
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <button
            type="button"
            class="h-8 rounded-lg bg-[#0A51B0] px-4 text-xs font-semibold text-white hover:bg-[#0A4391] cursor-pointer transition-colors"
            @click="closeModal"
          >
            Tutup
          </button>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.employee-assets-page {
  width: 100%;
  max-width: 1500px;
  margin: 0 auto;
  color: #333333;
  padding-bottom: 12px;
}

.employee-profile,
.asset-profile-banner {
  padding: 24px;
  border-radius: 13px;
  box-shadow: none;
  background: #fff;
}
.employee-profile h2,
.asset-profile-banner h2 {
  font-weight: 650;
  font-size: 21px;
  letter-spacing: -0.03em;
  white-space: normal;
  overflow-wrap: anywhere;
}
.assigned-asset-card {
  padding: 22px;
  box-shadow: none;
  border-radius: 13px;
}
.assigned-asset-card:hover {
  border-color: #9fb8da;
  box-shadow: 0 3px 12px #172b4d08;
  transform: none;
}
.assigned-asset-card h4 {
  font-size: 15px;
  line-height: 1.6;
  font-weight: 650;
}
.assigned-asset-card h4 + div {
  flex-wrap: wrap;
  gap: 7px;
}
.assigned-asset-card > div:last-child {
  color: #0a5dbd;
  padding-top: 15px;
  margin-top: 20px;
  min-height: 44px;
}
.asset-audit-layout > div {
  min-width: 0;
}
.asset-audit-layout > div > div {
  border-radius: 13px;
  box-shadow: none;
}
.asset-audit-layout dl {
  gap: 18px;
}
.asset-audit-layout dl > div {
  min-width: 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #edf1f6;
}
.asset-audit-layout dd {
  overflow-wrap: anywhere;
  line-height: 1.7;
}
.asset-audit-layout dt {
  color: #637288;
  font-weight: 500;
  text-transform: none;
}
.asset-audit-layout h3 {
  text-transform: none;
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.015em;
}

@media (max-width: 767px) {
  .employee-profile,
  .asset-profile-banner {
    padding: 18px;
  }
  .employee-profile h2,
  .asset-profile-banner h2 {
    font-size: 18px;
  }
  .assigned-asset-card {
    padding: 18px;
  }
  .asset-profile-banner > button {
    min-height: 44px;
  }
  .asset-audit-layout dl {
    gap: 14px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .assigned-asset-card {
    transition: none;
  }
}
</style>

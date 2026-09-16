<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useAuth } from '../composables/useAuth.js'
import { animateStagger } from '../composables/useGsap.js'
import { normalizeLocation } from '../utils/locationNormalizer.js'
import AppModal from '../components/ui/AppModal.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import AppRowActions from '../components/ui/AppRowActions.vue'
import AppImportModal from '../components/ui/AppImportModal.vue'
import AppPagination from '../components/ui/AppPagination.vue'
import StatCard from '../components/ui/StatCard.vue'
import SkeletonTable from '../components/ui/skeleton/SkeletonTable.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import SearchableSelect from '../components/ui/SearchableSelect.vue'
import FilterModal from '../components/ui/FilterModal.vue'
import { exportToExcel } from '../utils/exportEngine.js'

const { get, post, put, del } = useApi()
const { hasWritePermission } = useAuth()
const canWriteKaryawan = computed(() => hasWritePermission('karyawan'))

// ── State Utama ──────────────────────────────────────────────
const employees = ref([])
const stats = ref(null)
const isLoading = ref(true)
const isSubmitting = ref(false)
const showImportModal = ref(false)
const pageError = ref('')
const modalError = ref('')
const notification = ref(null)

const currentPage = ref(1)
const itemsPerPage = ref(10)

function onImported() {
  showImportModal.value = false
  fetchData()
  notification.value = { message: 'Data Excel berhasil diimpor ke database!', type: 'success' }
}

// ── Filter & Search ──────────────────────────────────────────
const searchQuery = ref('')
const filterDepartemen = ref('')
const filterLokasi = ref('')
const filterStatus = ref('')
const showFilterModal = ref(false)

// ── Modal State ──────────────────────────────────────────────
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const modalMode = ref('add') // 'add' | 'edit'
const selectedEmployee = ref(null)

// ── Predefined Master Options from Skema Table.xlsx ───────────
const jobLevelOptions = [
  'C-Level',
  'L1',
  'L1a',
  'L2',
  'L2b',
  'L3',
  'L3b',
  'L4',
  'L4c',
  'L5',
  'L6',
  'LS1',
  'LS2',
  'LS3',
  'Freelance',
  'Intern',
]

const statusKaryawanFormOptions = [
  { value: 'Active', label: 'Active', dot: 'bg-emerald-500' },
  { value: 'Outsource', label: 'Outsource', dot: 'bg-blue-500' },
  { value: 'Resigned', label: 'Resigned', dot: 'bg-rose-500' },
]

const statusKepegawaianFormOptions = [
  { value: 'Permanent', label: 'Permanent', dot: 'bg-emerald-500' },
  { value: 'Contract', label: 'Contract', dot: 'bg-amber-500' },
  { value: 'Freelance', label: 'Freelance', dot: 'bg-blue-500' },
  { value: 'Intern', label: 'Intern', dot: 'bg-purple-500' },
]

const atasanOptions = computed(() => [
  { nik: '', displayLabel: '-- Tanpa Atasan / Tidak Ada --' },
  ...employees.value
    .filter((emp) => emp.nik !== form.value.nik)
    .map((e) => ({
      nik: e.nik,
      displayLabel: `${e.nik} - ${e.nama_karyawan} (${e.jabatan || e.title || 'Staff'})`,
    })),
])

const departemenOptions = [
  'Account Management',
  'Accounting & Tax',
  'Asset Management',
  'Business Consultant',
  'Business Operations',
  'CEO',
  'CEO Office',
  'Corporate Development',
  'Data Analytics',
  'Digital Marketing',
  'Ecosystem and Strategic Partnership',
  'Finance & Accounting',
  'Finance & Legal',
  'Finance Business Partner',
  'Finance, Accounting, & Tax',
  'Integration Solutions Delivery',
  'Legal',
  'Marketing',
  'Marketing Communication',
  'Operation Excellence',
  'Operations',
  'Operations Support',
  'People Experience',
  'People Shared Services',
  'People Strategy & Development',
  'Product Engineering',
  'Product Management',
  'Research',
  'Revenue',
  'Technology',
]

const locationCodeOptions = [
  'BDG',
  'BKS',
  'BL',
  'BTM',
  'DPK',
  'GS',
  'JKT',
  'MDN',
  'MLG',
  'PL',
  'PLM',
  'SBY',
  'SLO',
  'SMG',
  'SRG',
  'YYK',
]

// ── Form Data ────────────────────────────────────────────────
const emptyForm = () => ({
  nik: '',
  nama_karyawan: '',
  email_kantor: '',
  lokasi_kerja: 'JKT',
  status_karyawan: 'Active',
  jabatan: '',
  tingkat_jabatan: 'L3',
  departemen: 'Technology',
  direktorat: 'Technology',
  tanggal_mulai_bekerja: '',
  status_kepegawaian: 'Permanent',
  nik_atasan_langsung: '',
})

const form = ref(emptyForm())

// ── Computed ──────────────────────────────────────────────────
const availableDepartemenOptions = computed(() => {
  const custom = employees.value.map((e) => e.departemen).filter(Boolean)
  return [...new Set([...departemenOptions, ...custom])].sort()
})

const availableLokasiOptions = computed(() => {
  const custom = employees.value.map((e) => normalizeLocation(e.lokasi_kerja)).filter(Boolean)
  const mappedDefaults = locationCodeOptions.map(normalizeLocation)
  return [...new Set([...mappedDefaults, ...custom])].sort()
})

const filteredEmployees = computed(() => {
  const q = searchQuery.value.trim().toLocaleLowerCase('id-ID')
  return employees.value.filter((emp) => {
    const searchable = [
      emp.nik,
      emp.nama_karyawan,
      emp.email_kantor,
      emp.jabatan,
      emp.title,
      emp.departemen,
      emp.direktorat,
      emp.directorate,
      emp.lokasi_kerja,
      emp.status_karyawan,
      emp.status,
      emp.nik_atasan_langsung,
    ]
      .join(' ')
      .toLocaleLowerCase('id-ID')

    const statusVal = emp.status_karyawan || emp.status
    return (
      (!q || searchable.includes(q)) &&
      (!filterDepartemen.value || emp.departemen === filterDepartemen.value) &&
      (!filterLokasi.value || emp.lokasi_kerja === filterLokasi.value) &&
      (!filterStatus.value || statusVal === filterStatus.value)
    )
  })
})

watch([searchQuery, filterDepartemen, filterLokasi, filterStatus], () => {
  currentPage.value = 1
})

const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredEmployees.value.slice(start, start + itemsPerPage.value)
})

function toast(msg, type = 'success') {
  notification.value = { message: msg, type }
  setTimeout(() => {
    notification.value = null
  }, 3500)
}

// ── Methods ──────────────────────────────────────────────────
async function fetchData() {
  isLoading.value = true
  pageError.value = ''
  try {
    const [data, statsData] = await Promise.all([
      get('/api/karyawan/with-assets'),
      get('/api/karyawan/stats'),
    ])
    const rawList = Array.isArray(data) ? data : []
    employees.value = rawList.map((e) => ({
      ...e,
      id_karyawan: e.id_karyawan || e.id,
      id: e.id || e.id_karyawan,
      status: e.status || e.status_karyawan || 'Active',
      status_karyawan: e.status_karyawan || e.status || 'Active',
      title: e.title || e.jabatan || '',
      jabatan: e.jabatan || e.title || '',
      job_level: e.job_level || e.tingkat_jabatan || 'L3',
      tingkat_jabatan: e.tingkat_jabatan || e.job_level || 'L3',
      directorate: e.directorate || e.direktorat || '',
      direktorat: e.direktorat || e.directorate || '',
      lokasi_kerja: normalizeLocation(e.lokasi_kerja || e.work_location || ''),
      employeement_status: e.employeement_status || e.status_kepegawaian || 'Permanent',
      status_kepegawaian: e.status_kepegawaian || e.employeement_status || 'Permanent',
    }))
    stats.value = statsData
  } catch (err) {
    pageError.value = err.message || 'Gagal memuat data karyawan.'
  } finally {
    isLoading.value = false
    await nextTick()
    animateStagger('tbody tr')
  }
}

function exportEmployees() {
  if (filteredEmployees.value.length === 0) {
    toast('Tidak ada data karyawan untuk diekspor.', 'error')
    return
  }

  exportToExcel(
    filteredEmployees.value,
    [
      { name: 'nik', label: 'NIK' },
      { name: 'nama_karyawan', label: 'Nama Karyawan' },
      { name: 'status_karyawan', label: 'Status' },
      { name: 'jabatan', label: 'Title' },
      { name: 'tingkat_jabatan', label: 'Job Level' },
      { name: 'departemen', label: 'Departemen' },
      { name: 'direktorat', label: 'Directorate' },
      { name: 'tanggal_mulai_bekerja', label: 'Tanggal Mulai Bekerja' },
      { name: 'status_kepegawaian', label: 'Employeement Status' },
      { name: 'nik_atasan_langsung', label: 'NIK Atasan Langsung' },
      { name: 'email_kantor', label: 'Email Kantor' },
      { name: 'lokasi_kerja', label: 'Lokasi Kerja' },
    ],
    'Table Karyawan',
    'Karyawan',
  )
  toast('Data karyawan berhasil diekspor ke XLSX.')
}

function openAdd() {
  if (!canWriteKaryawan.value) return
  modalMode.value = 'add'
  selectedEmployee.value = null
  form.value = emptyForm()
  modalError.value = ''
  showFormModal.value = true
}

function openEdit(emp) {
  if (!canWriteKaryawan.value) return
  modalMode.value = 'edit'
  selectedEmployee.value = emp
  const rawDate = emp.tanggal_mulai_bekerja
  const formattedDate = rawDate ? new Date(rawDate).toISOString().split('T')[0] : ''

  form.value = {
    nik: emp.nik || '',
    nama_karyawan: emp.nama_karyawan || '',
    email_kantor: emp.email_kantor || '',
    lokasi_kerja: emp.lokasi_kerja || 'JKT',
    status_karyawan: emp.status_karyawan || emp.status || 'Active',
    jabatan: emp.jabatan || emp.title || '',
    tingkat_jabatan: emp.tingkat_jabatan || emp.job_level || 'L3',
    departemen: emp.departemen || '',
    direktorat: emp.direktorat || emp.directorate || '',
    tanggal_mulai_bekerja: formattedDate,
    status_kepegawaian: emp.status_kepegawaian || emp.employeement_status || 'Permanent',
    nik_atasan_langsung: emp.nik_atasan_langsung || '',
  }
  modalError.value = ''
  showFormModal.value = true
}

function openDelete(emp) {
  if (!canWriteKaryawan.value) return
  selectedEmployee.value = emp
  modalError.value = ''
  showDeleteModal.value = true
}

function closeModal() {
  showFormModal.value = false
  showDeleteModal.value = false
  selectedEmployee.value = null
  modalError.value = ''
}

async function saveEmployee() {
  if (!canWriteKaryawan.value) {
    modalError.value = 'Anda hanya memiliki akses baca untuk data karyawan.'
    return
  }

  const payload = {
    nik: form.value.nik.trim(),
    nama_karyawan: form.value.nama_karyawan.trim(),
    email_kantor: form.value.email_kantor ? form.value.email_kantor.trim() : null,
    lokasi_kerja: form.value.lokasi_kerja,
    status: form.value.status_karyawan,
    status_karyawan: form.value.status_karyawan,
    title: form.value.jabatan.trim(),
    jabatan: form.value.jabatan.trim(),
    job_level: form.value.tingkat_jabatan,
    tingkat_jabatan: form.value.tingkat_jabatan,
    departemen: form.value.departemen,
    directorate: form.value.direktorat,
    direktorat: form.value.direktorat,
    tanggal_mulai_bekerja: form.value.tanggal_mulai_bekerja || null,
    employeement_status: form.value.status_kepegawaian,
    status_kepegawaian: form.value.status_kepegawaian,
    nik_atasan_langsung: form.value.nik_atasan_langsung
      ? form.value.nik_atasan_langsung.trim()
      : null,
  }

  if (!payload.nik || !payload.nama_karyawan) {
    modalError.value = 'NIK dan Nama Karyawan wajib diisi.'
    return
  }
  if (!payload.departemen || !payload.direktorat) {
    modalError.value = 'Departemen dan Direktorat wajib diisi.'
    return
  }
  if (!payload.tanggal_mulai_bekerja) {
    modalError.value = 'Tanggal mulai bekerja wajib diisi.'
    return
  }

  isSubmitting.value = true
  modalError.value = ''

  try {
    const targetId = selectedEmployee.value?.id_karyawan || selectedEmployee.value?.id
    if (modalMode.value === 'add') {
      await post('/api/karyawan', payload)
      toast('Data karyawan berhasil ditambahkan.')
    } else {
      await put(`/api/karyawan/${targetId}`, payload)
      toast('Data karyawan berhasil diperbarui.')
    }
    closeModal()
    await fetchData()
  } catch (err) {
    modalError.value = err.message || 'Gagal menyimpan data karyawan.'
  } finally {
    isSubmitting.value = false
  }
}

async function deleteEmployee() {
  if (!canWriteKaryawan.value || !selectedEmployee.value) return
  isSubmitting.value = true
  modalError.value = ''

  try {
    const targetId = selectedEmployee.value?.id_karyawan || selectedEmployee.value?.id
    const res = await del(`/api/karyawan/${targetId}`)
    const count = res?.affectedAssetsCount || 0
    if (count > 0) {
      toast(`Data karyawan berhasil dihapus. ${count} unit aset otomatis dialihkan menjadi Stock.`)
    } else {
      toast('Data karyawan berhasil dihapus dari tabel.')
    }
    closeModal()
    await fetchData()
  } catch (err) {
    modalError.value = err.message || 'Gagal menghapus karyawan.'
  } finally {
    isSubmitting.value = false
  }
}

function getEmployeeActions(emp) {
  return [
    {
      label: 'Edit Karyawan',
      icon: 'edit',
      onClick: () => openEdit(emp),
    },
    {
      label: 'Hapus Karyawan',
      icon: 'delete',
      danger: true,
      onClick: () => openDelete(emp),
    },
  ]
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div
    class="admin-workspace employees-page flex min-w-0 flex-col gap-4 sm:gap-5"
    :data-testid="!isLoading ? 'page-ready' : undefined"
  >
    <!-- Notification Toast -->
    <Transition name="fade">
      <div
        v-if="notification"
        class="fixed top-3 left-3 right-3 sm:top-5 sm:left-auto sm:right-5 sm:max-w-md z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl text-white font-semibold text-[13px]"
        :class="notification.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[20px]">
          {{ notification.type === 'error' ? 'error' : 'check_circle' }}
        </span>
        <span class="min-w-0 wrap-anywhere" role="status">{{ notification.message }}</span>
      </div>
    </Transition>

    <!-- Modern SaaS Header & Control Bar Container -->
    <div
      class="admin-page-header flex min-w-0 flex-col gap-4 bg-white p-3.5 sm:p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs"
    >
      <!-- Row 1: Page Title & Primary/Secondary Action Bar -->
      <div class="flex flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h2 class="text-xl font-bold text-[#333333] tracking-tight">Data Karyawan</h2>
          <p class="text-[13px] text-[#5F7089] mt-0.5 leading-normal">
            Pengelolaan dan integrasi data karyawan perusahaan
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <button
            v-if="canWriteKaryawan"
            type="button"
            @click="openAdd"
            class="toolbar-primary-action h-9 shrink-0 whitespace-nowrap rounded-lg bg-[#0A51B0] px-3 sm:px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#0A4391] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="Tambah karyawan baru"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[16px]">person_add</span>
            <span>Tambah Karyawan</span>
          </button>
          <div
            class="toolbar-action-group flex items-center gap-1 rounded-lg border border-[#D7E3F2] bg-[#F8FAFC] p-1"
          >
            <button
              v-if="canWriteKaryawan"
              type="button"
              @click="showImportModal = true"
              class="toolbar-action-button inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-bold text-[#0A51B0] hover:bg-white"
              title="Import data karyawan dari Excel"
            >
              <span aria-hidden="true" class="material-symbols-outlined text-[15px]"
                >upload_file</span
              >Import
            </button>
            <button
              type="button"
              @click="exportEmployees"
              class="toolbar-action-button inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-bold text-[#0A51B0] hover:bg-white"
              title="Export data karyawan"
            >
              <span aria-hidden="true" class="material-symbols-outlined text-[15px]">download</span
              >Export
            </button>
          </div>
        </div>
      </div>

      <!-- Row 2: Search Input & Filters Control Bar -->
      <div
        class="employee-filters grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 w-full min-w-0 pt-3 border-t border-[#F1F5F9]"
      >
        <div class="relative h-9 min-w-0">
          <span
            aria-hidden="true"
            class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#687281] pointer-events-none"
            >search</span
          >
          <input
            v-model="searchQuery"
            aria-label="Cari karyawan"
            type="text"
            placeholder="Cari NIK, nama, email, jabatan, atau departemen..."
            class="toolbar-search-input h-full min-h-0 w-full rounded-xl border border-[#E2E8F0] bg-white pl-9.5 pr-3 text-base sm:text-xs text-[#333333] placeholder-[#687281] focus:border-[#0A51B0] focus:outline-none transition-all shadow-2xs"
          />
        </div>
        <button
          type="button"
          @click="showFilterModal = true"
          class="toolbar-filter-button h-9 shrink-0 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-semibold text-[#5F7089] hover:bg-white"
        >
          <span aria-hidden="true" class="material-symbols-outlined mr-1 align-middle text-[16px]"
            >filter_alt</span
          >Filter
        </button>
      </div>
    </div>

    <FilterModal
      :is-open="showFilterModal"
      title="Filter Karyawan"
      @close="showFilterModal = false"
      @apply="showFilterModal = false"
      @reset="resetFilters"
    >
      <select
        v-model="filterDepartemen"
        class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"
      >
        <option value="">Semua Departemen</option>
        <option v-for="item in availableDepartemenOptions" :key="item" :value="item">
          {{ item }}
        </option>
      </select>
      <select
        v-model="filterLokasi"
        class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"
      >
        <option value="">Semua Lokasi</option>
        <option v-for="item in availableLokasiOptions" :key="item" :value="item">{{ item }}</option>
      </select>
      <select
        v-model="filterStatus"
        class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"
      >
        <option value="">Semua Status</option>
        <option value="Active">Active</option>
        <option value="Outsource">Outsource</option>
        <option value="Resigned">Resigned</option>
      </select>
    </FilterModal>

    <!-- ── Card Stats Karyawan ── -->
    <div
      v-if="!isLoading && stats"
      class="employee-stats grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3"
    >
      <StatCard title="Total Karyawan" :value="stats.totalKaryawan" icon="groups" color="primary" />
      <StatCard
        title="Karyawan Aktif"
        :value="stats.active"
        icon="check_circle"
        color="success"
        :subtitle="
          stats.totalKaryawan
            ? Math.round((stats.active / stats.totalKaryawan) * 100) + '% dari total'
            : ''
        "
      />
      <StatCard
        title="Resigned"
        :value="stats.resigned"
        icon="person_off"
        color="danger"
        :subtitle="
          stats.totalKaryawan
            ? Math.round((stats.resigned / stats.totalKaryawan) * 100) + '% turnover'
            : ''
        "
      />
      <StatCard
        title="Departemen"
        :value="stats.totalDepartemen"
        icon="corporate_fare"
        color="purple"
      />
    </div>

    <!-- Table Section -->
    <div class="rounded-2xl border border-[#E2E8F0]/80 bg-white shadow-2xs overflow-hidden">
      <div v-if="isLoading" aria-busy="true">
        <SkeletonTable preset="employees" :rows="6" />
      </div>

      <div v-else-if="pageError" class="p-6 text-center text-rose-600">
        <p class="font-bold text-[14px]">{{ pageError }}</p>
        <button
          type="button"
          @click="fetchData"
          class="mt-2 text-[12px] font-bold underline cursor-pointer"
        >
          Coba Lagi
        </button>
      </div>

      <div
        v-else-if="filteredEmployees.length === 0"
        class="px-4 py-8 sm:p-12 text-center text-[#5F7089]"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[44px] text-[#CBD5E1]"
          >person_off</span
        >
        <p class="mt-2 font-bold text-[13.5px] text-[#333333]">Tidak Ada Data Karyawan</p>
        <p class="text-[12px] text-[#5F7089]">
          Cobalah untuk mengosongkan filter atau menambah karyawan baru.
        </p>
      </div>

      <div v-else class="w-full max-w-full overflow-hidden">
        <ul class="admin-person-cards xl:hidden" aria-label="Daftar karyawan">
          <li
            v-for="emp in paginatedEmployees"
            :key="emp.id_karyawan || emp.nik"
            class="min-w-0 p-4 space-y-3 wrap-anywhere"
          >
            <div class="space-y-1">
              <h3 class="text-sm font-bold leading-snug text-[#333333]">{{ emp.nama_karyawan }}</h3>
              <p class="text-[13px] leading-relaxed text-[#5F7089]">
                {{ emp.email_kantor || '—' }}
              </p>
            </div>
            <AppBadge
              :type="
                (emp.status_karyawan || emp.status) === 'Active'
                  ? 'success'
                  : (emp.status_karyawan || emp.status) === 'Outsource'
                    ? 'warning'
                    : 'danger'
              "
              :text="emp.status_karyawan || emp.status || 'Active'"
            />
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] leading-relaxed">
              <div>
                <dt class="text-xs text-[#5F7089]">NIK</dt>
                <dd class="font-mono font-semibold text-[#333333]">{{ emp.nik }}</dd>
              </div>
              <div>
                <dt class="text-xs text-[#5F7089]">Title / Jabatan</dt>
                <dd class="text-[#333333]">{{ emp.jabatan || emp.title || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-[#5F7089]">Departemen</dt>
                <dd class="text-[#333333]">{{ emp.departemen || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-[#5F7089]">Direktorat</dt>
                <dd class="text-[#333333]">{{ emp.direktorat || emp.directorate || '—' }}</dd>
              </div>
              <div>
                <dt class="text-xs text-[#5F7089]">Lokasi Kerja</dt>
                <dd class="text-[#333333]">
                  {{ normalizeLocation(emp.lokasi_kerja || emp.work_location) || '—' }}
                </dd>
              </div>
            </dl>
            <div
              v-if="canWriteKaryawan"
              class="grid grid-cols-2 gap-2 border-t border-[#F1F5F9] pt-3"
            >
              <button
                type="button"
                :aria-label="'Edit ' + emp.nama_karyawan"
                class="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] text-[13px] font-semibold text-[#334155] hover:bg-[#F8FAFC] cursor-pointer"
                @click="openEdit(emp)"
              >
                <span aria-hidden="true" class="material-symbols-outlined text-[18px]">edit</span
                >Edit
              </button>
              <button
                type="button"
                :aria-label="'Hapus ' + emp.nama_karyawan"
                class="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] text-[13px] font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                @click="openDelete(emp)"
              >
                <span aria-hidden="true" class="material-symbols-outlined text-[18px]">delete</span
                >Hapus
              </button>
            </div>
          </li>
        </ul>
        <table class="hidden xl:table w-full max-w-full text-left border-collapse table-fixed">
          <colgroup>
            <col :class="canWriteKaryawan ? 'w-[22%]' : 'w-[24%]'" />
            <col :class="canWriteKaryawan ? 'w-[11%]' : 'w-[12%]'" />
            <col :class="canWriteKaryawan ? 'w-[18%]' : 'w-[20%]'" />
            <col :class="canWriteKaryawan ? 'w-[22%]' : 'w-[23%]'" />
            <col :class="canWriteKaryawan ? 'w-[10%]' : 'w-[10%]'" />
            <col :class="canWriteKaryawan ? 'w-[11%]' : 'w-[11%]'" />
            <col v-if="canWriteKaryawan" class="w-[6%]" />
          </colgroup>
          <thead
            class="sticky top-0 z-10 border-b border-[#E2E8F0]/80 bg-[#F8FAFC]/80 backdrop-blur-xs select-none whitespace-nowrap"
          >
            <tr>
              <th
                class="py-3 pl-5 pr-4 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
              >
                Karyawan
              </th>
              <th
                class="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
              >
                NIK
              </th>
              <th
                class="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
              >
                Title / Jabatan
              </th>
              <th
                class="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
              >
                Departemen / Direktorat
              </th>
              <th
                class="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
              >
                Status
              </th>
              <th
                class="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
              >
                Lokasi Kerja
              </th>
              <th
                v-if="canWriteKaryawan"
                class="py-3 pr-5 pl-4 text-right text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] whitespace-nowrap"
              >
                Aksi
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F1F5F9]">
            <tr
              v-for="emp in paginatedEmployees"
              :key="emp.id_karyawan || emp.nik"
              class="group hover:bg-[#F8FAFC] transition-colors duration-150"
            >
              <td class="py-4 pl-5 pr-4 overflow-hidden">
                <div class="flex flex-col min-w-0">
                  <span
                    class="text-[13.5px] font-bold text-[#333333] leading-snug truncate group-hover:text-[#333333] transition-colors block"
                    :title="emp.nama_karyawan"
                  >
                    {{ emp.nama_karyawan }}
                  </span>
                  <span
                    class="text-[12px] font-normal text-[#5F7089] mt-0.5 truncate block"
                    :title="emp.email_kantor || '—'"
                  >
                    {{ emp.email_kantor || '—' }}
                  </span>
                </div>
              </td>

              <td
                class="py-4 px-4 font-mono text-[12px] font-semibold text-[#333333] overflow-hidden"
              >
                <span class="truncate block" :title="emp.nik">{{ emp.nik }}</span>
              </td>

              <td class="py-4 px-4 overflow-hidden">
                <span
                  class="text-[13px] font-medium text-[#333333] truncate block"
                  :title="emp.jabatan || emp.title || '—'"
                  >{{ emp.jabatan || emp.title || '—' }}</span
                >
              </td>

              <td class="py-4 px-4 overflow-hidden">
                <div class="flex flex-col min-w-0">
                  <span
                    class="text-[13px] font-medium text-[#333333] leading-snug truncate block"
                    :title="emp.departemen || '—'"
                  >
                    {{ emp.departemen || '—' }}
                  </span>
                  <span
                    class="text-[12px] font-normal text-[#5F7089] mt-0.5 truncate block"
                    :title="emp.direktorat || emp.directorate || '—'"
                  >
                    {{ emp.direktorat || emp.directorate || '—' }}
                  </span>
                </div>
              </td>

              <td class="py-4 px-4 overflow-hidden">
                <AppBadge
                  :type="
                    (emp.status_karyawan || emp.status) === 'Active'
                      ? 'success'
                      : (emp.status_karyawan || emp.status) === 'Outsource'
                        ? 'warning'
                        : 'danger'
                  "
                  :text="emp.status_karyawan || emp.status || 'Active'"
                />
              </td>
              <td class="py-4 px-4 text-[13px] font-normal text-[#333333] overflow-hidden">
                <span
                  class="truncate block"
                  :title="normalizeLocation(emp.lokasi_kerja || emp.work_location) || '—'"
                  >{{ normalizeLocation(emp.lokasi_kerja || emp.work_location) || '—' }}</span
                >
              </td>
              <td
                v-if="canWriteKaryawan"
                class="py-4 pr-5 pl-4 text-right overflow-hidden"
                @click.stop
              >
                <AppRowActions :actions="getEmployeeActions(emp)" />
              </td>
            </tr>
          </tbody>
        </table>

        <AppPagination
          asset-style
          mobile-compact
          v-model:currentPage="currentPage"
          :total-items="filteredEmployees.length"
          :items-per-page="itemsPerPage"
        />
      </div>
    </div>

    <!-- Modal Form Tambah/Edit Karyawan -->
    <AppModal
      :is-open="showFormModal"
      :title="modalMode === 'add' ? 'Tambah Data Karyawan' : 'Edit Data Karyawan'"
      size="lg"
      @close="closeModal"
    >
      <form
        id="admin-employee-form"
        @submit.prevent="saveEmployee"
        class="admin-entry-form employee-modal-content space-y-4 wrap-anywhere"
      >
        <div
          v-if="modalError"
          class="rounded-xl bg-rose-50 p-3 text-[12px] font-semibold text-rose-600"
        >
          {{ modalError }}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              for="employee-nik"
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >NIK *</label
            >
            <input
              id="employee-nik"
              v-model="form.nik"
              type="text"
              required
              placeholder="Contoh: 2026001"
              class="min-w-0 min-h-11 sm:min-h-0 w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-base sm:text-[13px] text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
            />
          </div>

          <div>
            <label
              for="employee-nama_karyawan"
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >Nama Karyawan *</label
            >
            <input
              id="employee-nama_karyawan"
              v-model="form.nama_karyawan"
              type="text"
              required
              placeholder="Nama lengkap"
              class="min-w-0 min-h-11 sm:min-h-0 w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-base sm:text-[13px] text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              for="employee-email_kantor"
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >Email Kantor *</label
            >
            <input
              id="employee-email_kantor"
              v-model="form.email_kantor"
              type="email"
              required
              placeholder="nama@esb.co.id"
              class="min-w-0 min-h-11 sm:min-h-0 w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-base sm:text-[13px] text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
            />
          </div>

          <div>
            <label
              for="employee-lokasi_kerja"
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >Lokasi Kerja *</label
            >
            <input
              id="employee-lokasi_kerja"
              v-model="form.lokasi_kerja"
              type="text"
              required
              placeholder="Contoh: JKT, Solo, BSD"
              class="min-w-0 min-h-11 sm:min-h-0 w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-base sm:text-[13px] text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              for="employee-jabatan"
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >Title / Jabatan *</label
            >
            <input
              id="employee-jabatan"
              v-model="form.jabatan"
              type="text"
              required
              placeholder="Contoh: Software Engineer"
              class="min-w-0 min-h-11 sm:min-h-0 w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-base sm:text-[13px] text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
            />
          </div>

          <div>
            <label
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >Job Level *</label
            >
            <CustomSelect
              v-model="form.tingkat_jabatan"
              :options="jobLevelOptions"
              aria-label="Job Level"
              placeholder="Pilih level"
              :block="true"
              height-class="h-10"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              for="employee-departemen"
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >Departemen *</label
            >
            <input
              id="employee-departemen"
              v-model="form.departemen"
              type="text"
              required
              placeholder="Contoh: Technology"
              class="min-w-0 min-h-11 sm:min-h-0 w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-base sm:text-[13px] text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
            />
          </div>

          <div>
            <label
              for="employee-direktorat"
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >Directorate *</label
            >
            <input
              id="employee-direktorat"
              v-model="form.direktorat"
              type="text"
              required
              placeholder="Contoh: Technology"
              class="min-w-0 min-h-11 sm:min-h-0 w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-base sm:text-[13px] text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >Status Karyawan *</label
            >
            <CustomSelect
              v-model="form.status_karyawan"
              :options="statusKaryawanFormOptions"
              aria-label="Status Karyawan"
              placeholder="Pilih status"
              :block="true"
              height-class="h-10"
            />
          </div>

          <div>
            <label
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >Status Kepegawaian *</label
            >
            <CustomSelect
              v-model="form.status_kepegawaian"
              :options="statusKepegawaianFormOptions"
              aria-label="Status Kepegawaian"
              placeholder="Pilih status"
              :block="true"
              height-class="h-10"
            />
          </div>

          <div>
            <label
              for="employee-tanggal_mulai_bekerja"
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >Tgl Mulai Bekerja *</label
            >
            <input
              id="employee-tanggal_mulai_bekerja"
              v-model="form.tanggal_mulai_bekerja"
              type="date"
              required
              class="min-w-0 min-h-11 sm:min-h-0 w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-base sm:text-[13px] text-[#2A3547] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
            >NIK Atasan Langsung</label
          >
          <SearchableSelect
            v-model="form.nik_atasan_langsung"
            :options="atasanOptions"
            value-key="nik"
            label-key="displayLabel"
            placeholder="-- Tanpa Atasan / Tidak Ada --"
            search-placeholder="Cari NIK, nama, atau posisi atasan..."
            aria-label="NIK Atasan Langsung"
            height-class="h-10"
            :clearable="true"
          />
        </div>
      </form>
      <template #footer>
        <div
          class="admin-modal-actions grid grid-cols-1 sm:flex sm:items-center sm:justify-end gap-2 pt-4 border-t border-[#E5EAEF]"
        >
          <button
            type="button"
            @click="closeModal"
            class="min-h-11 sm:min-h-0 rounded-xl border border-[#E5EAEF] px-4 py-2 text-[12px] font-bold text-[#66728d] hover:bg-gray-50 transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            form="admin-employee-form"
            :disabled="isSubmitting || !canWriteKaryawan"
            class="min-h-11 sm:min-h-0 rounded-xl bg-[#0A51B0] px-4 py-2 text-[12px] font-bold text-white shadow-md hover:bg-[#0A4391] transition-all cursor-pointer disabled:opacity-60"
          >
            {{ isSubmitting ? 'Menyimpan...' : 'Simpan Data' }}
          </button>
        </div>
      </template>
    </AppModal>

    <!-- Modal Hapus Karyawan -->
    <AppModal :is-open="showDeleteModal" title="Hapus Data Karyawan" @close="closeModal">
      <div class="employee-modal-content space-y-4 wrap-anywhere">
        <div
          v-if="modalError"
          class="rounded-xl bg-rose-50 p-3 text-[12px] font-semibold text-rose-600"
        >
          {{ modalError }}
        </div>

        <p class="text-[13px] text-[#2A3547]">
          Apakah Anda yakin ingin menghapus data karyawan
          <strong>{{ selectedEmployee?.nama_karyawan }}</strong> (NIK: {{ selectedEmployee?.nik }})?
        </p>

        <div
          v-if="parseInt(selectedEmployee?.jumlah_aset || 0) > 0"
          class="rounded-xl bg-amber-50 p-3 text-[12px] font-semibold text-amber-700 flex items-start gap-2"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[18px] mt-0.5"
            >warning</span
          >
          <div>
            <p>
              Karyawan ini masih memiliki {{ selectedEmployee?.jumlah_aset }} unit aset ter-assign.
            </p>
            <p class="font-normal text-[11px] text-amber-800 mt-0.5">
              Aset milik karyawan ini akan <strong>otomatis dialihkan menjadi Stock</strong> saat
              karyawan dihapus.
            </p>
          </div>
        </div>
      </div>
      <template #footer>
        <div
          class="admin-modal-actions grid grid-cols-1 sm:flex sm:items-center sm:justify-end gap-2 pt-4 border-t border-[#E5EAEF]"
        >
          <button
            type="button"
            @click="closeModal"
            class="min-h-11 sm:min-h-0 rounded-xl border border-[#E5EAEF] px-4 py-2 text-[12px] font-bold text-[#66728d] hover:bg-gray-50 transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            @click="deleteEmployee"
            :disabled="isSubmitting || !canWriteKaryawan"
            class="min-h-11 sm:min-h-0 rounded-xl bg-rose-600 px-4 py-2 text-[12px] font-bold text-white shadow-md hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-60"
          >
            {{ isSubmitting ? 'Menghapus...' : 'Ya, Hapus Karyawan' }}
          </button>
        </div>
      </template>
    </AppModal>

    <!-- Modal Import Excel -->
    <AppImportModal
      :is-open="showImportModal"
      @close="showImportModal = false"
      @imported="onImported"
    />
  </div>
</template>

<style scoped>
.toolbar-search-input {
  height: 36px;
  min-height: 36px;
  max-height: 36px;
  box-sizing: border-box;
}
.toolbar-filter-button {
  height: 36px;
  min-height: 36px !important;
  max-height: 36px;
  box-sizing: border-box;
}
@media (width < 64rem) {
  .employee-stats :deep(.truncate),
  .employee-filters :deep(.truncate) {
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .employee-stats :deep(.tracking-wider) {
    font-size: 0.75rem;
    letter-spacing: normal;
  }
  .employee-stats :deep(.items-center) {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .employee-filters :deep([role='option']) {
    height: auto;
    min-height: 2.75rem;
    padding-block: 0.5rem;
  }
}
.employee-modal-content :is(input, select) {
  max-width: 100%;
}
@media (width < 40rem) {
  .employees-page input,
  .employee-modal-content :is(input, select) {
    font-size: 1rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style scoped src="../assets/admin-workspace.css"></style>

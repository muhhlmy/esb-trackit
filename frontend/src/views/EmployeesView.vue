<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import { useAuth } from '../composables/useAuth.js'
import { animateStagger } from '../composables/useGsap.js'
import { normalizeLocation } from '../utils/locationNormalizer.js'
import AppModal from '../components/ui/AppModal.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import AppRowActions from '../components/ui/AppRowActions.vue'
import AppImportModal from '../components/ui/AppImportModal.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import ErrorState from '../components/ui/ErrorState.vue'
import AppPagination from '../components/ui/AppPagination.vue'
import StatCard from '../components/ui/StatCard.vue'
import SkeletonTable from '../components/ui/skeleton/SkeletonTable.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import SearchableSelect from '../components/ui/SearchableSelect.vue'
import { useViewMode } from '../composables/useViewMode.js'
import { useLanguage } from '../composables/useLanguage.js'
import AppViewToggle from '../components/ui/AppViewToggle.vue'
import FilterModal from '../components/ui/FilterModal.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import { exportToExcel } from '../utils/exportEngine.js'

const { get, post, put, del } = useApi()
const { hasWritePermission } = useAuth()
const canWriteKaryawan = computed(() => hasWritePermission('karyawan'))
const { viewMode } = useViewMode('karyawan', 'table')
const { currentLang, t } = useLanguage()

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
  notification.value = { message: t('employees_import_success'), type: 'success' }
}

// ── Filter & Search ──────────────────────────────────────────
const searchQuery = ref('')
const filterDepartemen = ref('')
const filterLokasi = ref('')
const filterStatus = ref('')
const showFilterModal = ref(false)

const activeFilterCount = computed(() => {
  let count = 0
  if (filterDepartemen.value) count++
  if (filterLokasi.value) count++
  if (filterStatus.value) count++
  return count
})

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
  { nik: '', displayLabel: t('employees_no_supervisor_option') },
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

function resetFilters() {
  searchQuery.value = ''
  filterDepartemen.value = ''
  filterLokasi.value = ''
  filterStatus.value = ''
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
    pageError.value = err.message || t('employees_load_failed')
  } finally {
    isLoading.value = false
    await nextTick()
    animateStagger('tbody tr')
  }
}

function exportEmployees() {
  if (filteredEmployees.value.length === 0) {
    toast(t('employees_export_empty'), 'error')
    return
  }

  exportToExcel(
    filteredEmployees.value,
    [
      { name: 'nik', label: 'NIK' },
      { name: 'nama_karyawan', label: t('employees_export_name') },
      { name: 'status_karyawan', label: t('status') },
      { name: 'jabatan', label: 'Title' },
      { name: 'tingkat_jabatan', label: 'Job Level' },
      { name: 'departemen', label: t('department') },
      { name: 'direktorat', label: t('employees_directorate') },
      { name: 'tanggal_mulai_bekerja', label: t('employees_export_start_date') },
      { name: 'status_kepegawaian', label: 'Employeement Status' },
      { name: 'nik_atasan_langsung', label: t('employees_export_supervisor_nik') },
      { name: 'email_kantor', label: t('employees_export_office_email') },
      { name: 'lokasi_kerja', label: t('employees_work_location') },
    ],
    t('employees_export_sheet'),
    t('employees_export_filename'),
  )
  toast(t('employees_export_success'))
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
    modalError.value = t('employees_no_write_access')
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
    modalError.value = t('employees_validation_nik_name')
    return
  }
  if (!payload.departemen || !payload.direktorat) {
    modalError.value = t('employees_validation_dept_directorate')
    return
  }
  if (!payload.tanggal_mulai_bekerja) {
    modalError.value = t('employees_validation_start_date')
    return
  }

  isSubmitting.value = true
  modalError.value = ''

  try {
    const targetId = selectedEmployee.value?.id_karyawan || selectedEmployee.value?.id
    if (modalMode.value === 'add') {
      await post('/api/karyawan', payload)
      toast(t('employees_add_success'))
    } else {
      await put(`/api/karyawan/${targetId}`, payload)
      toast(t('employees_update_success'))
    }
    closeModal()
    await fetchData()
  } catch (err) {
    modalError.value = err.message || t('employees_save_failed')
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
      toast(`${t('employees_delete_success')} ${count} ${t('employees_delete_reassigned_units')}`)
    } else {
      toast(t('employees_delete_success_table'))
    }
    closeModal()
    await fetchData()
  } catch (err) {
    modalError.value = err.message || t('employees_delete_failed')
  } finally {
    isSubmitting.value = false
  }
}

function getEmployeeActions(emp) {
  return [
    {
      label: t('employees_edit_action'),
      icon: 'edit',
      onClick: () => openEdit(emp),
    },
    {
      label: t('employees_delete_action'),
      icon: 'delete',
      danger: true,
      onClick: () => openDelete(emp),
    },
  ]
}

const route = useRoute()
const router = useRouter()

onMounted(() => {
  fetchData()

  // Deep link from dashboard quick action: /karyawan?action=add opens the
  // create modal. Guarded by canWriteKaryawan, same as the toolbar button.
  if (route.query.action === 'add') {
    openAdd()
    router.replace({ path: route.path, query: { ...route.query, action: undefined } })
  }
})
</script>

<template>
  <div
    class="admin-workspace employees-page flex min-w-0 flex-col gap-3"
    :data-testid="!isLoading ? 'page-ready' : undefined"
  >
    <!-- Notification Toast -->
    <Transition name="fade">
      <div
        v-if="notification"
        class="fixed top-3 left-3 right-3 sm:top-5 sm:left-auto sm:right-5 sm:max-w-md z-50 flex items-center gap-3 rounded-[6px] px-4 py-3 shadow-2xl text-white font-semibold text-xs"
        :class="notification.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[20px]">
          {{ notification.type === 'error' ? 'error' : 'check_circle' }}
        </span>
        <span class="min-w-0 wrap-anywhere" role="status">{{ notification.message }}</span>
      </div>
    </Transition>
    <!-- Page Header -->
    <PageHeader
      :title="t('employees_title')"
      :subtitle="t('employees_subtitle')"
      icon="person_search"
    >
      <div class="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
        <button
          v-if="canWriteKaryawan"
          type="button"
          @click="openAdd"
          class="h-8 shrink-0 whitespace-nowrap rounded-[6px] bg-[#0A51B0] px-3 text-xs font-medium text-white shadow-2xs hover:bg-[#0A4391] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          :title="t('btn_add_employee')"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[16px]">person_add</span>
          <span>{{ currentLang === 'en' ? 'Add Employee' : 'Tambah Karyawan' }}</span>
        </button>
        <div class="flex items-center gap-1 rounded-[6px] border border-[#D7E3F2] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 p-0.5 h-8">
          <button
            v-if="canWriteKaryawan"
            type="button"
            @click="showImportModal = true"
            class="inline-flex h-full items-center gap-1 rounded-[4px] px-2 text-[11px] font-semibold text-[#0A51B0] dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700"
            :title="t('employees_import_title')"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[15px]">upload_file</span
            >{{ t('btn_import') }}
          </button>
          <button
            type="button"
            @click="exportEmployees"
            class="inline-flex h-full items-center gap-1 rounded-[4px] px-2 text-[11px] font-semibold text-[#0A51B0] dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700"
            :title="t('employees_export_title')"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[15px]">download</span
            >{{ t('btn_export') }}
          </button>
        </div>
      </div>
    </PageHeader>

    <!-- ── Card Stats Karyawan (Directly below Header) ── -->
    <div
      v-if="!isLoading && stats"
      class="employee-stats grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 lg:gap-3"
    >
      <StatCard
        :title="t('stat_total_employees')"
        :value="stats.totalKaryawan"
        icon="groups"
        color="primary"
        :subtitle="t('employees_stat_total_sub')"
      />
      <StatCard
        :title="t('employees_stat_active')"
        :value="stats.active"
        icon="check_circle"
        color="success"
        :subtitle="
          stats.totalKaryawan
            ? Math.round((stats.active / stats.totalKaryawan) * 100) + t('employees_pct_of_total')
            : t('employees_currently_working')
        "
      />
      <StatCard
        :title="t('employees_stat_resigned')"
        :value="stats.resigned"
        icon="person_off"
        color="danger"
        :subtitle="
          stats.totalKaryawan
            ? Math.round((stats.resigned / stats.totalKaryawan) * 100) + '% turnover'
            : t('employees_terminated')
        "
      />
      <StatCard
        :title="t('department')"
        :value="stats.totalDepartemen"
        icon="corporate_fare"
        color="neutral"
        :subtitle="t('employees_org_units')"
      />
    </div>

    <!-- Search & Filter Bar -->
    <div class="flex items-center gap-2.5 w-full min-w-0">
      <div class="relative h-8 min-w-0 flex-1">
        <span
          aria-hidden="true"
          class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-[#687281] dark:text-slate-400 pointer-events-none"
          >search</span
        >
        <input
          v-model="searchQuery"
          :aria-label="t('employees_search_label')"
          type="text"
          :placeholder="t('employees_search_placeholder')"
          class="h-full min-h-0 w-full rounded-[6px] border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-xs text-[#333333] dark:text-slate-100 placeholder-[#687281] dark:placeholder-slate-400 focus:border-[#0A51B0] focus:outline-none transition-all shadow-2xs"
        />
      </div>

      <button
        type="button"
        @click="showFilterModal = true"
        class="relative inline-flex items-center gap-1.5 h-8 shrink-0 rounded-[6px] border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 px-3 text-xs font-medium text-[#5F7089] dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[16px]">tune</span>
        <span>{{ t('filter') }}</span>
        <span
          v-if="activeFilterCount > 0"
          class="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-[#0A51B0] text-white"
        >
          {{ activeFilterCount }}
        </span>
      </button>
      <AppViewToggle v-model="viewMode" />
    </div>

    <FilterModal
      :is-open="showFilterModal"
      :title="t('employees_filter_title')"
      @close="showFilterModal = false"
      @apply="showFilterModal = false"
      @reset="resetFilters"
    >
      <select
        v-model="filterDepartemen"
        class="h-8 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 text-xs"
      >
        <option value="">{{ t('employees_filter_all_departments') }}</option>
        <option v-for="item in availableDepartemenOptions" :key="item" :value="item">
          {{ item }}
        </option>
      </select>
      <select
        v-model="filterLokasi"
        class="h-8 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 text-xs"
      >
        <option value="">{{ t('employees_filter_all_locations') }}</option>
        <option v-for="item in availableLokasiOptions" :key="item" :value="item">{{ item }}</option>
      </select>
      <select
        v-model="filterStatus"
        class="h-8 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 text-xs"
      >
        <option value="">{{ t('employees_filter_all_status') }}</option>
        <option value="Active">Active</option>
        <option value="Outsource">Outsource</option>
        <option value="Resigned">Resigned</option>
      </select>
    </FilterModal>

    <!-- Table Section -->
    <div class="rounded-[6px] border border-[#E2E8F0]/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
      <div v-if="isLoading" aria-busy="true">
        <SkeletonTable preset="employees" :rows="6" />
      </div>

      <ErrorState v-else-if="pageError" :message="pageError" @retry="fetchData" />

      <div v-else-if="filteredEmployees.length === 0" class="px-4 py-8 sm:p-8">
        <EmptyState
          icon="person_off"
          :title="t('employees_empty_title')"
          :description="t('employees_empty_desc')"
        />
      </div>

      <div v-else class="w-full max-w-full overflow-hidden">
        <ul v-if="viewMode === 'card'" class="admin-person-cards" :aria-label="t('employees_list_label')">
          <li
            v-for="emp in paginatedEmployees"
            :key="emp.id_karyawan || emp.nik"
            class="min-w-0 p-2.5 sm:p-3 space-y-2 wrap-anywhere rounded-[6px] border border-[#E2E8F0] bg-white shadow-2xs"
          >
            <div class="space-y-0.5">
              <h3 class="text-[13px] font-bold leading-snug text-[#333333]">{{ emp.nama_karyawan }}</h3>
              <p class="text-[11.5px] leading-relaxed text-[#5F7089]">
                {{ emp.email_kantor || '-' }}
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
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px] leading-relaxed">
              <div>
                <dt class="text-[10px] text-[#5F7089]">NIK</dt>
                <dd class="font-mono font-semibold text-[#333333]">{{ emp.nik }}</dd>
              </div>
              <div>
                <dt class="text-[10px] text-[#5F7089]">{{ t('employees_job_title') }}</dt>
                <dd class="text-[#333333]">{{ emp.jabatan || emp.title || '-' }}</dd>
              </div>
              <div>
                <dt class="text-[10px] text-[#5F7089]">{{ t('department') }}</dt>
                <dd class="text-[#333333]">{{ emp.departemen || '-' }}</dd>
              </div>
              <div>
                <dt class="text-[10px] text-[#5F7089]">{{ t('employees_directorate') }}</dt>
                <dd class="text-[#333333]">{{ emp.direktorat || emp.directorate || '-' }}</dd>
              </div>
              <div>
                <dt class="text-[10px] text-[#5F7089]">{{ t('employees_work_location') }}</dt>
                <dd class="text-[#333333]">
                  {{ normalizeLocation(emp.lokasi_kerja || emp.work_location) || '-' }}
                </dd>
              </div>
            </dl>
            <div
              v-if="canWriteKaryawan"
              class="grid grid-cols-2 gap-2 border-t border-[#F1F5F9] pt-2"
            >
              <button
                type="button"
                :aria-label="t('edit') + ' ' + emp.nama_karyawan"
                class="flex min-h-8 items-center justify-center gap-1.5 rounded-[6px] border border-[#E2E8F0] text-xs font-medium text-[#334155] hover:bg-[#F8FAFC] cursor-pointer"
                @click="openEdit(emp)"
              >
                <span aria-hidden="true" class="material-symbols-outlined text-[16px]">edit</span
                >{{ t('edit') }}
              </button>
              <button
                type="button"
                :aria-label="t('delete') + ' ' + emp.nama_karyawan"
                class="flex min-h-8 items-center justify-center gap-1.5 rounded-[6px] border border-[#E2E8F0] text-xs font-medium text-rose-700 hover:bg-rose-50 cursor-pointer"
                @click="openDelete(emp)"
              >
                <span aria-hidden="true" class="material-symbols-outlined text-[16px]">delete</span
                >{{ t('delete') }}
              </button>
            </div>
          </li>
        </ul>

        <div v-if="viewMode === 'table'" class="w-full max-w-full overflow-x-auto">
          <table
            class="w-full min-w-[700px] text-left border-collapse table-fixed"
          >
          <colgroup>
            <col :class="canWriteKaryawan ? 'w-[22%]' : 'w-[24%]'" />
            <col :class="canWriteKaryawan ? 'w-[11%]' : 'w-[12%]'" />
            <col :class="canWriteKaryawan ? 'w-[18%]' : 'w-[20%]'" />
            <col :class="canWriteKaryawan ? 'w-[22%]' : 'w-[23%]'" />
            <col :class="canWriteKaryawan ? 'w-[10%]' : 'w-[10%]'" />
            <col :class="canWriteKaryawan ? 'w-[11%]' : 'w-[11%]'" />
            <col v-if="canWriteKaryawan" class="w-[6%]" />
          </colgroup>
          <thead class="border-b border-[#E2E8F0] bg-[#F8FAFC] select-none whitespace-nowrap">
            <tr>
              <th
                scope="col"
                class="py-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
              >
                {{ t('employees_th_employee') }}
              </th>
              <th
                scope="col"
                class="py-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
              >
                NIK
              </th>
              <th
                scope="col"
                class="py-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
              >
                {{ t('employees_job_title') }}
              </th>
              <th
                scope="col"
                class="py-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
              >
                {{ t('employees_th_department') }}
              </th>
              <th
                scope="col"
                class="py-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
              >
                {{ t('status') }}
              </th>
              <th
                scope="col"
                class="py-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
              >
                {{ t('employees_work_location') }}
              </th>
              <th
                scope="col"
                v-if="canWriteKaryawan"
                class="py-1.5 px-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] whitespace-nowrap"
              >
                {{ currentLang === 'en' ? 'Actions' : 'Aksi' }}
              </th>
            </tr>
          </thead>
          <tbody class="relative z-0 isolate divide-y divide-[#F1F5F9]">
            <tr
              v-for="emp in paginatedEmployees"
              :key="emp.id_karyawan || emp.nik"
              class="group hover:bg-[#F8FAFC] transition-colors duration-150"
            >
              <td class="py-2 px-2.5 overflow-hidden">
                <div class="flex flex-col min-w-0">
                  <span
                    class="text-[12px] font-bold text-[#333333] leading-snug truncate group-hover:text-[#333333] transition-colors block"
                    :title="emp.nama_karyawan"
                  >
                    {{ emp.nama_karyawan }}
                  </span>
                  <span
                    class="text-[12px] font-normal text-[#5F7089] mt-0.5 truncate block"
                    :title="emp.email_kantor || '-'"
                  >
                    {{ emp.email_kantor || '-' }}
                  </span>
                </div>
              </td>

              <td
                class="py-2 px-2.5 font-mono text-[12px] font-semibold text-[#333333] overflow-hidden"
              >
                <span class="truncate block" :title="emp.nik">{{ emp.nik }}</span>
              </td>

              <td class="py-2 px-2.5 overflow-hidden">
                <span
                  class="text-xs font-medium text-[#333333] truncate block"
                  :title="emp.jabatan || emp.title || '-'"
                  >{{ emp.jabatan || emp.title || '-' }}</span
                >
              </td>

              <td class="py-2 px-2.5 overflow-hidden">
                <div class="flex flex-col min-w-0">
                  <span
                    class="text-xs font-medium text-[#333333] leading-snug truncate block"
                    :title="emp.departemen || '-'"
                  >
                    {{ emp.departemen || '-' }}
                  </span>
                  <span
                    class="text-[12px] font-normal text-[#5F7089] mt-0.5 truncate block"
                    :title="emp.direktorat || emp.directorate || '-'"
                  >
                    {{ emp.direktorat || emp.directorate || '-' }}
                  </span>
                </div>
              </td>

              <td class="py-2 px-2.5 overflow-hidden">
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
              <td class="py-2 px-2.5 text-xs font-normal text-[#333333] overflow-hidden">
                <span
                  class="truncate block"
                  :title="normalizeLocation(emp.lokasi_kerja || emp.work_location) || '-'"
                  >{{ normalizeLocation(emp.lokasi_kerja || emp.work_location) || '-' }}</span
                >
              </td>
              <td
                v-if="canWriteKaryawan"
                class="py-2 px-2.5 text-right overflow-hidden"
                @click.stop
              >
                <AppRowActions
                  :actions="getEmployeeActions(emp)"
                  :label="t('employees_row_actions_label') + ' ' + (emp.nama_karyawan || '')"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
      :title="modalMode === 'add' ? t('employees_modal_add_title') : t('employees_modal_edit_title')"
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
              :placeholder="t('employees_nik_placeholder')"
              class="min-w-0 min-h-11 sm:min-h-0 w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-base sm:text-xs text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
            />
          </div>

          <div>
            <label
              for="employee-nama_karyawan"
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >{{ t('employees_name_label') }} *</label
            >
            <input
              id="employee-nama_karyawan"
              v-model="form.nama_karyawan"
              type="text"
              required
              :placeholder="t('employees_name_placeholder')"
              class="min-w-0 min-h-11 sm:min-h-0 w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-base sm:text-xs text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              for="employee-email_kantor"
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >{{ t('employees_email_label') }} *</label
            >
            <input
              id="employee-email_kantor"
              v-model="form.email_kantor"
              type="email"
              required
              placeholder="nama@example.com"
              class="min-w-0 min-h-11 sm:min-h-0 w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-base sm:text-xs text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
            />
          </div>

          <div>
            <label
              for="employee-lokasi_kerja"
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >{{ t('employees_work_location') }} *</label
            >
            <input
              id="employee-lokasi_kerja"
              v-model="form.lokasi_kerja"
              type="text"
              required
              :placeholder="t('employees_location_placeholder')"
              class="min-w-0 min-h-11 sm:min-h-0 w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-base sm:text-xs text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              for="employee-jabatan"
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >{{ t('employees_job_title') }} *</label
            >
            <input
              id="employee-jabatan"
              v-model="form.jabatan"
              type="text"
              required
              :placeholder="t('employees_jabatan_placeholder')"
              class="min-w-0 min-h-11 sm:min-h-0 w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-base sm:text-xs text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
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
              :placeholder="t('employees_select_level')"
              :block="true"
              height-class="h-8"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              for="employee-departemen"
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >{{ t('department') }} *</label
            >
            <input
              id="employee-departemen"
              v-model="form.departemen"
              type="text"
              required
              :placeholder="t('employees_departemen_placeholder')"
              class="min-w-0 min-h-11 sm:min-h-0 w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-base sm:text-xs text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
            />
          </div>

          <div>
            <label
              for="employee-direktorat"
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >{{ t('employees_directorate') }} *</label
            >
            <input
              id="employee-direktorat"
              v-model="form.direktorat"
              type="text"
              required
              :placeholder="t('employees_direktorat_placeholder')"
              class="min-w-0 min-h-11 sm:min-h-0 w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-base sm:text-xs text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >{{ t('employees_status_karyawan_label') }} *</label
            >
            <CustomSelect
              v-model="form.status_karyawan"
              :options="statusKaryawanFormOptions"
              :aria-label="t('employees_status_karyawan_label')"
              :placeholder="t('employees_select_status')"
              :block="true"
              height-class="h-8"
            />
          </div>

          <div>
            <label
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >{{ t('employees_status_kepegawaian_label') }} *</label
            >
            <CustomSelect
              v-model="form.status_kepegawaian"
              :options="statusKepegawaianFormOptions"
              :aria-label="t('employees_status_kepegawaian_label')"
              :placeholder="t('employees_select_status')"
              :block="true"
              height-class="h-8"
            />
          </div>

          <div>
            <label
              for="employee-tanggal_mulai_bekerja"
              class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
              >{{ t('employees_start_date_label') }} *</label
            >
            <input
              id="employee-tanggal_mulai_bekerja"
              v-model="form.tanggal_mulai_bekerja"
              type="date"
              required
              class="min-w-0 min-h-11 sm:min-h-0 w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-base sm:text-xs text-[#2A3547] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            class="block text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#66728d] mb-1"
            >{{ t('employees_supervisor_nik_label') }}</label
          >
          <SearchableSelect
            v-model="form.nik_atasan_langsung"
            :options="atasanOptions"
            value-key="nik"
            label-key="displayLabel"
            :placeholder="t('employees_no_supervisor_placeholder')"
            :search-placeholder="t('employees_supervisor_search_placeholder')"
            :aria-label="t('employees_supervisor_nik_label')"
            height-class="h-8"
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
            class="h-8 rounded-[6px] border border-[#E5EAEF] px-3.5 text-[12px] font-medium text-[#66728d] hover:bg-gray-50 transition-all cursor-pointer"
          >
            {{ t('cancel') }}
          </button>
          <button
            type="submit"
            form="admin-employee-form"
            :disabled="isSubmitting || !canWriteKaryawan"
            class="h-8 rounded-[6px] bg-[#0A51B0] px-3.5 text-[12px] font-medium text-white shadow-md hover:bg-[#0A4391] transition-all cursor-pointer disabled:opacity-60"
          >
            {{ isSubmitting ? (currentLang === 'en' ? 'Saving...' : 'Menyimpan...') : (currentLang === 'en' ? 'Save Data' : 'Simpan Data') }}
          </button>
        </div>
      </template>
    </AppModal>

    <!-- Modal Hapus Karyawan -->
    <AppModal :is-open="showDeleteModal" :title="t('employees_delete_modal_title')" @close="closeModal">
      <div class="employee-modal-content space-y-4 wrap-anywhere">
        <div
          v-if="modalError"
          class="rounded-xl bg-rose-50 p-3 text-[12px] font-semibold text-rose-600"
        >
          {{ modalError }}
        </div>

        <p class="text-xs text-[#2A3547]">
          {{ t('employees_delete_confirm') }}
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
              {{ t('employees_delete_assets_count') }} {{ selectedEmployee?.jumlah_aset }}
              {{ t('employees_delete_assets_unit') }}
            </p>
            <p class="font-normal text-[11px] text-amber-800 mt-0.5">
              {{ t('employees_delete_assets_note_a') }}
              <strong>{{ t('employees_delete_assets_note_strong') }}</strong>
              {{ t('employees_delete_assets_note_b') }}
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
            class="h-8 rounded-[6px] border border-[#E5EAEF] px-3.5 text-[12px] font-medium text-[#66728d] hover:bg-gray-50 transition-all cursor-pointer"
          >
            {{ t('cancel') }}
          </button>
          <button
            type="button"
            @click="deleteEmployee"
            :disabled="isSubmitting || !canWriteKaryawan"
            class="h-8 rounded-[6px] bg-rose-600 px-3.5 text-[12px] font-medium text-white shadow-md hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-60"
          >
            {{ isSubmitting ? (currentLang === 'en' ? 'Deleting...' : 'Menghapus...') : (currentLang === 'en' ? 'Yes, Delete Employee' : 'Ya, Hapus Karyawan') }}
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
/* Ukuran kontrol toolbar diasumsikan dari token global (--control-height-*)
   dan kelas template; aturan lama 36px dihapus (dead code). */
@media (width < 48rem) {
  .employee-stats :deep(.truncate),
  .employee-filters :deep(.truncate) {
    white-space: normal;
    overflow-wrap: anywhere;
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
<style scoped src="../assets/ws-table.css"></style>

<style scoped>
/* Header tidak sticky di modul Master Data - scroll bersama konten.
   HARUS setelah import ws-table.css agar menang. */
.ws-toolbar-sticky {
  position: static;
  z-index: auto;
  top: auto;
}
</style>

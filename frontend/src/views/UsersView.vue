<script setup>
// ============================================================
// UsersView.vue — Manajemen Pengguna Sistem, bergaya Fynix
// Fitur: tampil, tambah, edit, hapus user dari tabel users
// ============================================================
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import { useAuth } from '../composables/useAuth.js'
import { animateStagger } from '../composables/useGsap.js'
import { isSuperAdminRole as isRoleSuperAdmin } from '../utils/permissionAccess.js'
import AppModal from '../components/ui/AppModal.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import AppRowActions from '../components/ui/AppRowActions.vue'
import AppPagination from '../components/ui/AppPagination.vue'
import SearchableSelect from '../components/ui/SearchableSelect.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import FilterModal from '../components/ui/FilterModal.vue'
import SkeletonTable from '../components/ui/skeleton/SkeletonTable.vue'

const route = useRoute()
const { get, getAllPages, post, put, del } = useApi()
const { isSuperAdmin, hasWritePermission } = useAuth()
const { user: currentUser } = useAuth()
const canWriteUsers = computed(() => hasWritePermission('users'))

// ── State Utama ──────────────────────────────────────────────
const users = ref([])
const queues = ref([]) // Master ticket queues (HR, IT, GA, OPS)
const employees = ref([]) // Master data karyawan
const selectedEmployeeId = ref('')
const isLoading = ref(true)
const pageError = ref('')
const modalError = ref('')
const isQueuesLoading = ref(false)
const isEmployeesLoading = ref(false)
const notification = ref(null)

const currentPage = ref(1)
const itemsPerPage = ref(10)

// ── Filter & Search ──────────────────────────────────────────
const searchQuery = ref('')
const filterRole = ref('')
const showFilterModal = ref(false)

// ── Modal State ──────────────────────────────────────────────
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const modalMode = ref('add') // 'add' | 'edit'
const isSubmitting = ref(false)
const selectedUser = ref(null)

const OPERATIONAL_FEATURES = [
  {
    key: 'dashboard',
    label: 'Dashboard Overview',
    icon: 'space_dashboard',
    desc: 'Ringkasan sistem & statistik',
  },
  {
    key: 'assets',
    label: 'Manajemen Aset IT',
    icon: 'devices',
    desc: 'Inventaris & pengolahan data aset',
  },
  {
    key: 'my_assets',
    label: 'Aset Saya / Karyawan',
    icon: 'badge',
    desc: 'Daftar aset per karyawan',
  },
  {
    key: 'tickets',
    label: 'Tiket Kendala',
    icon: 'confirmation_number',
    desc: 'Pengajuan & riwayat tiket kendala',
  },
  {
    key: 'submissions',
    label: 'Pengajuan Form',
    icon: 'assignment',
    desc: 'Formulir serah terima & layanan',
  },
  {
    key: 'shipments',
    label: 'Pengiriman',
    icon: 'local_shipping',
    desc: 'Tracker pengiriman barang & aset',
  },
]

const ADMINISTRATIVE_FEATURES = [
  {
    key: 'knowledge_base',
    label: 'Knowledge Base & CMS',
    icon: 'menu_book',
    desc: 'Pengaturan artikel, FAQ & kategori KB',
  },
  {
    key: 'users',
    label: 'Manajemen Pengguna',
    icon: 'manage_accounts',
    desc: 'Pengaturan akun & hak akses RBAC',
  },
  {
    key: 'logs',
    label: 'Audit Log & History',
    icon: 'receipt_long',
    desc: 'Riwayat audit login & aset',
  },
  {
    key: 'karyawan',
    label: 'Master Data Karyawan',
    icon: 'badge',
    desc: 'Integrasi data karyawan',
  },
]

const ALL_FEATURES = [...OPERATIONAL_FEATURES, ...ADMINISTRATIVE_FEATURES]

const selectedEmployee = computed(() => {
  if (!selectedEmployeeId.value) return null
  return employees.value.find((e) => Number(e.id_karyawan) === Number(selectedEmployeeId.value))
})

function clearSelectedEmployee() {
  selectedEmployeeId.value = ''
}

function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const defaultPermissions = () => ({
  dashboard: 'none',
  assets: 'none',
  my_assets: 'read_only',
  tickets: 'read_only',
  submissions: 'none',
  shipments: 'none',
  users: 'none',
  logs: 'none',
  karyawan: 'none',
  knowledge_base: 'none',
})

const superadminPermissions = () => ({
  dashboard: 'full',
  assets: 'full',
  my_assets: 'full',
  tickets: 'full',
  submissions: 'full',
  shipments: 'full',
  users: 'full',
  logs: 'full',
  karyawan: 'full',
  knowledge_base: 'full',
})

// ── Form Data ────────────────────────────────────────────────
const emptyForm = () => ({
  nama: '',
  email: '',
  password: 'Essensians@2026',
  role: 'user',
  permissions: defaultPermissions(),
  queue_ids: [],
  is_active: true,
})
const form = ref(emptyForm())

const availableRoleOptions = computed(() => {
  if (isSuperAdmin.value) return ['user', 'admin', 'superadmin']
  return ['user']
})

const formattedRoleOptions = computed(() =>
  availableRoleOptions.value.map((r) => ({
    value: r,
    label: r.toUpperCase(),
    dot: r === 'superadmin' ? 'bg-purple-500' : r === 'admin' ? 'bg-blue-500' : 'bg-slate-400',
  })),
)

function canManageUser(target) {
  if (!canWriteUsers.value || !target) return false
  if (isSuperAdmin.value) return true
  return target.role === 'user' && target.id !== currentUser.value?.id
}

function setPermissionLevel(featureKey, level) {
  if (!isSuperAdmin.value && featureKey === 'users') {
    form.value.permissions.users = 'none'
    return
  }
  form.value.permissions[featureKey] = level
}

function selectAllPermissions(val) {
  ALL_FEATURES.forEach((f) => {
    setPermissionLevel(f.key, val)
  })
}

function handleRoleChange() {
  const isSuper = isRoleSuperAdmin(form.value.role)
  if (isSuper) {
    form.value.permissions = superadminPermissions()
  } else {
    form.value.permissions = defaultPermissions()
  }
  if (!isSuperAdmin.value) form.value.permissions.users = 'none'
}

function getPermissionBadge(u) {
  const isSuper = isRoleSuperAdmin(u.role)
  if (isSuper) {
    return { text: `${ALL_FEATURES.length}/${ALL_FEATURES.length} Akses Penuh`, type: 'primary' }
  }
  const perms = u.permissions || {}
  const fullCount = Object.values(perms).filter((v) => v === 'full').length
  const readCount = Object.values(perms).filter((v) => v === 'read_only').length
  const totalGranted = fullCount + readCount
  if (totalGranted === 0) return { text: 'Tidak Ada Akses', type: 'default' }
  const parts = []
  if (fullCount > 0) parts.push(`${fullCount} Full`)
  if (readCount > 0) parts.push(`${readCount} Read`)
  return {
    text: parts.join(', '),
    type: fullCount > 0 ? 'success' : 'info',
  }
}

// ── Filter Logic ─────────────────────────────────────────────
const filteredUsers = computed(() => {
  return users.value.filter((u) => {
    const q = searchQuery.value.trim().toLowerCase()
    const matchSearch =
      !q || (u.nama || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
    const matchRole =
      !filterRole.value || (u.role || '').toLowerCase() === filterRole.value.toLowerCase()
    return matchSearch && matchRole
  })
})

watch([searchQuery, filterRole], () => {
  currentPage.value = 1
})

watch(
  () => route.query.q,
  (newQ) => {
    if (typeof newQ === 'string') {
      searchQuery.value = newQ
    }
  },
  { immediate: true },
)

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredUsers.value.slice(start, start + itemsPerPage.value)
})

// ── CRUD Functions ───────────────────────────────────────────
async function fetchQueues() {
  isQueuesLoading.value = true
  try {
    const data = await get('/api/ticket-queues')
    if (Array.isArray(data)) queues.value = data
  } catch (err) {
    toast('Gagal memuat data antrean unit: ' + (err.message || 'Kesalahan jaringan'), 'error')
  } finally {
    isQueuesLoading.value = false
  }
}

const unitOptions = computed(() => {
  const itQueues = queues.value.filter(
    (q) =>
      (q.kode || '').toUpperCase().includes('IT') || (q.nama || '').toUpperCase().includes('IT'),
  )
  const hrQueues = queues.value.filter(
    (q) =>
      (q.kode || '').toUpperCase().includes('HR') ||
      (q.nama || '').toUpperCase().includes('HR') ||
      (q.nama || '').toUpperCase().includes('HUMAN'),
  )
  const gaQueues = queues.value.filter(
    (q) =>
      (q.kode || '').toUpperCase().includes('GA') ||
      (q.nama || '').toUpperCase().includes('GA') ||
      (q.nama || '').toUpperCase().includes('GENERAL'),
  )
  const otherQueues = queues.value.filter(
    (q) => !itQueues.includes(q) && !hrQueues.includes(q) && !gaQueues.includes(q),
  )

  const items = [
    {
      key: 'IT',
      kode: 'IT Support',
      nama: 'Perangkat, Network & Software',
      icon: 'computer',
      queueIds: itQueues.map((q) => Number(q.id)),
    },
    {
      key: 'HR',
      kode: 'HR Support',
      nama: 'Kepegawaian, Dokumen & QNA',
      icon: 'badge',
      queueIds: hrQueues.map((q) => Number(q.id)),
    },
    {
      key: 'GA',
      kode: 'GA Support',
      nama: 'Fasilitas, Gedung & Logistik',
      icon: 'corporate_fare',
      queueIds: gaQueues.map((q) => Number(q.id)),
    },
  ]

  otherQueues.forEach((q) => {
    items.push({
      key: `OTHER_${q.id}`,
      kode: q.kode,
      nama: q.nama,
      icon: 'confirmation_number',
      queueIds: [Number(q.id)],
    })
  })

  return items
})

function isUnitSelected(unit) {
  if (!unit.queueIds || unit.queueIds.length === 0) return false
  return unit.queueIds.some((id) => form.value.queue_ids.includes(id))
}

function toggleUnit(unit) {
  const selected = isUnitSelected(unit)
  if (selected) {
    form.value.queue_ids = form.value.queue_ids.filter((id) => !unit.queueIds.includes(id))
  } else {
    const toAdd = unit.queueIds.filter((id) => !form.value.queue_ids.includes(id))
    form.value.queue_ids = [...form.value.queue_ids, ...toAdd]
  }
}

async function fetchUsers() {
  isLoading.value = true
  pageError.value = ''
  try {
    const data = await getAllPages('/api/users')
    if (!Array.isArray(data)) throw new Error('Format data pengguna dari server tidak valid.')
    users.value = data
  } catch (e) {
    pageError.value = e.message || 'Gagal memuat daftar pengguna.'
    console.error(e)
  } finally {
    isLoading.value = false
    await nextTick()
    animateStagger('tbody tr')
  }
}

async function fetchEmployees() {
  isEmployeesLoading.value = true
  try {
    const data = await get('/api/karyawan?all=true')
    if (Array.isArray(data)) employees.value = data
  } catch (err) {
    toast('Gagal memuat data karyawan: ' + (err.message || 'Kesalahan jaringan'), 'error')
  } finally {
    isEmployeesLoading.value = false
  }
}

const employeeOptions = computed(() => {
  return employees.value.map((emp) => ({
    id_karyawan: emp.id_karyawan,
    nama_karyawan: emp.nama_karyawan,
    detail: `${emp.nik ? 'NIK: ' + emp.nik : ''}${emp.jabatan ? ' — ' + emp.jabatan : ''}${emp.departemen ? ' (' + emp.departemen + ')' : ''}`,
    email_kantor: emp.email_kantor,
    nik: emp.nik,
    jabatan: emp.jabatan,
    departemen: emp.departemen,
  }))
})

function handleEmployeeSelect(val) {
  const empId = val || selectedEmployeeId.value
  if (empId) {
    selectedEmployeeId.value = empId
    const emp = employees.value.find((e) => Number(e.id_karyawan) === Number(empId))
    if (emp) {
      form.value.nama = emp.nama_karyawan || ''
      form.value.email = emp.email_kantor || `${(emp.nik || '').toLowerCase()}@esb.co.id`
    }
  } else {
    selectedEmployeeId.value = ''
  }
}

function openAdd() {
  if (!canWriteUsers.value) return
  modalMode.value = 'add'
  form.value = emptyForm()
  selectedEmployeeId.value = ''
  modalError.value = ''
  showFormModal.value = true
}

function openEdit(u) {
  if (!canWriteUsers.value) return
  if (!canManageUser(u)) return
  modalMode.value = 'edit'
  selectedUser.value = u
  const isSuper = isRoleSuperAdmin(u.role)
  const initialPerms = isSuper
    ? superadminPermissions()
    : (() => {
        const base = defaultPermissions()
        const saved = u.permissions || {}
        // Normalise legacy boolean values
        for (const k of Object.keys(base)) {
          const v = saved[k]
          if (v === 'none' || v === 'read_only' || v === 'full') {
            base[k] = v
          } else if (v === true) {
            base[k] = 'read_only'
          } else if (v === false) {
            base[k] = 'none'
          }
        }
        if (!isSuperAdmin.value) base.users = 'none'
        return base
      })()

  form.value = {
    nama: u.nama || '',
    email: u.email || '',
    password: '',
    role: u.role || 'user',
    permissions: initialPerms,
    queue_ids: Array.isArray(u.queue_ids)
      ? u.queue_ids.map((id) => Number(id)).filter(Number.isSafeInteger)
      : [],
    is_active: u.is_active !== false,
  }
  modalError.value = ''
  showFormModal.value = true
}

function openDelete(user) {
  if (!isSuperAdmin.value || isRoleSuperAdmin(user?.role)) return
  selectedUser.value = user
  modalError.value = ''
  showDeleteModal.value = true
}

function closeModal() {
  showFormModal.value = false
  showDeleteModal.value = false
  selectedUser.value = null
  isSubmitting.value = false
  modalError.value = ''
}

function requestCloseModal() {
  if (!isSubmitting.value) closeModal()
}

async function saveUser() {
  if (!canWriteUsers.value) {
    modalError.value = 'Anda hanya memiliki akses baca untuk pengguna.'
    return
  }
  if (modalMode.value === 'edit' && !canManageUser(selectedUser.value)) {
    modalError.value = 'Anda tidak dapat mengubah pengguna ini.'
    return
  }
  isSubmitting.value = true
  modalError.value = ''

  const nama = form.value.nama.trim()
  const email = form.value.email.trim()
  const role = isSuperAdmin.value ? form.value.role.trim() : 'user'

  if (!nama || !email || !role) {
    modalError.value = 'Nama, email, dan role wajib diisi.'
    isSubmitting.value = false
    return
  }
  if (modalMode.value === 'add' && !form.value.password) {
    form.value.password = 'Essensians@2026'
  }
  const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W_]).{8,}$/
  if (form.value.password && !PASSWORD_COMPLEXITY_REGEX.test(form.value.password)) {
    modalError.value =
      'Password minimal 8 karakter dan harus mengandung kombinasi huruf besar, huruf kecil, serta angka atau simbol.'
    isSubmitting.value = false
    return
  }

  try {
    const permissions = { ...form.value.permissions }
    if (!isSuperAdmin.value) permissions.users = 'none'

    const payload = {
      nama,
      email,
      role,
      permissions,
      is_active: form.value.is_active,
    }
    if (isSuperAdmin.value) {
      payload.queue_ids = (form.value.queue_ids || [])
        .map((id) => Number(id))
        .filter(Number.isSafeInteger)
    }
    if (form.value.password) payload.password = form.value.password

    if (modalMode.value === 'add') {
      await post('/api/users', payload)
      toast('Pengguna baru berhasil ditambahkan.')
    } else {
      await put(`/api/users/${selectedUser.value.id}`, payload)
      toast('Data pengguna & hak akses berhasil diperbarui.')
    }
    closeModal()
    await fetchUsers()
  } catch (e) {
    modalError.value = e.message || 'Gagal menyimpan data pengguna.'
    console.error(e)
  } finally {
    isSubmitting.value = false
  }
}

async function deleteUser() {
  if (!isSuperAdmin.value || !selectedUser.value || isRoleSuperAdmin(selectedUser.value.role))
    return
  isSubmitting.value = true
  modalError.value = ''
  try {
    await del(`/api/users/${selectedUser.value.id}`)
    toast('Pengguna berhasil dihapus!')
    closeModal()
    await fetchUsers()
  } catch (e) {
    modalError.value = e.message || 'Gagal menghapus pengguna.'
  } finally {
    isSubmitting.value = false
  }
}

// ── Toast ────────────────────────────────────────────────────
let toastTimer

function toast(message, type = 'success') {
  window.clearTimeout(toastTimer)
  notification.value = { message, type }
  toastTimer = window.setTimeout(() => {
    notification.value = null
  }, 3500)
}

// ── Helpers ──────────────────────────────────────────────────
function getRoleBadgeType(role) {
  const r = (role || '').toLowerCase()
  if (r === 'superadmin') return 'purple'
  if (r === 'admin') return 'primary'
  if (r === 'user') return 'info'
  return 'default'
}

function getUserActions(u) {
  const actions = []
  if (canWriteUsers.value && (isSuperAdmin.value || !isRoleSuperAdmin(u.role))) {
    actions.push({
      label: 'Edit Hak Akses',
      icon: 'edit',
      onClick: () => openEdit(u),
    })
  }
  if (isSuperAdmin.value && !isRoleSuperAdmin(u.role)) {
    actions.push({
      label: 'Hapus Pengguna',
      icon: 'delete',
      danger: true,
      onClick: () => openDelete(u),
    })
  }
  return actions
}

function resetFilters() {
  searchQuery.value = ''
  filterRole.value = ''
}

onMounted(async () => {
  await fetchQueues()
  await fetchUsers()
  await fetchEmployees()
})
onBeforeUnmount(() => window.clearTimeout(toastTimer))
</script>

<template>
  <div
    class="admin-workspace flex min-w-0 flex-col gap-5"
    :data-testid="!isLoading ? 'page-ready' : undefined"
  >
    <!-- ── Toast Notifikasi ──────────────────────────────── -->
    <Transition name="slide-right">
      <div
        v-if="notification"
        role="status"
        aria-live="polite"
        class="fixed left-4 right-4 top-4 z-[60] flex items-center gap-3 rounded-xl bg-[#111827] px-4 py-3 text-white shadow-2xl toast-anim sm:left-auto sm:right-5 sm:max-w-md"
      >
        <div class="w-6 h-6 rounded-full bg-brand flex items-center justify-center">
          <span aria-hidden="true" class="material-symbols-outlined text-[14px]">check</span>
        </div>
        <span class="text-[13px] font-semibold">{{ notification.message }}</span>
      </div>
    </Transition>

    <!-- Simplified SaaS Header & Toolbar Container -->
    <div
      class="admin-page-header flex flex-col gap-3.5 bg-white p-3.5 sm:p-4.5 rounded-2xl border border-[#E2E8F0]/80 shadow-2xs"
    >
      <!-- Row 1: Page Title & Primary CTA -->
      <div class="flex items-center justify-between gap-2 sm:gap-3">
        <div class="min-w-0">
          <h2 class="text-base sm:text-lg font-bold text-[#333333] tracking-tight">
            Data Pengguna
          </h2>
          <p class="text-[11px] sm:text-xs text-[#5F7089] mt-0.5 leading-normal">
            Pengelolaan akun, role, dan hak akses pengguna sistem
          </p>
        </div>

        <button
          v-if="canWriteUsers"
          type="button"
          @click="openAdd"
          class="toolbar-primary-button h-9 shrink-0 rounded-lg bg-[#0A51B0] px-2.5 sm:px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#0A4391] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          title="Tambah admin baru atau promosikan akses"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[16px]">person_add</span>
          <span class="hidden sm:inline whitespace-nowrap">Tambah Admin / Akses</span>
        </button>
      </div>

      <!-- Row 2: Search & Filters -->
      <div
        class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 w-full min-w-0 pt-2 border-t border-[#F1F5F9]"
      >
        <div class="relative h-9 min-w-0">
          <span
            aria-hidden="true"
            class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[17px] text-[#687281] pointer-events-none"
            >search</span
          >
          <input
            id="user-search"
            v-model="searchQuery"
            type="search"
            autocomplete="off"
            aria-label="Cari pengguna"
            placeholder="Cari nama atau email pengguna..."
            class="toolbar-search-input h-full min-h-0 w-full rounded-lg border border-[#E2E8F0] bg-white pl-8 text-xs text-[#333333] placeholder-[#687281] focus:border-[#0A51B0] focus:outline-none transition-all shadow-2xs"
            :class="searchQuery ? 'pr-8' : 'pr-2.5'"
          />
          <button
            v-if="searchQuery"
            type="button"
            @click="searchQuery = ''"
            class="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-[#E2E8F0] text-[#5F7089] hover:bg-[#CBD5E1] hover:text-[#333333] transition-colors cursor-pointer"
            title="Hapus pencarian"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[13px]">close</span>
          </button>
        </div>

        <button
          type="button"
          @click="showFilterModal = true"
          class="toolbar-filter-button h-9 shrink-0 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-semibold text-[#5F7089] hover:bg-white"
        >
          <span aria-hidden="true" class="material-symbols-outlined mr-1 align-middle text-[16px]"
            >filter_alt</span
          >Filter
        </button>
      </div>
    </div>

    <FilterModal
      :is-open="showFilterModal"
      title="Filter Pengguna"
      @close="showFilterModal = false"
      @apply="showFilterModal = false"
      @reset="resetFilters"
    >
      <CustomSelect
        v-model="filterRole"
        :options="[
          { value: '', label: 'Semua Role' },
          { value: 'admin', label: 'ADMIN' },
          { value: 'superadmin', label: 'SUPERADMIN' },
          { value: 'user', label: 'USER' },
        ]"
        aria-label="Filter role"
        :block="true"
      />
    </FilterModal>

    <!-- ── Tabel Pengguna ─────────────────────────────────── -->
    <div class="rounded-2xl border border-[#E2E8F0]/80 bg-white shadow-2xs overflow-hidden">
      <!-- Loading -->
      <div v-if="isLoading" role="status" aria-busy="true">
        <!-- Desktop Skeleton -->
        <div class="hidden xl:block">
          <SkeletonTable preset="users" :rows="5" />
        </div>
        <!-- Mobile Skeleton -->
        <div class="xl:hidden flex flex-col gap-3 p-3.5">
          <div
            v-for="i in 4"
            :key="'skel-user-' + i"
            class="rounded-xl border border-[#F1F5F9] bg-[#FAFCFF] p-3.5 flex flex-col gap-3 animate-pulse"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="h-9 w-9 rounded-lg bg-[#E2E8F0]"></div>
                <div class="flex flex-col gap-1.5">
                  <div class="h-3.5 w-28 rounded bg-[#E2E8F0]"></div>
                  <div class="h-3 w-36 rounded bg-[#F1F5F9]"></div>
                </div>
              </div>
              <div class="h-5 w-5 rounded bg-[#F1F5F9]"></div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="h-8 rounded-lg bg-[#F1F5F9]"></div>
              <div class="h-8 rounded-lg bg-[#F1F5F9]"></div>
              <div class="h-8 rounded-lg bg-[#F1F5F9]"></div>
              <div class="h-8 rounded-lg bg-[#F1F5F9]"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error -->
      <div
        v-else-if="pageError"
        role="alert"
        class="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-4 text-[13px] text-rose-600 bg-rose-50"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[18px] shrink-0">error</span>
        <span class="flex-1 font-semibold">{{ pageError }}</span>
        <button type="button" class="font-bold underline cursor-pointer" @click="fetchUsers">
          Coba lagi
        </button>
      </div>

      <template v-else>
        <!-- ═══ Desktop Table (>= md / 768px) ═══ -->
        <div
          class="hidden xl:block w-full max-w-full overflow-hidden"
          tabindex="0"
          aria-label="Tabel pengguna"
        >
          <table class="w-full max-w-full text-left border-collapse table-fixed">
            <caption class="sr-only">
              Daftar pengguna sistem
            </caption>
            <colgroup>
              <col class="w-[31%]" />
              <col class="w-[12%]" />
              <col class="w-[22%]" />
              <col class="w-[15%]" />
              <col class="w-[12%]" />
              <col class="w-[8%]" />
            </colgroup>
            <thead
              class="sticky top-0 z-10 border-b border-[#E2E8F0]/80 bg-[#F8FAFC]/80 backdrop-blur-xs select-none whitespace-nowrap"
            >
              <tr>
                <th
                  class="py-3 pl-5 pr-4 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
                >
                  Pengguna
                </th>
                <th
                  class="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
                >
                  Role Akses
                </th>
                <th
                  class="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
                >
                  Sub Role / Unit Ditangani
                </th>
                <th
                  class="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
                >
                  Hak Akses Fitur
                </th>
                <th
                  class="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] text-left whitespace-nowrap"
                >
                  Status
                </th>
                <th
                  class="py-3 pr-5 pl-4 text-right text-[11px] font-semibold uppercase tracking-wider text-[#5F7089] whitespace-nowrap"
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#F1F5F9]">
              <tr
                v-for="user in paginatedUsers"
                :key="user.id"
                class="group hover:bg-[#F8FAFC] transition-colors duration-150"
              >
                <!-- Kolom Pengguna (nama + email) -->
                <td class="py-4 pl-5 pr-4 overflow-hidden">
                  <div class="flex flex-col min-w-0">
                    <span
                      class="text-[13.5px] font-bold text-[#333333] leading-snug truncate group-hover:text-[#333333] transition-colors block"
                      :title="user.nama"
                    >
                      {{ user.nama }}
                    </span>
                    <span
                      class="text-[12px] font-normal text-[#5F7089] mt-0.5 truncate block"
                      :title="user.email"
                    >
                      {{ user.email }}
                    </span>
                  </div>
                </td>

                <!-- Role Badge -->
                <td class="py-4 px-4 overflow-hidden">
                  <AppBadge
                    :type="getRoleBadgeType(user.role)"
                    :text="(user.role || 'user').toUpperCase()"
                  />
                </td>

                <!-- Unit Tiket (Queue) Badge -->
                <td class="py-4 px-4 overflow-hidden">
                  <div
                    v-if="isRoleSuperAdmin(user.role)"
                    class="text-[12px] font-semibold text-[#333333] truncate block"
                  >
                    Semua Unit (Superadmin)
                  </div>
                  <div
                    v-else-if="user.queues && user.queues.length > 0"
                    class="flex flex-wrap gap-1 min-w-0"
                  >
                    <span
                      v-for="q in user.queues"
                      :key="q.id"
                      class="inline-flex items-center rounded-md bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#333333] shrink-0"
                      >{{ q.kode }}</span
                    >
                  </div>
                  <span v-else class="text-[12px] text-[#687281] italic truncate block"
                    >Tidak ada unit</span
                  >
                </td>

                <!-- Hak Akses Fitur Count Badge -->
                <td class="py-4 px-4 overflow-hidden">
                  <AppBadge
                    :type="getPermissionBadge(user).type"
                    :text="getPermissionBadge(user).text"
                  />
                </td>

                <!-- Status Akun -->
                <td class="py-4 px-4 overflow-hidden">
                  <AppBadge
                    :type="user.is_active === false ? 'danger' : 'success'"
                    :text="user.is_active === false ? 'NONAKTIF' : 'AKTIF'"
                  />
                </td>

                <!-- Aksi -->
                <td class="py-4 pr-5 pl-4 text-right overflow-hidden" @click.stop>
                  <AppRowActions :actions="getUserActions(user)" />
                </td>
              </tr>

              <!-- Empty state -->
              <tr v-if="filteredUsers.length === 0">
                <td colspan="7" class="px-5 py-12 text-center">
                  <div class="flex flex-col items-center gap-2">
                    <span
                      aria-hidden="true"
                      class="material-symbols-outlined text-[40px] text-[#D1D5DB]"
                      >group</span
                    >
                    <p class="text-[13px] text-[#9CA3AF]">
                      Tidak ada pengguna yang sesuai pencarian.
                    </p>
                    <button
                      v-if="searchQuery || filterRole"
                      @click="resetFilters"
                      class="text-[12px] text-brand font-bold hover:text-brand-dark cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ═══ Mobile Card List (< md / < 768px) ═══ -->
        <div class="xl:hidden">
          <!-- Empty State -->
          <div v-if="filteredUsers.length === 0" class="px-4 py-10 text-center">
            <div class="flex flex-col items-center gap-2">
              <span aria-hidden="true" class="material-symbols-outlined text-[36px] text-[#D1D5DB]"
                >group</span
              >
              <p class="text-[13px] text-[#9CA3AF]">Tidak ada pengguna yang sesuai pencarian.</p>
              <button
                v-if="searchQuery || filterRole"
                @click="resetFilters"
                class="text-[12px] text-brand font-bold hover:text-brand-dark cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          </div>

          <!-- User Cards -->
          <div v-else class="admin-person-cards flex flex-col gap-3 p-3.5">
            <div
              v-for="user in paginatedUsers"
              :key="'m-' + user.id"
              class="rounded-xl border border-[#E2E8F0] bg-white p-3.5 flex flex-col gap-2.5 shadow-2xs active:bg-[#F8FAFC] transition-colors"
            >
              <!-- Card Header: Avatar + Name + Email + Actions -->
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white select-none"
                    :class="{
                      'bg-purple-600': isRoleSuperAdmin(user.role),
                      'bg-[#0A51B0]': user.role === 'admin' && !isRoleSuperAdmin(user.role),
                      'bg-[#5F7089]': user.role === 'user' || !user.role,
                    }"
                  >
                    {{ getInitials(user.nama) }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p
                      class="text-[13px] font-bold text-[#333333] leading-snug truncate"
                      :title="user.nama"
                    >
                      {{ user.nama }}
                    </p>
                    <p class="text-[11px] text-[#5F7089] truncate" :title="user.email">
                      {{ user.email }}
                    </p>
                  </div>
                </div>
                <div @click.stop>
                  <AppRowActions :actions="getUserActions(user)" />
                </div>
              </div>

              <!-- Card Body: 2x2 Metadata Grid -->
              <div class="grid grid-cols-2 gap-2">
                <!-- Role -->
                <div class="flex flex-col gap-0.5 rounded-lg bg-[#F8FAFC] px-2.5 py-2">
                  <span class="text-[10px] font-semibold uppercase tracking-wider text-[#687281]"
                    >Role</span
                  >
                  <AppBadge
                    :type="getRoleBadgeType(user.role)"
                    :text="(user.role || 'user').toUpperCase()"
                  />
                </div>

                <!-- Status -->
                <div class="flex flex-col gap-0.5 rounded-lg bg-[#F8FAFC] px-2.5 py-2">
                  <span class="text-[10px] font-semibold uppercase tracking-wider text-[#687281]"
                    >Status</span
                  >
                  <AppBadge
                    :type="user.is_active === false ? 'danger' : 'success'"
                    :text="user.is_active === false ? 'NONAKTIF' : 'AKTIF'"
                  />
                </div>

                <!-- Unit Ditangani -->
                <div class="flex flex-col gap-1 rounded-lg bg-[#F8FAFC] px-2.5 py-2">
                  <span class="text-[10px] font-semibold uppercase tracking-wider text-[#687281]"
                    >Unit</span
                  >
                  <div
                    v-if="isRoleSuperAdmin(user.role)"
                    class="text-[11px] font-semibold text-[#333333] leading-tight"
                  >
                    Semua Unit
                  </div>
                  <div
                    v-else-if="user.queues && user.queues.length > 0"
                    class="flex flex-wrap gap-1"
                  >
                    <span
                      v-for="q in user.queues"
                      :key="'mq-' + q.id"
                      class="inline-flex items-center rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[9.5px] font-semibold text-[#333333]"
                      >{{ q.kode }}</span
                    >
                  </div>
                  <span v-else class="text-[11px] text-[#687281] italic leading-tight">—</span>
                </div>

                <!-- Hak Akses -->
                <div class="flex flex-col gap-0.5 rounded-lg bg-[#F8FAFC] px-2.5 py-2">
                  <span class="text-[10px] font-semibold uppercase tracking-wider text-[#687281]"
                    >Hak Akses</span
                  >
                  <AppBadge
                    :type="getPermissionBadge(user).type"
                    :text="getPermissionBadge(user).text"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Footer Pagination -->
      <AppPagination
        asset-style
        mobile-compact
        v-if="!isLoading && !pageError"
        v-model:currentPage="currentPage"
        :total-items="filteredUsers.length"
        :items-per-page="itemsPerPage"
      />
    </div>

    <!-- ═══════════════════════════════════════════════════════
         MODAL FORM — TAMBAH / EDIT USER & RBAC PERMISSIONS
         ═══════════════════════════════════════════════════════ -->
    <AppModal
      :is-open="showFormModal"
      :title="modalMode === 'add' ? 'Tambah Pengguna' : 'Edit Pengguna & Hak Akses'"
      :subtitle="
        modalMode === 'add'
          ? 'Buat akun dan atur hak akses pengguna'
          : 'Perbarui informasi dan hak akses pengguna'
      "
      size="xl"
      @close="requestCloseModal"
    >
      <form
        id="admin-user-form"
        @submit.prevent="saveUser"
        class="admin-entry-form user-entry-form flex flex-col gap-4"
      >
        <section class="user-entry-section">
          <h3 class="user-entry-title">Identitas & akun</h3>
          <p class="user-entry-hint">
            Lengkapi profil pengguna dan informasi untuk masuk ke aplikasi.
          </p>
          <!-- 1. Employee Selection (Searchable Combobox) -->
          <div v-if="modalMode === 'add' && employees.length > 0" class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-[#333333]">Karyawan</label>
            <SearchableSelect
              v-model="selectedEmployeeId"
              :options="employeeOptions"
              value-key="id_karyawan"
              label-key="nama_karyawan"
              secondary-label-key="detail"
              placeholder="Pilih karyawan yang akan diberikan akses..."
              search-placeholder="Cari nama, NIK, jabatan, atau departemen..."
              aria-label="Pilih karyawan"
              clearable
              @update:modelValue="handleEmployeeSelect"
            />

            <!-- Compact Selected Employee Summary Card -->
            <div
              v-if="selectedEmployee"
              class="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] mt-0.5"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#333333] font-bold text-xs select-none"
                >
                  {{ getInitials(selectedEmployee.nama_karyawan) }}
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-[#333333] leading-snug truncate">
                    {{ selectedEmployee.nama_karyawan }}
                  </p>
                  <p class="text-[11px] text-[#5F7089] truncate">
                    {{ selectedEmployee.email_kantor || 'Tanpa Email' }} • NIK:
                    {{ selectedEmployee.nik }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                @click="clearSelectedEmployee"
                class="text-xs text-[#687281] hover:text-[#E11D48] font-medium cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>

          <!-- 2. Form Fields (2-Column Grid on Desktop) -->
          <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <!-- Nama Lengkap -->
            <div class="flex flex-col gap-1">
              <label for="user-name" class="text-xs font-semibold text-[#333333]"
                >Nama Lengkap *</label
              >
              <input
                id="user-name"
                v-model="form.nama"
                required
                autofocus
                type="text"
                autocomplete="name"
                :disabled="modalMode === 'edit' && !isSuperAdmin"
                placeholder="Nama lengkap pengguna"
                class="h-9 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#333333] placeholder-[#687281] focus:border-[#0A51B0] focus:outline-none transition-all shadow-2xs disabled:bg-[#F8FAFC] disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <!-- Email -->
            <div class="flex flex-col gap-1">
              <label for="user-email" class="text-xs font-semibold text-[#333333]">Email *</label>
              <input
                id="user-email"
                v-model="form.email"
                required
                type="email"
                autocomplete="email"
                :disabled="modalMode === 'edit' && !isSuperAdmin"
                placeholder="email@perusahaan.com"
                class="h-9 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#333333] placeholder-[#687281] focus:border-[#0A51B0] focus:outline-none transition-all shadow-2xs disabled:bg-[#F8FAFC] disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <!-- Password -->
            <div class="flex flex-col gap-1">
              <label for="user-password" class="text-xs font-semibold text-[#333333]">
                {{ modalMode === 'add' ? 'Password (Default: Essensians@2026)' : 'Password Baru' }}
              </label>
              <input
                id="user-password"
                v-model="form.password"
                minlength="8"
                type="password"
                autocomplete="new-password"
                :placeholder="
                  modalMode === 'add' ? 'Default: Essensians@2026' : 'Kosongkan jika tidak diubah'
                "
                class="h-9 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs text-[#333333] placeholder-[#687281] focus:border-[#0A51B0] focus:outline-none transition-all shadow-2xs"
              />
            </div>

            <!-- Role -->
            <div class="flex flex-col gap-1">
              <label class="text-xs font-semibold text-[#333333]">Role Akses *</label>
              <CustomSelect
                v-model="form.role"
                :options="formattedRoleOptions"
                aria-label="Role Akses"
                placeholder="Pilih role"
                :block="true"
                height-class="h-9"
                :disabled="
                  modalMode === 'edit' &&
                  (!isSuperAdmin || Number(selectedUser?.id) === Number(currentUser?.id))
                "
                @change="handleRoleChange"
              />
              <p
                v-if="modalMode === 'edit' && Number(selectedUser?.id) === Number(currentUser?.id)"
                class="text-[11px] font-normal text-amber-600"
              >
                Role tidak dapat diubah untuk akun milik sendiri.
              </p>
            </div>
          </div>
        </section>
        <!-- 3. Unit Tiket yang Ditangani (Queue Selection - Hanya untuk Admin/Teknisi) -->
        <div v-if="form.role !== 'user'" class="flex flex-col gap-2 pt-2 border-t border-[#F1F5F9]">
          <div>
            <span class="block text-xs font-semibold text-[#333333]"
              >Unit Tiket yang Ditangani</span
            >
            <span class="block text-[11px] text-[#5F7089]"
              >Pilih unit tiket yang dapat diakses &amp; ditangani pengguna ini:</span
            >
          </div>

          <div
            v-if="form.role === 'superadmin'"
            class="text-xs font-semibold text-[#333333] bg-[#EFF6FF] p-2.5 rounded-xl border border-[#BFDBFE]"
          >
            ⚡ Superadmin memiliki akses otomatis ke seluruh unit (IT, HR, GA).
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div
              v-for="unit in unitOptions"
              :key="unit.key"
              @click="toggleUnit(unit)"
              class="flex items-center gap-3 p-3 rounded-xl border bg-white cursor-pointer transition-all shadow-2xs select-none"
              :class="
                isUnitSelected(unit)
                  ? 'border-[#0A51B0] bg-[#EFF6FF]/50 text-[#333333] ring-1 ring-[#0A51B0]/30'
                  : 'border-[#E2E8F0] text-[#333333] hover:bg-[#F8FAFC]'
              "
            >
              <input
                type="checkbox"
                :checked="isUnitSelected(unit)"
                @click.stop="toggleUnit(unit)"
                class="h-4 w-4 rounded border-gray-300 text-[#333333] focus:ring-[#0A51B0] cursor-pointer shrink-0"
              />
              <div class="flex items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[20px] shrink-0"
                  :class="isUnitSelected(unit) ? 'text-[#333333]' : 'text-[#5F7089]'"
                  >{{ unit.icon }}</span
                >
                <div class="min-w-0">
                  <p class="text-xs font-bold leading-tight truncate">{{ unit.kode }}</p>
                  <p class="text-[11px] text-[#5F7089] leading-tight truncate">{{ unit.nama }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Granular RBAC Permissions Section (Grouped & Compact Settings Panel) -->
        <div class="user-permission-section flex flex-col gap-3">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 class="text-xs font-semibold text-[#333333]">Hak Akses</h3>
              <p class="text-[11px] text-[#5F7089]">
                Tentukan level akses pengguna untuk setiap fitur
              </p>
            </div>

            <div v-if="form.role !== 'superadmin'" class="flex items-center gap-2 text-xs">
              <button
                type="button"
                @click="selectAllPermissions('full')"
                class="font-semibold text-[#059669] hover:underline cursor-pointer"
              >
                Akses penuh semua
              </button>
              <span class="text-[#CBD5E1]">•</span>
              <button
                type="button"
                @click="selectAllPermissions('read_only')"
                class="font-semibold text-[#333333] hover:underline cursor-pointer"
              >
                Baca saja semua
              </button>
              <span class="text-[#CBD5E1]">•</span>
              <button
                type="button"
                @click="selectAllPermissions('none')"
                class="font-semibold text-[#5F7089] hover:underline cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          <!-- Superadmin Notice -->
          <div
            v-if="form.role === 'superadmin'"
            class="rounded-xl bg-[#EFF6FF] p-3 text-xs font-semibold text-[#333333] border border-[#BFDBFE] flex items-center gap-2"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[18px]"
              >verified_user</span
            >
            <span>Superadmin memiliki akses penuh ke seluruh fitur sistem secara otomatis.</span>
          </div>

          <!-- Grouped Permission Rows -->
          <div v-else class="flex flex-col gap-4">
            <!-- Group 1: Operasional -->
            <div class="flex flex-col gap-1.5">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-[#687281]"
                >Operasional</span
              >
              <div
                class="divide-y divide-[#F1F5F9] rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-2xs"
              >
                <div
                  v-for="f in OPERATIONAL_FEATURES"
                  :key="f.key"
                  class="user-permission-row flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-3.5 py-2.5 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      aria-hidden="true"
                      class="material-symbols-outlined text-[18px] text-[#5F7089] shrink-0"
                      >{{ f.icon }}</span
                    >
                    <div class="min-w-0">
                      <p class="text-xs font-semibold text-[#333333] truncate">{{ f.label }}</p>
                      <p class="text-[11px] text-[#5F7089] truncate">{{ f.desc }}</p>
                    </div>
                  </div>

                  <select
                    v-model="form.permissions[f.key]"
                    :aria-label="'Hak akses ' + f.label"
                    class="h-8 rounded-lg border px-2.5 text-xs font-semibold focus:outline-none transition-all cursor-pointer shadow-2xs select-none shrink-0"
                    :class="
                      form.permissions[f.key] === 'full'
                        ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                        : form.permissions[f.key] === 'read_only'
                          ? 'bg-[#EFF6FF] text-[#333333] border-[#BFDBFE]'
                          : 'bg-[#F8FAFC] text-[#5F7089] border-[#E2E8F0]'
                    "
                  >
                    <option value="none">Tanpa akses</option>
                    <option value="read_only">Baca saja</option>
                    <option value="full">Akses penuh</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Group 2: Administrasi & Audit -->
            <div class="flex flex-col gap-1.5">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-[#687281]"
                >Administrasi &amp; Audit</span
              >
              <div
                class="divide-y divide-[#F1F5F9] rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-2xs"
              >
                <div
                  v-for="f in ADMINISTRATIVE_FEATURES"
                  :key="f.key"
                  class="user-permission-row flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-3.5 py-2.5 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      aria-hidden="true"
                      class="material-symbols-outlined text-[18px] text-[#5F7089] shrink-0"
                      >{{ f.icon }}</span
                    >
                    <div class="min-w-0">
                      <p class="text-xs font-semibold text-[#333333] truncate">{{ f.label }}</p>
                      <p class="text-[11px] text-[#5F7089] truncate">{{ f.desc }}</p>
                    </div>
                  </div>

                  <select
                    v-model="form.permissions[f.key]"
                    :aria-label="'Hak akses ' + f.label"
                    class="h-8 rounded-lg border px-2.5 text-xs font-semibold focus:outline-none transition-all cursor-pointer shadow-2xs select-none shrink-0"
                    :class="
                      form.permissions[f.key] === 'full'
                        ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                        : form.permissions[f.key] === 'read_only'
                          ? 'bg-[#EFF6FF] text-[#333333] border-[#BFDBFE]'
                          : 'bg-[#F8FAFC] text-[#5F7089] border-[#E2E8F0]'
                    "
                  >
                    <option value="none">Tanpa akses</option>
                    <option value="read_only">Baca saja</option>
                    <option value="full">Akses penuh</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Status Akun saat Edit -->
        <label
          v-if="modalMode === 'edit' && isSuperAdmin && !isRoleSuperAdmin(selectedUser?.role)"
          class="flex items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 cursor-pointer select-none"
        >
          <div>
            <span class="block text-xs font-semibold text-[#333333]">Status Akun Aktif</span>
            <span class="block text-[11px] text-[#5F7089]"
              >Pengguna nonaktif tidak dapat login ke dalam sistem.</span
            >
          </div>
          <input
            v-model="form.is_active"
            type="checkbox"
            class="h-4 w-4 shrink-0 accent-[#0A51B0]"
          />
        </label>
      </form>
      <template #footer>
        <!-- 6. Sticky Footer -->
        <div
          class="admin-modal-actions flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 pt-3 border-t border-[#F1F5F9]"
        >
          <div class="min-w-0">
            <p v-if="modalError" class="text-xs font-semibold text-rose-600">
              {{ modalError }}
            </p>
          </div>

          <div
            class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 shrink-0"
          >
            <button
              type="button"
              :disabled="isSubmitting"
              @click="requestCloseModal"
              class="h-9 w-full sm:w-auto px-4 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#333333] active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
            >
              Batal
            </button>

            <button
              type="submit"
              form="admin-user-form"
              :disabled="isSubmitting || !canWriteUsers"
              class="h-9 w-full sm:w-auto px-4 rounded-lg bg-[#0A51B0] text-xs font-semibold text-white shadow-2xs hover:bg-[#0A4391] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span
                v-if="isSubmitting"
                class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
              ></span>
              <span>{{
                isSubmitting
                  ? 'Menyimpan...'
                  : modalMode === 'add'
                    ? 'Tambah Pengguna'
                    : 'Simpan Perubahan'
              }}</span>
            </button>
          </div>
        </div>
      </template>
    </AppModal>

    <!-- ═══════════════════════════════════════════════════════
         MODAL KONFIRMASI HAPUS USER
         ═══════════════════════════════════════════════════════ -->
    <AppModal
      :is-open="showDeleteModal"
      title="Hapus Pengguna"
      size="sm"
      @close="requestCloseModal"
    >
      <div class="flex flex-col items-center gap-4 text-center">
        <div
          v-if="modalError"
          role="alert"
          class="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-[12px] text-red-700"
        >
          {{ modalError }}
        </div>
        <div class="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <span aria-hidden="true" class="material-symbols-outlined text-[28px] text-[#EF4444]"
            >warning</span
          >
        </div>

        <div>
          <h4 class="text-[15px] font-black text-[#111827]">Yakin ingin menghapus?</h4>
          <p class="text-[12px] text-[#9CA3AF] mt-1">Tindakan ini tidak dapat dibatalkan.</p>
        </div>

        <!-- Info user yang akan dihapus -->
        <div
          class="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 text-left space-y-1.5"
        >
          <div class="flex justify-between text-[12px]">
            <span class="text-[#9CA3AF]">Nama</span>
            <span class="font-bold text-[#111827]">{{ selectedUser?.nama }}</span>
          </div>
          <div class="flex justify-between text-[12px]">
            <span class="text-[#9CA3AF]">Email</span>
            <span class="break-all text-right text-[#374151]">{{ selectedUser?.email }}</span>
          </div>
          <div class="flex justify-between text-[12px]">
            <span class="text-[#9CA3AF]">Role</span>
            <AppBadge
              :type="getRoleBadgeType(selectedUser?.role)"
              :text="(selectedUser?.role || '').toUpperCase()"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="admin-modal-actions flex gap-3 w-full">
          <button
            type="button"
            :disabled="isSubmitting"
            @click="requestCloseModal"
            class="flex-1 h-10 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-[13px] font-semibold text-[#374151] hover:bg-[#F3F4F6] transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            @click="deleteUser"
            :disabled="isSubmitting"
            class="flex-1 h-10 bg-[#EF4444] hover:bg-[#DC2626] text-white text-[13px] font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            <span
              v-if="isSubmitting"
              class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
            ></span>
            {{ isSubmitting ? 'Menghapus...' : 'Ya, Hapus' }}
          </button>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<style scoped src="../assets/admin-workspace.css"></style>

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
.user-entry-form {
  gap: 22px;
  padding: 0;
}
.user-entry-section,
.user-permission-section {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
}
.user-entry-title,
.user-permission-section h3 {
  font-size: 14px;
  font-weight: 650;
  color: #333;
}
.user-entry-hint {
  margin-top: 6px;
  margin-bottom: 20px;
  font-size: 12px;
  line-height: 1.7;
  color: #637288;
}
.user-entry-section > div + div {
  margin-top: 18px;
}
.user-entry-section > .grid {
  gap: 18px;
}
.user-entry-form label {
  font-size: 12px;
  font-weight: 500;
}
.user-entry-form input:not([type='checkbox']) {
  min-height: 44px;
  background: #fafbfd;
  font-size: 13px;
  font-weight: 400;
}
.user-entry-form :deep(button[aria-haspopup='listbox']) {
  min-height: 44px;
  border-radius: 8px;
}
.user-permission-section > div:first-child > div:last-child {
  flex-wrap: wrap;
  gap: 8px;
}
.user-permission-section > div:first-child button {
  min-height: 36px;
  padding: 6px 9px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  font-size: 11px;
  text-decoration: none;
}
.user-permission-row {
  padding: 14px;
  gap: 16px;
}
.user-permission-row p {
  white-space: normal;
  line-height: 1.6;
}
.user-permission-row select {
  min-height: 42px;
  width: 140px;
  font-size: 12px;
  border-radius: 8px;
}
.user-entry-form input:disabled {
  background: #f1f5f9;
  color: #637288;
}
@media (max-width: 639px) {
  .user-entry-section,
  .user-permission-section {
    padding: 16px;
  }
  .user-entry-form input:not([type='checkbox']),
  .user-entry-form :deep(button[aria-haspopup='listbox']) {
    font-size: 16px;
  }
  .user-permission-row {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .user-permission-row select {
    width: 100%;
    min-height: 44px;
    font-size: 16px;
  }
  .user-permission-section > div:first-child button {
    min-height: 44px;
  }
}
</style>

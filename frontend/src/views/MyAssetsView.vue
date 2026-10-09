<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import { useAuth } from '../composables/useAuth.js'
import { formatStatusPill } from '../utils/assetStatus.js'
import { normalizeLocation } from '../utils/locationNormalizer.js'
import PageHeader from '../components/ui/PageHeader.vue'
import AppModal from '../components/ui/AppModal.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import StatusBadge from '../components/ui/StatusBadge.vue'
import MyAssetsEmployeeList from '../components/assets/MyAssetsEmployeeList.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import FilterModal from '../components/ui/FilterModal.vue'
import StatCard from '../components/ui/StatCard.vue'
import AppPagination from '../components/ui/AppPagination.vue'
import { useNotificationSound } from '../composables/useNotificationSound.js'
import {
  notificationPermission,
  cameraPermission,
  clipboardPermission,
  requestNotificationPermission,
  showNativeNotification,
  requestCameraAccess,
  requestClipboardAccess,
} from '../composables/useBrowserPermissions.js'

const router = useRouter()
const { get, post } = useApi()
const { isAdmin, isSuperAdmin, user, refreshUser, hasPermission } = useAuth()
const canBrowseOtherAssets = computed(
  () => isSuperAdmin.value || (isAdmin.value && hasPermission('assets')),
)

const myNik = computed(() => user.value?.employee?.nik || user.value?.nik || '')

// Bawahan langsung dari user yang sedang login.
// Super Admin tidak memiliki bawahan operasional langsung.
const mySubordinates = computed(() => {
  if (isSuperAdmin.value) return []
  const nik = String(myNik.value || '').trim()
  if (!nik) return []
  return employees.value.filter(
    (e) => e.nik_atasan_langsung && String(e.nik_atasan_langsung).trim() === nik,
  )
})

const hasSubordinates = computed(() => mySubordinates.value.length > 0)

const canAccessDirectoryTab = computed(
  () => canBrowseOtherAssets.value || hasSubordinates.value,
)

// ── State Level Navigasi (1 = Master Profil, 2 = Detail Karyawan Lain, 3 = Detail & Audit History Aset) ──
const currentLevel = ref(1)
const activeProfileTab = ref('assets')

// ── State: Riwayat Tiket User ────────────────────────────────────────────────
const userTickets = ref([])
const isLoadingUserTickets = ref(false)
const userTicketsError = ref('')
const ticketSearch = ref('')

const filteredUserTickets = computed(() => {
  const q = ticketSearch.value.trim().toLowerCase()
  if (!q) return userTickets.value
  return userTickets.value.filter((t) => {
    const text = [
      t.nomor_tiket,
      t.judul,
      t.kategori,
      t.prioritas,
      t.status_tiket,
      t.assigned_to_nama,
    ]
      .join(' ')
      .toLowerCase()
    return text.includes(q)
  })
})

// ── State: Ganti Password Langsung ──────────────────────────────────────────
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const isChangingPassword = ref(false)
const passwordSuccess = ref('')
const passwordError = ref('')
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// ── State & Handlers: Izin Browser & Suara Tone.js ─────────────────────────
const { isSoundEnabled, toggleSound, testSound } = useNotificationSound()
const permissionFeedback = ref('')
const permissionFeedbackType = ref('info')

function showPermFeedback(msg, type = 'info') {
  permissionFeedback.value = msg
  permissionFeedbackType.value = type
  setTimeout(() => {
    permissionFeedback.value = ''
  }, 4000)
}

async function handleProfileEnableNotif() {
  const res = await requestNotificationPermission()
  if (res === 'granted') {
    showPermFeedback('Notifikasi desktop browser berhasil diaktifkan.', 'success')
  } else if (res === 'denied') {
    showPermFeedback('Izin notifikasi diblokir browser. Buka setelan situs browser untuk mengizinkan.', 'error')
  }
}

function handleProfileTestNotif() {
  if (notificationPermission.value === 'granted') {
    testSound()
    showNativeNotification({
      title: 'Uji Notifikasi TrackIT',
      body: 'Notifikasi desktop dan nada suara Tone.js berjalan lancar.',
      icon: '/logo.svg',
    })
    showPermFeedback('Uji coba notifikasi dan suara berhasil.', 'success')
  } else {
    handleProfileEnableNotif()
  }
}

async function handleProfileCamera() {
  const res = await requestCameraAccess()
  showPermFeedback(res.message, res.ok ? 'success' : 'error')
}

async function handleProfileClipboard() {
  const res = await requestClipboardAccess()
  showPermFeedback(res.message, res.ok ? 'success' : 'error')
}

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
  if (myAssets.value.length === 0) return '-'
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
      detail: `Pemegang Aktif: ${emp?.nama_karyawan || 'Karyawan'} (NIK: ${emp?.nik || '-'})`,
      icon: 'person_check',
      type: 'assignment',
    })
  }

  return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
})

// ── Navigasi Helper ────────────────────────────────────────────────────────────
async function goToLevel1() {
  currentLevel.value = 1
  selectedEmployee.value = null
  selectedAsset.value = null
  await loadMyOwnAssets()
  activeProfileTab.value = canBrowseOtherAssets.value ? 'directory' : 'assets'
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
  if (!canAccessDirectoryTab.value && !hasPermission('my_assets')) return

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
    const nik = empData?.nik || currentUser?.nik || ''

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
    } else {
      selectedEmployee.value = {
        nik: '',
        nama_karyawan: currentUser?.nama || 'Pengguna',
        title: currentUser?.role || 'User',
        jabatan: currentUser?.role || 'User',
        departemen: '-',
        lokasi_kerja: '-',
        email_kantor: currentUser?.email || '',
        hasEmployeeRecord: false,
      }
    }

    if (nik) {
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

    const assetData = await get('/api/assets/my')
    myAssets.value = Array.isArray(assetData) ? assetData.map(normalizeAsset) : []
  } catch (err) {
    assetError.value = err.message || 'Gagal memuat data aset Anda.'
  } finally {
    isLoadingAssets.value = false
  }
}

async function fetchUserTickets() {
  isLoadingUserTickets.value = true
  userTicketsError.value = ''
  try {
    const data = await get('/api/tickets?tab=reported')
    userTickets.value = Array.isArray(data) ? data : []
  } catch (err) {
    userTicketsError.value = err.message || 'Gagal memuat riwayat tiket.'
  } finally {
    isLoadingUserTickets.value = false
  }
}

const activeTicketsCount = computed(() => {
  return userTickets.value.filter((t) =>
    ['open', 'in progress', 'pending'].includes((t.status_tiket || '').toLowerCase()),
  ).length
})

async function handleChangePassword() {
  passwordSuccess.value = ''
  passwordError.value = ''
  if (!passwordForm.value.currentPassword) {
    passwordError.value = 'Password saat ini harus diisi.'
    return
  }
  if (!passwordForm.value.newPassword) {
    passwordError.value = 'Password baru harus diisi.'
    return
  }
  if (passwordForm.value.newPassword.length < 8) {
    passwordError.value = 'Password baru minimal 8 karakter.'
    return
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = 'Konfirmasi password baru tidak cocok.'
    return
  }

  isChangingPassword.value = true
  try {
    await post('/api/auth/change-password', {
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword,
    })
    passwordSuccess.value = 'Password berhasil diperbarui!'
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  } catch (err) {
    passwordError.value = err.message || 'Gagal mengubah password. Pastikan password lama benar.'
  } finally {
    isChangingPassword.value = false
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
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
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

onMounted(async () => {
  currentLevel.value = 1
  activeProfileTab.value = 'assets'
  await Promise.all([
    loadMyOwnAssets(),
    fetchUserTickets(),
    fetchEmployees(),
  ])
})
</script>
<template>
  <div
    class="employee-assets-page flex min-w-0 flex-col gap-3"
    :data-testid="!isLoading ? 'page-ready' : undefined"
  >
    <template v-if="currentLevel === 1">
      <!-- Enterprise Page Header -->
      <PageHeader
        title="Profil"
        subtitle="Detail aset, tiket, riwayat aktivitas, dan profil akun"
      >
        <template #actions>
          <div class="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              @click="router.push('/tickets')"
              class="inline-flex items-center gap-1 h-7 sm:h-7.5 px-2 sm:px-2.5 rounded-[5px] bg-[#0A51B0] hover:bg-[#0A4391] text-white text-[10px] sm:text-[11px] font-semibold shadow-2xs transition-all cursor-pointer touch-manipulation"
            >
              <span class="material-symbols-outlined text-[14px] sm:text-[15px]">add_circle</span>
              <span>Buat Tiket</span>
            </button>
            <button
              type="button"
              @click="loadMyOwnAssets(); fetchUserTickets()"
              class="inline-flex items-center gap-1 h-7 sm:h-7.5 px-2 sm:px-2.5 rounded-[5px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] sm:text-[11px] font-medium shadow-2xs transition-all cursor-pointer touch-manipulation"
              title="Segarkan data aset dan profil"
            >
              <span class="material-symbols-outlined text-[14px] sm:text-[15px]">refresh</span>
              <span class="hidden sm:inline">Segarkan</span>
            </button>
          </div>
        </template>
      </PageHeader>

      <!-- Profile Hero Identity Banner -->
      <div
        class="profile-hero-card rounded-[6px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 sm:p-2.5 shadow-2xs"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-2.5">
          <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div
              class="flex h-7.5 w-7.5 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-[5px] bg-gradient-to-br from-[#0A51B0] to-[#0A4391] text-[10px] sm:text-[11px] font-bold text-white shadow-2xs"
            >
              {{ getInitials(selectedEmployee?.nama_karyawan || user?.nama || 'Saya') }}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <h2 class="text-[11px] sm:text-xs font-semibold text-[#333333] dark:text-white tracking-tight truncate">
                  {{ selectedEmployee?.nama_karyawan || user?.nama || 'Pengguna TrackIT' }}
                </h2>
                <AppBadge
                  type="success"
                  :text="selectedEmployee?.status_karyawan || 'Aktif'"
                />
              </div>
              <p class="text-[9.5px] sm:text-[10px] font-medium text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                {{ selectedEmployee?.jabatan || user?.role || 'Staff' }}
              </p>
            </div>
          </div>

          <!-- Role Tag -->
          <div class="flex items-center gap-1.5 shrink-0 flex-wrap">
            <span
              class="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-[5px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] sm:text-[9.5px] font-medium"
            >
              <span class="material-symbols-outlined text-[12px] text-[#0A51B0]">verified_user</span>
              <span>Hak Akses: {{ user?.role || 'User' }}</span>
            </span>
          </div>
        </div>

        <!-- Identity Details Row -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-1.5 mt-1.5 border-t border-slate-100 dark:border-slate-800/80">
          <div class="min-w-0">
            <span class="block text-[8.5px] sm:text-[9px] font-medium text-slate-500 dark:text-slate-400">Nomor Induk (NIK)</span>
            <span class="font-semibold text-slate-800 dark:text-slate-200 font-mono truncate block text-[9.5px] sm:text-[10px] mt-0.5">
              {{ selectedEmployee?.nik || user?.nik || '-' }}
            </span>
          </div>
          <div class="min-w-0">
            <span class="block text-[8.5px] sm:text-[9px] font-medium text-slate-500 dark:text-slate-400">Departemen</span>
            <span class="font-semibold text-slate-800 dark:text-slate-200 truncate block text-[9.5px] sm:text-[10px] mt-0.5">
              {{ selectedEmployee?.departemen || user?.departemen || '-' }}
            </span>
          </div>
          <div class="min-w-0">
            <span class="block text-[8.5px] sm:text-[9px] font-medium text-slate-500 dark:text-slate-400">Lokasi Kantor</span>
            <span class="font-semibold text-slate-800 dark:text-slate-200 truncate block text-[9.5px] sm:text-[10px] mt-0.5">
              {{ selectedEmployee?.lokasi_kerja || user?.lokasi_kerja || '-' }}
            </span>
          </div>
          <div class="min-w-0">
            <span class="block text-[8.5px] sm:text-[9px] font-medium text-slate-500 dark:text-slate-400">Email Perusahaan</span>
            <span class="font-semibold text-slate-800 dark:text-slate-200 truncate block text-[9.5px] sm:text-[10px] mt-0.5">
              {{ selectedEmployee?.email_kantor || user?.email || '-' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 4 Personal Summary Stat Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2 lg:gap-2.5">
        <StatCard
          title="Total Aset Digunakan"
          :value="myAssets.length"
          subtitle="Unit perangkat aktif"
          is-total
          color="primary"
          icon="devices"
        />
        <StatCard
          label="Tiket Aktif"
          :value="activeTicketsCount"
          help-text="Perlu tindak lanjut"
          tone="amber"
          icon="confirmation_number"
        />
        <StatCard
          label="Riwayat Tiket"
          :value="userTickets.length"
          help-text="Total diajukan"
          tone="teal"
          icon="history_toggle_off"
        />
        <StatCard
          label="Log Aktivitas"
          :value="deviceCycle.length"
          help-text="Riwayat siklus & mutasi"
          tone="indigo"
          icon="sync_alt"
        />
      </div>

      <!-- Tab Navigation Switcher -->
      <div
        class="profile-tabs flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="activeProfileTab === 'assets'"
          @click="activeProfileTab = 'assets'"
          class="flex items-center gap-1 px-1.5 py-1 sm:px-2 sm:py-1 rounded-[5px] text-[9.5px] sm:text-[10.5px] font-semibold transition-all cursor-pointer whitespace-nowrap touch-manipulation"
          :class="
            activeProfileTab === 'assets'
              ? 'bg-[#0A51B0] text-white shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          "
        >
          <span class="material-symbols-outlined text-[13px] sm:text-[14px]">devices</span>
          <span>Aset Saya</span>
          <span
            class="ml-0.5 px-1 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold"
            :class="
              activeProfileTab === 'assets'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            "
          >
            {{ myAssets.length }}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          :aria-selected="activeProfileTab === 'tickets'"
          @click="activeProfileTab = 'tickets'"
          class="flex items-center gap-1 px-1.5 py-1 sm:px-2 sm:py-1 rounded-[5px] text-[9.5px] sm:text-[10.5px] font-semibold transition-all cursor-pointer whitespace-nowrap touch-manipulation"
          :class="
            activeProfileTab === 'tickets'
              ? 'bg-[#0A51B0] text-white shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          "
        >
          <span class="material-symbols-outlined text-[13px] sm:text-[14px]">confirmation_number</span>
          <span>Riwayat Tiket</span>
          <span
            class="ml-0.5 px-1 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold"
            :class="
              activeProfileTab === 'tickets'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            "
          >
            {{ userTickets.length }}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          :aria-selected="activeProfileTab === 'logs'"
          @click="activeProfileTab = 'logs'"
          class="flex items-center gap-1 px-1.5 py-1 sm:px-2 sm:py-1 rounded-[5px] text-[9.5px] sm:text-[10.5px] font-semibold transition-all cursor-pointer whitespace-nowrap touch-manipulation"
          :class="
            activeProfileTab === 'logs'
              ? 'bg-[#0A51B0] text-white shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          "
        >
          <span class="material-symbols-outlined text-[13px] sm:text-[14px]">history</span>
          <span>Histori Log & Siklus</span>
          <span
            class="ml-0.5 px-1 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold"
            :class="
              activeProfileTab === 'logs'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            "
          >
            {{ deviceCycle.length }}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          :aria-selected="activeProfileTab === 'security'"
          @click="activeProfileTab = 'security'"
          class="flex items-center gap-1 px-1.5 py-1 sm:px-2 sm:py-1 rounded-[5px] text-[9.5px] sm:text-[10.5px] font-semibold transition-all cursor-pointer whitespace-nowrap touch-manipulation"
          :class="
            activeProfileTab === 'security'
              ? 'bg-[#0A51B0] text-white shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          "
        >
          <span class="material-symbols-outlined text-[13px] sm:text-[14px]">tune</span>
          <span>Keamanan & Izin Browser</span>
        </button>

        <button
          v-if="canAccessDirectoryTab"
          type="button"
          role="tab"
          :aria-selected="activeProfileTab === 'directory'"
          @click="activeProfileTab = 'directory'"
          class="flex items-center gap-1 px-1.5 py-1 sm:px-2 sm:py-1 rounded-[5px] text-[9.5px] sm:text-[10.5px] font-semibold transition-all cursor-pointer whitespace-nowrap touch-manipulation"
          :class="
            activeProfileTab === 'directory'
              ? 'bg-[#0A51B0] text-white shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          "
        >
          <span class="material-symbols-outlined text-[13px] sm:text-[14px]">{{ hasSubordinates && !isSuperAdmin ? 'account_tree' : 'group' }}</span>
          <span>{{ hasSubordinates && !isSuperAdmin ? 'Tim & Org Chart' : 'Direktori Karyawan' }}</span>
          <span
            class="ml-0.5 px-1 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold"
            :class="
              activeProfileTab === 'directory'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            "
          >
            {{ hasSubordinates && !isSuperAdmin ? mySubordinates.length : totalEmployeesHoldingAssets }}
          </span>
        </button>
      </div>

      <!-- Tab Panel 1: Aset Saya -->
      <div v-if="activeProfileTab === 'assets'" class="space-y-2 sm:space-y-2.5">
        <!-- Filter Bar -->
        <div
          class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2 rounded-[6px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 sm:p-2"
        >
          <div class="relative flex-1 min-w-0">
            <span
              aria-hidden="true"
              class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-slate-400"
              >search</span
            >
            <input
              v-model="assetSearch"
              type="text"
              placeholder="Cari label, nomor seri, merek, atau model..."
              class="w-full h-7 sm:h-7.5 pl-6.5 pr-2 rounded-[5px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] sm:text-[10.5px] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0] transition-colors"
            />
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <select
              v-model="filterTipe"
              class="h-7 sm:h-7.5 px-2 rounded-[5px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[9.5px] sm:text-[10px] text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0A51B0] transition-colors cursor-pointer"
            >
              <option value="">Semua Tipe Perangkat</option>
              <option
                v-for="opt in tipeFilterOptions.filter((o) => o.value)"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
            <button
              v-if="assetSearch || filterTipe"
              type="button"
              @click="assetSearch = ''; filterTipe = ''"
              class="h-7 sm:h-7.5 px-2 rounded-[5px] text-[9.5px] sm:text-[10px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoadingAssets" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-2.5">
          <div
            v-for="i in 3"
            :key="i"
            class="h-32 rounded-[6px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 animate-pulse"
          >
            <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3 mb-2"></div>
            <div class="h-2 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-3"></div>
            <div class="h-12 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
          </div>
        </div>

        <!-- Error State -->
        <div
          v-else-if="assetError"
          class="rounded-[6px] border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-2.5 text-[10px] sm:text-[10.5px] text-rose-700 dark:text-rose-400 flex items-center justify-between gap-2"
        >
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[15px]">error</span>
            <span>{{ assetError }}</span>
          </div>
          <button
            type="button"
            @click="loadMyOwnAssets"
            class="font-semibold underline hover:no-underline cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="filteredAssets.length === 0"
          class="rounded-[6px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 text-center"
        >
          <div
            class="mx-auto flex h-8 w-8 items-center justify-center rounded-[5px] bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2"
          >
            <span class="material-symbols-outlined text-[17px]">devices_off</span>
          </div>
          <h3 class="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200">
            {{ assetSearch || filterTipe ? 'Aset Tidak Ditemukan' : 'Belum Ada Aset Ditugaskan' }}
          </h3>
          <p class="text-[9.5px] sm:text-[10px] text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            {{
              assetSearch || filterTipe
                ? 'Tidak ada perangkat yang cocok dengan kriteria pencarian atau filter yang dipilih.'
                : 'Saat ini tidak ada perangkat IT yang terdaftar aktif atas nama Anda. Jika membutuhkan perangkat, hubungi tim IT Helpdesk.'
            }}
          </p>
          <div class="mt-3 flex items-center justify-center gap-2">
            <button
              v-if="assetSearch || filterTipe"
              type="button"
              @click="assetSearch = ''; filterTipe = ''"
              class="h-7 px-2.5 rounded-[5px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] sm:text-[10.5px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
            >
              Hapus Filter
            </button>
            <button
              v-else
              type="button"
              @click="router.push('/tickets')"
              class="h-7 px-2.5 rounded-[5px] bg-[#0A51B0] hover:bg-[#0A4391] text-[10px] sm:text-[10.5px] font-semibold text-white shadow-2xs transition-colors"
            >
              Ajukan Permintaan Perangkat
            </button>
          </div>
        </div>

        <!-- Asset Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-2.5">
          <div
            v-for="asset in paginatedAssets"
            :key="asset.id_aset || asset.id"
            class="assigned-asset-card rounded-[6px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 sm:p-2.5 shadow-2xs hover:border-[#0A51B0]/40 transition-colors flex flex-col justify-between"
          >
            <div>
              <!-- Card Header -->
              <div class="flex items-start justify-between gap-1.5 mb-1.5">
                <div class="flex items-center gap-1.5 min-w-0">
                  <div
                    class="flex h-6.5 w-6.5 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-[5px] bg-[#EFF6FF] dark:bg-slate-800 text-[#0A51B0] dark:text-blue-400"
                  >
                    <span class="material-symbols-outlined text-[15px] sm:text-[16px]">
                      {{ getDeviceIcon(asset.tipe_perangkat) }}
                    </span>
                  </div>
                  <div class="min-w-0">
                    <h4 class="text-[10.5px] sm:text-[11px] font-semibold text-slate-900 dark:text-white truncate">
                      {{ asset.label_aset || asset.hostname || 'Perangkat IT' }}
                    </h4>
                    <span class="text-[9px] sm:text-[9.5px] font-mono text-slate-500 dark:text-slate-400 truncate block">
                      {{ asset.nomor_seri || asset.serial_number || '-' }}
                    </span>
                  </div>
                </div>

                <!-- Status Badges -->
                <div class="flex items-center gap-1 shrink-0">
                  <StatusBadge
                    :text="formatStatusPill(asset.status_aset || asset.status)"
                    :status="asset.status_aset || asset.status"
                    size="sm"
                  />
                </div>
              </div>

              <!-- Metadata Grid -->
              <div class="rounded-[5px] bg-slate-50 dark:bg-slate-800/60 p-1.5 space-y-0.5 text-[9.5px] sm:text-[10px] border border-slate-100 dark:border-slate-800">
                <div class="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span class="font-medium text-[8.5px] sm:text-[9px]">Merek / Model</span>
                  <span class="font-semibold text-slate-800 dark:text-slate-200 truncate ml-2">
                    {{ [asset.merek, asset.model].filter(Boolean).join(' ') || '-' }}
                  </span>
                </div>
                <div class="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span class="font-medium text-[8.5px] sm:text-[9px]">Tipe</span>
                  <span class="font-semibold text-slate-800 dark:text-slate-200 truncate ml-2">
                    {{ asset.tipe_perangkat || '-' }}
                  </span>
                </div>
                <div class="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span class="font-medium text-[8.5px] sm:text-[9px]">Kondisi</span>
                  <span class="font-semibold text-slate-800 dark:text-slate-200 truncate ml-2">
                    {{ asset.kondisi_aset || asset.kondisi || 'Normal' }}
                  </span>
                </div>
                <div class="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span class="font-medium text-[8.5px] sm:text-[9px]">Lokasi</span>
                  <span class="font-semibold text-slate-800 dark:text-slate-200 truncate ml-2">
                    {{ asset.lokasi_aset || asset.lokasi || '-' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Card Actions Footer -->
            <div class="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
              <button
                type="button"
                @click="openSpecification(asset)"
                class="flex items-center gap-1 text-[9.5px] sm:text-[10px] font-semibold text-[#0A51B0] hover:text-[#0A4391] dark:text-blue-400 hover:underline cursor-pointer"
              >
                <span class="material-symbols-outlined text-[12px] sm:text-[13px]">info</span>
                <span>Spesifikasi</span>
              </button>

              <div class="flex items-center gap-1">
                <button
                  type="button"
                  @click="goToLevel3(asset)"
                  class="flex items-center gap-1 h-6 px-1.5 rounded-[4px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[9px] sm:text-[9.5px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  <span class="material-symbols-outlined text-[11px] sm:text-[12px]">history</span>
                  <span>Riwayat</span>
                </button>
                <button
                  type="button"
                  @click="router.push('/tickets?search=' + encodeURIComponent(asset.label_aset || asset.nomor_seri))"
                  class="flex items-center gap-1 h-6 px-1.5 rounded-[4px] bg-[#0A51B0] hover:bg-[#0A4391] text-[9px] sm:text-[9.5px] font-semibold text-white cursor-pointer transition-colors shadow-2xs"
                  title="Laporkan kendala terkait perangkat ini"
                >
                  <span class="material-symbols-outlined text-[11px] sm:text-[12px]">report_problem</span>
                  <span>Lapor</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Assets Pagination -->
        <AppPagination
          v-if="!isLoadingAssets && !assetError && filteredAssets.length > itemsPerPage"
          v-model:currentPage="currentPageAssets"
          :total-items="filteredAssets.length"
          :items-per-page="itemsPerPage"
        />
      </div>

      <!-- Tab Panel 2: Riwayat Tiket -->
      <div v-else-if="activeProfileTab === 'tickets'" class="space-y-2 sm:space-y-2.5">
        <!-- Toolbar -->
        <div
          class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2 rounded-[6px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 sm:p-2"
        >
          <div class="relative flex-1 min-w-0">
            <span
              aria-hidden="true"
              class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-slate-400"
              >search</span
            >
            <input
              v-model="ticketSearch"
              type="text"
              placeholder="Cari tiket berdasarkan nomor, judul, status, atau prioritas..."
              class="w-full h-7 sm:h-7.5 pl-6.5 pr-2 rounded-[5px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] sm:text-[10.5px] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0] transition-colors"
            />
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              @click="router.push('/tickets')"
              class="inline-flex items-center gap-1 h-7 sm:h-7.5 px-2.5 rounded-[5px] bg-[#0A51B0] hover:bg-[#0A4391] text-white text-[10px] sm:text-[10.5px] font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <span class="material-symbols-outlined text-[13px] sm:text-[14px]">add_circle</span>
              <span>Buat Tiket Baru</span>
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoadingUserTickets" class="space-y-1.5">
          <div
            v-for="i in 3"
            :key="i"
            class="h-10 rounded-[6px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 animate-pulse flex items-center justify-between"
          >
            <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
            <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/6"></div>
          </div>
        </div>

        <!-- Error State -->
        <div
          v-else-if="userTicketsError"
          class="rounded-[6px] border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-2.5 text-[10px] sm:text-[10.5px] text-rose-700 dark:text-rose-400 flex items-center justify-between gap-2"
        >
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[15px]">error</span>
            <span>{{ userTicketsError }}</span>
          </div>
          <button
            type="button"
            @click="fetchUserTickets"
            class="font-semibold underline hover:no-underline cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="filteredUserTickets.length === 0"
          class="rounded-[6px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 text-center"
        >
          <div
            class="mx-auto flex h-8 w-8 items-center justify-center rounded-[5px] bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2"
          >
            <span class="material-symbols-outlined text-[17px]">confirmation_number</span>
          </div>
          <h3 class="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200">
            {{ ticketSearch ? 'Tiket Tidak Ditemukan' : 'Belum Ada Tiket yang Diajukan' }}
          </h3>
          <p class="text-[9.5px] sm:text-[10px] text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            {{
              ticketSearch
                ? 'Tidak ada tiket yang sesuai dengan kata kunci pencarian Anda.'
                : 'Anda belum pernah melaporkan keluhan atau kendala IT. Jika ada gangguan perangkat, ajukan tiket baru.'
            }}
          </p>
          <div class="mt-3 flex items-center justify-center gap-2">
            <button
              v-if="ticketSearch"
              type="button"
              @click="ticketSearch = ''"
              class="h-7 px-2.5 rounded-[5px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] sm:text-[10.5px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
            >
              Hapus Pencarian
            </button>
            <button
              v-else
              type="button"
              @click="router.push('/tickets')"
              class="h-7 px-2.5 rounded-[5px] bg-[#0A51B0] hover:bg-[#0A4391] text-[10px] sm:text-[10.5px] font-semibold text-white shadow-2xs transition-colors"
            >
              Ajukan Tiket Sekarang
            </button>
          </div>
        </div>

        <!-- Tickets Table -->
        <div
          v-else
          class="rounded-[6px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs"
        >
          <div class="overflow-x-auto">
            <table class="w-full text-left text-[10px] sm:text-[10.5px]">
              <thead class="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[9px] sm:text-[9.5px]">
                <tr>
                  <th class="py-1.5 px-2">Nomor Tiket</th>
                  <th class="py-1.5 px-2">Judul & Kategori</th>
                  <th class="py-1.5 px-2">Prioritas</th>
                  <th class="py-1.5 px-2">Status</th>
                  <th class="py-1.5 px-2">Teknisi IT</th>
                  <th class="py-1.5 px-2">Tanggal Dibuat</th>
                  <th class="py-1.5 px-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr
                  v-for="ticket in filteredUserTickets"
                  :key="ticket.id"
                  class="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td class="py-1.5 px-2 font-mono font-semibold text-[#0A51B0] dark:text-blue-400 whitespace-nowrap text-[9.5px] sm:text-[10px]">
                    #{{ ticket.nomor_tiket || ticket.id }}
                  </td>
                  <td class="py-1.5 px-2 min-w-[160px]">
                    <span class="font-semibold text-slate-900 dark:text-slate-100 block truncate text-[10px] sm:text-[10.5px]">
                      {{ ticket.judul }}
                    </span>
                    <span class="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 block truncate">
                      {{ ticket.kategori || 'Umum' }}
                    </span>
                  </td>
                  <td class="py-1.5 px-2 whitespace-nowrap">
                    <span
                      class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-[3px] text-[8.5px] sm:text-[9px] font-semibold"
                      :class="
                        ticket.prioritas === 'Critical'
                          ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                          : ticket.prioritas === 'High'
                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                            : ticket.prioritas === 'Medium'
                              ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                              : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                      "
                    >
                      {{ ticket.prioritas || 'Medium' }}
                    </span>
                  </td>
                  <td class="py-1.5 px-2 whitespace-nowrap">
                    <StatusBadge
                      :text="ticket.status_tiket || 'Open'"
                      :status="ticket.status_tiket || 'Open'"
                      size="sm"
                    />
                  </td>
                  <td class="py-1.5 px-2 text-slate-600 dark:text-slate-400 whitespace-nowrap text-[9px] sm:text-[9.5px]">
                    {{ ticket.assigned_to_nama || '-' }}
                  </td>
                  <td class="py-1.5 px-2 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[9px] sm:text-[9.5px]">
                    {{ formatDate(ticket.created_at || ticket.dibuat_pada) }}
                  </td>
                  <td class="py-1.5 px-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      @click="router.push('/tickets?search=' + encodeURIComponent(ticket.nomor_tiket || ''))"
                      class="h-6 px-1.5 rounded-[4px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-[9px] sm:text-[9.5px] font-medium cursor-pointer transition-colors"
                    >
                      Buka Tiket
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Tab Panel 3: Histori Log & Siklus -->
      <div v-else-if="activeProfileTab === 'logs'" class="space-y-2 sm:space-y-2.5">
        <!-- Loading State -->
        <div v-if="isLoadingCycle" class="space-y-1.5">
          <div
            v-for="i in 3"
            :key="i"
            class="h-10 rounded-[6px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 animate-pulse"
          >
            <div class="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-1.5"></div>
            <div class="h-2 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="deviceCycle.length === 0"
          class="rounded-[6px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 text-center"
        >
          <div
            class="mx-auto flex h-8 w-8 items-center justify-center rounded-[5px] bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2"
          >
            <span class="material-symbols-outlined text-[17px]">history_toggle_off</span>
          </div>
          <h3 class="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200">
            Belum Ada Log Siklus Aset
          </h3>
          <p class="text-[9.5px] sm:text-[10px] text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            Riwayat serah terima, pengembalian, pergantian, atau mutasi perangkat IT untuk akun Anda akan tercatat secara otomatis di sini.
          </p>
        </div>

        <!-- Timeline Log List -->
        <div
          v-else
          class="rounded-[6px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3 shadow-2xs space-y-2.5"
        >
          <div class="relative border-l-2 border-slate-200 dark:border-slate-800 ml-2.5 space-y-2.5 pl-3.5 sm:pl-4">
            <div
              v-for="(cycle, idx) in deviceCycle"
              :key="idx"
              class="relative group"
            >
              <!-- Circle Dot -->
              <span
                class="absolute -left-[20px] sm:-left-[23px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-white dark:bg-slate-900 border-2 border-[#0A51B0]"
              >
                <span class="h-1 w-1 rounded-full bg-[#0A51B0]"></span>
              </span>

              <!-- Content Item -->
              <div class="rounded-[5px] border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-2 sm:p-2.5">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] mb-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold text-slate-900 dark:text-white text-[10px] sm:text-[10.5px]">
                      {{ cycle.action || cycle.event || 'Aktivitas Perangkat' }}
                    </span>
                    <span
                      v-if="cycle.status || cycle.status_aset"
                      class="px-1.5 py-0.2 rounded-[3px] text-[8.5px] sm:text-[9px] font-semibold bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400"
                    >
                      {{ cycle.status || cycle.status_aset }}
                    </span>
                  </div>
                  <span class="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 font-mono">
                    {{ formatDateTime(cycle.date || cycle.created_at || cycle.dibuat_pada) }}
                  </span>
                </div>

                <div class="text-[9.5px] sm:text-[10px] text-slate-600 dark:text-slate-300 space-y-0.5">
                  <p v-if="cycle.asset_label || cycle.nomor_seri" class="font-semibold text-slate-800 dark:text-slate-200">
                    Perangkat: {{ cycle.asset_label || 'Aset' }} (S/N: {{ cycle.nomor_seri || '-' }})
                  </p>
                  <p v-if="cycle.detail || cycle.keterangan || cycle.notes">
                    {{ cycle.detail || cycle.keterangan || cycle.notes }}
                  </p>
                  <p v-if="cycle.actor || cycle.petugas_it" class="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400">
                    Petugas: {{ cycle.actor || cycle.petugas_it }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Panel 4: Keamanan & Izin Perangkat Browser -->
      <div v-else-if="activeProfileTab === 'security'" class="grid grid-cols-1 lg:grid-cols-2 gap-2.5 items-start">
        <!-- Card 1: Ganti Password Akun -->
        <div
          class="rounded-[6px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3 shadow-2xs"
        >
          <div class="mb-2.5">
            <h3 class="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[15px] text-[#0A51B0]">lock_reset</span>
              <span>Ganti Password Akun</span>
            </h3>
            <p class="text-[9.5px] sm:text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Perbarui kata sandi akun TrackIT Anda. Gunakan kombinasi minimal 8 karakter dengan huruf dan angka untuk keamanan optimal.
            </p>
          </div>

          <!-- Alert Feedback -->
          <div
            v-if="passwordSuccess"
            class="mb-2.5 rounded-[5px] border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 p-2 text-[9.5px] sm:text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[14px]">check_circle</span>
            <span>{{ passwordSuccess }}</span>
          </div>

          <div
            v-if="passwordError"
            class="mb-2.5 rounded-[5px] border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-2 text-[9.5px] sm:text-[10px] font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[14px]">error</span>
            <span>{{ passwordError }}</span>
          </div>

          <!-- Form Fields -->
          <form @submit.prevent="handleChangePassword" class="space-y-2 text-[10px] sm:text-[10.5px]">
            <div>
              <label for="current-pwd" class="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5 text-[9.5px] sm:text-[10px]">
                Password Saat Ini <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <input
                  id="current-pwd"
                  v-model="passwordForm.currentPassword"
                  :type="showCurrentPassword ? 'text' : 'password'"
                  placeholder="Masukkan password saat ini"
                  autocomplete="current-password"
                  required
                  class="w-full h-7 sm:h-7.5 pl-2 pr-7 rounded-[5px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] sm:text-[10.5px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0] transition-colors"
                />
                <button
                  type="button"
                  @click="showCurrentPassword = !showCurrentPassword"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  :title="showCurrentPassword ? 'Sembunyikan password' : 'Lihat password'"
                >
                  <span class="material-symbols-outlined text-[14px]">
                    {{ showCurrentPassword ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label for="new-pwd" class="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5 text-[9.5px] sm:text-[10px]">
                Password Baru <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <input
                  id="new-pwd"
                  v-model="passwordForm.newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  placeholder="Minimal 8 karakter"
                  autocomplete="new-password"
                  required
                  minlength="8"
                  class="w-full h-7 sm:h-7.5 pl-2 pr-7 rounded-[5px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] sm:text-[10.5px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0] transition-colors"
                />
                <button
                  type="button"
                  @click="showNewPassword = !showNewPassword"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  :title="showNewPassword ? 'Sembunyikan password' : 'Lihat password'"
                >
                  <span class="material-symbols-outlined text-[14px]">
                    {{ showNewPassword ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label for="confirm-pwd" class="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5 text-[9.5px] sm:text-[10px]">
                Konfirmasi Password Baru <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <input
                  id="confirm-pwd"
                  v-model="passwordForm.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  placeholder="Ulangi password baru"
                  autocomplete="new-password"
                  required
                  class="w-full h-7 sm:h-7.5 pl-2 pr-7 rounded-[5px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] sm:text-[10.5px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0] transition-colors"
                />
                <button
                  type="button"
                  @click="showConfirmPassword = !showConfirmPassword"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  :title="showConfirmPassword ? 'Sembunyikan password' : 'Lihat password'"
                >
                  <span class="material-symbols-outlined text-[14px]">
                    {{ showConfirmPassword ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <div class="pt-1">
              <button
                type="submit"
                :disabled="isChangingPassword"
                class="inline-flex items-center gap-1.5 h-7 sm:h-7.5 px-3 rounded-[5px] bg-[#0A51B0] hover:bg-[#0A4391] disabled:opacity-50 text-white font-semibold text-[10px] sm:text-[10.5px] transition-colors cursor-pointer shadow-2xs"
              >
                <span v-if="isChangingPassword" class="material-symbols-outlined text-[14px] animate-spin">
                  progress_activity
                </span>
                <span v-else class="material-symbols-outlined text-[14px]">save</span>
                <span>{{ isChangingPassword ? 'Menyimpan...' : 'Perbarui Password' }}</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Card 2: Izin & Akses Perangkat Browser -->
        <div
          class="rounded-[6px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3 shadow-2xs space-y-2.5"
        >
          <div>
            <h3 class="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[15px] text-[#0A51B0]">tune</span>
              <span>Izin & Akses Perangkat Browser</span>
            </h3>
            <p class="text-[9.5px] sm:text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Atur izin notifikasi desktop, nada suara Tone.js, akses kamera foto aset, dan berkas lampiran di browser Anda.
            </p>
          </div>

          <!-- Feedback Banner -->
          <div
            v-if="permissionFeedback"
            class="rounded-[5px] p-2 text-[9.5px] sm:text-[10px] font-medium flex items-center gap-1.5"
            :class="{
              'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800': permissionFeedbackType === 'success',
              'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800': permissionFeedbackType === 'error',
              'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800': permissionFeedbackType === 'info',
            }"
          >
            <span class="material-symbols-outlined text-[14px] shrink-0">
              {{ permissionFeedbackType === 'success' ? 'check_circle' : permissionFeedbackType === 'error' ? 'error' : 'info' }}
            </span>
            <span class="flex-1">{{ permissionFeedback }}</span>
          </div>

          <div class="space-y-1.5">
            <!-- 1. Notifikasi Desktop -->
            <div class="p-2 sm:p-2.5 rounded-[5px] border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-start gap-2 min-w-0">
                <div class="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-[5px] bg-blue-100 dark:bg-blue-900/40 text-[#0A51B0] dark:text-blue-300">
                  <span class="material-symbols-outlined text-[14px]">notifications</span>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold text-slate-800 dark:text-white text-[10px] sm:text-[10.5px]">Notifikasi Desktop</span>
                    <AppBadge
                      :type="notificationPermission === 'granted' ? 'success' : notificationPermission === 'denied' ? 'danger' : 'warning'"
                      :text="notificationPermission === 'granted' ? 'Diizinkan' : notificationPermission === 'denied' ? 'Diblokir' : 'Belum Aktif'"
                    />
                  </div>
                  <p class="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Peringatan pop-up di layar saat ada tiket baru atau perubahan status tiket.
                  </p>
                </div>
              </div>
              <div class="shrink-0 self-end sm:self-center">
                <button
                  v-if="notificationPermission !== 'granted'"
                  type="button"
                  @click="handleProfileEnableNotif"
                  class="h-6 px-2 rounded-[4px] bg-[#0A51B0] hover:bg-[#0A4391] text-white text-[9px] sm:text-[9.5px] font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  Aktifkan
                </button>
                <button
                  v-else
                  type="button"
                  @click="handleProfileTestNotif"
                  class="h-6 px-2 rounded-[4px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] sm:text-[9.5px] font-medium transition-colors cursor-pointer"
                >
                  Uji Coba
                </button>
              </div>
            </div>

            <!-- 2. Suara Tone.js -->
            <div class="p-2 sm:p-2.5 rounded-[5px] border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-start gap-2 min-w-0">
                <div class="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-[5px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
                  <span class="material-symbols-outlined text-[14px]">volume_up</span>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold text-slate-800 dark:text-white text-[10px] sm:text-[10.5px]">Suara Tone.js</span>
                    <AppBadge
                      :type="isSoundEnabled ? 'success' : 'neutral'"
                      :text="isSoundEnabled ? 'Suara Aktif' : 'Senyap'"
                    />
                  </div>
                  <p class="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Sintesis audio nada harmonik Tone.js saat aktivitas baru diterima.
                  </p>
                </div>
              </div>
              <div class="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
                <button
                  type="button"
                  @click="testSound"
                  class="h-6 px-1.5 rounded-[4px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] sm:text-[9.5px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                  title="Putar nada uji coba"
                >
                  <span class="material-symbols-outlined text-[12px]">music_note</span>
                  <span>Tes Suara</span>
                </button>
                <button
                  type="button"
                  @click="toggleSound"
                  class="h-6 px-1.5 rounded-[4px] text-[9px] sm:text-[9.5px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                  :class="isSoundEnabled ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'"
                >
                  <span class="material-symbols-outlined text-[12px]">
                    {{ isSoundEnabled ? 'volume_up' : 'volume_off' }}
                  </span>
                  <span>{{ isSoundEnabled ? 'On' : 'Mute' }}</span>
                </button>
              </div>
            </div>

            <!-- 3. Kamera & Foto -->
            <div class="p-2 sm:p-2.5 rounded-[5px] border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-start gap-2 min-w-0">
                <div class="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-[5px] bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300">
                  <span class="material-symbols-outlined text-[14px]">photo_camera</span>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold text-slate-800 dark:text-white text-[10px] sm:text-[10.5px]">Kamera & Foto Aset</span>
                    <AppBadge
                      :type="cameraPermission === 'granted' ? 'success' : cameraPermission === 'denied' ? 'danger' : 'neutral'"
                      :text="cameraPermission === 'granted' ? 'Diizinkan' : cameraPermission === 'denied' ? 'Ditolak' : 'Tersedia'"
                    />
                  </div>
                  <p class="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Ambil foto langsung kondisi perangkat rusak ke lampiran tiket.
                  </p>
                </div>
              </div>
              <div class="shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  @click="handleProfileCamera"
                  class="h-6 px-2 rounded-[4px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] sm:text-[9.5px] font-medium transition-colors cursor-pointer"
                >
                  Uji Kamera
                </button>
              </div>
            </div>

            <!-- 4. Berkas & Clipboard -->
            <div class="p-2 sm:p-2.5 rounded-[5px] border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-start gap-2 min-w-0">
                <div class="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-[5px] bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300">
                  <span class="material-symbols-outlined text-[14px]">attachment</span>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-bold text-slate-800 dark:text-white text-[10px] sm:text-[10.5px]">Akses File & Clipboard</span>
                    <AppBadge
                      type="success"
                      text="Mendukung File & Paste"
                    />
                  </div>
                  <p class="text-[9px] sm:text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Unggah berkas dokumen/gambar dan paste screenshot dari clipboard (Ctrl+V).
                  </p>
                </div>
              </div>
              <div class="shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  @click="handleProfileClipboard"
                  class="h-6 px-2 rounded-[4px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] sm:text-[9.5px] font-medium transition-colors cursor-pointer"
                >
                  Uji Clipboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Panel 5: Direktori Karyawan (Admin RBAC / Tim & Org Chart) -->
      <div v-else-if="activeProfileTab === 'directory' && canAccessDirectoryTab">
        <MyAssetsEmployeeList
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
          :current-user="user"
          :is-super-admin="isSuperAdmin"
          :all-employees="employees"
          :my-subordinates="mySubordinates"
          :has-subordinates="hasSubordinates"
          @update:employee-search="employeeSearch = $event"
          @update:filter-departemen="filterDepartemen = $event"
          @update:filter-lokasi="filterLokasi = $event"
          @update:current-page-employees="currentPageEmployees = $event"
          @select-employee="goToLevel2"
          @refresh="fetchEmployees"
          @open-filter="showFilterModal = true"
        />
      </div>
    </template>

    <template v-else-if="currentLevel === 2 && selectedEmployee">
      <!-- Interactive Breadcrumb & Back Navigation -->
      <div class="flex items-center justify-between gap-2.5 min-w-0">
        <nav
          class="flex items-center gap-1.5 text-[10px] sm:text-[10.5px] min-w-0 overflow-hidden"
          aria-label="Breadcrumb"
        >
          <button
            v-if="canAccessDirectoryTab"
            type="button"
            @click="goToLevel1"
            class="font-medium text-[#5F7089] hover:text-[#333333] dark:text-slate-400 dark:hover:text-white transition-colors shrink-0"
          >
            Profil
          </button>
          <span v-else class="font-medium text-[#5F7089] dark:text-slate-400 shrink-0">Profil</span>
          <span
            aria-hidden="true"
            class="material-symbols-outlined text-[12px] sm:text-[13px] text-[#CBD5E1] dark:text-slate-600 shrink-0"
            >chevron_right</span
          >
          <span class="font-bold text-[#333333] dark:text-white truncate">{{
            selectedEmployee.nama_karyawan
          }}</span>
        </nav>

        <button
          v-if="canAccessDirectoryTab"
          type="button"
          @click="goToLevel1"
          class="flex items-center gap-1 shrink-0 h-7 sm:h-7.5 rounded-[5px] border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 px-2 sm:px-2.5 text-[10px] sm:text-[10.5px] font-medium text-[#475569] dark:text-slate-300 hover:bg-[#F8FAFC] dark:hover:bg-slate-700 hover:text-[#333333] dark:hover:text-white transition-all cursor-pointer shadow-2xs touch-manipulation"
          title="Kembali ke Profil"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[14px]">arrow_back</span>
          <span class="hidden xs:inline">Kembali</span>
        </button>
      </div>

      <!-- Employee Hero Profile Identity Header -->
      <div
        class="employee-profile rounded-[6px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-2 sm:p-2.5 shadow-2xs flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-start sm:items-center gap-2 sm:gap-2.5 min-w-0">
          <div
            class="flex h-7.5 w-7.5 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-[5px] bg-gradient-to-br from-[#0A51B0] to-[#0A4391] text-[10px] sm:text-[11px] font-bold text-white shadow-2xs"
          >
            {{ getInitials(selectedEmployee.nama_karyawan) }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <h1 class="text-[11px] sm:text-xs font-semibold text-[#333333] dark:text-white tracking-tight truncate">
                {{ selectedEmployee.nama_karyawan }}
              </h1>
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
            <p class="text-[9.5px] sm:text-[10px] font-medium text-[#475569] dark:text-slate-400 mt-0.5 truncate">
              {{ selectedEmployee.jabatan || selectedEmployee.title || 'Staff' }}
            </p>
            <div class="mt-1 flex flex-wrap items-center gap-1 text-[9px] sm:text-[9.5px] text-[#5F7089] dark:text-slate-400">
              <span
                class="inline-flex items-center h-4.5 sm:h-5 px-1.5 rounded bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 font-mono font-medium text-[#333333] dark:text-white leading-none"
              >
                NIK: {{ selectedEmployee.nik }}
              </span>
              <span
                v-if="selectedEmployee.departemen"
                class="inline-flex items-center h-4.5 sm:h-5 px-1.5 rounded bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-300 leading-none"
              >
                {{ selectedEmployee.departemen }}
              </span>
              <span
                v-if="selectedEmployee.lokasi_kerja"
                class="inline-flex items-center gap-1 h-4.5 sm:h-5 px-1.5 rounded bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-300 leading-none"
              >
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[11px] text-[#687281] dark:text-slate-400 leading-none shrink-0"
                  >location_on</span
                >
                {{ selectedEmployee.lokasi_kerja }}
              </span>
              <span
                v-if="selectedEmployee.email_kantor"
                class="inline-flex items-center h-4.5 sm:h-5 px-1.5 rounded bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-300 leading-none truncate max-w-[180px]"
              >
                {{ selectedEmployee.email_kantor }}
              </span>
            </div>
          </div>
        </div>

        <!-- Employee Summary Stat Badges -->
        <div
          class="grid grid-cols-2 sm:flex sm:items-stretch gap-1 sm:gap-1.5 shrink-0 border-t border-[#F1F5F9] dark:border-slate-800 pt-1.5 sm:border-t-0 sm:pt-0"
        >
          <div
            class="flex flex-col justify-center h-auto min-w-[80px] sm:min-w-[90px] rounded-[5px] bg-[#F8FAFC] dark:bg-slate-800 px-2 py-1 border border-[#E2E8F0] dark:border-slate-700 text-center sm:text-right shadow-2xs"
          >
            <span
              class="block text-[8px] sm:text-[8.5px] font-medium uppercase tracking-wider text-[#5F7089] dark:text-slate-400 leading-tight"
              >Total aset</span
            >
            <span
              class="font-num text-[11px] sm:text-[12px] font-semibold text-[#333333] dark:text-white leading-snug mt-0.5 block"
              >{{ myAssets.length }} Unit</span
            >
          </div>
          <div
            class="flex flex-col justify-center h-auto min-w-[80px] sm:min-w-[90px] rounded-[5px] bg-[#F8FAFC] dark:bg-slate-800 px-2 py-1 border border-[#E2E8F0] dark:border-slate-700 text-center sm:text-right shadow-2xs"
          >
            <span
              class="block text-[8px] sm:text-[8.5px] font-medium uppercase tracking-wider text-[#5F7089] dark:text-slate-400 leading-tight"
              >Penugasan awal</span
            >
            <span
              class="font-num text-[10px] sm:text-[10.5px] font-semibold text-[#333333] dark:text-white leading-snug mt-0.5 block truncate"
              >{{ employeeAssignedSince }}</span
            >
          </div>
        </div>
      </div>

      <!-- KPI Cards: MyAssets Summary -->
      <div class="myassets-kpi-grid grid grid-cols-3 gap-1.5 sm:gap-2">
        <StatCard
          title="Total aset saya"
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
          title="Stok tersedia"
          :value="
            filteredAssets.filter((a) =>
              ['tersedia', 'stok', 'stock'].includes((a.status_aset || '').toLowerCase()),
            ).length
          "
          icon="inventory"
          color="neutral"
          subtitle="Aset dalam stok"
        />
      </div>

      <!-- Section: Assigned Assets -->
      <div class="flex flex-col gap-2 sm:gap-2.5">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
          <div class="flex items-center gap-1.5">
            <span aria-hidden="true" class="material-symbols-outlined text-[15px] text-[#333333]"
              >inventory_2</span
            >
            <h3 class="text-[11px] sm:text-xs font-bold text-[#333333]">Aset yang ditugaskan</h3>
            <span class="rounded-full bg-[#EFF6FF] px-1.5 py-0.2 text-[8.5px] sm:text-[9px] font-bold text-[#333333]">
              {{ myAssets.length }}
            </span>
          </div>

          <!-- Quick Search Assets inside Employee -->
          <div v-if="myAssets.length > 0" class="relative w-full sm:w-auto sm:min-w-[180px]">
            <span
              aria-hidden="true"
              class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-[#687281] pointer-events-none"
              >search</span
            >
            <input
              v-model="assetSearch"
              type="text"
              placeholder="Cari label / serial..."
              class="h-7 sm:h-7.5 w-full rounded-[5px] border border-[#E2E8F0] bg-white pl-6.5 pr-6 text-[10px] sm:text-[10.5px] text-[#333333] focus:border-[#0A51B0] focus:outline-none shadow-2xs"
            />
            <button
              v-if="assetSearch"
              type="button"
              @click="assetSearch = ''"
              aria-label="Bersihkan"
              class="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full text-[#687281] hover:bg-[#F1F5F9] hover:text-[#333333] cursor-pointer"
            >
              <span aria-hidden="true" class="material-symbols-outlined text-[12px]">close</span>
            </button>
          </div>
        </div>

        <!-- Loading Assets -->
        <div
          v-if="isLoadingAssets"
          class="flex flex-col items-center justify-center py-8 text-[#5F7089] rounded-[6px] border border-[#E2E8F0] bg-white"
        >
          <div
            class="h-4 w-4 animate-spin rounded-full border-2 border-[#0A51B0] border-t-transparent mb-1"
          ></div>
          <p class="text-[10px] sm:text-[10.5px] font-semibold">Memuat aset terassigned...</p>
        </div>

        <!-- Error Assets -->
        <div
          v-else-if="assetError"
          class="p-2 text-center text-rose-600 text-[10px] sm:text-[10.5px] rounded-[6px] border border-[#E2E8F0] bg-white"
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
          class="flex flex-col items-center justify-center gap-1 py-5 px-3 text-center rounded-[6px] border border-[#FEF3C7] bg-[#FFFBEB]"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[24px] text-[#D97706]"
            >account_box_off</span
          >
          <h4 class="text-[11px] sm:text-xs font-bold text-[#92400E]">
            Akun Belum Terhubung dengan Data Karyawan
          </h4>
          <p class="max-w-md text-[9.5px] sm:text-[10px] text-[#B45309]">
            Akun Anda (<strong>{{ selectedEmployee.email_kantor }}</strong
            >) belum terhubung ke Master Data Karyawan. Silakan hubungi Administrator IT untuk
            mendaftarkan email Anda.
          </p>
        </div>

        <!-- Empty State: No Assets -->
        <div
          v-else-if="myAssets.length === 0"
          class="flex flex-col items-center justify-center gap-1 py-6 px-3 text-center rounded-[6px] border border-[#E2E8F0] bg-white"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[24px] text-[#CBD5E1]"
            >devices_off</span
          >
          <h4 class="text-[11px] sm:text-xs font-semibold text-[#333333]">Belum Ada Aset yang ditugaskan</h4>
          <p class="max-w-xs text-[9.5px] sm:text-[10px] text-[#5F7089]">
            Tidak ada aset IT yang terdaftar atas nama {{ selectedEmployee.nama_karyawan }}.
          </p>
        </div>

        <!-- Assigned Asset Cards Grid -->
        <div
          v-else
          class="assigned-assets-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-2.5"
        >
          <div
            v-for="asset in paginatedAssets"
            :key="asset.id_aset"
            @click="goToLevel3(asset)"
            tabindex="0"
            @keydown.enter.self="goToLevel3(asset)"
            @keydown.space.prevent.self="goToLevel3(asset)"
            aria-label="Lihat detail dan riwayat aset"
            class="assigned-asset-card group relative flex flex-col justify-between rounded-[6px] border border-[#E2E8F0] bg-white p-2 sm:p-2.5 shadow-2xs hover:border-[#0A51B0] hover:shadow-md active:scale-[0.99] transition-all duration-200 cursor-pointer touch-manipulation"
          >
            <div>
              <!-- Top Row: Device Icon & Status Pill -->
              <div class="flex items-center justify-between gap-1.5 mb-1.5">
                <div
                  class="flex h-6.5 w-6.5 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-[5px] bg-[#EFF6FF] text-[#333333]"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[14px] sm:text-[15px]">{{
                    getDeviceIcon(asset.tipe_perangkat)
                  }}</span>
                </div>
                <StatusBadge
                  :status="asset.status_aset"
                  :text="formatStatusPill(asset.status_aset).label"
                  size="sm"
                />
              </div>

              <!-- Asset Label & Serial Number -->
              <h4
                class="text-[10.5px] sm:text-[11px] font-semibold text-[#333333] leading-snug group-hover:text-[#333333] transition-colors truncate"
              >
                {{
                  asset.label_aset ||
                  [asset.merek, asset.model].filter(Boolean).join(' ') ||
                  'Aset IT'
                }}
              </h4>
              <div class="mt-0.5 flex items-center justify-between text-[8.5px] sm:text-[9px] text-[#5F7089]">
                <span class="font-mono font-medium truncate"
                  >SN: {{ asset.nomor_seri || '-' }}</span
                >
                <span class="font-mono text-[8.5px] text-[#687281] shrink-0"
                  >AST-IT-{{ String(asset.id_aset).padStart(5, '0') }}</span
                >
              </div>

              <!-- Specs Grid -->
              <div class="mt-2 pt-1.5 border-t border-[#F1F5F9] grid grid-cols-2 gap-1 text-[9px] sm:text-[9.5px]">
                <div>
                  <span class="block text-[8px] sm:text-[8.5px] font-semibold uppercase text-[#687281]">Tipe</span>
                  <span class="font-medium text-[#333333] truncate block mt-0.5">{{
                    asset.tipe_perangkat || '-'
                  }}</span>
                </div>
                <div>
                  <span class="block text-[8px] sm:text-[8.5px] font-semibold uppercase text-[#687281]"
                    >Merek / Model</span
                  >
                  <span class="font-medium text-[#333333] truncate block mt-0.5">{{
                    [asset.merek, asset.model].filter(Boolean).join(' ') || '-'
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Bottom Trigger link -->
            <div
              class="mt-2 pt-1.5 border-t border-[#F1F5F9] flex items-center justify-between text-[9px] sm:text-[9.5px] font-semibold text-[#333333]"
            >
              <span>Lihat detail & riwayat</span>
              <span
                aria-hidden="true"
                class="material-symbols-outlined text-[13px] group-hover:translate-x-1 transition-transform"
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
      <div class="flex items-center justify-between gap-2 min-w-0">
        <!-- Desktop Breadcrumb (>= sm) -->
        <nav
          class="hidden sm:flex items-center gap-1 text-[10px] sm:text-[10.5px] min-w-0 overflow-hidden"
          aria-label="Breadcrumb"
        >
          <button
            v-if="canBrowseOtherAssets"
            type="button"
            @click="goToLevel1"
            class="font-medium text-[#5F7089] hover:text-[#333333] dark:text-slate-400 dark:hover:text-white transition-colors shrink-0"
          >
            Profil
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
            class="material-symbols-outlined text-[12px] text-[#CBD5E1] shrink-0"
            >chevron_right</span
          >
          <span class="font-bold text-[#333333] truncate">{{
            selectedAsset.label_aset || selectedAsset.nomor_seri
          }}</span>
          <span
            aria-hidden="true"
            class="material-symbols-outlined text-[12px] text-[#CBD5E1] shrink-0"
            >chevron_right</span
          >
          <span class="font-semibold text-[#5F7089] shrink-0">Audit History</span>
        </nav>

        <!-- Mobile Breadcrumb / Back Button (< sm) -->
        <button
          type="button"
          @click="currentLevel = 2"
          class="sm:hidden flex items-center gap-1 text-[10px] font-semibold text-[#333333] truncate"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[14px]">arrow_back</span>
          <span class="truncate">Kembali ke {{ selectedEmployee.nama_karyawan }}</span>
        </button>

        <button
          type="button"
          @click="currentLevel = 2"
          class="hidden sm:flex items-center gap-1 h-6.5 sm:h-7 rounded-[5px] border border-[#E2E8F0] bg-white px-2 text-[10px] sm:text-[10.5px] font-medium text-[#475569] hover:bg-[#F8FAFC] hover:text-[#333333] transition-all cursor-pointer shadow-2xs touch-manipulation shrink-0"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[14px]">arrow_back</span>
          <span>Kembali ke Detail Karyawan</span>
        </button>
      </div>

      <!-- Asset Title Header Banner -->
      <div
        class="asset-profile-banner rounded-[6px] border border-[#E2E8F0] bg-white p-2 sm:p-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2.5"
      >
        <div class="flex items-start sm:items-center gap-2 sm:gap-2.5 min-w-0">
          <div
            class="flex h-7.5 w-7.5 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-[5px] bg-[#EFF6FF] text-[#333333]"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[16px]">{{
              getDeviceIcon(selectedAsset.tipe_perangkat)
            }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <h1 class="text-[11px] sm:text-xs font-semibold text-[#333333] tracking-tight truncate">
                {{
                  selectedAsset.label_aset ||
                  [selectedAsset.merek, selectedAsset.model].filter(Boolean).join(' ') ||
                  'Aset IT'
                }}
              </h1>
              <AppBadge
                :type="getStatusBadgeType(selectedAsset.status_aset)"
                :text="selectedAsset.status_aset || 'In Use'"
              />
            </div>
            <div class="mt-0.5 flex flex-wrap items-center gap-1 text-[8.5px] sm:text-[9px] text-[#5F7089]">
              <span
                class="inline-flex items-center font-mono font-medium px-1.5 py-0.2 rounded bg-[#F1F5F9] text-[#333333]"
              >
                AST-IT-{{ String(selectedAsset.id_aset).padStart(5, '0') }}
              </span>
              <span
                class="inline-flex items-center font-mono px-1.5 py-0.2 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569]"
              >
                SN: {{ selectedAsset.nomor_seri || '-' }}
              </span>
              <span
                class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569]"
              >
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[10px] text-[#687281]"
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
          class="w-full sm:w-auto h-6.5 sm:h-7 inline-flex items-center justify-center gap-1 rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] px-2 text-[10px] sm:text-[10.5px] font-medium text-[#333333] hover:bg-[#EFF6FF] cursor-pointer transition-colors shadow-2xs touch-manipulation shrink-0"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[14px]">description</span>
          <span>Lihat Spesifikasi</span>
        </button>
      </div>

      <!-- Main Two-Column View: Specs Grid (Left) & Audit Timeline (Right) -->
      <div class="asset-audit-layout grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
        <!-- LEFT COLUMN: Asset Metadata Grid (lg:col-span-6) -->
        <div class="lg:col-span-6 flex flex-col gap-2.5">
          <!-- Information Card -->
          <div class="rounded-[6px] border border-[#E2E8F0] bg-white p-2.5 sm:p-3 shadow-2xs">
            <div class="flex items-center gap-1 pb-1.5 mb-2 border-b border-[#F1F5F9]">
              <span aria-hidden="true" class="material-symbols-outlined text-[14px] text-[#333333]"
                >info</span
              >
              <h3 class="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-[#333333]">
                Informasi Perangkat
              </h3>
            </div>

            <dl class="grid grid-cols-2 gap-2 text-[10px] sm:text-[10.5px]">
              <div>
                <dt class="text-[8px] sm:text-[8.5px] font-semibold uppercase text-[#687281]">Tipe Perangkat</dt>
                <dd class="mt-0.5 font-semibold text-[#333333] truncate">
                  {{ selectedAsset.tipe_perangkat || '-' }}
                </dd>
              </div>

              <div>
                <dt class="text-[8px] sm:text-[8.5px] font-semibold uppercase text-[#687281]">Brand / Merek</dt>
                <dd class="mt-0.5 font-semibold text-[#333333] truncate">
                  {{ selectedAsset.merek || '-' }}
                </dd>
              </div>

              <div>
                <dt class="text-[8px] sm:text-[8.5px] font-semibold uppercase text-[#687281]">Model</dt>
                <dd class="mt-0.5 font-semibold text-[#333333] truncate">
                  {{ selectedAsset.model || '-' }}
                </dd>
              </div>

              <div>
                <dt class="text-[8px] sm:text-[8.5px] font-semibold uppercase text-[#687281]">Serial Number</dt>
                <dd class="mt-0.5 font-mono font-medium text-[#333333] truncate">
                  {{ selectedAsset.nomor_seri || '-' }}
                </dd>
              </div>

              <div>
                <dt class="text-[8px] sm:text-[8.5px] font-semibold uppercase text-[#687281]">Kode / ID Aset</dt>
                <dd class="mt-0.5 font-mono font-medium text-[#333333] truncate">
                  AST-IT-{{ String(selectedAsset.id_aset).padStart(5, '0') }}
                </dd>
              </div>

              <div>
                <dt class="text-[8px] sm:text-[8.5px] font-semibold uppercase text-[#687281]">Lokasi Aset</dt>
                <dd class="mt-0.5 font-semibold text-[#333333] truncate">
                  {{ selectedAsset.lokasi_aset || selectedEmployee.lokasi_kerja || '-' }}
                </dd>
              </div>

              <div>
                <dt class="text-[8px] sm:text-[8.5px] font-semibold uppercase text-[#687281]">Status Pemakaian</dt>
                <dd class="mt-0.5">
                  <AppBadge
                    :type="getStatusBadgeType(selectedAsset.status_aset)"
                    :text="selectedAsset.status_aset || '-'"
                  />
                </dd>
              </div>

              <div>
                <dt class="text-[8px] sm:text-[8.5px] font-semibold uppercase text-[#687281]">
                  Kondisi Perangkat
                </dt>
                <dd class="mt-0.5 font-semibold text-[#333333] truncate">
                  {{ selectedAsset.kondisi_aset || 'Normal' }}
                </dd>
              </div>
            </dl>
          </div>

          <!-- Current Holder Identity Card -->
          <div class="rounded-[6px] border border-[#E2E8F0] bg-white p-2.5 sm:p-3 shadow-2xs">
            <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-[#F1F5F9]">
              <div class="flex items-center gap-1">
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[14px] text-[#059669]"
                  >person_pin</span
                >
                <h3 class="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-[#333333]">
                  Pemegang Aktif saat ini
                </h3>
              </div>
              <span
                class="rounded-full bg-[#ECFDF5] px-1.5 py-0.2 text-[8.5px] sm:text-[9px] font-semibold text-[#059669]"
                >Active Holder</span
              >
            </div>

            <div class="flex items-center gap-2">
              <div
                class="flex h-7 w-7 sm:h-7.5 sm:w-7.5 shrink-0 items-center justify-center rounded-[5px] bg-gradient-to-br from-[#0A51B0] to-[#0A4391] text-[10px] sm:text-[10.5px] font-bold text-white shadow-2xs"
              >
                {{ getInitials(selectedEmployee.nama_karyawan) }}
              </div>
              <div class="min-w-0 flex-1 text-[10px]">
                <h4 class="font-bold text-[10.5px] sm:text-[11px] text-[#333333] truncate">
                  {{ selectedEmployee.nama_karyawan }}
                </h4>
                <p class="text-[#5F7089] font-medium text-[9px] sm:text-[9.5px] truncate mt-0.5">
                  {{ selectedEmployee.jabatan || 'Staff' }} ·
                  {{ selectedEmployee.departemen || '-' }}
                </p>
                <p class="font-mono text-[9px] sm:text-[9.5px] text-[#687281] mt-0.5">
                  NIK: {{ selectedEmployee.nik }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Modern SaaS Audit Timeline (lg:col-span-6) -->
        <div
          class="lg:col-span-6 rounded-[6px] border border-[#E2E8F0] bg-white p-2.5 sm:p-3 shadow-2xs"
        >
          <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-[#F1F5F9]">
            <div class="flex items-center gap-1">
              <span aria-hidden="true" class="material-symbols-outlined text-[14px] text-[#7C3AED]"
                >history</span
              >
              <h3 class="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-[#333333]">
                Audit Timeline & Log History
              </h3>
            </div>
            <span class="text-[9px] sm:text-[9.5px] font-semibold text-[#5F7089]"
              >{{ assetHistoryTimeline.length }} Peristiwa</span
            >
          </div>

          <!-- Loading logs indicator -->
          <div v-if="isLoadingLogs" class="py-5 text-center text-[10px] text-[#5F7089]">
            <div
              class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#7C3AED] border-t-transparent mx-auto mb-1"
            ></div>
            Memuat riwayat log...
          </div>

          <!-- Audit Timeline Activity Stream -->
          <div v-else class="relative border-l border-[#E2E8F0] pl-3 ml-2 sm:ml-2 space-y-2">
            <div v-for="(log, idx) in assetHistoryTimeline" :key="idx" class="relative group">
              <!-- Timeline Node Dot -->
              <div
                class="absolute -left-[17px] top-1 h-2 w-2 rounded-full border border-white ring-1 ring-white"
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
              <div class="rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-[9.5px] sm:text-[10px]">
                <div
                  class="flex items-center justify-between gap-1.5 text-[8.5px] sm:text-[9px] text-[#5F7089] mb-0.5"
                >
                  <span class="font-medium">{{ formatDateTime(log.date) }}</span>
                  <span class="font-semibold text-[#475569] truncate">Oleh: {{ log.actor }}</span>
                </div>

                <h4 class="font-bold text-[10px] sm:text-[10.5px] text-[#333333] leading-snug">
                  {{ log.action }}
                </h4>

                <p class="text-[9px] sm:text-[9.5px] text-[#475569] mt-0.5 leading-relaxed">
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
      <div v-if="activeModalAsset" class="space-y-2.5">
        <div class="flex items-center gap-2 rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-2">
          <div
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-[#EFF6FF] text-[#333333]"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[16px]">{{
              getDeviceIcon(activeModalAsset.tipe_perangkat)
            }}</span>
          </div>
          <div class="min-w-0">
            <h4 class="font-bold text-[10.5px] sm:text-[11px] text-[#333333] truncate">
              {{ activeModalAsset.label_aset || activeModalAsset.merek || 'Aset IT' }}
            </h4>
            <p class="font-mono text-[9px] sm:text-[9.5px] text-[#5F7089] mt-0.5">
              SN: {{ activeModalAsset.nomor_seri || '-' }}
            </p>
          </div>
        </div>

        <div>
          <label class="block text-[9px] sm:text-[9.5px] font-semibold uppercase text-[#5F7089] mb-0.5">
            Spesifikasi Detail
          </label>
          <div
            class="min-h-16 whitespace-pre-wrap rounded-[5px] border border-[#E2E8F0] bg-white p-2 text-[10px] sm:text-[10.5px] text-[#333333] leading-relaxed"
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
            class="h-6.5 sm:h-7 rounded-[5px] bg-[#0A51B0] px-3 text-[10px] sm:text-[10.5px] font-semibold text-white hover:bg-[#0A4391] cursor-pointer transition-colors"
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
  padding: 8px 10px;
  border-radius: 6px;
  box-shadow: none;
  background: #fff;
}
.assigned-asset-card {
  padding: 8px 10px;
  box-shadow: none;
  border-radius: 6px;
}
.assigned-asset-card:hover {
  border-color: #9fb8da;
  box-shadow: 0 2px 8px #172b4d08;
  transform: none;
}
.assigned-asset-card h4 {
  font-size: 10.5px;
  line-height: 1.35;
  font-weight: 650;
}
.assigned-asset-card h4 + div {
  flex-wrap: wrap;
  gap: 6px;
}
.assigned-asset-card > div:last-child {
  color: #0a5dbd;
  padding-top: 6px;
  margin-top: 8px;
  min-height: 24px;
}
.asset-audit-layout > div {
  min-width: 0;
}
.asset-audit-layout > div > div {
  border-radius: 6px;
  box-shadow: none;
}
.asset-audit-layout dl {
  gap: 8px;
}
.asset-audit-layout dl > div {
  min-width: 0;
  padding-bottom: 4px;
  border-bottom: 1px solid #edf1f6;
}
.asset-audit-layout dd {
  overflow-wrap: anywhere;
  line-height: 1.4;
}
.asset-audit-layout dt {
  color: #637288;
  font-weight: 500;
  text-transform: none;
}
.asset-audit-layout h3 {
  text-transform: none;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

@media (max-width: 767px) {
  .employee-profile,
  .asset-profile-banner {
    padding: 6px 8px;
  }
  .assigned-asset-card {
    padding: 6px 8px;
  }
  .assigned-asset-card h4 {
    font-size: 9.5px;
  }
  .asset-profile-banner > button {
    min-height: 26px;
  }
  .asset-audit-layout dl {
    gap: 6px;
  }
  .asset-audit-layout h3 {
    font-size: 9.5px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .assigned-asset-card {
    transition: none;
  }
}
</style>

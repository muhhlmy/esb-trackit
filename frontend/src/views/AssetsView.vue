<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import { useAuth } from '../composables/useAuth.js'
import { animateStagger } from '../composables/useGsap.js'
import { downloadAssetsCsv } from '../utils/exportAssetsCsv.js'
import { downloadAssetsPdf } from '../utils/exportAssetsPdf.js'
import { ASSET_STATUSES, formatStatusPill, getAssetStatusLabel } from '../utils/assetStatus.js'
import { normalizeLocation } from '../utils/locationNormalizer.js'
import AppModal from '../components/ui/AppModal.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import SearchableSelect from '../components/ui/SearchableSelect.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import AppRowActions from '../components/ui/AppRowActions.vue'
import AppImportModal from '../components/ui/AppImportModal.vue'
import AssetLabelModal from '../components/common/AssetLabelModal.vue'
import AppPagination from '../components/ui/AppPagination.vue'
import BaseSkeleton from '../components/ui/skeleton/BaseSkeleton.vue'
import SkeletonAvatar from '../components/ui/skeleton/SkeletonAvatar.vue'
import SkeletonTable from '../components/ui/skeleton/SkeletonTable.vue'

const { get, post, put, del } = useApi()
const { isAdmin, isSuperAdmin, hasWritePermission } = useAuth()
const route = useRoute()
const router = useRouter()
const canWriteAssets = computed(() => hasWritePermission('assets'))

const assets = ref([])
const employees = ref([])
const locations = ref([])
const showImportModal = ref(false)
const currentPage = ref(1)
const itemsPerPage = ref(10)

function onImported() {
  showImportModal.value = false
  fetchData()
  notification.value = { message: 'Data Excel berhasil diimpor ke database!', type: 'success' }
}
const isLoading = ref(true)
const isSubmitting = ref(false)
const isExporting = ref(false)
const pageError = ref('')
const modalError = ref('')
const notification = ref(null)
const searchQuery = ref('')
const filterStatus = ref('')
const filterTipe = ref('')
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const showDetailsModal = ref(false)
const showSpecificationModal = ref(false)
const showExportModal = ref(false)
const showLabelModal = ref(false)
const selectedLabelAsset = ref(null)

function openLabelModal(asset) {
  selectedLabelAsset.value = asset
  showLabelModal.value = true
}
const exportFormat = ref('csv')
const exportStatus = ref('')
const exportTipe = ref('')
const modalMode = ref('add')
const selectedAsset = ref(null)
const detailsTab = ref('info')
const activeTab = ref('info')
const deviceLogs = ref([])
const isLoadingLogs = ref(false)

const emptyForm = () => ({
  hostname: '',
  serial_number: '',
  spesifikasi: '',
  nik_pemegang_asset: '',
  nama_karyawan_pemegang_asset: '',
  departemen_pemegang_asset: '',
  lokasi_asset: '',
  tipe_perangkat: '',
  brand_merek: '',
  model: '',
  status: 'In Use',
  kondisi: 'Normal',
  note_asset: '',
})

const form = ref(emptyForm())
const statusOptions = ['In Use', 'Stock', 'Damaged', 'In Service', 'Disposal']
const kondisiOptions = ['Baru', 'Normal', 'Rusak Ringan', 'Rusak Sedang', 'Rusak Berat']
const tipeOptions = [
  'Laptop',
  'Desktop',
  'Server',
  'Printer',
  'Network Device',
  'Monitor',
  'Smartphone',
  'Tablet',
  'Lainnya',
]
const brandOptions = [
  'Lenovo',
  'HP',
  'Dell',
  'Apple',
  'Asus',
  'Acer',
  'Samsung',
  'Cisco',
  'APC',
  'Logitech',
  'Epson',
  'MikroTik',
  'Ubiquiti',
  'Lainnya',
]
const defaultLocations = [
  'Solo',
  'Pluit',
  'Gading Serpong',
  'Surabaya',
  'Bandung',
  'Medan',
  'Semarang',
  'Malang',
  'Bali',
  'Yogyakarta',
  'Makassar',
  'Balikpapan',
  'Pontianak',
  'Palembang',
  'Batam',
  'Bekasi',
]

function mergeOptions(defaults, values) {
  return [...new Set([...defaults, ...values.filter(Boolean)])]
}

const availableStatusOptions = computed(() => mergeOptions(statusOptions, [form.value.status_aset]))
const availableKondisiOptions = computed(() =>
  mergeOptions(kondisiOptions, [form.value.kondisi_aset]),
)
const availableTipeOptions = computed(() => mergeOptions(tipeOptions, [form.value.tipe_perangkat]))
const brandSelectOptions = computed(() =>
  mergeOptions(brandOptions, [...assets.value.map((a) => a.merek), form.value.merek]).map((b) => ({
    value: b,
    label: b,
  })),
)
const locationOptions = computed(() =>
  mergeOptions(
    defaultLocations.map(normalizeLocation),
    [
      ...assets.value.map((a) => a.lokasi_asset || a.lokasi_aset || a.lokasi_kerja),
      form.value.lokasi_asset || form.value.lokasi_aset,
    ].map(normalizeLocation),
  ).map((loc) => ({ value: loc, label: loc })),
)

const filterStatusOptions = computed(() => [
  { value: '', label: 'Semua Status' },
  ...ASSET_STATUSES.map((s) => ({ value: s.value, label: s.label })),
])

const filteredAssets = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('id-ID')
  return assets.value.filter((asset) => {
    const searchable = [
      asset.id_aset,
      asset.nomor_seri,
      asset.label_aset,
      asset.spesifikasi,
      asset.nik,
      asset.nama_karyawan,
      asset.departemen,
      asset.lokasi_kerja,
      asset.lokasi_aset,
      asset.tipe_perangkat,
      asset.merek,
      asset.model,
      asset.status_aset,
      asset.kondisi_aset,
      asset.catatan_aset,
    ]
      .join(' ')
      .toLocaleLowerCase('id-ID')
    return (
      (!query || searchable.includes(query)) &&
      (!filterStatus.value || asset.status_aset === filterStatus.value) &&
      (!filterTipe.value || asset.tipe_perangkat === filterTipe.value)
    )
  })
})

const isStep1Valid = computed(() => {
  return Boolean(
    form.value.hostname &&
    form.value.hostname.trim() &&
    form.value.serial_number &&
    form.value.serial_number.trim() &&
    form.value.tipe_perangkat,
  )
})

const isStep2Valid = computed(() => {
  return Boolean(form.value.lokasi_asset)
})

function getEmployeeInitials(name) {
  if (!name) return 'IT'
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function clearEmployee() {
  form.value.nik_pemegang_asset = ''
  form.value.nama_karyawan_pemegang_asset = ''
  form.value.departemen_pemegang_asset = ''
}

function selectStep(targetStep) {
  if (targetStep === 'info') {
    activeTab.value = 'info'
    modalError.value = ''
    return
  }
  if (targetStep === 'placement') {
    if (!isStep1Valid.value) {
      modalError.value =
        'Mohon lengkapi Hostname, Serial Number, dan Tipe Perangkat terlebih dahulu.'
      return
    }
    activeTab.value = 'placement'
    modalError.value = ''
    return
  }
  if (targetStep === 'specifications') {
    if (!isStep1Valid.value) {
      modalError.value = 'Mohon lengkapi data Informasi Perangkat terlebih dahulu.'
      activeTab.value = 'info'
      return
    }
    if (!isStep2Valid.value) {
      modalError.value = 'Lokasi penempatan aset wajib dipilih terlebih dahulu.'
      activeTab.value = 'placement'
      return
    }
    activeTab.value = 'specifications'
    modalError.value = ''
  }
}

const hasValidationErrors = computed(() => {
  if (activeTab.value === 'info') {
    return !isStep1Valid.value
  }
  if (activeTab.value === 'placement') {
    return !isStep2Valid.value
  }
  if (activeTab.value === 'specifications') {
    return !isStep1Valid.value || !isStep2Valid.value || !form.value.status || !form.value.kondisi
  }
  return false
})

watch([searchQuery, filterStatus, filterTipe], () => {
  currentPage.value = 1
})

watch(
  () => form.value.nik_pemegang_asset,
  (newNik) => {
    if (!newNik) {
      form.value.nama_karyawan_pemegang_asset = ''
      form.value.departemen_pemegang_asset = ''
      return
    }
    const emp = employees.value.find((e) => e.nik === newNik)
    if (emp) {
      form.value.nama_karyawan_pemegang_asset = emp.nama_karyawan || ''
      form.value.departemen_pemegang_asset = emp.departemen || ''
      if (!form.value.lokasi_asset && (emp.lokasi_kerja || emp.lokasi)) {
        form.value.lokasi_asset = emp.lokasi_kerja || emp.lokasi
      }
    }
  },
)

const paginatedAssets = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredAssets.value.slice(start, start + itemsPerPage.value)
})

async function fetchData() {
  isLoading.value = true
  pageError.value = ''
  try {
    const [assetData, employeeData, locationData] = await Promise.all([
      get('/api/assets?all=true'),
      get('/api/karyawan?all=true'),
      get('/api/karyawan/locations'),
    ])
    if (!Array.isArray(assetData) || !Array.isArray(employeeData)) {
      throw new Error('Format data dari server tidak valid.')
    }
    assets.value = assetData.map((a) => {
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
    })
    employees.value = employeeData
    locations.value = Array.isArray(locationData) ? locationData : []
  } catch (error) {
    pageError.value = error.message || 'Gagal memuat data aset.'
  } finally {
    isLoading.value = false
    await nextTick()
    animateStagger('.asset-row-grid')
  }
}

function openAdd() {
  if (!canWriteAssets.value) return
  modalMode.value = 'add'
  selectedAsset.value = null
  form.value = emptyForm()
  activeTab.value = 'info'
  modalError.value = ''
  showFormModal.value = true
}

function openEdit(asset) {
  if (!canWriteAssets.value) return
  modalMode.value = 'edit'
  selectedAsset.value = asset
  form.value = {
    hostname: asset.hostname || asset.label_aset || '',
    serial_number: asset.serial_number || asset.nomor_seri || '',
    spesifikasi: asset.spesifikasi || '',
    nik_pemegang_asset: asset.nik_pemegang_asset || asset.nik || '',
    nama_karyawan_pemegang_asset: asset.nama_karyawan_pemegang_asset || asset.nama_karyawan || '',
    departemen_pemegang_asset: asset.departemen_pemegang_asset || asset.departemen || '',
    lokasi_asset: asset.lokasi_asset || asset.lokasi_aset || asset.lokasi_kerja || '',
    tipe_perangkat: asset.tipe_perangkat || '',
    brand_merek: asset.brand_merek || asset.merek || '',
    model: asset.model || '',
    status: asset.status || asset.status_aset || 'In Use',
    kondisi: asset.kondisi || asset.kondisi_aset || 'Normal',
    note_asset: asset.note_asset || asset.catatan_aset || '',
  }
  activeTab.value = 'info'
  modalError.value = ''
  showFormModal.value = true
}

function openDelete(asset) {
  if (!canWriteAssets.value) return
  selectedAsset.value = asset
  modalError.value = ''
  showDeleteModal.value = true
}

async function openDetails(asset) {
  selectedAsset.value = asset
  detailsTab.value = 'info'
  deviceLogs.value = []
  showDetailsModal.value = true
  // Fetch device-specific logs in background
  isLoadingLogs.value = true
  const targetId = asset.id_aset || asset.id
  try {
    const data = await get(`/api/logs/assets/${targetId}`)
    deviceLogs.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Gagal memuat log perangkat:', error)
    deviceLogs.value = []
  } finally {
    isLoadingLogs.value = false
  }
}

function closeModal() {
  if (isSubmitting.value || isExporting.value) return
  showFormModal.value = false
  showDeleteModal.value = false
  showDetailsModal.value = false
  showSpecificationModal.value = false
  showExportModal.value = false
  selectedAsset.value = null
  modalError.value = ''
}

function buildPayload() {
  return Object.fromEntries(
    Object.entries(form.value).map(([key, value]) => [
      key,
      typeof value === 'string' ? value.trim() : value,
    ]),
  )
}

async function nextStep() {
  if (activeTab.value === 'info') {
    if (!isStep1Valid.value) {
      modalError.value = 'Hostname, Serial Number, dan Tipe Perangkat wajib diisi.'
      return
    }
    activeTab.value = 'placement'
    modalError.value = ''
  } else if (activeTab.value === 'placement') {
    if (!isStep2Valid.value) {
      modalError.value = 'Lokasi penempatan aset wajib dipilih.'
      return
    }
    activeTab.value = 'specifications'
    modalError.value = ''
  }
}

async function saveAsset() {
  if (!canWriteAssets.value) {
    modalError.value = 'Anda hanya memiliki akses baca untuk aset.'
    return
  }
  const payload = buildPayload()
  if (!payload.hostname) {
    modalError.value = 'Hostname wajib diisi.'
    return
  }
  if (!payload.lokasi_asset && !payload.lokasi_aset) {
    modalError.value = 'Penempatan aset wajib dipilih.'
    return
  }
  isSubmitting.value = true
  modalError.value = ''
  try {
    if (modalMode.value === 'add') {
      await post('/api/assets', payload)
      toast('Aset IT berhasil ditambahkan.')
    } else {
      await put(`/api/assets/${selectedAsset.value.id_aset}`, payload)
      toast('Aset IT berhasil diperbarui.')
    }
    showFormModal.value = false
    selectedAsset.value = null
    await fetchData()
  } catch (error) {
    modalError.value = error.message || 'Gagal menyimpan aset.'
  } finally {
    isSubmitting.value = false
  }
}

async function deleteAsset() {
  if (!canWriteAssets.value || !selectedAsset.value) return
  isSubmitting.value = true
  modalError.value = ''
  try {
    await del(`/api/assets/${selectedAsset.value.id_aset}`)
    showDeleteModal.value = false
    selectedAsset.value = null
    toast('Aset IT berhasil dihapus.')
    await fetchData()
  } catch (error) {
    modalError.value = error.message || 'Gagal menghapus aset.'
  } finally {
    isSubmitting.value = false
  }
}

function openExport() {
  exportStatus.value = filterStatus.value
  exportTipe.value = filterTipe.value
  exportFormat.value = 'csv'
  showExportModal.value = true
}

async function executeExport() {
  if (isExporting.value) return
  isExporting.value = true
  try {
    const data = await get('/api/assets?all=true')
    const q = searchQuery.value.trim().toLowerCase()
    const filteredData = data.filter((asset) => {
      const text = [
        asset.id_aset,
        asset.hostname,
        asset.label_aset,
        asset.serial_number,
        asset.nomor_seri,
        asset.nama_karyawan,
        asset.nik,
        asset.departemen,
        asset.lokasi_kerja,
        asset.lokasi_aset,
        asset.tipe_perangkat,
        asset.merek,
        asset.model,
      ]
        .join(' ')
        .toLowerCase()

      return (
        (!exportStatus.value || asset.status_aset === exportStatus.value) &&
        (!exportTipe.value || asset.tipe_perangkat === exportTipe.value) &&
        (!q || text.includes(q))
      )
    })

    if (filteredData.length === 0) {
      toast('Tidak ada data aset yang cocok dengan filter ekspor.', 'warning')
      isExporting.value = false
      return
    }

    if (exportFormat.value === 'csv') {
      downloadAssetsCsv(filteredData)
      toast('CSV aset berhasil dibuat.')
    } else {
      downloadAssetsPdf(filteredData, {
        status: exportStatus.value,
        tipe: exportTipe.value,
      })
      toast('PDF laporan berhasil dicetak.')
    }
    showExportModal.value = false
  } catch (error) {
    toast(error.message || 'Gagal mengekspor aset.', 'error')
  } finally {
    isExporting.value = false
  }
}

function getStatusBadgeType(status) {
  const s = (status || '').toLowerCase()
  if (['digunakan', 'in use'].includes(s)) return 'success'
  if (['tersedia', 'stock'].includes(s)) return 'info'
  if (['maintenance', 'need service'].includes(s)) return 'warning'
  if (['rusak', 'damaged'].includes(s)) return 'danger'
  if (['disposal'].includes(s)) return 'default'
  return 'default'
}

function getDeviceIcon(type) {
  const value = (type || '').toLowerCase()
  if (value.includes('laptop')) return 'laptop'
  if (value.includes('server')) return 'dns'
  if (value.includes('printer')) return 'print'
  if (value.includes('monitor')) return 'monitor'
  if (value.includes('network')) return 'router'
  return 'computer'
}

function formatLogDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function openAssign(asset) {
  if (!canWriteAssets.value) return
  openEdit(asset)
  activeTab.value = 'placement'
}

function openStatusChange(asset) {
  if (!canWriteAssets.value) return
  openEdit(asset)
  activeTab.value = 'specifications'
}

function formatKondisiText(kondisi) {
  if (!kondisi) return 'Kondisi —'
  const k = String(kondisi).trim().toLowerCase()
  if (k === 'normal' || k === 'baik' || k === 'baru') return 'Kondisi normal'
  return kondisi
}

function formatKondisiStyle(kondisi) {
  const k = (kondisi || '').toLowerCase()
  if (k.includes('rusak') || k.includes('perbaikan') || k.includes('berat')) {
    return 'text-[#DC2626] font-medium'
  }
  if (k.includes('ringan') || k.includes('sedang')) {
    return 'text-[#D97706] font-medium'
  }
  return 'text-[#64748B] font-normal'
}

function formatKondisiDot(kondisi) {
  const k = (kondisi || '').toLowerCase()
  if (k.includes('rusak') || k.includes('perbaikan') || k.includes('berat')) {
    return 'bg-[#DC2626]'
  }
  if (k.includes('ringan') || k.includes('sedang')) {
    return 'bg-[#D97706]'
  }
  return 'bg-[#94A3B8]'
}

function getAssetActions(asset) {
  const actions = [
    {
      label: 'Lihat Detail',
      icon: 'visibility',
      onClick: () => openDetails(asset),
    },
    {
      label: 'Cetak Label',
      icon: 'print',
      onClick: () => openLabelModal(asset),
    },
  ]
  if (canWriteAssets.value) {
    actions.push({
      label: 'Edit Aset',
      icon: 'edit',
      onClick: () => openEdit(asset),
    })
    actions.push({
      label: 'Assign / Pindahkan',
      icon: 'person_add',
      onClick: () => openAssign(asset),
    })
    actions.push({
      label: 'Ubah Status',
      icon: 'sync_alt',
      onClick: () => openStatusChange(asset),
    })
    actions.push({
      label: 'Hapus Aset',
      icon: 'delete',
      danger: true,
      onClick: () => openDelete(asset),
    })
  }
  return actions
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

function resetFilters() {
  searchQuery.value = ''
  filterStatus.value = ''
  filterTipe.value = ''
  if ('q' in route.query) {
    const query = { ...route.query }
    delete query.q
    router.replace({ query })
  }
}

let toastTimer
function toast(message, type = 'success') {
  window.clearTimeout(toastTimer)
  notification.value = { message, type }
  toastTimer = window.setTimeout(() => {
    notification.value = null
  }, 3500)
}

watch(
  () => route.query.q,
  (query) => {
    searchQuery.value = typeof query === 'string' ? query : ''
  },
  { immediate: true },
)

onMounted(async () => {
  await fetchData()
})
</script>

<template>
  <div
    class="asset-workspace asset-inventory space-y-4"
    :data-testid="!isLoading ? 'page-ready' : undefined"
  >
    <!-- Simplified SaaS Header & Toolbar Container -->
    <div
      class="asset-toolbar flex flex-col gap-3 sm:gap-3.5 bg-white p-3.5 sm:p-4.5 rounded-2xl border border-[#E2E8F0]/80 shadow-2xs"
    >
      <!-- Row 1: Page Title & Primary CTA -->
      <div class="flex items-center justify-between gap-2.5">
        <div class="min-w-0">
          <h2 class="text-base sm:text-lg font-bold text-[#333333] tracking-tight truncate">
            Aset IT
          </h2>
          <p
            class="text-[11px] sm:text-xs text-[#64748B] mt-0.5 leading-normal line-clamp-1 sm:line-clamp-none"
          >
            Monitor dan kelola seluruh perangkat IT perusahaan
          </p>
        </div>

        <!-- Primary Action CTA -->
        <button
          v-if="canWriteAssets"
          type="button"
          @click="openAdd"
          class="h-9 shrink-0 whitespace-nowrap rounded-lg bg-[#0A51B0] px-3 sm:px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#0A4391] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
          title="Tambah aset baru"
        >
          <span class="material-symbols-outlined text-[16px]">add</span>
          <span>Tambah Aset</span>
        </button>
      </div>

      <!-- Row 2: Search, Filters & Actions -->
      <div
        class="flex flex-col sm:flex-row sm:items-center gap-2 w-full min-w-0 pt-2.5 border-t border-[#F1F5F9]"
      >
        <!-- Search Input -->
        <div class="relative w-full sm:flex-1 sm:min-w-[200px]">
          <span
            class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[17px] text-[#94A3B8] pointer-events-none"
            >search</span
          >
          <input
            v-model="searchQuery"
            type="text"
            aria-label="Cari aset, serial number, atau pemegang"
            placeholder="Cari aset, serial number, atau pemegang..."
            class="h-9 w-full rounded-lg border border-[#E2E8F0] bg-white pl-8 pr-8 text-xs text-[#333333] placeholder-[#94A3B8] focus:border-[#0A51B0] focus:outline-none transition-all shadow-2xs"
          />
          <!-- Inline Clear Button -->
          <button
            v-if="searchQuery"
            type="button"
            @click="searchQuery = ''"
            aria-label="Bersihkan pencarian"
            class="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#333333] transition-all cursor-pointer touch-manipulation"
            title="Bersihkan"
          >
            <span class="material-symbols-outlined text-[15px]">close</span>
          </button>
        </div>

        <!-- Filter & Actions Cluster -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <!-- Filter Group: Status & Reset -->
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <div class="flex-1 sm:w-[150px] min-w-0">
              <CustomSelect
                v-model="filterStatus"
                :options="filterStatusOptions"
                aria-label="Filter status"
                :block="true"
              />
            </div>

            <!-- Reset Filter Button -->
            <button
              v-if="searchQuery || filterStatus || filterTipe"
              type="button"
              @click="resetFilters"
              class="h-9 shrink-0 whitespace-nowrap rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-medium text-[#64748B] hover:text-[#333333] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs touch-manipulation"
              title="Reset filter"
            >
              <span class="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Reset</span>
            </button>
          </div>

          <!-- Actions Group: Ekspor & Impor -->
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              @click="openExport"
              class="h-9 flex-1 sm:flex-initial shrink-0 whitespace-nowrap rounded-lg border border-[#E2E8F0] bg-white px-3.5 text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] hover:text-[#333333] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs touch-manipulation"
              title="Ekspor laporan data aset"
            >
              <span class="material-symbols-outlined text-[16px] text-[#64748B]">download</span>
              <span>Ekspor</span>
            </button>

            <button
              v-if="canWriteAssets"
              type="button"
              @click="showImportModal = true"
              class="h-9 flex-1 sm:flex-initial shrink-0 whitespace-nowrap rounded-lg border border-[#E2E8F0] bg-white px-3.5 text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] hover:text-[#333333] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs touch-manipulation"
              title="Impor data dari file Excel"
            >
              <span class="material-symbols-outlined text-[16px] text-[#64748B]">file_upload</span>
              <span>Impor</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- ─── MODERN ENTERPRISE SAAS DATA MANAGEMENT CONTAINER ──────────────── -->
    <div>
      <div v-if="!isLoading && !pageError" class="it-list-heading" aria-live="polite">
        <div>
          <h3>
            Daftar perangkat <span>{{ filteredAssets.length }}</span>
          </h3>
          <p>
            {{
              searchQuery || filterStatus || filterTipe
                ? 'Hasil sesuai pencarian dan filter Anda'
                : 'Inventaris perangkat IT perusahaan'
            }}
          </p>
        </div>
        <span v-if="filteredAssets.length" class="it-result-range"
          >{{ (currentPage - 1) * itemsPerPage + 1 }}–{{
            Math.min(currentPage * itemsPerPage, filteredAssets.length)
          }}
          dari {{ filteredAssets.length }} aset</span
        >
      </div>
      <!-- Loading State Skeleton -->
      <div v-if="isLoading" aria-busy="true" class="space-y-2.5">
        <div
          v-for="r in 6"
          :key="'asset-skel-' + r"
          class="asset-row-grid gap-3 xl:gap-4 rounded-xl border border-[#E2E8F0]/80 bg-white p-3.5 sm:p-4 shadow-2xs select-none"
        >
          <!-- Mobile Skeleton Structure (< 768px) -->
          <div class="flex items-start justify-between gap-2.5 min-w-0 xl:hidden">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <SkeletonAvatar size="40px" shape="rounded" class="shrink-0" />
              <div class="flex flex-col gap-1.5 min-w-0 flex-1">
                <BaseSkeleton width="120px" height="15px" radius="md" />
                <BaseSkeleton width="80px" height="11px" radius="sm" />
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0 self-start">
              <BaseSkeleton width="65px" height="22px" radius="full" />
              <BaseSkeleton width="18px" height="18px" radius="md" />
            </div>
          </div>

          <div class="border-t border-[#F1F5F9] my-0.5 xl:hidden"></div>

          <div class="grid grid-cols-2 gap-2.5 xl:hidden">
            <div class="flex flex-col gap-1 min-w-0">
              <BaseSkeleton width="65px" height="10px" radius="sm" />
              <BaseSkeleton width="85px" height="13px" radius="md" />
              <BaseSkeleton width="50px" height="11px" radius="sm" />
            </div>
            <div class="flex flex-col gap-1 min-w-0">
              <BaseSkeleton width="45px" height="10px" radius="sm" />
              <BaseSkeleton width="75px" height="13px" radius="md" />
            </div>
            <div class="flex flex-col gap-1 min-w-0">
              <BaseSkeleton width="55px" height="10px" radius="sm" />
              <BaseSkeleton width="90px" height="13px" radius="md" />
            </div>
            <div class="flex flex-col gap-1 min-w-0">
              <BaseSkeleton width="45px" height="10px" radius="sm" />
              <BaseSkeleton width="90px" height="13px" radius="md" />
            </div>
          </div>

          <!-- Desktop Skeleton Structure -->
          <!-- 1. Asset Identity -->
          <div class="hidden xl:flex items-center gap-3.5 min-w-0">
            <SkeletonAvatar size="40px" shape="rounded" class="shrink-0" />
            <div class="flex flex-col gap-1.5 min-w-0">
              <BaseSkeleton width="130px" height="15px" radius="md" />
              <BaseSkeleton width="90px" height="12px" radius="sm" />
            </div>
          </div>
          <!-- 2. Perangkat -->
          <div class="hidden xl:flex flex-col gap-1 min-w-0">
            <BaseSkeleton width="50px" height="10px" radius="sm" />
            <BaseSkeleton width="100px" height="13px" radius="md" />
            <BaseSkeleton width="80px" height="11px" radius="sm" />
          </div>
          <!-- 3. Penanggung Jawab -->
          <div class="hidden xl:flex flex-col gap-1 min-w-0">
            <BaseSkeleton width="85px" height="10px" radius="sm" />
            <BaseSkeleton width="120px" height="13px" radius="md" />
            <BaseSkeleton width="70px" height="11px" radius="sm" />
          </div>
          <!-- 4. Lokasi -->
          <div class="hidden xl:flex flex-col gap-1 min-w-0">
            <BaseSkeleton width="45px" height="10px" radius="sm" />
            <BaseSkeleton width="80px" height="13px" radius="md" />
          </div>
          <!-- 5. Status -->
          <div class="hidden xl:flex items-center">
            <BaseSkeleton width="75px" height="22px" radius="full" />
          </div>
          <!-- 6. Action -->
          <div class="hidden xl:flex justify-end">
            <BaseSkeleton width="18px" height="18px" radius="md" />
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="pageError"
        role="alert"
        class="flex items-center gap-2 bg-rose-50 px-5 py-4 text-[12.5px] text-rose-600 rounded-2xl border border-rose-200"
      >
        <span class="material-symbols-outlined text-[18px]">error</span>
        <span class="flex-1 font-semibold">{{ pageError }}</span>
        <button type="button" class="font-bold underline cursor-pointer" @click="fetchData">
          Coba lagi
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredAssets.length === 0"
        class="py-12 px-4 text-center bg-white rounded-2xl border border-[#E2E8F0]/80"
      >
        <div class="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
          <span
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F1F5F9] text-[#64748B]"
          >
            <span class="material-symbols-outlined text-[24px]">devices_off</span>
          </span>
          <h3 class="text-[14px] font-bold text-[#333333] mt-1">Belum Ada Aset IT</h3>
          <p class="text-[11.5px] text-[#64748B] leading-relaxed">
            Belum ada aset IT yang terdaftar dalam inventaris atau sesuai dengan kata kunci
            pencarian.
          </p>
          <button
            v-if="canWriteAssets"
            type="button"
            @click="openAdd"
            class="mt-2 h-9 rounded-lg bg-[#0A51B0] px-4 text-[12px] font-semibold text-white shadow-2xs hover:bg-[#0A4391] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span class="material-symbols-outlined text-[16px]">add</span>
            <span>Tambah Aset</span>
          </button>
        </div>
      </div>

      <!-- Responsive inventory list -->
      <div v-else class="asset-card-list laptop-list">
        <div
          v-for="asset in paginatedAssets"
          :key="asset.id_aset"
          class="laptop-row"
          tabindex="0"
          :aria-label="'Lihat detail ' + (asset.hostname || asset.label_aset || 'aset')"
          @click="openDetails(asset)"
          @keydown.enter.self="openDetails(asset)"
          @keydown.space.prevent.self="openDetails(asset)"
        >
          <div class="laptop-identity">
            <div class="laptop-icon" aria-hidden="true">
              <span class="material-symbols-outlined">{{
                getDeviceIcon(asset.tipe_perangkat)
              }}</span>
            </div>
            <div class="laptop-identity-text">
              <h4 :title="asset.hostname || asset.label_aset">
                {{ asset.hostname || asset.label_aset || '—' }}
              </h4>
              <p :title="[asset.merek || asset.brand_merek, asset.model].filter(Boolean).join(' ')">
                {{
                  [asset.merek || asset.brand_merek, asset.model].filter(Boolean).join(' ') ||
                  asset.tipe_perangkat ||
                  '—'
                }}
              </p>
              <span class="laptop-serial" :title="asset.serial_number || asset.nomor_seri"
                >SN: {{ asset.serial_number || asset.nomor_seri || '—' }}</span
              >
            </div>
          </div>
          <div class="laptop-holder laptop-field">
            <span class="laptop-label">Pengguna</span>
            <strong
              :class="{ 'laptop-unassigned': !asset.nama_karyawan }"
              :title="asset.nama_karyawan || 'Belum ditetapkan'"
              >{{ asset.nama_karyawan || 'Belum ditetapkan' }}</strong
            >
            <span
              v-if="asset.nama_karyawan && asset.nik"
              class="laptop-secondary"
              :title="'NIK: ' + asset.nik"
              >NIK: {{ asset.nik }}</span
            >
          </div>
          <div class="laptop-location laptop-field">
            <span class="laptop-label">Lokasi</span>
            <strong :title="asset.lokasi_kerja || asset.lokasi_aset">{{
              asset.lokasi_kerja || asset.lokasi_aset || '—'
            }}</strong>
          </div>
          <div class="laptop-state">
            <span
              class="laptop-status"
              :class="[
                formatStatusPill(asset.status_aset).bg,
                formatStatusPill(asset.status_aset).text,
              ]"
            >
              <span class="laptop-dot" :class="formatStatusPill(asset.status_aset).dot"></span>
              {{ formatStatusPill(asset.status_aset).label }}
            </span>
            <span class="laptop-condition" :class="formatKondisiStyle(asset.kondisi_aset)">
              <span class="laptop-dot" :class="formatKondisiDot(asset.kondisi_aset)"></span>
              {{ formatKondisiText(asset.kondisi_aset) }}
            </span>
          </div>
          <div class="laptop-actions" @click.stop>
            <AppRowActions :actions="getAssetActions(asset)" />
          </div>
        </div>
      </div>

      <!-- Pagination Footer -->
      <AppPagination
        asset-style
        mobile-compact
        v-if="!isLoading && !pageError"
        v-model:currentPage="currentPage"
        :total-items="filteredAssets.length"
        :items-per-page="itemsPerPage"
      />
    </div>

    <!-- ── Modal Form Tambah / Edit Aset IT (Modern Brand Navy SaaS UI) ── -->
    <AppModal
      :is-open="showFormModal"
      :title="modalMode === 'add' ? 'Tambah Aset IT' : 'Edit Aset IT'"
      :subtitle="
        modalMode === 'add'
          ? 'Lengkapi data perangkat. Kolom bertanda * wajib diisi.'
          : 'Perbarui spesifikasi dan konfigurasi unit aset IT.'
      "
      :icon="modalMode === 'add' ? 'devices' : 'edit_note'"
      size="lg"
      @close="closeModal"
    >
      <nav class="it-create-steps" aria-label="Langkah pengisian aset">
        <button
          v-for="(step, index) in [
            { key: 'info', label: 'Perangkat', hint: 'Identitas utama' },
            { key: 'placement', label: 'Penempatan', hint: 'Pengguna & lokasi' },
            { key: 'specifications', label: 'Spesifikasi', hint: 'Detail & kondisi' },
          ]"
          :key="step.key"
          type="button"
          :aria-current="activeTab === step.key ? 'step' : undefined"
          @click="selectStep(step.key)"
        >
          <span class="it-create-step-number">{{ index + 1 }}</span>
          <span class="it-create-step-label"
            ><strong>{{ step.label }}</strong
            ><small>{{ step.hint }}</small></span
          >
        </button>
      </nav>

      <!-- Form Content -->
      <form
        id="crud-AssetsView"
        class="asset-crud-form asset-entry-form it-create-form flex flex-col"
        @submit.prevent="saveAsset"
      >
        <div
          v-if="modalError"
          role="alert"
          class="mb-3.5 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-[12px] font-semibold text-rose-700 shadow-2xs"
        >
          <span class="material-symbols-outlined text-[18px] text-rose-500 shrink-0">error</span>
          <span class="flex-1">{{ modalError }}</span>
        </div>

        <!-- Step 1: Informasi Perangkat -->
        <div v-show="activeTab === 'info'" class="it-create-panel space-y-3.5">
          <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <div class="flex items-center gap-2">
              <span
                class="flex h-6 w-6 items-center justify-center rounded-md bg-[#EDF5FF] text-[#333333]"
              >
                <span class="material-symbols-outlined text-[15px]">devices</span>
              </span>
              <span class="text-[11.5px] font-bold text-[#333333] uppercase tracking-wider">
                Identitas perangkat
              </span>
            </div>
            <span class="text-[11px] font-medium text-[#64748B]">Langkah 1 dari 3</span>
          </div>

          <fieldset class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <!-- Hostname Input -->
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-bold text-[#333333] flex items-center justify-between">
                <span>Hostname / Label Aset <span class="text-[#DC2626]">*</span></span>
                <span class="text-[10px] font-normal text-[#64748B]">Maks. 100 karakter</span>
              </label>
              <div class="relative flex items-center">
                <span
                  class="material-symbols-outlined absolute left-3 text-[17px] text-[#94A3B8] pointer-events-none"
                >
                  computer
                </span>
                <input
                  v-model="form.hostname"
                  required
                  maxlength="100"
                  aria-label="Hostname Aset"
                  placeholder="cth: LAPTOP-IT-04 atau WS-FINANCE-01"
                  class="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-[12px] font-medium text-[#333333] placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all shadow-2xs"
                />
              </div>
            </div>

            <!-- Serial Number Input -->
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-bold text-[#333333] flex items-center justify-between">
                <span>Serial Number (S/N) <span class="text-[#DC2626]">*</span></span>
                <span class="text-[10px] font-normal text-[#64748B]">Nomor seri fisik</span>
              </label>
              <div class="relative flex items-center">
                <span
                  class="material-symbols-outlined absolute left-3 text-[17px] text-[#94A3B8] pointer-events-none"
                >
                  tag
                </span>
                <input
                  v-model="form.serial_number"
                  required
                  maxlength="100"
                  aria-label="Serial Number Aset"
                  placeholder="cth: PF3ABCDE atau 5CD1234XYZ"
                  class="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-[12px] font-medium text-[#333333] placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all shadow-2xs"
                />
              </div>
            </div>

            <!-- Tipe Perangkat -->
            <div class="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <label class="text-[12px] font-bold text-[#333333]">
                Tipe Perangkat <span class="text-[#DC2626]">*</span>
              </label>
              <CustomSelect
                v-model="form.tipe_perangkat"
                :options="availableTipeOptions"
                aria-label="Tipe Perangkat Aset"
                placeholder="Pilih jenis/tipe perangkat (Laptop, Desktop, Server, dll.)"
                :block="true"
                height-class="h-10"
              />
            </div>

            <!-- Tip Info Banner -->
            <div
              class="flex items-start gap-2.5 rounded-xl bg-[#EDF5FF]/70 border border-[#B8D4F5]/40 p-3 col-span-1 sm:col-span-2"
            >
              <span class="material-symbols-outlined text-[17px] text-[#333333] mt-0.5 shrink-0"
                >info</span
              >
              <p class="text-[11.5px] leading-relaxed text-[#0A4391]">
                Gunakan hostname dan serial number yang tertera pada perangkat.
              </p>
            </div>
          </fieldset>
        </div>

        <!-- Step 2: Penempatan & Pemegang -->
        <div v-show="activeTab === 'placement'" class="it-create-panel space-y-3.5">
          <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <div class="flex items-center gap-2">
              <span
                class="flex h-6 w-6 items-center justify-center rounded-md bg-[#EDF5FF] text-[#333333]"
              >
                <span class="material-symbols-outlined text-[15px]">badge</span>
              </span>
              <span class="text-[11.5px] font-bold text-[#333333] uppercase tracking-wider">
                Pengguna dan lokasi
              </span>
            </div>
            <span class="text-[11px] font-medium text-[#64748B]">Langkah 2 dari 3</span>
          </div>

          <fieldset class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <!-- Pemegang Aset SearchableSelect -->
            <div class="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <div class="flex items-center justify-between">
                <label class="text-[12px] font-bold text-[#333333]"
                  >Pemegang Aset / User Penanggung Jawab</label
                >
                <span class="text-[11px] font-medium text-[#64748B]">Opsional</span>
              </div>
              <SearchableSelect
                v-model="form.nik_pemegang_asset"
                :options="employees"
                value-key="nik"
                label-key="nama_karyawan"
                secondary-label-key="nik"
                placeholder="Pilih karyawan pemegang (Biarkan kosong jika disimpan sebagai Stok IT)"
                search-placeholder="Cari berdasarkan nama atau NIK karyawan..."
                clearable
                class="w-full"
              />
            </div>

            <!-- State 1: Karyawan Terpilih (Rich Employee Card) -->
            <div
              v-if="form.nik_pemegang_asset"
              class="col-span-1 sm:col-span-2 flex items-center justify-between gap-3 rounded-xl border border-[#B8D4F5]/60 bg-gradient-to-r from-[#EDF5FF]/90 to-[#F8FAFC] p-3 shadow-2xs transition-all"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A51B0] text-white font-bold text-[12px] shadow-xs"
                >
                  {{ getEmployeeInitials(form.nama_karyawan_pemegang_asset) }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-[13px] font-bold text-[#333333] truncate">
                      {{ form.nama_karyawan_pemegang_asset || 'Karyawan Terpilih' }}
                    </span>
                    <span
                      class="inline-flex items-center gap-1 rounded-full bg-[#0A5DBD]/15 px-2 py-0.5 text-[10.5px] font-bold text-[#0A4391]"
                    >
                      <span class="material-symbols-outlined text-[12px]">business</span>
                      {{ form.departemen_pemegang_asset || 'Umum' }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2 mt-0.5 text-[11px] text-[#64748B]">
                    <span
                      >NIK:
                      <strong class="text-[#0A4391]">{{ form.nik_pemegang_asset }}</strong></span
                    >
                    <span>•</span>
                    <span class="flex items-center gap-0.5 text-[#059669] font-semibold">
                      <span class="material-symbols-outlined text-[13px]">check_circle</span>
                      Akan ditugaskan
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                @click="clearEmployee"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#DC2626] hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                title="Batal pilih karyawan (Jadikan Stock)"
              >
                <span class="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <!-- State 2: Unit Sebagai Stock IT -->
            <div
              v-else
              class="col-span-1 sm:col-span-2 flex items-center gap-3 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-3 text-[#64748B]"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-[#E2E8F0] text-[#333333] shadow-2xs"
              >
                <span class="material-symbols-outlined text-[18px]">inventory_2</span>
              </div>
              <div class="text-[11.5px] leading-snug">
                <p class="font-bold text-[#333333]">Status Unit: Stok Tersedia (Stock)</p>
                <p class="text-[#64748B] text-[11px] mt-0.5">
                  Perangkat tidak terikat ke karyawan mana pun dan tersimpan di pool inventaris IT.
                </p>
              </div>
            </div>

            <!-- Lokasi Penempatan Aset -->
            <div class="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <div class="flex items-center justify-between">
                <label class="text-[12px] font-bold text-[#333333]">
                  Lokasi Penempatan Aset <span class="text-[#DC2626]">*</span>
                </label>
                <span class="text-[10.5px] text-[#64748B]">Kantor cabang atau area fisik</span>
              </div>
              <SearchableSelect
                v-model="form.lokasi_asset"
                :options="locationOptions"
                value-key="value"
                label-key="label"
                placeholder="Pilih atau ketik lokasi (cth: Solo, Pluit, Gudang IT)"
                search-placeholder="Cari atau ketik lokasi baru..."
                allow-custom
                custom-label-prefix="+ Gunakan lokasi baru"
                drop-direction="up"
                class="w-full"
              />
            </div>
          </fieldset>
        </div>

        <!-- Step 3: Spesifikasi & Details -->
        <div v-show="activeTab === 'specifications'" class="it-create-panel space-y-3.5">
          <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <div class="flex items-center gap-2">
              <span
                class="flex h-6 w-6 items-center justify-center rounded-md bg-[#EDF5FF] text-[#333333]"
              >
                <span class="material-symbols-outlined text-[15px]">tune</span>
              </span>
              <span class="text-[11.5px] font-bold text-[#333333] uppercase tracking-wider">
                Spesifikasi & Kondisi Teknis
              </span>
            </div>
            <span class="text-[11px] font-medium text-[#64748B]">Langkah 3 dari 3</span>
          </div>

          <fieldset class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <!-- Brand / Merek -->
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-bold text-[#333333]">Brand / Merek</label>
              <SearchableSelect
                v-model="form.brand_merek"
                :options="brandSelectOptions"
                value-key="value"
                label-key="label"
                placeholder="Pilih atau ketik merek"
                search-placeholder="Cari merek (Lenovo, Dell, HP, Apple)..."
                allow-custom
                custom-label-prefix="+ Gunakan merek baru"
                clearable
                class="w-full"
              />
            </div>

            <!-- Model -->
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-bold text-[#333333]">Model / Seri</label>
              <div class="relative flex items-center">
                <span
                  class="material-symbols-outlined absolute left-3 text-[17px] text-[#94A3B8] pointer-events-none"
                >
                  memory
                </span>
                <input
                  v-model="form.model"
                  maxlength="100"
                  placeholder="cth: ThinkPad T14 Gen 3"
                  class="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-[12px] font-medium text-[#333333] placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all shadow-2xs"
                />
              </div>
            </div>

            <!-- Status Aset -->
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-bold text-[#333333]">
                Status Aset <span class="text-[#DC2626]">*</span>
              </label>
              <CustomSelect
                v-model="form.status"
                :options="ASSET_STATUSES"
                aria-label="Status Aset"
                placeholder="Pilih status aset"
                :block="true"
                height-class="h-10"
              />
            </div>

            <!-- Kondisi Aset -->
            <div class="flex flex-col gap-1.5">
              <label class="text-[12px] font-bold text-[#333333]">
                Kondisi Fisik <span class="text-[#DC2626]">*</span>
              </label>
              <CustomSelect
                v-model="form.kondisi"
                :options="availableKondisiOptions"
                aria-label="Kondisi Aset"
                placeholder="Pilih kondisi aset"
                :block="true"
                height-class="h-10"
              />
            </div>

            <!-- Spesifikasi Detail -->
            <div class="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <div class="flex items-center justify-between">
                <label class="text-[12px] font-bold text-[#333333]">Spesifikasi Teknis</label>
                <span class="text-[10.5px] text-[#64748B]">CPU, RAM, SSD, OS, dll.</span>
              </div>
              <textarea
                v-model="form.spesifikasi"
                rows="2"
                placeholder="cth: Intel Core i7-12700H, 16GB DDR5, 512GB NVMe SSD, Windows 11 Pro"
                class="min-h-[56px] max-h-[100px] w-full rounded-lg border border-[#E2E8F0] bg-white p-2.5 text-[12px] font-medium text-[#333333] placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all resize-y shadow-2xs"
              ></textarea>
            </div>

            <!-- Catatan Aset -->
            <div class="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
              <div class="flex items-center justify-between">
                <label class="text-[12px] font-bold text-[#333333]">Catatan Tambahan</label>
                <span class="text-[10.5px] text-[#64748B]">Kelengkapan atau riwayat khusus</span>
              </div>
              <textarea
                v-model="form.note_asset"
                rows="2"
                placeholder="cth: Lengkap dengan charger original 65W USB-C dan tas laptop"
                class="min-h-[56px] max-h-[100px] w-full rounded-lg border border-[#E2E8F0] bg-white p-2.5 text-[12px] font-medium text-[#333333] placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all resize-y shadow-2xs"
              ></textarea>
            </div>
          </fieldset>
        </div>
      </form>

      <template #footer>
        <!-- Footer Action Bar -->
        <div
          class="asset-crud-actions it-create-actions flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3.5 mt-4 border-t border-[#E2E8F0]"
        >
          <button
            type="button"
            :disabled="isSubmitting"
            @click="closeModal"
            class="h-9.5 px-4 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#333333] hover:border-[#CBD5E1] active:scale-95 transition-all cursor-pointer touch-manipulation flex items-center justify-center gap-1.5"
          >
            <span>Batal</span>
          </button>

          <div class="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              v-if="activeTab !== 'info'"
              type="button"
              @click="activeTab = activeTab === 'specifications' ? 'placement' : 'info'"
              class="h-9.5 flex-1 sm:flex-initial rounded-lg border border-[#E2E8F0] bg-white px-3.5 text-[12px] font-bold text-[#0A4391] hover:bg-[#EDF5FF] hover:border-[#B8D4F5] active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer touch-manipulation shadow-2xs"
            >
              <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Kembali</span>
            </button>

            <button
              v-if="activeTab !== 'specifications'"
              type="button"
              @click="nextStep"
              :disabled="isSubmitting || hasValidationErrors"
              class="h-9.5 flex-1 sm:flex-initial rounded-lg bg-[#0A51B0] hover:bg-[#0A4391] active:bg-[#0F1F38] px-4.5 text-[12px] font-bold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
            >
              <span>Lanjutkan</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>

            <button
              v-else
              type="submit"
              form="crud-AssetsView"
              :disabled="isSubmitting || !canWriteAssets || hasValidationErrors"
              class="h-9.5 flex-1 sm:flex-initial rounded-lg bg-[#0A51B0] hover:bg-[#0A4391] active:bg-[#0F1F38] px-5 text-[12px] font-bold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
            >
              <span
                v-if="isSubmitting"
                class="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"
              ></span>
              <span v-else class="material-symbols-outlined text-[17px]">
                {{ modalMode === 'add' ? 'add_circle' : 'check_circle' }}
              </span>
              <span>{{
                isSubmitting
                  ? 'Menyimpan...'
                  : modalMode === 'add'
                    ? 'Tambah Aset'
                    : 'Simpan Perubahan'
              }}</span>
            </button>
          </div>
        </div>
      </template>
    </AppModal>

    <AppModal :is-open="showDeleteModal" title="Hapus Aset IT" size="sm" @close="closeModal">
      <div class="asset-delete-content flex flex-col items-center gap-4 text-center">
        <div
          v-if="modalError"
          role="alert"
          class="w-full rounded-lg bg-red-50 px-3 py-2 text-left text-[12px] text-red-700"
        >
          {{ modalError }}
        </div>
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <span class="material-symbols-outlined text-[28px] text-[#EF4444]">warning</span>
        </div>
        <div>
          <h4 class="text-[15px] font-black text-[#111827]">
            Hapus {{ selectedAsset?.label_aset }}?
          </h4>
          <p class="mt-1 text-[12px] text-[#9CA3AF]">Data aset akan dihapus permanen.</p>
        </div>
      </div>
      <template #footer>
        <div class="asset-crud-actions asset-delete-actions flex w-full gap-3">
          <button
            type="button"
            :disabled="isSubmitting"
            @click="closeModal"
            class="h-10 flex-1 rounded-lg border"
          >
            Batal</button
          ><button
            type="button"
            :disabled="isSubmitting"
            @click="deleteAsset"
            class="h-10 flex-1 rounded-lg bg-[#EF4444] font-bold text-white"
          >
            {{ isSubmitting ? 'Menghapus...' : 'Ya, Hapus' }}
          </button>
        </div>
      </template>
    </AppModal>

    <AppModal
      :is-open="showSpecificationModal"
      title="Detail Spesifikasi"
      size="md"
      @close="closeModal"
    >
      <div v-if="selectedAsset" class="space-y-4">
        <div class="flex items-center gap-3 rounded-2xl border border-[#E8EDF3] bg-[#F8FAFC] p-4">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[21px]">{{
              getDeviceIcon(selectedAsset.tipe_perangkat)
            }}</span>
          </div>
          <div class="min-w-0">
            <p class="truncate font-mono text-[11px] font-bold text-[#172033]">
              {{ selectedAsset.nomor_seri || '—' }}
            </p>
            <p class="mt-1 truncate text-[9px] font-semibold text-[#94A3B8]">
              {{ selectedAsset.label_aset }}
            </p>
          </div>
        </div>

        <div>
          <p class="mb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">
            Spesifikasi Perangkat
          </p>
          <div
            class="min-h-28 whitespace-pre-wrap rounded-2xl border border-[#DCE3EC] bg-white p-4 text-[11px] font-medium leading-6 text-[#334155]"
          >
            {{ selectedAsset.spesifikasi || 'Belum ada informasi spesifikasi untuk aset ini.' }}
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <button
            type="button"
            class="h-9 rounded-xl bg-brand px-5 font-bold text-white hover:bg-brand-dark"
            @click="closeModal"
          >
            Tutup
          </button>
        </div>
      </template>
    </AppModal>

    <AppModal :is-open="showDetailsModal" title="Detail Aset" size="lg" @close="closeModal">
      <div v-if="selectedAsset" class="asset-detail flex flex-col gap-0">
        <!-- Header Aset -->
        <div class="asset-detail-identity flex items-center gap-3 pb-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
            <span class="material-symbols-outlined">{{
              getDeviceIcon(selectedAsset.tipe_perangkat)
            }}</span>
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase text-brand">
              ID #{{ selectedAsset.id_aset }}
            </p>
            <h4 class="text-[17px] font-black text-[#111827]">{{ selectedAsset.label_aset }}</h4>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div class="asset-detail-tabs flex flex-wrap border-b border-[#E2E8F0]/80 mb-4">
          <button
            type="button"
            @click="detailsTab = 'info'"
            class="flex items-center gap-2 px-3 sm:px-4 py-3 text-[12px] font-bold transition-all duration-150 border-b-2"
            :class="
              detailsTab === 'info'
                ? 'border-brand text-brand font-black'
                : 'border-transparent text-[#64748B] hover:text-[#172033]'
            "
          >
            <span class="material-symbols-outlined text-[16px]">info</span>
            Informasi Detail
          </button>
          <button
            v-if="isAdmin || isSuperAdmin"
            type="button"
            @click="detailsTab = 'logs'"
            class="flex items-center gap-2 px-3 sm:px-4 py-3 text-[12px] font-bold transition-all duration-150 border-b-2"
            :class="
              detailsTab === 'logs'
                ? 'border-brand text-brand font-black'
                : 'border-transparent text-[#64748B] hover:text-[#172033]'
            "
          >
            <span class="material-symbols-outlined text-[16px]">history</span>
            Log Perubahan
            <span
              v-if="deviceLogs.length"
              class="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand/10 px-1.5 text-[10px] font-black text-brand"
            >
              {{ deviceLogs.length }}
            </span>
          </button>
        </div>

        <!-- Tab 1: Info Detail -->
        <div v-if="detailsTab === 'info'" class="space-y-4">
          <dl class="asset-detail-fields">
            <div
              v-for="item in [
                ['Nomor Seri', selectedAsset.nomor_seri],
                ['Tipe Perangkat', selectedAsset.tipe_perangkat],
                ['Merek', selectedAsset.merek],
                ['Model', selectedAsset.model],
                ['Status Aset', getAssetStatusLabel(selectedAsset.status_aset)],
                ['Kondisi Aset', selectedAsset.kondisi_aset],
                ['NIK', selectedAsset.nik],
                ['Nama Karyawan', selectedAsset.nama_karyawan],
                ['Departemen', selectedAsset.departemen],
                ['Lokasi Aset', selectedAsset.lokasi_kerja],
              ]"
              :key="item[0]"
            >
              <dt class="text-[10px] font-bold uppercase text-[#9CA3AF]">{{ item[0] }}</dt>
              <dd class="mt-1 text-[13px] font-semibold text-[#111827]">{{ item[1] || '—' }}</dd>
            </div>
          </dl>
          <div>
            <p class="mb-1 text-[10px] font-bold uppercase text-[#9CA3AF]">Spesifikasi</p>
            <p class="whitespace-pre-wrap rounded-xl bg-[#F9FAFB] p-3 text-[13px] text-[#374151]">
              {{ selectedAsset.spesifikasi || '—' }}
            </p>
          </div>
          <div>
            <p class="mb-1 text-[10px] font-bold uppercase text-[#9CA3AF]">Catatan Aset</p>
            <p class="whitespace-pre-wrap rounded-xl bg-[#FFFDF5] p-3 text-[13px] text-[#374151]">
              {{ selectedAsset.catatan_aset || '—' }}
            </p>
          </div>
        </div>

        <!-- Tab 2: Log Perubahan -->
        <div v-if="detailsTab === 'logs'" class="space-y-3">
          <!-- Loading -->
          <div v-if="isLoadingLogs" aria-busy="true">
            <SkeletonTable :rows="4" :cols="3" :show-actions="false" />
          </div>

          <!-- Empty State -->
          <div
            v-else-if="deviceLogs.length === 0"
            class="flex flex-col items-center justify-center py-12 gap-3"
          >
            <span class="material-symbols-outlined text-[36px] text-[#D1D5DB]"
              >history_toggle_off</span
            >
            <p class="text-[12px] font-semibold text-[#9CA3AF]">
              Belum ada riwayat perubahan untuk perangkat ini.
            </p>
          </div>

          <!-- Timeline Log -->
          <div v-else class="relative">
            <!-- Timeline line -->
            <div
              class="absolute left-[15px] top-2 bottom-2 w-[2px] bg-[#E5E7EB] rounded-full"
            ></div>

            <div
              v-for="log in deviceLogs"
              :key="log.id"
              class="relative flex gap-4 pl-1 pb-4 last:pb-0"
            >
              <!-- Timeline dot -->
              <div
                class="relative z-10 mt-1 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm"
                :class="{
                  'bg-[#ECFDF5] text-[#059669]': log.aksi === 'TAMBAH',
                  'bg-[#FFF8E6] text-[#D97706]': log.aksi === 'UBAH',
                  'bg-[#FEF2F2] text-[#DC2626]': log.aksi === 'HAPUS',
                }"
              >
                <span class="material-symbols-outlined text-[14px]">
                  {{
                    log.aksi === 'TAMBAH' ? 'add_circle' : log.aksi === 'UBAH' ? 'edit' : 'delete'
                  }}
                </span>
              </div>

              <!-- Log Content -->
              <div class="flex-1 rounded-xl border border-[#F3F4F6] bg-[#FAFBFC] p-3">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <AppBadge
                    :type="
                      getStatusBadgeType(
                        log.aksi === 'TAMBAH'
                          ? 'tersedia'
                          : log.aksi === 'UBAH'
                            ? 'maintenance'
                            : 'rusak',
                      )
                    "
                    :text="log.aksi"
                  />
                  <span class="text-[10px] font-mono text-[#9CA3AF]">{{
                    formatLogDate(log.dibuat_pada)
                  }}</span>
                </div>

                <!-- UBAH: Table with old -> new -->
                <div
                  v-if="
                    log.aksi === 'UBAH' &&
                    parsePerubahan(log.perubahan, log.aksi).length &&
                    parsePerubahan(log.perubahan, log.aksi)[0].old !== undefined
                  "
                  class="overflow-x-auto w-full -mx-0.5"
                >
                  <table class="w-full text-[10px] border-collapse min-w-[260px]">
                    <thead>
                      <tr class="border-b border-[#E5E7EB]">
                        <th
                          class="py-1 pr-2 text-left font-bold text-[#9CA3AF] uppercase tracking-wider w-24 sm:w-28"
                        >
                          Field
                        </th>
                        <th
                          class="py-1 px-2 text-left font-bold text-[#9CA3AF] uppercase tracking-wider"
                        >
                          Sebelum
                        </th>
                        <th
                          class="py-1 pl-2 text-left font-bold text-[#9CA3AF] uppercase tracking-wider"
                        >
                          Sesudah
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(row, idx) in parsePerubahan(log.perubahan, log.aksi)"
                        :key="idx"
                        class="border-b border-[#F3F4F6] last:border-0"
                      >
                        <td class="py-1.5 pr-2 font-bold text-[#475569]">{{ row.field }}</td>
                        <td class="py-1.5 px-2 text-[#DC2626] line-through">{{ row.old }}</td>
                        <td class="py-1.5 pl-2 font-semibold text-[#059669]">{{ row.new }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- TAMBAH: Key-value detail list -->
                <div
                  v-else-if="
                    log.aksi === 'TAMBAH' && parsePerubahan(log.perubahan, log.aksi).length > 1
                  "
                  class="overflow-x-auto w-full -mx-0.5"
                >
                  <table class="w-full text-[10px] border-collapse min-w-[260px]">
                    <tbody>
                      <tr
                        v-for="(row, idx) in parsePerubahan(log.perubahan, log.aksi)"
                        :key="idx"
                        class="border-b border-[#F3F4F6] last:border-0"
                      >
                        <td
                          class="py-1.5 pr-2 font-bold text-[#9CA3AF] uppercase tracking-wider w-24 sm:w-28"
                        >
                          {{ row.field }}
                        </td>
                        <td class="py-1.5 font-semibold text-[#374151]">{{ row.value }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Fallback: plain text -->
                <p v-else class="text-[11px] font-medium leading-relaxed text-[#374151]">
                  {{ log.perubahan }}
                </p>

                <p class="mt-2 text-[10px] font-bold text-[#94A3B8]">
                  <span class="material-symbols-outlined text-[12px] align-text-bottom mr-0.5"
                    >person</span
                  >
                  {{ log.oleh_pengguna }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
      </div>
      <template #footer>
        <div class="asset-detail-footer">
          <button
            type="button"
            @click="closeModal"
            class="h-9 rounded-lg bg-[#111827] px-5 text-[13px] font-bold text-white"
          >
            Tutup
          </button>
        </div>
      </template>
    </AppModal>

    <AppModal :is-open="showExportModal" title="Ekspor Aset IT" size="md" @close="closeModal">
      <form class="flex flex-col gap-4" @submit.prevent="executeExport">
        <fieldset class="flex flex-col gap-2">
          <legend class="text-[11px] font-bold uppercase tracking-wider text-[#374151] mb-2">
            Pilih Format Ekspor
          </legend>
          <div class="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <label
              class="flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-colors"
              :class="
                exportFormat === 'csv'
                  ? 'border-brand bg-brand-light'
                  : 'border-[#DCE3EC] bg-white hover:bg-[#F8FAFC]'
              "
            >
              <span class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[20px] text-[#0B9B6C]">table_view</span>
                <span class="text-[12px] font-bold text-[#172033]">CSV (Excel)</span>
              </span>
              <input
                v-model="exportFormat"
                type="radio"
                name="exportFormat"
                value="csv"
                class="accent-brand"
              />
            </label>
            <label
              class="flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-colors"
              :class="
                exportFormat === 'pdf'
                  ? 'border-brand bg-brand-light'
                  : 'border-[#DCE3EC] bg-white hover:bg-[#F8FAFC]'
              "
            >
              <span class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[20px] text-[#DC4C4C]"
                  >picture_as_pdf</span
                >
                <span class="text-[12px] font-bold text-[#172033]">PDF Laporan</span>
              </span>
              <input
                v-model="exportFormat"
                type="radio"
                name="exportFormat"
                value="pdf"
                class="accent-brand"
              />
            </label>
          </div>
        </fieldset>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <span class="text-[11px] font-bold uppercase tracking-wider text-[#374151]"
              >Filter Status</span
            >
            <CustomSelect
              v-model="exportStatus"
              :options="[
                { value: '', label: 'Semua Status' },
                ...availableStatusOptions.map((s) => ({ value: s, label: s })),
              ]"
              aria-label="Filter Status"
              placeholder="Semua Status"
              :block="true"
              height-class="h-10"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <span class="text-[11px] font-bold uppercase tracking-wider text-[#374151]"
              >Filter Tipe Perangkat</span
            >
            <CustomSelect
              v-model="exportTipe"
              :options="[
                { value: '', label: 'Semua Tipe' },
                ...availableTipeOptions.map((t) => ({ value: t, label: t })),
              ]"
              aria-label="Filter Tipe Perangkat"
              placeholder="Semua Tipe"
              :block="true"
              height-class="h-10"
            />
          </div>
        </div>

        <div
          class="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 border-t border-[#F3F4F6] pt-4 mt-2"
        >
          <button
            type="button"
            @click="closeModal"
            class="h-10 w-full sm:w-auto rounded-xl border border-[#DCE3EC] px-5 text-[12px] font-semibold text-[#475569] hover:bg-[#F8FAFC] active:scale-95 transition-all cursor-pointer touch-manipulation"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="isExporting"
            class="h-10 w-full sm:w-auto rounded-xl bg-brand px-5 text-[12px] font-bold text-white shadow-md shadow-brand/20 hover:bg-brand-dark active:scale-95 disabled:opacity-50 transition-all cursor-pointer touch-manipulation"
          >
            {{ isExporting ? 'Mengekspor...' : 'Unduh File' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- Modal Import Excel -->
    <AppImportModal
      :is-open="showImportModal"
      @close="showImportModal = false"
      @imported="onImported"
    />

    <!-- Modal Cetak Label Aset -->
    <AssetLabelModal
      :is-open="showLabelModal"
      :asset="selectedLabelAsset"
      @close="showLabelModal = false"
    />
  </div>
</template>

<style scoped>
.asset-row-grid {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1280px) {
  .asset-row-grid {
    display: grid;
    grid-template-columns:
      minmax(230px, 2.2fr) minmax(140px, 1.2fr) minmax(170px, 1.5fr) minmax(120px, 1fr)
      minmax(130px, 1fr) 32px;
    align-items: center;
  }
}

.form-control {
  height: 2.625rem;
  border: 1px solid #dce3ec;
  border-radius: 0.75rem;
  background: #ffffff;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  font-size: 0.6875rem;
  color: #334155;
  outline: none;
}
.form-control:focus {
  border-color: var(--color-brand);
  box-shadow: 0 0 0 3px rgb(9 124 222 / 10%);
}
</style>

<style scoped src="../assets/asset-workspace.css"></style>

<style scoped>
.it-create-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 22px;
  padding: 6px;
  border-radius: 12px;
  background: #f1f5f9;
}
.it-create-steps button {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 60px;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 9px;
  text-align: left;
  cursor: pointer;
  color: #71829b;
}
.it-create-steps button[aria-current='step'] {
  background: #fff;
  border-color: #dfe7f1;
  color: #333333;
  box-shadow: 0 2px 4px #0A51B005;
}
.it-create-step-number {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #e7edf5;
  font-size: 12px;
  font-weight: 650;
}
.it-create-steps button[aria-current='step'] .it-create-step-number {
  background: #0A51B0;
  color: #fff;
}
.it-create-step-label {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 3px;
}
.it-create-step-label strong {
  font-size: 12px;
  font-weight: 600;
}
.it-create-step-label small {
  font-size: 10px;
  color: #8291a7;
}
.it-create-panel {
  padding: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
}
.it-create-panel > div:first-child {
  gap: 12px;
  align-items: center;
  padding-bottom: 14px;
  border-color: #edf1f6;
}
.it-create-panel > div:first-child > div > span:last-child {
  text-transform: none;
  letter-spacing: 0;
  font-size: 13px;
  font-weight: 600;
}
.it-create-panel > div:first-child > span {
  flex-shrink: 0;
  font-size: 10px;
  color: #8291a7;
}
.it-create-form fieldset {
  gap: 18px;
  padding-top: 4px;
}
.it-create-form label {
  margin: 0;
  font-size: 12px;
  font-weight: 550;
}
.it-create-form input {
  min-height: 44px;
  border-radius: 8px;
  background: #fafbfd;
}
.it-create-form :deep(button[aria-haspopup='listbox']) {
  min-height: 44px;
  background: #fafbfd;
}
.it-create-actions {
  justify-content: space-between;
}
.it-create-actions button {
  min-height: 44px;
}
.it-create-steps button:focus-visible {
  outline: 2px solid #097CDE;
  outline-offset: 2px;
}
@media (max-width: 639px) {
  .it-create-steps {
    gap: 4px;
    padding: 4px;
    margin-bottom: 16px;
  }
  .it-create-steps button {
    flex-direction: column;
    gap: 7px;
    padding: 9px 2px;
    min-height: 72px;
    text-align: center;
  }
  .it-create-step-label strong {
    font-size: 11px;
  }
  .it-create-step-label small {
    display: none;
  }
  .it-create-panel {
    padding: 14px;
  }
  .it-create-panel > div:first-child {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 8px;
  }
  .it-create-panel fieldset > div > div.flex.items-center.justify-between {
    flex-wrap: wrap;
    gap: 6px;
  }
  .it-create-form input,
  .it-create-form :deep(button[aria-haspopup='listbox']) {
    font-size: 16px;
  }
  .it-create-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }
  .it-create-actions > button {
    width: 100%;
  }
  .it-create-actions > div {
    width: 100%;
  }
}
</style>

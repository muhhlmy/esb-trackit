<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useAuth } from '../composables/useAuth.js'
import { animateStagger } from '../composables/useGsap.js'
import { normalizeLocation } from '../utils/locationNormalizer.js'
import AppModal from '../components/ui/AppModal.vue'
import SearchableSelect from '../components/ui/SearchableSelect.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import AppRowActions from '../components/ui/AppRowActions.vue'
import AppPagination from '../components/ui/AppPagination.vue'
import AssetLabelModal from '../components/common/AssetLabelModal.vue'
import BaseSkeleton from '../components/ui/skeleton/BaseSkeleton.vue'
import SkeletonAvatar from '../components/ui/skeleton/SkeletonAvatar.vue'

const { get, post, put, del } = useApi()
const { isAdmin, isSuperAdmin, hasWritePermission } = useAuth()
const canWriteAssets = computed(
  () =>
    isAdmin.value ||
    isSuperAdmin.value ||
    hasWritePermission('assets_ga') ||
    hasWritePermission('assets'),
)

const assets = ref([])
const currentPage = ref(1)
const itemsPerPage = ref(10)
const isLoading = ref(true)
const pageError = ref('')

// Filter State
const searchQuery = ref('')
const selectedLocation = ref('')
const selectedTipe = ref('')
const selectedKondisi = ref('')

// Modal States
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const showDetailsModal = ref(false)
const showLabelModal = ref(false)
const selectedLabelAsset = ref(null)
const modalMode = ref('add') // 'add' | 'edit'
const selectedAsset = ref(null)
const isSubmitting = ref(false)
const modalError = ref('')

// Tipe Aset GA States (Dynamic from Database)
const gaTypes = ref([])
const isLoadingTypes = ref(false)
const showTypeModal = ref(false)
const typeMode = ref('add') // 'add' | 'edit'
const typeForm = ref({
  id: null,
  nama_tipe: '',
  deskripsi: '',
})
const typeModalError = ref('')
const isSubmittingType = ref(false)
const typeToDelete = ref(null)
const showDeleteTypeModal = ref(false)

function openLabelModal(asset) {
  selectedLabelAsset.value = asset
  showLabelModal.value = true
}

// Opsi Pilihan Dropdown
const defaultTipeFasilitas = [
  'Meja',
  'Kursi',
  'AC',
  'Lemari',
  'Sofa',
  'Rak',
  'Printer',
  'Dispenser',
  'TV',
  'Lainnya',
]

const kondisiOptions = ['Baik', 'Rusak Ringan', 'Rusak Sedang', 'Rusak Berat']

const defaultLocations = [
  'Solo',
  'Pluit',
  'Gading Serpong',
  'Surabaya',
  'Bandung',
  'Medan',
  'Semarang',
  'Malang',
]

function mergeOptions(defaults, values) {
  return [...new Set([...defaults, ...values.filter(Boolean)])]
}

const locationOptions = computed(() =>
  mergeOptions(
    defaultLocations.map(normalizeLocation),
    [...assets.value.map((a) => a.lokasi), form.value.lokasi].map(normalizeLocation),
  ).map((loc) => ({ value: loc, label: loc })),
)

const tipeOptions = computed(() => {
  const dynamicNames = gaTypes.value.map((t) => t.nama_tipe).filter(Boolean)
  const base = dynamicNames.length > 0 ? dynamicNames : defaultTipeFasilitas
  return mergeOptions(base, [
    ...assets.value.map((a) => a.tipe_fasilitas),
    form.value.tipe_fasilitas,
  ]).map((t) => ({ value: t, label: t }))
})

// Filter option lists (include an empty "all" entry for CustomSelect)
const locationFilterOptions = computed(() => [
  { value: '', label: 'Semua Lokasi' },
  ...locationOptions.value,
])

const tipeFilterOptions = computed(() => [
  { value: '', label: 'Semua Fasilitas' },
  ...tipeOptions.value,
])

const kondisiFilterOptions = [
  { value: '', label: 'Semua Kondisi' },
  ...kondisiOptions.map((k) => ({ value: k, label: k })),
]

const kondisiFormOptions = computed(() =>
  kondisiOptions.map((k) => ({ value: k, label: k })),
)

// Form State (9 fields)
const emptyForm = () => ({
  lokasi: 'Pluit',
  lokasi_detail: '',
  hostname: '',
  nomor_tagging: '',
  quantity: 1,
  tipe_fasilitas: gaTypes.value[0]?.nama_tipe || 'Meja',
  brand: '',
  ukuran: '',
  detail: '',
  kondisi: 'Baik',
})

const form = ref(emptyForm())

// Filtered & Paginated Assets
const filteredAssets = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('id-ID')
  return assets.value.filter((asset) => {
    const searchable = [
      asset.id,
      asset.hostname,
      asset.nomor_tagging,
      asset.nama_asset,
      asset.brand,
      asset.tipe_fasilitas,
      asset.ukuran,
      asset.detail,
      asset.lokasi,
      asset.lokasi_detail,
      asset.kondisi,
    ]
      .join(' ')
      .toLocaleLowerCase('id-ID')

    return (
      (!query || searchable.includes(query)) &&
      (!selectedLocation.value || asset.lokasi === selectedLocation.value) &&
      (!selectedTipe.value || asset.tipe_fasilitas === selectedTipe.value) &&
      (!selectedKondisi.value || asset.kondisi === selectedKondisi.value)
    )
  })
})

const paginatedAssets = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredAssets.value.slice(start, start + itemsPerPage.value)
})

watch([searchQuery, selectedLocation, selectedTipe, selectedKondisi], () => {
  currentPage.value = 1
})

function resetFilters() {
  searchQuery.value = ''
  selectedLocation.value = ''
  selectedTipe.value = ''
  selectedKondisi.value = ''
}

// Lifecycle
onMounted(() => {
  fetchData()
  fetchGaTypes()
})

async function fetchGaTypes() {
  isLoadingTypes.value = true
  try {
    const data = await get('/api/ga-assets/types')
    gaTypes.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Gagal memuat tipe aset GA:', error)
  } finally {
    isLoadingTypes.value = false
  }
}

function openTypeManager() {
  typeMode.value = 'add'
  typeForm.value = { id: null, nama_tipe: '', deskripsi: '' }
  typeModalError.value = ''
  showTypeModal.value = true
  fetchGaTypes()
}

function closeTypeModal() {
  if (isSubmittingType.value) return
  showTypeModal.value = false
  typeForm.value = { id: null, nama_tipe: '', deskripsi: '' }
  typeModalError.value = ''
}

function editType(item) {
  typeMode.value = 'edit'
  typeForm.value = {
    id: item.id,
    nama_tipe: item.nama_tipe,
    deskripsi: item.deskripsi || '',
  }
  typeModalError.value = ''
}

function cancelEditType() {
  typeMode.value = 'add'
  typeForm.value = { id: null, nama_tipe: '', deskripsi: '' }
  typeModalError.value = ''
}

async function submitTypeForm() {
  typeModalError.value = ''
  const nama = (typeForm.value.nama_tipe || '').trim()
  if (!nama) {
    typeModalError.value = 'Nama tipe wajib diisi.'
    return
  }

  isSubmittingType.value = true
  try {
    const payload = {
      nama_tipe: nama,
      deskripsi: (typeForm.value.deskripsi || '').trim(),
    }

    if (typeMode.value === 'add') {
      await post('/api/ga-assets/types', payload)
    } else {
      await put(`/api/ga-assets/types/${typeForm.value.id}`, payload)
    }

    typeForm.value = { id: null, nama_tipe: '', deskripsi: '' }
    typeMode.value = 'add'
    await Promise.all([fetchGaTypes(), fetchData()])
  } catch (err) {
    typeModalError.value = err.message || 'Gagal menyimpan tipe aset GA.'
  } finally {
    isSubmittingType.value = false
  }
}

function openDeleteType(item) {
  typeToDelete.value = item
  showDeleteTypeModal.value = true
}

function closeDeleteTypeModal() {
  if (isSubmittingType.value) return
  showDeleteTypeModal.value = false
  typeToDelete.value = null
}

async function confirmDeleteType() {
  if (!typeToDelete.value) return
  isSubmittingType.value = true
  try {
    await del(`/api/ga-assets/types/${typeToDelete.value.id}`)
    showDeleteTypeModal.value = false
    typeToDelete.value = null
    await Promise.all([fetchGaTypes(), fetchData()])
  } catch (err) {
    typeModalError.value = err.message || 'Gagal menghapus tipe aset GA.'
  } finally {
    isSubmittingType.value = false
  }
}

async function fetchData() {
  isLoading.value = true
  pageError.value = ''
  try {
    const data = await get('/api/ga-assets')
    assets.value = (Array.isArray(data) ? data : []).map((a) => ({
      ...a,
      lokasi: normalizeLocation(a.lokasi),
    }))
  } catch (error) {
    pageError.value = error.message || 'Gagal memuat data Aset GA.'
  } finally {
    isLoading.value = false
    await nextTick()
    animateStagger('.ga-row-grid')
  }
}

function openAdd() {
  if (!canWriteAssets.value) return
  modalMode.value = 'add'
  selectedAsset.value = null
  form.value = emptyForm()
  modalError.value = ''
  showFormModal.value = true
}

function openEdit(asset) {
  if (!canWriteAssets.value) return
  modalMode.value = 'edit'
  selectedAsset.value = asset
  const tagging = asset.hostname || asset.nomor_tagging || ''
  form.value = {
    lokasi: asset.lokasi || 'Pluit',
    lokasi_detail: asset.lokasi_detail || '',
    hostname: tagging,
    nomor_tagging: tagging,
    quantity: asset.quantity || 1,
    tipe_fasilitas: asset.tipe_fasilitas || 'Meja',
    brand: asset.brand || asset.nama_asset || '',
    ukuran: asset.ukuran || '',
    detail: asset.detail || '',
    kondisi: asset.kondisi || 'Baik',
  }
  modalError.value = ''
  showFormModal.value = true
}

function openDelete(asset) {
  if (!canWriteAssets.value) return
  selectedAsset.value = asset
  modalError.value = ''
  showDeleteModal.value = true
}

function openDetails(asset) {
  selectedAsset.value = asset
  showDetailsModal.value = true
}

function closeModal(force = false) {
  if (isSubmitting.value && !force) return
  showFormModal.value = false
  showDeleteModal.value = false
  showDetailsModal.value = false
  selectedAsset.value = null
  modalError.value = ''
}

async function submitForm() {
  modalError.value = ''
  if (!form.value.lokasi) {
    modalError.value = 'Lokasi wajib diisi.'
    return
  }
  const tagging = (form.value.hostname || form.value.nomor_tagging || '').trim()
  if (!tagging) {
    modalError.value = 'Nomor Tagging wajib diisi.'
    return
  }
  if (!form.value.quantity || form.value.quantity <= 0) {
    modalError.value = 'Quantity harus berupa angka lebih dari 0.'
    return
  }
  if (!form.value.tipe_fasilitas) {
    modalError.value = 'Tipe wajib diisi.'
    return
  }
  if (!form.value.kondisi) {
    modalError.value = 'Kondisi Aset wajib diisi.'
    return
  }

  isSubmitting.value = true
  try {
    const brandVal = (form.value.brand || '').trim()
    const tipeVal = (form.value.tipe_fasilitas || '').trim()
    const computedNamaAsset = brandVal
      ? (brandVal.toLowerCase().includes(tipeVal.toLowerCase()) ? brandVal : `${tipeVal} ${brandVal}`)
      : tipeVal

    const payload = {
      ...form.value,
      hostname: tagging,
      nomor_tagging: tagging,
      nama_asset: computedNamaAsset,
      brand: brandVal,
      lokasi: normalizeLocation(form.value.lokasi),
    }

    if (modalMode.value === 'add') {
      await post('/api/ga-assets', payload)
    } else {
      await put(`/api/ga-assets/${selectedAsset.value.id}`, payload)
    }
    showFormModal.value = false
    selectedAsset.value = null
    modalError.value = ''
    await fetchData()
  } catch (err) {
    modalError.value = err.message || 'Gagal menyimpan data Aset GA.'
  } finally {
    isSubmitting.value = false
  }
}

async function confirmDelete() {
  if (!selectedAsset.value) return
  isSubmitting.value = true
  modalError.value = ''
  try {
    await del(`/api/ga-assets/${selectedAsset.value.id}`)
    showDeleteModal.value = false
    selectedAsset.value = null
    modalError.value = ''
    await fetchData()
  } catch (err) {
    modalError.value = err.message || 'Gagal menghapus Aset GA.'
  } finally {
    isSubmitting.value = false
  }
}

function getGaActions(asset) {
  const actions = [
    {
      label: 'Lihat Detail',
      icon: 'visibility',
      onClick: () => openDetails(asset),
      handler: () => openDetails(asset),
    },
    {
      label: 'Cetak Label',
      icon: 'print',
      onClick: () => openLabelModal(asset),
      handler: () => openLabelModal(asset),
    },
  ]
  if (canWriteAssets.value) {
    actions.push({
      label: 'Edit Aset',
      icon: 'edit',
      onClick: () => openEdit(asset),
      handler: () => openEdit(asset),
    })
    actions.push({
      label: 'Hapus Aset',
      icon: 'delete',
      danger: true,
      onClick: () => openDelete(asset),
      handler: () => openDelete(asset),
    })
  }
  return actions
}

function getGaIcon(type) {
  const value = (type || '').toLowerCase()
  if (value.includes('meja')) return 'table_bar'
  if (value.includes('kursi')) return 'chair'
  if (value.includes('ac')) return 'ac_unit'
  if (value.includes('lemari')) return 'inventory_2'
  if (value.includes('sofa')) return 'weekend'
  if (value.includes('rak')) return 'shelves'
  if (value.includes('printer')) return 'print'
  if (value.includes('dispenser')) return 'water_drop'
  if (value.includes('tv')) return 'tv'
  return 'domain'
}

function formatKondisiPill(kondisi) {
  switch (kondisi) {
    case 'Baik':
      return { text: 'text-[#166534]', bg: 'bg-[#DCFCE7]', dot: 'bg-[#15803D]' }
    case 'Rusak Ringan':
      return { text: 'text-[#854D0E]', bg: 'bg-[#FEF9C3]', dot: 'bg-[#CA8A04]' }
    case 'Rusak Sedang':
      return { text: 'text-[#C2410C]', bg: 'bg-[#FFEDD5]', dot: 'bg-[#EA580C]' }
    case 'Rusak Berat':
      return { text: 'text-[#991B1B]', bg: 'bg-[#FEE2E2]', dot: 'bg-[#DC2626]' }
    default:
      return { text: 'text-[#475569]', bg: 'bg-[#F1F5F9]', dot: 'bg-[#64748B]' }
  }
}
</script>

<template>
  <div class="space-y-4" :data-testid="!isLoading ? 'page-ready' : undefined">
    <!-- Simplified SaaS Header & Toolbar Container -->
    <div
      class="flex flex-col gap-3 sm:gap-3.5 bg-white p-3.5 sm:p-4.5 rounded-2xl border border-[#E2E8F0]/80 shadow-2xs"
    >
      <!-- Row 1: Page Title & Primary CTA -->
      <div class="flex items-center justify-between gap-2.5">
        <div class="min-w-0">
          <h2 class="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight truncate">
            Aset GA
          </h2>
          <p
            class="text-[11px] sm:text-xs text-[#64748B] mt-0.5 leading-normal line-clamp-1 sm:line-clamp-none"
          >
            Kelola inventaris fasilitas General Affair, mebel, AC, dan perlengkapan kantor.
          </p>
        </div>

        <!-- Primary Action CTA -->
        <div class="flex items-center gap-2">
          <button
            v-if="canWriteAssets"
            type="button"
            @click="openTypeManager"
            class="h-9 shrink-0 whitespace-nowrap rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F1F5F9] hover:border-[#CBD5E1] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
            title="Kelola Tipe Fasilitas Aset GA"
          >
            <span class="material-symbols-outlined text-[16px] text-[#64748B]">category</span>
            <span>Kelola Tipe</span>
          </button>
          <button
            v-if="canWriteAssets"
            type="button"
            @click="openAdd"
            class="h-9 shrink-0 whitespace-nowrap rounded-lg bg-[#2563EB] px-3 sm:px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#1D4ED8] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
            title="Tambah Aset GA baru"
          >
            <span class="material-symbols-outlined text-[16px]">add</span>
            <span>Tambah Aset GA</span>
          </button>
        </div>
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
            placeholder="Cari hostname, nama asset, detail, lokasi..."
            class="h-9 w-full rounded-lg border border-[#E2E8F0] bg-white pl-8 pr-8 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none transition-all shadow-2xs"
          />
          <!-- Inline Clear Button -->
          <button
            v-if="searchQuery"
            type="button"
            @click="searchQuery = ''"
            aria-label="Bersihkan pencarian"
            class="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-all cursor-pointer touch-manipulation"
            title="Bersihkan"
          >
            <span class="material-symbols-outlined text-[15px]">close</span>
          </button>
        </div>

        <!-- Filter Cluster -->
        <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <!-- Filter Lokasi -->
          <div class="flex-1 min-w-[120px] sm:w-[140px] sm:flex-initial">
            <CustomSelect
              v-model="selectedLocation"
              :options="locationFilterOptions"
              aria-label="Filter lokasi"
              placeholder="Semua Lokasi"
              :block="true"
              height-class="h-9"
            />
          </div>

          <!-- Filter Tipe Fasilitas -->
          <div class="flex-1 min-w-[120px] sm:w-[145px] sm:flex-initial">
            <CustomSelect
              v-model="selectedTipe"
              :options="tipeFilterOptions"
              aria-label="Filter tipe fasilitas"
              placeholder="Semua Fasilitas"
              :block="true"
              height-class="h-9"
            />
          </div>

          <!-- Filter Kondisi -->
          <div class="flex-1 min-w-[110px] sm:w-[135px] sm:flex-initial">
            <CustomSelect
              v-model="selectedKondisi"
              :options="kondisiFilterOptions"
              aria-label="Filter kondisi"
              placeholder="Semua Kondisi"
              :block="true"
              height-class="h-9"
            />
          </div>

          <!-- Reset Filter Button -->
          <button
            v-if="searchQuery || selectedLocation || selectedTipe || selectedKondisi"
            type="button"
            @click="resetFilters"
            class="h-9 shrink-0 whitespace-nowrap rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-medium text-[#64748B] hover:text-[#0F172A] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs touch-manipulation"
            title="Reset filter"
          >
            <span class="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ─── MODERN ENTERPRISE SAAS DATA MANAGEMENT CONTAINER ──────────────── -->
    <div>
      <!-- Error Alert -->
      <div
        v-if="pageError"
        role="alert"
        class="flex items-center gap-2 bg-rose-50 px-5 py-4 text-[12.5px] text-rose-600 rounded-2xl border border-rose-200"
      >
        <span class="material-symbols-outlined text-[18px]">error</span>
        <span class="flex-1 font-semibold">{{ pageError }}</span>
        <button type="button" class="font-bold underline cursor-pointer" @click="fetchData">
          Coba lagi
        </button>
      </div>

      <!-- Loading State Skeleton -->
      <div v-else-if="isLoading" aria-busy="true" class="space-y-2.5">
        <div
          v-for="r in 6"
          :key="'ga-skel-' + r"
          class="ga-row-grid gap-3 md:gap-4 rounded-xl border border-[#E2E8F0]/80 bg-white p-3.5 sm:p-4 shadow-2xs select-none"
        >
          <!-- Mobile Skeleton Structure (< 768px) -->
          <div class="flex items-start justify-between gap-2.5 min-w-0 md:hidden">
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

          <div class="border-t border-[#F1F5F9] my-0.5 md:hidden"></div>

          <div class="grid grid-cols-2 gap-2.5 md:hidden">
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

          <!-- Desktop Skeleton Structure (>= 768px) -->
          <!-- 1. Identity -->
          <div class="hidden md:flex items-center gap-3.5 min-w-0">
            <SkeletonAvatar size="40px" shape="rounded" class="shrink-0" />
            <div class="flex flex-col gap-1.5 min-w-0">
              <BaseSkeleton width="130px" height="15px" radius="md" />
              <BaseSkeleton width="90px" height="12px" radius="sm" />
            </div>
          </div>
          <!-- 2. Fasilitas & Qty -->
          <div class="hidden md:flex flex-col gap-1 min-w-0">
            <BaseSkeleton width="60px" height="10px" radius="sm" />
            <BaseSkeleton width="90px" height="13px" radius="md" />
            <BaseSkeleton width="50px" height="11px" radius="sm" />
          </div>
          <!-- 3. Lokasi -->
          <div class="hidden md:flex flex-col gap-1 min-w-0">
            <BaseSkeleton width="45px" height="10px" radius="sm" />
            <BaseSkeleton width="80px" height="13px" radius="md" />
            <BaseSkeleton width="90px" height="11px" radius="sm" />
          </div>
          <!-- 4. Ukuran & Detail -->
          <div class="hidden md:flex flex-col gap-1 min-w-0">
            <BaseSkeleton width="55px" height="10px" radius="sm" />
            <BaseSkeleton width="100px" height="13px" radius="md" />
          </div>
          <!-- 5. Kondisi -->
          <div class="hidden md:flex items-center">
            <BaseSkeleton width="75px" height="22px" radius="full" />
          </div>
          <!-- 6. Action -->
          <div class="hidden md:flex justify-end">
            <BaseSkeleton width="18px" height="18px" radius="md" />
          </div>
        </div>
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
            <span class="material-symbols-outlined text-[24px]">domain_disabled</span>
          </span>
          <h3 class="text-[14px] font-bold text-[#0F172A] mt-1">Belum Ada Aset GA</h3>
          <p class="text-[11.5px] text-[#64748B] leading-relaxed">
            Belum ada fasilitas General Affair yang terdaftar dalam inventaris atau sesuai dengan
            kata kunci pencarian.
          </p>
          <button
            v-if="canWriteAssets"
            type="button"
            @click="openAdd"
            class="mt-2 h-9 rounded-lg bg-[#2563EB] px-4 text-[12px] font-semibold text-white shadow-2xs hover:bg-[#1D4ED8] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span class="material-symbols-outlined text-[16px]">add</span>
            <span>Tambah Aset GA</span>
          </button>
        </div>
      </div>

      <!-- PRIMARY VIEW: SaaS Row Cards -->
      <div v-else class="space-y-2.5">
        <div
          v-for="asset in paginatedAssets"
          :key="asset.id"
          @click="openDetails(asset)"
          class="ga-row-grid group relative gap-3 md:gap-4 rounded-xl border border-[#E2E8F0]/80 bg-white p-3.5 sm:p-4 shadow-2xs hover:border-[#2563EB]/40 hover:shadow-sm transition-all duration-200 cursor-pointer select-none"
        >
          <!-- ── MOBILE LAYOUT (< 768px / md:hidden) ─────────────────── -->
          <!-- Mobile Header: Icon + Identity + Kondisi Pill + Actions -->
          <div class="flex items-start justify-between gap-2.5 min-w-0 md:hidden">
            <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB] group-hover:scale-105 transition-transform"
              >
                <span class="material-symbols-outlined text-[20px]">{{
                  getGaIcon(asset.tipe_fasilitas)
                }}</span>
              </div>
              <div class="flex flex-col min-w-0 flex-1">
                <span
                  class="font-mono text-[13.5px] font-bold text-[#0F172A] leading-tight group-hover:text-[#2563EB] transition-colors truncate block"
                  :title="asset.hostname || '—'"
                >
                  {{ asset.hostname || '—' }}
                </span>
                <span
                  class="text-[11px] font-medium text-[#64748B] mt-0.5 tracking-tight truncate block"
                  :title="asset.tipe_fasilitas || '—'"
                >
                  {{ asset.tipe_fasilitas || '—' }}
                </span>
              </div>
            </div>

            <!-- Mobile Kondisi & Action Menu -->
            <div class="flex items-center gap-1.5 shrink-0 self-start">
              <div
                class="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold"
                :class="[
                  formatKondisiPill(asset.kondisi).bg,
                  formatKondisiPill(asset.kondisi).text,
                ]"
              >
                <span
                  class="h-1.5 w-1.5 rounded-full shrink-0"
                  :class="formatKondisiPill(asset.kondisi).dot"
                ></span>
                <span class="truncate max-w-[85px] xs:max-w-none">{{ asset.kondisi }}</span>
              </div>
              <div @click.stop class="shrink-0">
                <AppRowActions :actions="getGaActions(asset)" />
              </div>
            </div>
          </div>

          <!-- Mobile Divider -->
          <div class="border-t border-[#F1F5F9] my-0.5 md:hidden"></div>

          <!-- Mobile 2x2 Metadata Grid -->
          <div class="grid grid-cols-2 gap-2.5 md:hidden text-left">
            <!-- 1. Brand & Qty -->
            <div class="flex flex-col min-w-0 overflow-hidden">
              <span class="text-[10px] font-semibold uppercase text-[#94A3B8] tracking-wider"
                >Brand & Qty</span
              >
              <span
                class="text-[12px] font-semibold text-[#1E293B] mt-0.5 truncate block"
                :title="asset.brand || '—'"
              >
                {{ asset.brand || '—' }}
              </span>
              <span class="text-[11px] font-medium text-[#2563EB] mt-0.5 truncate block">
                {{ asset.quantity || 1 }} Unit
              </span>
            </div>

            <!-- 2. Lokasi & Detail -->
            <div class="flex flex-col min-w-0 overflow-hidden">
              <span class="text-[10px] font-semibold uppercase text-[#94A3B8] tracking-wider"
                >Lokasi</span
              >
              <span
                class="text-[12px] font-normal text-[#1E293B] mt-0.5 truncate block"
                :title="asset.lokasi || '—'"
              >
                {{ asset.lokasi || '—' }}
              </span>
              <span
                v-if="asset.lokasi_detail"
                class="text-[11px] font-normal text-[#64748B] mt-0.5 truncate block"
                :title="asset.lokasi_detail"
              >
                {{ asset.lokasi_detail }}
              </span>
            </div>

            <!-- 3. Ukuran -->
            <div class="flex flex-col min-w-0 overflow-hidden">
              <span class="text-[10px] font-semibold uppercase text-[#94A3B8] tracking-wider"
                >Ukuran</span
              >
              <span
                class="text-[12px] font-normal text-[#1E293B] mt-0.5 truncate block"
                :title="asset.ukuran || '—'"
              >
                {{ asset.ukuran || '—' }}
              </span>
            </div>

            <!-- 4. Detail / Catatan -->
            <div class="flex flex-col min-w-0 overflow-hidden">
              <span class="text-[10px] font-semibold uppercase text-[#94A3B8] tracking-wider"
                >Detail</span
              >
              <span
                class="text-[12px] font-normal text-[#64748B] mt-0.5 truncate block"
                :title="asset.detail || '—'"
              >
                {{ asset.detail || '—' }}
              </span>
            </div>
          </div>

          <!-- ── DESKTOP LAYOUT (>= 768px / hidden md:flex) ──────────── -->
          <!-- 1. Asset Identity -->
          <div class="hidden md:flex items-center gap-3.5 min-w-0 overflow-hidden">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB] group-hover:scale-105 transition-transform"
            >
              <span class="material-symbols-outlined text-[20px]">{{
                getGaIcon(asset.tipe_fasilitas)
              }}</span>
            </div>
            <div class="flex flex-col min-w-0 overflow-hidden">
              <span
                class="font-mono text-[14px] font-bold text-[#0F172A] leading-snug group-hover:text-[#2563EB] transition-colors truncate block w-full"
                :title="asset.hostname || '—'"
              >
                {{ asset.hostname || '—' }}
              </span>
              <span
                class="text-[12px] font-medium text-[#64748B] mt-0.5 tracking-tight truncate block w-full"
                :title="asset.tipe_fasilitas || '—'"
              >
                {{ asset.tipe_fasilitas || '—' }}
              </span>
            </div>
          </div>

          <!-- 2. Brand & Qty -->
          <div class="hidden md:flex flex-col min-w-0 overflow-hidden">
            <span class="text-[10px] font-semibold uppercase text-[#94A3B8] tracking-wider"
              >Brand & Qty</span
            >
            <span
              class="text-[12.5px] font-semibold text-[#1E293B] mt-0.5 truncate block w-full"
              :title="asset.brand || '—'"
            >
              {{ asset.brand || '—' }}
            </span>
            <span class="text-[11.5px] font-medium text-[#2563EB] mt-0.5 truncate block w-full">
              {{ asset.quantity || 1 }} Unit
            </span>
          </div>

          <!-- 3. Lokasi & Detail -->
          <div class="hidden md:flex flex-col min-w-0 overflow-hidden">
            <span class="text-[10px] font-semibold uppercase text-[#94A3B8] tracking-wider"
              >Lokasi</span
            >
            <span
              class="text-[12.5px] font-normal text-[#1E293B] mt-0.5 truncate block w-full"
              :title="asset.lokasi || '—'"
            >
              {{ asset.lokasi || '—' }}
            </span>
            <span
              v-if="asset.lokasi_detail"
              class="text-[11.5px] font-normal text-[#64748B] mt-0.5 truncate block w-full"
              :title="asset.lokasi_detail"
            >
              {{ asset.lokasi_detail }}
            </span>
          </div>

          <!-- 4. Ukuran & Detail -->
          <div class="hidden md:flex flex-col min-w-0 overflow-hidden">
            <span class="text-[10px] font-semibold uppercase text-[#94A3B8] tracking-wider"
              >Ukuran & Detail</span
            >
            <span
              class="text-[12.5px] font-normal text-[#1E293B] mt-0.5 truncate block w-full"
              :title="asset.ukuran || '—'"
            >
              {{ asset.ukuran || '—' }}
            </span>
            <span
              v-if="asset.detail"
              class="text-[11.5px] font-normal text-[#64748B] mt-0.5 truncate block w-full"
              :title="asset.detail"
            >
              {{ asset.detail }}
            </span>
          </div>

          <!-- 5. Kondisi Component Block -->
          <div class="hidden md:flex flex-col items-start min-w-0 overflow-hidden select-none">
            <div
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
              :class="[formatKondisiPill(asset.kondisi).bg, formatKondisiPill(asset.kondisi).text]"
            >
              <span
                class="h-1.5 w-1.5 rounded-full shrink-0"
                :class="formatKondisiPill(asset.kondisi).dot"
              ></span>
              <span class="truncate">{{ asset.kondisi }}</span>
            </div>
          </div>

          <!-- 6. Action Menu -->
          <div
            @click.stop
            class="hidden md:flex items-center justify-end w-8 shrink-0 justify-self-end"
          >
            <AppRowActions :actions="getGaActions(asset)" />
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <AppPagination
        v-if="!isLoading && !pageError"
        v-model:currentPage="currentPage"
        :total-items="filteredAssets.length"
        :items-per-page="itemsPerPage"
      />
    </div>

    <!-- Modal Form (Tambah / Edit) -->
    <AppModal
      :is-open="showFormModal"
      :title="modalMode === 'add' ? 'Tambah Aset GA Baru' : 'Edit Aset GA'"
      :subtitle="
        modalMode === 'add'
          ? 'Lengkapi data inventaris fasilitas General Affair kantor.'
          : 'Perbarui informasi dan spesifikasi aset GA.'
      "
      size="xl"
      @close="closeModal"
    >
      <form @submit.prevent="submitForm" class="space-y-3.5">
        <div
          v-if="modalError"
          class="p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[#991B1B] text-[12px]"
        >
          {{ modalError }}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-12 gap-x-3.5 gap-y-3">
          <!-- 1. Lokasi -->
          <div class="sm:col-span-4">
            <label class="block text-[12px] font-semibold text-[#1E293B] mb-1">
              Lokasi <span class="text-rose-500">*</span>
            </label>
            <SearchableSelect
              v-model="form.lokasi"
              :options="locationOptions"
              value-key="value"
              label-key="label"
              placeholder="Pilih Lokasi"
              height-class="h-9.5"
              teleport
            />
          </div>

          <!-- 2. Lokasi Detail -->
          <div class="sm:col-span-4">
            <label for="ga-lokasi-detail" class="block text-[12px] font-semibold text-[#1E293B] mb-1">
              Lokasi Detail
            </label>
            <input
              id="ga-lokasi-detail"
              v-model="form.lokasi_detail"
              type="text"
              placeholder="Contoh: Lantai 2 / Ruang Rapat"
              class="w-full h-9.5 px-3 text-[12.5px] rounded-xl border border-[#E2E8F0] bg-white focus:border-[#2563EB] focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <!-- 3. Nomor Tagging -->
          <div class="sm:col-span-4">
            <label for="ga-nomor-tagging" class="block text-[12px] font-semibold text-[#1E293B] mb-1">
              Nomor Tagging <span class="text-rose-500">*</span>
            </label>
            <input
              id="ga-nomor-tagging"
              v-model="form.hostname"
              type="text"
              required
              placeholder="Contoh: GA-PL-001"
              class="w-full h-9.5 px-3 text-[12.5px] rounded-xl border border-[#E2E8F0] bg-white focus:border-[#2563EB] focus:outline-none transition-all shadow-2xs font-mono"
            />
          </div>

          <!-- 4. Quantity -->
          <div class="sm:col-span-2">
            <label for="ga-quantity" class="block text-[12px] font-semibold text-[#1E293B] mb-1">
              Quantity <span class="text-rose-500">*</span>
            </label>
            <input
              id="ga-quantity"
              v-model.number="form.quantity"
              type="number"
              min="1"
              required
              placeholder="1"
              class="w-full h-9.5 px-3 text-[12.5px] rounded-xl border border-[#E2E8F0] bg-white focus:border-[#2563EB] focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <!-- 5. Tipe -->
          <div class="sm:col-span-4">
            <div class="flex items-center justify-between mb-1">
              <label class="block text-[12px] font-semibold text-[#1E293B]">
                Tipe <span class="text-rose-500">*</span>
              </label>
              <button
                v-if="canWriteAssets"
                type="button"
                @click="openTypeManager"
                class="text-[11px] font-medium text-[#2563EB] hover:text-[#1D4ED8] hover:underline flex items-center gap-0.5 cursor-pointer"
                title="Kelola Daftar Tipe Fasilitas"
              >
                <span class="material-symbols-outlined text-[13px]">tune</span>
                <span>Kelola</span>
              </button>
            </div>
            <SearchableSelect
              v-model="form.tipe_fasilitas"
              :options="tipeOptions"
              value-key="value"
              label-key="label"
              placeholder="Pilih Tipe"
              height-class="h-9.5"
              teleport
            />
          </div>

          <!-- 6. Brand -->
          <div class="sm:col-span-3">
            <label for="ga-brand" class="block text-[12px] font-semibold text-[#1E293B] mb-1">
              Brand
            </label>
            <input
              id="ga-brand"
              v-model="form.brand"
              type="text"
              placeholder="Contoh: Daikin, IKEA, Informa"
              class="w-full h-9.5 px-3 text-[12.5px] rounded-xl border border-[#E2E8F0] bg-white focus:border-[#2563EB] focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <!-- 7. Ukuran -->
          <div class="sm:col-span-3">
            <label for="ga-ukuran" class="block text-[12px] font-semibold text-[#1E293B] mb-1">
              Ukuran
            </label>
            <input
              id="ga-ukuran"
              v-model="form.ukuran"
              type="text"
              placeholder="Contoh: 120x60 cm / 2 PK"
              class="w-full h-9.5 px-3 text-[12.5px] rounded-xl border border-[#E2E8F0] bg-white focus:border-[#2563EB] focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <!-- 8. Detail Aset -->
          <div class="sm:col-span-8">
            <label for="ga-detail" class="block text-[12px] font-semibold text-[#1E293B] mb-1">
              Detail Aset
            </label>
            <input
              id="ga-detail"
              v-model="form.detail"
              type="text"
              placeholder="Contoh: Warna Hitam, Kayu Jati"
              class="w-full h-9.5 px-3 text-[12.5px] rounded-xl border border-[#E2E8F0] bg-white focus:border-[#2563EB] focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <!-- 9. Kondisi Aset -->
          <div class="sm:col-span-4">
            <label for="ga-kondisi" class="block text-[12px] font-semibold text-[#1E293B] mb-1">
              Kondisi Aset <span class="text-rose-500">*</span>
            </label>
            <SearchableSelect
              id="ga-kondisi"
              v-model="form.kondisi"
              :options="kondisiFormOptions"
              value-key="value"
              label-key="label"
              placeholder="Pilih Kondisi"
              height-class="h-9.5"
              teleport
            />
          </div>
        </div>

        <!-- Submit Footer -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
          <button
            type="button"
            @click="closeModal"
            class="h-9.5 px-4 rounded-xl border border-[#E2E8F0] text-[12.5px] font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="h-9.5 px-5 rounded-xl bg-[#2563EB] text-[12.5px] font-bold text-white shadow-2xs hover:bg-[#1D4ED8] disabled:opacity-50 flex items-center gap-2"
          >
            <span v-if="isSubmitting" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>
            <span>{{ isSubmitting ? 'Menyimpan...' : (modalMode === 'add' ? 'Simpan Aset GA' : 'Perbarui Aset GA') }}</span>
          </button>
        </div>
      </form>
    </AppModal>

    <!-- Modal Confirm Delete -->
    <AppModal :is-open="showDeleteModal" title="Hapus Aset GA" size="sm" @close="closeModal">
      <div class="space-y-4">
        <p class="text-[13px] text-[#475569]">
          Apakah Anda yakin ingin menghapus Aset GA
          <strong class="text-[#0F172A]">{{ selectedAsset?.nama_asset || selectedAsset?.brand }}</strong> ({{
            selectedAsset?.hostname
          }})?
        </p>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
          <button
            type="button"
            @click="closeModal"
            class="h-10 px-4 rounded-xl border border-[#E2E8F0] text-[12.5px] font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            @click="confirmDelete"
            class="h-10 px-5 rounded-xl bg-rose-600 text-[12.5px] font-bold text-white shadow-2xs hover:bg-rose-700 disabled:opacity-50"
          >
            {{ isSubmitting ? 'Menghapus...' : 'Ya, Hapus' }}
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Modal Details View -->
    <AppModal :is-open="showDetailsModal" title="Detail Aset GA" size="md" @close="closeModal">
      <div v-if="selectedAsset" class="space-y-4">
        <div class="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]"
          >
            <span class="material-symbols-outlined text-[24px]">{{
              getGaIcon(selectedAsset.tipe_fasilitas)
            }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="font-bold text-[#0F172A] text-[14px] truncate">
              {{ selectedAsset.brand || selectedAsset.nama_asset || selectedAsset.tipe_fasilitas }}
            </h3>
            <p class="font-mono text-[11px] text-[#64748B]">{{ selectedAsset.hostname }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3.5 text-[12.5px]">
          <div>
            <span class="text-[#64748B] block text-[11px] font-medium">1. Lokasi</span>
            <span class="font-semibold text-[#1E293B]">{{ selectedAsset.lokasi }}</span>
          </div>

          <div>
            <span class="text-[#64748B] block text-[11px] font-medium">2. Lokasi Detail</span>
            <span class="text-[#1E293B]">{{ selectedAsset.lokasi_detail || '—' }}</span>
          </div>

          <div>
            <span class="text-[#64748B] block text-[11px] font-medium">3. Nomor Tagging</span>
            <span class="font-mono text-[#1E293B]">{{ selectedAsset.hostname || '—' }}</span>
          </div>

          <div>
            <span class="text-[#64748B] block text-[11px] font-medium">4. Quantity</span>
            <span class="font-bold text-[#0F172A]">{{ selectedAsset.quantity }} Unit</span>
          </div>

          <div>
            <span class="text-[#64748B] block text-[11px] font-medium">5. Tipe</span>
            <span class="font-semibold text-[#1E293B]">{{ selectedAsset.tipe_fasilitas }}</span>
          </div>

          <div>
            <span class="text-[#64748B] block text-[11px] font-medium">6. Brand</span>
            <span class="text-[#1E293B]">{{ selectedAsset.brand || selectedAsset.nama_asset || '—' }}</span>
          </div>

          <div>
            <span class="text-[#64748B] block text-[11px] font-medium">7. Ukuran</span>
            <span class="text-[#1E293B]">{{ selectedAsset.ukuran || '—' }}</span>
          </div>

          <div>
            <span class="text-[#64748B] block text-[11px] font-medium">9. Kondisi Aset</span>
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold mt-0.5"
              :class="[
                formatKondisiPill(selectedAsset.kondisi).bg,
                formatKondisiPill(selectedAsset.kondisi).text,
              ]"
            >
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="formatKondisiPill(selectedAsset.kondisi).dot"
              ></span>
              {{ selectedAsset.kondisi }}
            </span>
          </div>
        </div>

        <div class="pt-2 border-t border-[#E2E8F0]">
          <span class="text-[#64748B] block text-[11px] font-medium"
            >8. Detail Aset</span
          >
          <p
            class="text-[12.5px] text-[#1E293B] mt-1 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]"
          >
            {{ selectedAsset.detail || 'Tidak ada detail tambahan.' }}
          </p>
        </div>

        <div class="flex justify-end pt-3 border-t border-[#E2E8F0]">
          <button
            type="button"
            @click="closeModal"
            class="h-10 px-5 rounded-xl bg-[#2563EB] text-[12.5px] font-bold text-white shadow-2xs hover:bg-[#1D4ED8]"
          >
            Tutup
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Modal Cetak Label Aset -->
    <AssetLabelModal
      :is-open="showLabelModal"
      :asset="selectedLabelAsset"
      @close="showLabelModal = false"
    />

    <!-- Modal Kelola Tipe Aset GA -->
    <AppModal
      :is-open="showTypeModal"
      title="Kelola Tipe Aset GA"
      subtitle="Kelola master data kategori fasilitas General Affair (Meja, Kursi, AC, dll)."
      size="lg"
      @close="closeTypeModal"
    >
      <div class="space-y-4">
        <!-- Add / Edit Inline Form -->
        <div class="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-[12.5px] font-bold text-[#0F172A] flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-[#2563EB]">{{
                typeMode === 'add' ? 'add_circle' : 'edit_square'
              }}</span>
              <span>{{ typeMode === 'add' ? 'Tambah Tipe Baru' : `Edit Tipe: ${typeForm.nama_tipe}` }}</span>
            </h4>
            <span
              v-if="typeMode === 'edit'"
              class="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
            >
              Mode Pengeditan
            </span>
          </div>

          <div
            v-if="typeModalError"
            class="p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[#991B1B] text-[12px] flex items-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[15px]">error</span>
            <span>{{ typeModalError }}</span>
          </div>

          <form @submit.prevent="submitTypeForm" class="space-y-2.5">
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div class="sm:col-span-5">
                <label for="type-form-nama" class="block text-[11.5px] font-semibold text-[#1E293B] mb-1">
                  Nama Tipe <span class="text-rose-500">*</span>
                </label>
                <input
                  id="type-form-nama"
                  v-model="typeForm.nama_tipe"
                  type="text"
                  required
                  placeholder="Contoh: Genset, Brankas..."
                  class="w-full h-9 px-3 text-[12.5px] rounded-xl border border-[#E2E8F0] bg-white focus:border-[#2563EB] focus:outline-none transition-all shadow-2xs"
                />
              </div>

              <div class="sm:col-span-7">
                <label for="type-form-desc" class="block text-[11.5px] font-semibold text-[#1E293B] mb-1">
                  Deskripsi / Keterangan
                </label>
                <input
                  id="type-form-desc"
                  v-model="typeForm.deskripsi"
                  type="text"
                  placeholder="Contoh: Fasilitas ruang pertemuan (opsional)"
                  class="w-full h-9 px-3 text-[12.5px] rounded-xl border border-[#E2E8F0] bg-white focus:border-[#2563EB] focus:outline-none transition-all shadow-2xs"
                />
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-1">
              <button
                v-if="typeMode === 'edit'"
                type="button"
                @click="cancelEditType"
                class="h-8.5 px-3 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#64748B] hover:bg-white cursor-pointer"
              >
                Batal Edit
              </button>
              <button
                type="submit"
                :disabled="isSubmittingType"
                class="h-8.5 px-4 rounded-lg bg-[#2563EB] text-[12px] font-bold text-white shadow-2xs hover:bg-[#1D4ED8] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <span
                  v-if="isSubmittingType"
                  class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                ></span>
                <span v-else class="material-symbols-outlined text-[15px]">{{
                  typeMode === 'add' ? 'add' : 'check'
                }}</span>
                <span>{{
                  isSubmittingType
                    ? 'Menyimpan...'
                    : typeMode === 'add'
                    ? 'Tambah Tipe'
                    : 'Simpan Perubahan'
                }}</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Daftar Tipe Table -->
        <div class="space-y-2">
          <div class="flex items-center justify-between px-0.5">
            <span class="text-[12px] font-bold text-[#0F172A] flex items-center gap-1.5">
              <span>Daftar Tipe Terdaftar</span>
              <span class="text-[11px] font-normal text-[#64748B]">({{ gaTypes.length }} kategori)</span>
            </span>
            <button
              type="button"
              @click="fetchGaTypes"
              class="text-[11px] font-medium text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 cursor-pointer"
              title="Segarkan daftar tipe"
            >
              <span class="material-symbols-outlined text-[13px]">refresh</span>
              <span>Segarkan</span>
            </button>
          </div>

          <div class="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-2xs">
            <div class="max-h-[260px] overflow-y-auto divide-y divide-[#F1F5F9]">
              <div
                v-if="isLoadingTypes"
                class="p-6 text-center text-[12px] text-[#64748B] flex items-center justify-center gap-2"
              >
                <span class="w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin"></span>
                <span>Memuat tipe fasilitas...</span>
              </div>

              <div
                v-else-if="gaTypes.length === 0"
                class="p-6 text-center text-[12px] text-[#64748B]"
              >
                Belum ada tipe fasilitas terdaftar. Tambahkan tipe pertama di atas.
              </div>

              <div
                v-else
                v-for="item in gaTypes"
                :key="item.id"
                class="p-3 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors"
                :class="{ 'bg-blue-50/50': typeForm.id === item.id }"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    class="h-8 w-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0"
                  >
                    <span class="material-symbols-outlined text-[17px]">{{ getGaIcon(item.nama_tipe) }}</span>
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-[13px] font-bold text-[#0F172A] truncate">{{ item.nama_tipe }}</span>
                      <span
                        class="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"
                        :title="`${item.total_aset || 0} unit aset terdaftar dengan tipe ini`"
                      >
                        {{ item.total_aset || 0 }} Aset
                      </span>
                    </div>
                    <p class="text-[11px] text-[#64748B] truncate mt-0.5">
                      {{ item.deskripsi || 'Tidak ada deskripsi' }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    @click="editType(item)"
                    class="h-7 w-7 rounded-lg text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] flex items-center justify-center transition-colors cursor-pointer"
                    title="Edit tipe"
                  >
                    <span class="material-symbols-outlined text-[15px]">edit</span>
                  </button>
                  <button
                    type="button"
                    @click="openDeleteType(item)"
                    class="h-7 w-7 rounded-lg text-[#64748B] hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                    title="Hapus tipe"
                  >
                    <span class="material-symbols-outlined text-[15px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end pt-2 border-t border-[#E2E8F0]">
          <button
            type="button"
            @click="closeTypeModal"
            class="h-9 px-4 rounded-xl bg-[#2563EB] text-[12.5px] font-bold text-white shadow-2xs hover:bg-[#1D4ED8] cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </AppModal>

    <!-- Modal Konfirmasi Hapus Tipe -->
    <AppModal
      :is-open="showDeleteTypeModal"
      title="Hapus Tipe Aset GA"
      size="sm"
      @close="closeDeleteTypeModal"
    >
      <div class="space-y-4">
        <p class="text-[13px] text-[#475569]">
          Apakah Anda yakin ingin menghapus tipe
          <strong class="text-[#0F172A]">{{ typeToDelete?.nama_tipe }}</strong>?
        </p>

        <div
          v-if="typeToDelete && typeToDelete.total_aset > 0"
          class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11.5px] flex items-start gap-2"
        >
          <span class="material-symbols-outlined text-[16px] text-amber-600 shrink-0 mt-0.5">warning</span>
          <span>
            Tipe ini saat ini digunakan oleh <strong>{{ typeToDelete.total_aset }} unit aset GA</strong>.
          </span>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
          <button
            type="button"
            @click="closeDeleteTypeModal"
            class="h-9 px-4 rounded-xl border border-[#E2E8F0] text-[12.5px] font-semibold text-[#64748B] hover:bg-[#F8FAFC] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="isSubmittingType"
            @click="confirmDeleteType"
            class="h-9 px-4 rounded-xl bg-rose-600 text-[12.5px] font-bold text-white shadow-2xs hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            <span
              v-if="isSubmittingType"
              class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            ></span>
            <span>{{ isSubmittingType ? 'Menghapus...' : 'Ya, Hapus Tipe' }}</span>
          </button>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
.ga-row-grid {
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .ga-row-grid {
    display: grid;
    grid-template-columns:
      minmax(220px, 2fr) minmax(130px, 1fr) minmax(150px, 1.2fr) minmax(140px, 1.1fr)
      minmax(120px, 1fr) 32px;
    align-items: center;
  }
}
</style>

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
import AssetCategoryImportModal from '../components/ui/AssetCategoryImportModal.vue'
import FilterModal from '../components/ui/FilterModal.vue'
import AssetCategoryExportModal from '../components/ui/AssetCategoryExportModal.vue'

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
const showFilterModal = ref(false)
const showDetailsModal = ref(false)
const showLabelModal = ref(false)
const selectedLabelAsset = ref(null)
const modalMode = ref('add') // 'add' | 'edit'
const selectedAsset = ref(null)
const isSubmitting = ref(false)
const modalError = ref('')
const showImportModal = ref(false)
const showExportModal = ref(false)


function openLabelModal(asset) {
  selectedLabelAsset.value = asset
  showLabelModal.value = true
}

// Opsi Pilihan Dropdown
const tipeFasilitasOptions = [
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

const tipeOptions = computed(() =>
  mergeOptions(tipeFasilitasOptions, [
    ...assets.value.map((a) => a.tipe_fasilitas),
    form.value.tipe_fasilitas,
  ]).map((t) => ({ value: t, label: t })),
)

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

// Form State
const emptyForm = () => ({
  hostname: '',
  quantity: 1,
  tipe_fasilitas: 'Meja',
  nama_asset: '',
  ukuran: '',
  detail: '',
  lokasi: 'Pluit',
  lokasi_detail: '',
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
      asset.nama_asset,
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
})

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
  form.value = {
    hostname: asset.hostname || '',
    quantity: asset.quantity || 1,
    tipe_fasilitas: asset.tipe_fasilitas || 'Meja',
    nama_asset: asset.nama_asset || '',
    ukuran: asset.ukuran || '',
    detail: asset.detail || '',
    lokasi: asset.lokasi || 'Pluit',
    lokasi_detail: asset.lokasi_detail || '',
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

function closeModal() {
  if (isSubmitting.value) return
  showFormModal.value = false
  showDeleteModal.value = false
  showDetailsModal.value = false
  selectedAsset.value = null
  modalError.value = ''
}

async function submitForm() {
  modalError.value = ''
  if (!form.value.hostname) {
    modalError.value = 'Hostname wajib diisi.'
    return
  }
  if (!form.value.nama_asset) {
    modalError.value = 'Nama Asset wajib diisi.'
    return
  }
  if (!form.value.quantity || form.value.quantity <= 0) {
    modalError.value = 'Quantity harus berupa angka lebih dari 0.'
    return
  }
  if (!form.value.tipe_fasilitas) {
    modalError.value = 'Tipe Fasilitas wajib diisi.'
    return
  }
  if (!form.value.lokasi) {
    modalError.value = 'Lokasi wajib diisi.'
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      ...form.value,
      lokasi: normalizeLocation(form.value.lokasi),
    }

    if (modalMode.value === 'add') {
      await post('/api/ga-assets', payload)
    } else {
      await put(`/api/ga-assets/${selectedAsset.value.id}`, payload)
    }
    closeModal()
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
    isSubmitting.value = false
    closeModal()
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
            Aset GA
          </h2>
          <p
            class="text-[11px] sm:text-xs text-[#64748B] mt-0.5 leading-normal line-clamp-1 sm:line-clamp-none"
          >
            Kelola inventaris fasilitas General Affair, mebel, AC, dan perlengkapan kantor.
          </p>
        </div>

        <!-- Primary Action CTA -->
        <div class="flex shrink-0 items-center gap-2">
          <button v-if="canWriteAssets"
            type="button"
            @click="openAdd"
            class="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#0A51B0] px-3 sm:px-3.5 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-[#0A4391] active:scale-95"
            title="Tambah Aset GA baru"
          >
            <span class="material-symbols-outlined text-[16px]">add</span>
            <span>Tambah Aset GA</span>
          </button>
          <div class="flex items-center gap-1 rounded-lg border border-[#D7E3F2] bg-[#F8FAFC] p-1">
            <button
              v-if="canWriteAssets"
              type="button"
              @click="showImportModal = true"
              class="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-bold text-[#0A51B0] hover:bg-white"
              title="Impor data Aset GA dari Excel"
            >
              <span class="material-symbols-outlined text-[15px]">upload_file</span>Import
            </button>
            <button type="button" @click="showExportModal = true" class="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-bold text-[#0A51B0] hover:bg-white" title="Export data Aset GA">
              <span class="material-symbols-outlined text-[15px]">download</span>Export
            </button>
          </div>
        </div>
      </div>

      <!-- Row 2: Search, Filters & Actions -->
      <div
        class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 w-full min-w-0 pt-2.5 border-t border-[#F1F5F9]"
      >
        <!-- Search Input -->
        <div class="relative h-9 w-full sm:flex-1 sm:min-w-[200px]">
          <span
            class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[17px] text-[#94A3B8] pointer-events-none"
            >search</span
          >
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari hostname, nama asset, detail, lokasi..."
            class="h-full w-full rounded-lg border border-[#E2E8F0] bg-white pl-8 pr-8 text-xs text-[#333333] placeholder-[#94A3B8] focus:border-[#0A51B0] focus:outline-none transition-all shadow-2xs"
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

        <div class="flex w-full items-center justify-end">
          <button type="button" @click="showFilterModal = true" class="h-9 shrink-0 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-semibold text-[#64748B] hover:bg-white"><span class="material-symbols-outlined mr-1 align-middle text-[16px]">filter_alt</span>Filter</button>
        </div>
      </div>
    </div>

    <!-- ─── MODERN ENTERPRISE SAAS DATA MANAGEMENT CONTAINER ──────────────── -->
    <div>
      <div v-if="!isLoading && !pageError" class="it-list-heading" aria-live="polite">
        <div>
          <h3>
            Daftar aset GA <span>{{ filteredAssets.length }}</span>
          </h3>
          <p>Inventaris fasilitas umum perusahaan</p>
        </div>
      </div>
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
          class="ga-row-grid gap-3 xl:gap-4 rounded-xl border border-[#E2E8F0]/80 bg-white p-3.5 sm:p-4 shadow-2xs select-none"
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

          <!-- Desktop Skeleton Structure (>= 768px) -->
          <!-- 1. Identity -->
          <div class="hidden xl:flex items-center gap-3.5 min-w-0">
            <SkeletonAvatar size="40px" shape="rounded" class="shrink-0" />
            <div class="flex flex-col gap-1.5 min-w-0">
              <BaseSkeleton width="130px" height="15px" radius="md" />
              <BaseSkeleton width="90px" height="12px" radius="sm" />
            </div>
          </div>
          <!-- 2. Fasilitas & Qty -->
          <div class="hidden xl:flex flex-col gap-1 min-w-0">
            <BaseSkeleton width="60px" height="10px" radius="sm" />
            <BaseSkeleton width="90px" height="13px" radius="md" />
            <BaseSkeleton width="50px" height="11px" radius="sm" />
          </div>
          <!-- 3. Lokasi -->
          <div class="hidden xl:flex flex-col gap-1 min-w-0">
            <BaseSkeleton width="45px" height="10px" radius="sm" />
            <BaseSkeleton width="80px" height="13px" radius="md" />
            <BaseSkeleton width="90px" height="11px" radius="sm" />
          </div>
          <!-- 4. Ukuran & Detail -->
          <div class="hidden xl:flex flex-col gap-1 min-w-0">
            <BaseSkeleton width="55px" height="10px" radius="sm" />
            <BaseSkeleton width="100px" height="13px" radius="md" />
          </div>
          <!-- 5. Kondisi -->
          <div class="hidden xl:flex items-center">
            <BaseSkeleton width="75px" height="22px" radius="full" />
          </div>
          <!-- 6. Action -->
          <div class="hidden xl:flex justify-end">
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
          <h3 class="text-[14px] font-bold text-[#333333] mt-1">Belum Ada Aset GA</h3>
          <p class="text-[11.5px] text-[#64748B] leading-relaxed">
            Belum ada fasilitas General Affair yang terdaftar dalam inventaris atau sesuai dengan
            kata kunci pencarian.
          </p>
          <button
            v-if="canWriteAssets"
            type="button"
            @click="openAdd"
            class="mt-2 h-9 rounded-lg bg-[#0A51B0] px-4 text-[12px] font-semibold text-white shadow-2xs hover:bg-[#0A4391] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span class="material-symbols-outlined text-[16px]">add</span>
            <span>Tambah Aset GA</span>
          </button>
        </div>
      </div>

      <!-- Asset list -->
      <div v-else class="asset-card-list laptop-list">
        <div
          v-for="asset in paginatedAssets"
          :key="asset.id"
          class="laptop-row"
          tabindex="0"
          :aria-label="'Lihat detail ' + (asset.nama_asset || 'aset')"
          @click="openDetails(asset)"
          @keydown.enter.self="openDetails(asset)"
          @keydown.space.prevent.self="openDetails(asset)"
        >
          <div class="laptop-identity">
            <div class="laptop-icon" aria-hidden="true">
              <span class="material-symbols-outlined">{{ getGaIcon(asset.tipe_fasilitas) }}</span>
            </div>
            <div class="laptop-identity-text">
              <h4 :title="asset.nama_asset">{{ asset.nama_asset || '—' }}</h4>
              <p :title="asset.tipe_fasilitas">{{ asset.tipe_fasilitas || '—' }}</p>
              <span class="laptop-serial" :title="asset.hostname">{{ asset.hostname || '—' }}</span>
            </div>
          </div>
          <div class="laptop-holder laptop-field">
            <span class="laptop-label">Jumlah & ukuran</span>
            <strong>{{ asset.quantity ?? 1 }} unit</strong>
            <span class="laptop-secondary" :title="asset.ukuran">{{ asset.ukuran || '—' }}</span>
          </div>
          <div class="laptop-location laptop-field">
            <span class="laptop-label">Lokasi</span>
            <strong :title="asset.lokasi">{{ asset.lokasi || '—' }}</strong>
            <span
              v-if="asset.lokasi_detail"
              class="laptop-secondary"
              :title="asset.lokasi_detail"
              >{{ asset.lokasi_detail }}</span
            >
          </div>
          <div class="laptop-state">
            <span class="laptop-label">Status</span>
            <span class="laptop-status">{{ asset.kondisi || '—' }}</span>
            <span
              v-if="asset.detail"
              class="laptop-secondary asset-row-note"
              :title="asset.detail"
              >{{ asset.detail }}</span
            >
          </div>
          <div class="laptop-actions" @click.stop>
            <AppRowActions :actions="getGaActions(asset)" />
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <AppPagination
        asset-style
        mobile-compact
        v-if="!isLoading && !pageError"
        v-model:currentPage="currentPage"
        :total-items="filteredAssets.length"
        :items-per-page="itemsPerPage"
      />
    </div>

    <FilterModal :is-open="showFilterModal" title="Filter Aset GA" @close="showFilterModal = false" @apply="showFilterModal = false" @reset="resetFilters">
      <CustomSelect v-model="selectedLocation" :options="locationFilterOptions" aria-label="Filter lokasi" :block="true" height-class="h-9" />
      <CustomSelect v-model="selectedTipe" :options="tipeFilterOptions" aria-label="Filter tipe fasilitas" :block="true" height-class="h-9" />
      <CustomSelect v-model="selectedKondisi" :options="kondisiFilterOptions" aria-label="Filter kondisi" :block="true" height-class="h-9" />
    </FilterModal>

    <!-- Modal Form (Tambah / Edit) -->
    <AppModal
      :is-open="showFormModal"
      :title="modalMode === 'add' ? 'Tambah Aset GA Baru' : 'Edit Aset GA'"
      subtitle="Lengkapi data aset. Kolom bertanda * wajib diisi."
      icon="inventory_2"
      size="lg"
      @close="closeModal"
    >
      <form
        @submit.prevent="submitForm"
        id="crud-AssetsGaView"
        class="asset-crud-form asset-entry-form space-y-4"
      >
        <div
          v-if="modalError"
          role="alert"
          class="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[#991B1B] text-[12px]"
        >
          {{ modalError }}
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <h3 class="asset-form-section-title"><span>01</span>Identitas aset</h3>
          <!-- Hostname -->
          <div>
            <label for="ga-hostname" class="block text-[12px] font-bold text-[#333333] mb-1">
              Hostname / Kode Aset <span class="text-rose-500">*</span>
            </label>
            <input
              id="ga-hostname"
              v-model="form.hostname"
              type="text"
              required
              placeholder="Contoh: GA-PL-001"
              class="w-full h-10 px-3 text-[12.5px] rounded-xl border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
            />
          </div>

          <!-- Nama Asset -->
          <div>
            <label for="ga-nama-asset" class="block text-[12px] font-bold text-[#333333] mb-1">
              Nama Asset <span class="text-rose-500">*</span>
            </label>
            <input
              id="ga-nama-asset"
              v-model="form.nama_asset"
              type="text"
              required
              placeholder="Contoh: Meja Kerja Kayu Jati"
              class="w-full h-10 px-3 text-[12.5px] rounded-xl border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <h3 class="asset-form-section-title"><span>02</span>Jumlah & kondisi</h3>
          <!-- Quantity -->
          <div>
            <label for="ga-quantity" class="block text-[12px] font-bold text-[#333333] mb-1">
              Quantity <span class="text-rose-500">*</span>
            </label>
            <input
              id="ga-quantity"
              v-model.number="form.quantity"
              type="number"
              min="1"
              required
              class="w-full h-10 px-3 text-[12.5px] rounded-xl border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
            />
          </div>

          <!-- Tipe Fasilitas -->
          <div>
            <label class="block text-[12px] font-bold text-[#333333] mb-1">
              Tipe Fasilitas <span class="text-rose-500">*</span>
            </label>
            <SearchableSelect
              v-model="form.tipe_fasilitas"
              :options="tipeOptions"
              value-key="value"
              label-key="label"
              placeholder="Pilih Fasilitas"
            />
          </div>

          <!-- Kondisi -->
          <div>
            <label class="block text-[12px] font-bold text-[#333333] mb-1">
              Kondisi <span class="text-rose-500">*</span>
            </label>
            <CustomSelect
              v-model="form.kondisi"
              :options="kondisiOptions"
              aria-label="Kondisi GA"
              placeholder="Pilih kondisi"
              :block="true"
              height-class="h-10"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <h3 class="asset-form-section-title"><span>03</span>Penempatan</h3>
          <!-- Lokasi Utama -->
          <div>
            <label class="block text-[12px] font-bold text-[#333333] mb-1">
              Lokasi Utama <span class="text-rose-500">*</span>
            </label>
            <SearchableSelect
              v-model="form.lokasi"
              :options="locationOptions"
              value-key="value"
              label-key="label"
              placeholder="Pilih Lokasi"
            />
          </div>

          <!-- Lokasi Detail -->
          <div>
            <label for="ga-lokasi-detail" class="block text-[12px] font-bold text-[#333333] mb-1"
              >Lokasi Detail</label
            >
            <input
              id="ga-lokasi-detail"
              v-model="form.lokasi_detail"
              type="text"
              placeholder="Contoh: Lantai 2 / Ruang Rapat Utama"
              class="w-full h-10 px-3 text-[12.5px] rounded-xl border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <h3 class="asset-form-section-title"><span>04</span>Spesifikasi tambahan</h3>
          <!-- Ukuran -->
          <div>
            <label for="ga-ukuran" class="block text-[12px] font-bold text-[#333333] mb-1"
              >Ukuran / Dimensi</label
            >
            <input
              id="ga-ukuran"
              v-model="form.ukuran"
              type="text"
              placeholder="Contoh: 120x60x75 cm / 2 PK"
              class="w-full h-10 px-3 text-[12.5px] rounded-xl border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
            />
          </div>

          <!-- Detail Spesifikasi -->
          <div>
            <label for="ga-detail" class="block text-[12px] font-bold text-[#333333] mb-1"
              >Detail / Catatan</label
            >
            <input
              id="ga-detail"
              v-model="form.detail"
              type="text"
              placeholder="Contoh: Warna Hitam, Daikin Inverter"
              class="w-full h-10 px-3 text-[12.5px] rounded-xl border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
            />
          </div>
        </div>
      </form>
      <template #footer>
        <!-- Submit Footer -->
        <div
          class="asset-crud-actions flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]"
        >
          <button
            type="button"
            :disabled="isSubmitting"
            @click="closeModal"
            class="h-10 px-4 rounded-xl border border-[#E2E8F0] text-[12.5px] font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
          >
            Batal
          </button>
          <button
            type="submit"
            form="crud-AssetsGaView"
            :disabled="isSubmitting"
            class="h-10 px-5 rounded-xl bg-[#0A51B0] text-[12.5px] font-bold text-white shadow-2xs hover:bg-[#0A4391] disabled:opacity-50 flex items-center gap-2"
          >
            <span v-if="isSubmitting" class="animate-spin text-[16px]">hourglass_empty</span>
            <span>{{ isSubmitting ? 'Menyimpan...' : 'Simpan Aset GA' }}</span>
          </button>
        </div>
      </template>
    </AppModal>

    <!-- Modal Confirm Delete -->
    <AppModal :is-open="showDeleteModal" title="Hapus Aset GA" size="sm" @close="closeModal">
      <div class="asset-delete-content space-y-4">
        <p class="text-[13px] text-[#475569]">
          Apakah Anda yakin ingin menghapus Aset GA
          <strong class="text-[#333333]">{{ selectedAsset?.nama_asset }}</strong> ({{
            selectedAsset?.hostname
          }})?
        </p>
      </div>
      <template #footer>
        <div
          class="asset-crud-actions asset-delete-actions flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]"
        >
          <button
            type="button"
            :disabled="isSubmitting"
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
      </template>
    </AppModal>

    <!-- Modal Details View -->
    <AppModal :is-open="showDetailsModal" title="Detail Aset GA" size="lg" @close="closeModal">
      <div v-if="selectedAsset" class="asset-detail space-y-4">
        <div
          class="asset-detail-identity flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#333333]"
          >
            <span class="material-symbols-outlined text-[22px]">{{
              getGaIcon(selectedAsset.tipe_fasilitas)
            }}</span>
          </div>
          <div>
            <h3 class="font-bold text-[#333333] text-[14px]">{{ selectedAsset.nama_asset }}</h3>
            <p class="font-mono text-[11px] text-[#64748B]">{{ selectedAsset.hostname }}</p>
          </div>
        </div>

        <div class="asset-detail-fields">
          <div>
            <span class="text-[#64748B] block text-[11px] font-medium">Quantity</span>
            <span class="font-bold text-[#333333]">{{ selectedAsset.quantity }} Unit</span>
          </div>

          <div>
            <span class="text-[#64748B] block text-[11px] font-medium">Tipe Fasilitas</span>
            <span class="font-semibold text-[#333333]">{{ selectedAsset.tipe_fasilitas }}</span>
          </div>

          <div>
            <span class="text-[#64748B] block text-[11px] font-medium">Lokasi</span>
            <span class="font-semibold text-[#333333]">{{ selectedAsset.lokasi }}</span>
          </div>

          <div>
            <span class="text-[#64748B] block text-[11px] font-medium">Lokasi Detail</span>
            <span class="text-[#333333]">{{ selectedAsset.lokasi_detail || '—' }}</span>
          </div>

          <div>
            <span class="text-[#64748B] block text-[11px] font-medium">Ukuran / Dimensi</span>
            <span class="text-[#333333]">{{ selectedAsset.ukuran || '—' }}</span>
          </div>

          <div>
            <span class="text-[#64748B] block text-[11px] font-medium">Kondisi</span>
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
            >Detail / Catatan Spesifikasi</span
          >
          <p
            class="text-[12.5px] text-[#333333] mt-1 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]"
          >
            {{ selectedAsset.detail || 'Tidak ada detail tambahan.' }}
          </p>
        </div>
      </div>
      <template #footer>
        <div class="asset-detail-footer">
          <button
            type="button"
            @click="closeModal"
            class="h-10 px-5 rounded-xl bg-[#0A51B0] text-[12.5px] font-bold text-white shadow-2xs hover:bg-[#0A4391]"
          >
            Tutup
          </button>
        </div>
      </template>
    </AppModal>

    <!-- Modal Cetak Label Aset -->
    <AssetLabelModal
      :is-open="showLabelModal"
      :asset="selectedLabelAsset"
      @close="showLabelModal = false"
    />
    <AssetCategoryImportModal :is-open="showImportModal" asset-type="ga" @close="showImportModal = false" @imported="showImportModal = false; fetchData()" />
    <AssetCategoryExportModal :is-open="showExportModal" asset-type="ga" :assets="filteredAssets" @close="showExportModal = false" />
  </div>
</template>

<style scoped>
.ga-row-grid {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1280px) {
  .ga-row-grid {
    display: grid;
    grid-template-columns:
      minmax(220px, 2fr) minmax(130px, 1fr) minmax(150px, 1.2fr) minmax(140px, 1.1fr)
      minmax(120px, 1fr) 32px;
    align-items: center;
  }
}
</style>

<style scoped src="../assets/asset-workspace.css"></style>

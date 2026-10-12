<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useAuth } from '../composables/useAuth.js'
import { animateStagger } from '../composables/useGsap.js'
import { normalizeLocation } from '../utils/locationNormalizer.js'
import { useViewMode } from '../composables/useViewMode.js'
import AppViewToggle from '../components/ui/AppViewToggle.vue'
import StatCard from '../components/ui/StatCard.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import AppModal from '../components/ui/AppModal.vue'
import SearchableSelect from '../components/ui/SearchableSelect.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import AppRowActions from '../components/ui/AppRowActions.vue'
import AppPagination from '../components/ui/AppPagination.vue'
import AssetLabelModal from '../components/common/AssetLabelModal.vue'
import BaseSkeleton from '../components/ui/skeleton/BaseSkeleton.vue'
import SkeletonAvatar from '../components/ui/skeleton/SkeletonAvatar.vue'
import AssetCategoryImportModal from '../components/ui/AssetCategoryImportModal.vue'
import ErrorState from '../components/ui/ErrorState.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import FilterModal from '../components/ui/FilterModal.vue'
import AssetCategoryExportModal from '../components/ui/AssetCategoryExportModal.vue'
import BarcodeScannerModal from '../components/common/BarcodeScannerModal.vue'

import { useLanguage } from '../composables/useLanguage.js'

const { getAllPages, post, put, del } = useApi()
const { hasWritePermission } = useAuth()
const canWriteAssets = computed(() => hasWritePermission('assets_ga'))
const { viewMode } = useViewMode('assets-ga', 'table')
const { currentLang, t } = useLanguage()

const assets = ref([])
// Count complete category records, independent of table filters and pagination.
const assetStats = computed(() => [
  { title: typeof t === 'function' ? t('ga_stat_total') : 'Total aset GA', value: assets.value.length, icon: 'inventory_2', color: 'primary' },
  {
    title: typeof t === 'function' ? t('ga_stat_good') : 'Baik',
    value: assets.value.filter((asset) => asset.kondisi === 'Baik').length,
    icon: 'check_circle',
    color: 'success',
  },
  {
    title: typeof t === 'function' ? t('ga_stat_minor') : 'Rusak ringan',
    value: assets.value.filter((asset) => asset.kondisi === 'Rusak Ringan').length,
    icon: 'build',
    color: 'warning',
  },
  {
    title: typeof t === 'function' ? t('ga_stat_severe') : 'Rusak berat',
    value: assets.value.filter((asset) => asset.kondisi === 'Rusak Berat').length,
    icon: 'warning',
    color: 'danger',
  },
])
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
const showScannerModal = ref(false)

function handleBarcodeScanned(code) {
  if (typeof code === 'string' && code.trim()) {
    searchQuery.value = code.trim()
  }
}

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

// Label map (reaktif terhadap perubahan bahasa) untuk tampilan kondisi & tipe fasilitas
const gaKondisiLabels = computed(() => ({
  Baik: t('ga_kondisi_baik'),
  'Rusak Ringan': t('ga_kondisi_ringan'),
  'Rusak Sedang': t('ga_kondisi_sedang'),
  'Rusak Berat': t('ga_kondisi_berat'),
}))

function gaKondisiLabel(kondisi) {
  return gaKondisiLabels.value[kondisi] || kondisi
}

const gaKondisiSelectOptions = computed(() =>
  kondisiOptions.map((kondisi) => ({ value: kondisi, label: gaKondisiLabel(kondisi) })),
)

const gaTipeLabels = computed(() => ({
  Meja: t('ga_tipe_meja'),
  Kursi: t('ga_tipe_kursi'),
  AC: t('ga_tipe_ac'),
  Lemari: t('ga_tipe_lemari'),
  Sofa: t('ga_tipe_sofa'),
  Rak: t('ga_tipe_rak'),
  Printer: t('ga_tipe_printer'),
  Dispenser: t('ga_tipe_dispenser'),
  TV: t('ga_tipe_tv'),
  Lainnya: t('ga_tipe_lainnya'),
}))

function gaTipeLabel(tipe) {
  return gaTipeLabels.value[tipe] || tipe
}

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
  ]).map((tipe) => ({ value: tipe, label: gaTipeLabel(tipe) })),
)

// Filter option lists (include an empty "all" entry for CustomSelect)
const locationFilterOptions = computed(() => [
  { value: '', label: t('ga_filter_all_lokasi') },
  ...locationOptions.value,
])

const tipeFilterOptions = computed(() => [
  { value: '', label: t('ga_filter_all_tipe') },
  ...tipeOptions.value,
])

const kondisiFilterOptions = computed(() => [
  { value: '', label: t('ga_filter_all_kondisi') },
  ...kondisiOptions.map((k) => ({ value: k, label: gaKondisiLabel(k) })),
])

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

async function handleImported() {
  showImportModal.value = false
  await fetchData()
}

// Lifecycle
onMounted(() => {
  fetchData()
})

async function fetchData() {
  isLoading.value = true
  pageError.value = ''
  try {
    const data = await getAllPages('/api/ga-assets')
    assets.value = (Array.isArray(data) ? data : []).map((a) => ({
      ...a,
      lokasi: normalizeLocation(a.lokasi),
    }))
  } catch (error) {
    pageError.value = error.message || t('ga_error_load')
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
  if (!canWriteAssets.value) return
  modalError.value = ''
  if (!form.value.hostname) {
    modalError.value = t('ga_err_hostname')
    return
  }
  if (!form.value.nama_asset) {
    modalError.value = t('ga_err_asset_name')
    return
  }
  if (!form.value.quantity || form.value.quantity <= 0) {
    modalError.value = t('ga_err_quantity')
    return
  }
  if (!form.value.tipe_fasilitas) {
    modalError.value = t('ga_err_tipe')
    return
  }
  if (!form.value.lokasi) {
    modalError.value = t('ga_err_lokasi')
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
    isSubmitting.value = false
    closeModal()
    await fetchData()
  } catch (err) {
    modalError.value = err.message || t('ga_error_save')
  } finally {
    isSubmitting.value = false
  }
}

async function confirmDelete() {
  if (!canWriteAssets.value || !selectedAsset.value) return
  isSubmitting.value = true
  modalError.value = ''
  try {
    await del(`/api/ga-assets/${selectedAsset.value.id}`)
    isSubmitting.value = false
    closeModal()
    await fetchData()
  } catch (err) {
    modalError.value = err.message || t('ga_error_delete')
  } finally {
    isSubmitting.value = false
  }
}

function getGaActions(asset) {
  const actions = [
    {
      label: t('ga_action_view_detail'),
      icon: 'visibility',
      onClick: () => openDetails(asset),
      handler: () => openDetails(asset),
    },
    {
      label: t('ga_action_print_label'),
      icon: 'print',
      onClick: () => openLabelModal(asset),
      handler: () => openLabelModal(asset),
    },
  ]
  if (canWriteAssets.value) {
    actions.push({
      label: t('ga_action_edit'),
      icon: 'edit',
      onClick: () => openEdit(asset),
      handler: () => openEdit(asset),
    })
    actions.push({
      label: t('ga_action_delete'),
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
      return { text: 'text-[#475569]', bg: 'bg-[#F1F5F9]', dot: 'bg-[#5F7089]' }
  }
}
</script>

<template>
  <div
    class="asset-workspace asset-inventory inventory-polish space-y-3"
    :data-testid="!isLoading ? 'page-ready' : undefined"
  >
    <!-- ── Page Header (komponen bersama; sama dengan halaman lain) ── -->
    <PageHeader
      :title="t('assets_ga_title')"
      :subtitle="t('assets_ga_subtitle')"
      icon="domain"
    >
      <div class="inventory-actions flex flex-wrap sm:flex-nowrap items-center gap-1.5">
        <button
          v-if="canWriteAssets"
          type="button"
          @click="openAdd"
          class="inventory-primary-action inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] bg-[#0A51B0] px-3 text-[11px] sm:text-[12px] font-semibold text-white shadow-2xs transition-all hover:bg-[#0A4391]"
          :title="t('ga_add_tooltip')"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[16px]">add</span>
          <span>{{ currentLang === 'en' ? 'Add GA Asset' : 'Tambah Aset GA' }}</span>
        </button>
        <div
          class="inventory-action-group flex items-center gap-1 rounded-[6px] border border-[#D7E3F2] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 p-0.5 h-8"
        >
          <button
            v-if="canWriteAssets"
            type="button"
            @click="showImportModal = true"
            class="inventory-action-button inline-flex h-full items-center gap-1 rounded-[4px] px-2 text-[11px] font-semibold text-[#0A51B0] dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700"
            :title="t('ga_import_tooltip')"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[15px]"
              >upload_file</span
            >{{ t('btn_import') }}
          </button>
          <button
            type="button"
            @click="showExportModal = true"
            class="inventory-action-button inline-flex h-full items-center gap-1 rounded-[4px] px-2 text-[11px] font-semibold text-[#0A51B0] dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700"
            :title="t('ga_export_tooltip')"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[15px]"
              >download</span
            >{{ t('btn_export') }}
          </button>
        </div>
      </div>
    </PageHeader>

    <!-- ── Quick KPI Stat Cards (Directly below Header) ── -->
    <section
      aria-label="Ringkasan aset"
      :aria-busy="isLoading"
      class="grid grid-cols-1 min-[360px]:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-2.5 lg:gap-3"
    >
      <StatCard
        v-for="stat in assetStats"
        :key="stat.title"
        :title="stat.title"
        :value="isLoading || pageError ? '-' : stat.value"
        :icon="stat.icon"
        :color="stat.color"
        :subtitle="isLoading ? (currentLang === 'en' ? 'Loading…' : 'Memuat…') : pageError ? (currentLang === 'en' ? 'Unavailable' : 'Tidak tersedia') : (currentLang === 'en' ? 'All category records' : 'Seluruh data kategori')"
      />
    </section>

    <!-- Toolbar sticky mengikuti scroll (app-main adalah scroll container) -->
    <div class="asset-toolbar-sticky">
      <div
        class="asset-toolbar flex flex-col gap-2.5 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-[6px] border border-[#E2E8F0] dark:border-slate-800 shadow-2xs"
      >
        <!-- Search, Filters & Actions -->
        <div
          class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 w-full min-w-0"
        >
          <!-- Search Input -->
          <div class="relative h-8 w-full sm:flex-1 sm:min-w-[200px]">
            <span
              aria-hidden="true"
              class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-[#687281] dark:text-slate-400 pointer-events-none"
              >search</span
            >
            <input
              v-model="searchQuery"
              type="text"
              :aria-label="t('ga_search_aria')"
              :placeholder="t('ga_search_placeholder')"
              class="h-full w-full rounded-[6px] border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-800 pl-8 pr-8 text-[12px] text-[#333333] dark:text-white placeholder-[#687281] dark:placeholder-slate-400 focus:border-[#0A51B0] focus:outline-none transition-all shadow-2xs"
            />
            <!-- Inline Clear Button -->
            <button
              v-if="searchQuery"
              type="button"
              @click="searchQuery = ''"
              :aria-label="t('clear_search')"
              class="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-[#687281] hover:bg-[#F1F5F9] hover:text-[#333333] transition-all cursor-pointer touch-manipulation"
              :title="t('clear_search')"
            >
              <span aria-hidden="true" class="material-symbols-outlined text-[15px]">close</span>
            </button>
          </div>

          <div class="flex w-full items-center justify-end gap-1.5">
            <button
              type="button"
              @click="showScannerModal = true"
              class="h-8 shrink-0 inline-flex items-center gap-1 rounded-[6px] border border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800 px-2 sm:px-2.5 text-[11px] sm:text-[12px] font-semibold text-[#5F7089] dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-[#0A51B0] transition cursor-pointer"
              :title="t('scan_barcode_title', 'Pindai Barcode / QR Code')"
              :aria-label="t('scan_barcode_btn', 'Pindai Barcode')"
            >
              <span aria-hidden="true" class="material-symbols-outlined text-[16px]">qr_code_scanner</span>
              <span class="hidden sm:inline">{{ t('scan_barcode_btn', 'Pindai') }}</span>
            </button>
            <button
              type="button"
              @click="showFilterModal = true"
              class="h-8 shrink-0 rounded-[6px] border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 text-[11px] sm:text-[12px] font-semibold text-[#5F7089] hover:bg-white"
            >
              <span
                aria-hidden="true"
                class="material-symbols-outlined mr-1 align-middle text-[15px]"
                >filter_alt</span
              >{{ t('filter') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── MODERN ENTERPRISE SAAS DATA MANAGEMENT CONTAINER ──────────────── -->
    <div>
      <div v-if="!isLoading && !pageError" class="it-list-heading-sticky">
        <div class="it-list-heading" aria-live="polite">
          <div>
            <h3>
              {{ t('ga_list_title') }} <span>{{ filteredAssets.length }}</span>
            </h3>
            <p>{{ t('ga_list_subtitle') }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-3">
            <AppViewToggle v-model="viewMode" />
          </div>
        </div>
      </div>
      <!-- Error State -->
      <ErrorState v-if="pageError" :message="pageError" @retry="fetchData" />

      <!-- Loading State Skeleton -->
      <div v-else-if="isLoading" aria-busy="true" class="space-y-2.5">
        <div
          v-for="r in 6"
          :key="'ga-skel-' + r"
          class="ga-row-grid gap-3 xl:gap-4 rounded-[6px] border border-[#E2E8F0]/80 bg-white p-2.5 sm:p-3 shadow-2xs select-none"
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
        class="bg-white rounded-[6px] border border-[#E2E8F0]/80"
      >
        <EmptyState
          icon="domain_disabled"
          :title="t('ga_empty_title')"
          :description="t('ga_empty_desc')"
          :action-label="canWriteAssets ? t('ga_add_asset') : ''"
          @action="openAdd"
        />
      </div>

      <!-- Asset list -->
      <div v-else :class="{ 'ws-table-mode': viewMode === 'table' }">
        <!-- Mode Tabel (tampil di semua breakpoint saat dipilih) -->
        <div v-if="viewMode === 'table'" class="ws-data-table-wrap">
          <table class="ws-data-table">
            <caption class="sr-only">
              {{ t('ga_list_title') }}
            </caption>
            <colgroup>
              <col class="w-[24%]" />
              <col class="w-[12%]" />
              <col class="w-[16%]" />
              <col class="w-[14%]" />
              <col class="w-[16%]" />
              <col class="w-[12%]" />
              <col class="w-[6%]" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">{{ t('ga_th_asset_name') }}</th>
                <th scope="col">{{ t('ga_th_quantity') }}</th>
                <th scope="col">{{ t('ga_th_location') }}</th>
                <th scope="col">{{ t('ga_th_type') }}</th>
                <th scope="col">Hostname</th>
                <th scope="col">{{ t('th_condition') }}</th>
                <th scope="col"><span class="sr-only">{{ t('actions') }}</span></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="asset in paginatedAssets"
                :key="asset.id"
                tabindex="0"
                :aria-label="t('ga_view_detail') + ' ' + (asset.nama_asset || t('ga_asset_word'))"
                @click="openDetails(asset)"
                @keydown.enter.self="openDetails(asset)"
                @keydown.space.prevent.self="openDetails(asset)"
              >
                <td>
                  <span class="ws-cell-main" :title="asset.nama_asset">{{
                    asset.nama_asset || '-'
                  }}</span>
                  <span class="ws-cell-sub" :title="gaTipeLabel(asset.tipe_fasilitas)">{{
                    gaTipeLabel(asset.tipe_fasilitas) || '-'
                  }}</span>
                </td>
                <td>
                  <span class="ws-cell-main ws-cell-num">{{ asset.quantity ?? 1 }} unit</span>
                  <span class="ws-cell-sub">{{ asset.ukuran || '-' }}</span>
                </td>
                <td>
                  <span class="ws-cell-main" :title="asset.lokasi">{{ asset.lokasi || '-' }}</span>
                  <span v-if="asset.lokasi_detail" class="ws-cell-sub">{{
                    asset.lokasi_detail
                  }}</span>
                </td>
                <td>
                  <span class="ws-cell-main">{{ gaTipeLabel(asset.tipe_fasilitas) || '-' }}</span>
                </td>
                <td>
                  <span class="ws-cell-main">{{ asset.hostname || '-' }}</span>
                </td>
                <td>
                  <span class="ws-cell-main">{{ gaKondisiLabel(asset.kondisi) || '-' }}</span>
                </td>
                <td @click.stop>
                  <AppRowActions
                    :actions="getGaActions(asset)"
                    :label="`${t('ga_actions_aria')} ${asset.hostname || ''}`"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mode Kartu -->
        <div v-if="viewMode === 'card'" class="asset-card-list laptop-list">
          <div
            v-for="asset in paginatedAssets"
            :key="asset.id"
            class="laptop-row"
            tabindex="0"
            :aria-label="t('ga_view_detail') + ' ' + (asset.nama_asset || t('ga_asset_word'))"
            @click="openDetails(asset)"
            @keydown.enter.self="openDetails(asset)"
            @keydown.space.prevent.self="openDetails(asset)"
          >
            <div class="laptop-identity">
              <div class="laptop-icon" aria-hidden="true">
                <span aria-hidden="true" class="material-symbols-outlined">{{
                  getGaIcon(asset.tipe_fasilitas)
                }}</span>
              </div>
              <div class="laptop-identity-text">
                <h4 :title="asset.nama_asset">{{ asset.nama_asset || '-' }}</h4>
                <p :title="gaTipeLabel(asset.tipe_fasilitas)">{{ gaTipeLabel(asset.tipe_fasilitas) || '-' }}</p>
                <span class="laptop-serial" :title="asset.hostname">{{
                  asset.hostname || '-'
                }}</span>
              </div>
            </div>
            <div class="laptop-holder laptop-field">
              <span class="laptop-label">{{ t('ga_card_qty_size') }}</span>
              <strong>{{ asset.quantity ?? 1 }} unit</strong>
              <span class="laptop-secondary" :title="asset.ukuran">{{ asset.ukuran || '-' }}</span>
            </div>
            <div class="laptop-location laptop-field">
              <span class="laptop-label">{{ t('ga_th_location') }}</span>
              <strong :title="asset.lokasi">{{ asset.lokasi || '-' }}</strong>
              <span
                v-if="asset.lokasi_detail"
                class="laptop-secondary"
                :title="asset.lokasi_detail"
                >{{ asset.lokasi_detail }}</span
              >
            </div>
            <div class="laptop-state">
              <span class="laptop-label">{{ t('status') }}</span>
              <span class="laptop-status">{{ gaKondisiLabel(asset.kondisi) || '-' }}</span>
              <span
                v-if="asset.detail"
                class="laptop-secondary asset-row-note"
                :title="asset.detail"
                >{{ asset.detail }}</span
              >
            </div>
            <div class="laptop-actions" @click.stop>
              <AppRowActions
                :actions="getGaActions(asset)"
                :label="`${t('ga_actions_aria')} ${asset.hostname || ''}`"
              />
            </div>
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

    <FilterModal
      panel-class="inventory-dialog"
      :is-open="showFilterModal"
      :title="t('ga_filter_title')"
      @close="showFilterModal = false"
      @apply="showFilterModal = false"
      @reset="resetFilters"
    >
      <CustomSelect
        v-model="selectedLocation"
        :options="locationFilterOptions"
        :aria-label="t('ga_aria_filter_location')"
        :block="true"
        height-class="h-8"
      />
      <CustomSelect
        v-model="selectedTipe"
        :options="tipeFilterOptions"
        :aria-label="t('ga_aria_filter_tipe')"
        :block="true"
        height-class="h-8"
      />
      <CustomSelect
        v-model="selectedKondisi"
        :options="kondisiFilterOptions"
        :aria-label="t('ga_aria_filter_kondisi')"
        :block="true"
        height-class="h-8"
      />
    </FilterModal>

    <!-- Modal Form (Tambah / Edit) -->
    <AppModal
      panel-class="inventory-dialog"
      :is-open="showFormModal"
      :title="modalMode === 'add' ? t('ga_form_add_title') : t('ga_form_edit_title')"
      :subtitle="t('ga_form_subtitle')"
      icon="inventory_2"
      size="lg"
      @close="closeModal"
    >
      <form
        @submit.prevent="submitForm"
        id="crud-AssetsGaView"
        class="asset-crud-form asset-entry-form space-y-3"
      >
        <div
          v-if="modalError"
          role="alert"
          class="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] text-[#991B1B] text-[12px]"
        >
          {{ modalError }}
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <h3 class="asset-form-section-title">{{ t('ga_section_identity') }}</h3>
          <!-- Hostname -->
          <div>
            <label for="ga-hostname" class="block text-[12px] font-bold text-[#333333] mb-1">
              {{ t('ga_label_hostname') }} <span class="text-rose-500">*</span>
            </label>
            <input
              id="ga-hostname"
              v-model="form.hostname"
              type="text"
              required
              :placeholder="t('ga_ph_hostname')"
              class="w-full h-8 px-3 text-[12px] rounded-[6px] border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
            />
          </div>

          <!-- Nama Asset -->
          <div>
            <label for="ga-nama-asset" class="block text-[12px] font-bold text-[#333333] mb-1">
              {{ t('ga_label_asset_name') }} <span class="text-rose-500">*</span>
            </label>
            <input
              id="ga-nama-asset"
              v-model="form.nama_asset"
              type="text"
              required
              :placeholder="t('ga_ph_asset_name')"
              class="w-full h-8 px-3 text-[12px] rounded-[6px] border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <h3 class="asset-form-section-title">{{ t('ga_section_qty_condition') }}</h3>
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
              class="w-full h-8 px-3 text-[12px] rounded-[6px] border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
            />
          </div>

          <!-- Tipe Fasilitas -->
          <div>
            <label class="block text-[12px] font-bold text-[#333333] mb-1">
              {{ t('ga_label_tipe') }} <span class="text-rose-500">*</span>
            </label>
            <SearchableSelect
              v-model="form.tipe_fasilitas"
              :options="tipeOptions"
              value-key="value"
              label-key="label"
              :placeholder="t('ga_ph_select_tipe')"
            />
          </div>

          <!-- Kondisi -->
          <div>
            <label class="block text-[12px] font-bold text-[#333333] mb-1">
              {{ t('filter_condition') }} <span class="text-rose-500">*</span>
            </label>
            <CustomSelect
              v-model="form.kondisi"
              :options="gaKondisiSelectOptions"
              :aria-label="t('ga_aria_kondisi')"
              :placeholder="t('ga_ph_select_kondisi')"
              :block="true"
              height-class="h-8"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <h3 class="asset-form-section-title">{{ t('ga_section_placement') }}</h3>
          <!-- Lokasi Utama -->
          <div>
            <label class="block text-[12px] font-bold text-[#333333] mb-1">
              {{ t('ga_label_primary_location') }} <span class="text-rose-500">*</span>
            </label>
            <SearchableSelect
              v-model="form.lokasi"
              :options="locationOptions"
              value-key="value"
              label-key="label"
              :placeholder="t('ga_ph_select_location')"
            />
          </div>

          <!-- Lokasi Detail -->
          <div>
            <label for="ga-lokasi-detail" class="block text-[12px] font-bold text-[#333333] mb-1"
              >{{ t('ga_label_location_detail') }}</label
            >
            <input
              id="ga-lokasi-detail"
              v-model="form.lokasi_detail"
              type="text"
              :placeholder="t('ga_ph_location_detail')"
              class="w-full h-8 px-3 text-[12px] rounded-[6px] border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <h3 class="asset-form-section-title">{{ t('ga_section_extra_spec') }}</h3>
          <!-- Ukuran -->
          <div>
            <label for="ga-ukuran" class="block text-[12px] font-bold text-[#333333] mb-1"
              >{{ t('ga_label_size') }}</label
            >
            <input
              id="ga-ukuran"
              v-model="form.ukuran"
              type="text"
              :placeholder="t('ga_ph_size')"
              class="w-full h-8 px-3 text-[12px] rounded-[6px] border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
            />
          </div>

          <!-- Detail Spesifikasi -->
          <div>
            <label for="ga-detail" class="block text-[12px] font-bold text-[#333333] mb-1"
              >{{ t('ga_label_detail_notes') }}</label
            >
            <input
              id="ga-detail"
              v-model="form.detail"
              type="text"
              :placeholder="t('ga_ph_detail')"
              class="w-full h-8 px-3 text-[12px] rounded-[6px] border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
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
            class="h-8 px-4 rounded-[6px] border border-[#E2E8F0] text-[12px] font-semibold text-[#5F7089] hover:bg-[#F8FAFC]"
          >
            {{ t('cancel') }}
          </button>
          <button
            type="submit"
            form="crud-AssetsGaView"
            :disabled="isSubmitting || !canWriteAssets"
            class="h-8 px-4 rounded-[6px] bg-[#0A51B0] text-[12px] font-bold text-white shadow-2xs hover:bg-[#0A4391] disabled:opacity-50 flex items-center gap-2"
          >
            <span
              v-if="isSubmitting"
              aria-hidden="true"
              class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
            ></span>
            <span>{{ isSubmitting ? t('ga_saving') : t('ga_save_asset') }}</span>
          </button>
        </div>
      </template>
    </AppModal>

    <!-- Modal Confirm Delete -->
    <AppModal
      panel-class="inventory-dialog"
      :is-open="showDeleteModal"
      :title="t('ga_delete_title')"
      size="sm"
      @close="closeModal"
    >
      <div class="asset-delete-content space-y-3">
        <p class="text-[12px] text-[#475569]">
          {{ t('ga_delete_confirm') }}
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
            class="h-8 px-4 rounded-[6px] border border-[#E2E8F0] text-[12px] font-semibold text-[#5F7089] hover:bg-[#F8FAFC]"
          >
            {{ t('cancel') }}
          </button>
          <button
            type="button"
            :disabled="isSubmitting || !canWriteAssets"
            @click="confirmDelete"
            class="h-8 px-4 rounded-[6px] bg-rose-600 text-[12px] font-bold text-white shadow-2xs hover:bg-rose-700 disabled:opacity-50"
          >
            {{ isSubmitting ? t('ga_deleting') : t('btn_yes_delete') }}
          </button>
        </div>
      </template>
    </AppModal>

    <!-- Modal Details View -->
    <AppModal
      panel-class="inventory-dialog"
      :is-open="showDetailsModal"
      :title="t('ga_details_title')"
      size="lg"
      @close="closeModal"
    >
      <div v-if="selectedAsset" class="asset-detail space-y-3">
        <div
          class="asset-detail-identity flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-[6px] border border-[#E2E8F0]"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#333333]"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[22px]">{{
              getGaIcon(selectedAsset.tipe_fasilitas)
            }}</span>
          </div>
          <div>
            <h3 class="font-bold text-[#333333] text-[14px]">{{ selectedAsset.nama_asset }}</h3>
            <p class="font-mono text-[11px] text-[#5F7089]">{{ selectedAsset.hostname }}</p>
          </div>
        </div>

        <div class="asset-detail-fields">
          <div>
            <span class="text-[#5F7089] block text-[11px] font-medium">Quantity</span>
            <span class="font-bold text-[#333333]">{{ selectedAsset.quantity }} Unit</span>
          </div>

          <div>
            <span class="text-[#5F7089] block text-[11px] font-medium">{{ t('ga_label_tipe') }}</span>
            <span class="font-semibold text-[#333333]">{{ gaTipeLabel(selectedAsset.tipe_fasilitas) }}</span>
          </div>

          <div>
            <span class="text-[#5F7089] block text-[11px] font-medium">{{ t('ga_th_location') }}</span>
            <span class="font-semibold text-[#333333]">{{ selectedAsset.lokasi }}</span>
          </div>

          <div>
            <span class="text-[#5F7089] block text-[11px] font-medium">{{ t('ga_label_location_detail') }}</span>
            <span class="text-[#333333]">{{ selectedAsset.lokasi_detail || '-' }}</span>
          </div>

          <div>
            <span class="text-[#5F7089] block text-[11px] font-medium">{{ t('ga_label_size') }}</span>
            <span class="text-[#333333]">{{ selectedAsset.ukuran || '-' }}</span>
          </div>

          <div>
            <span class="text-[#5F7089] block text-[11px] font-medium">{{ t('filter_condition') }}</span>
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
              {{ gaKondisiLabel(selectedAsset.kondisi) }}
            </span>
          </div>
        </div>

        <div class="pt-2 border-t border-[#E2E8F0]">
          <span class="text-[#5F7089] block text-[11px] font-medium"
            >{{ t('ga_details_spec_notes') }}</span
          >
          <p
            class="text-[12px] text-[#333333] mt-1 p-3 bg-[#F8FAFC] rounded-[6px] border border-[#E2E8F0]"
          >
            {{ selectedAsset.detail || t('ga_no_extra_detail') }}
          </p>
        </div>
      </div>
      <template #footer>
        <div class="asset-detail-footer">
          <button
            type="button"
            @click="closeModal"
            class="h-8 px-4 rounded-[6px] bg-[#0A51B0] text-[12px] font-bold text-white shadow-2xs hover:bg-[#0A4391]"
          >
            {{ t('close') }}
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
    <AssetCategoryImportModal
      :is-open="showImportModal"
      asset-type="ga"
      @close="showImportModal = false"
      @imported="handleImported"
    />
    <AssetCategoryExportModal
      :is-open="showExportModal"
      asset-type="ga"
      :assets="filteredAssets"
      @close="showExportModal = false"
    />
    <BarcodeScannerModal
      :is-open="showScannerModal"
      @close="showScannerModal = false"
      @scan="handleBarcodeScanned"
    />
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
<style scoped src="../assets/ws-table.css"></style>
<style src="../assets/inventory-polish.css"></style>

<style scoped>
/* Header & list heading tidak sticky di modul Inventaris - scroll
   bersama konten. HARUS setelah import ws-table.css agar menang. */
.asset-toolbar-sticky,
.it-list-heading-sticky {
  position: static;
  z-index: auto;
  top: auto;
}
.asset-inventory .asset-toolbar {
  padding: 8px 10px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 6px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(23, 43, 77, 0.04);
}
@media (min-width: 640px) {
  .asset-inventory .asset-toolbar {
    padding: 10px 12px;
  }
}
</style>

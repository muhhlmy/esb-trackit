<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useApi } from '../composables/useApi.js'
import { useAuth } from '../composables/useAuth.js'
import { animateStagger } from '../composables/useGsap.js'
import { useViewMode } from '../composables/useViewMode.js'
import AppViewToggle from '../components/ui/AppViewToggle.vue'
import StatCard from '../components/ui/StatCard.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import { normalizeLocation } from '../utils/locationNormalizer.js'
import { formatCurrency } from '../utils/currencyFormatter.js'
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

import { useLanguage } from '../composables/useLanguage.js'

const { getAllPages, post, put, del } = useApi()
const { hasWritePermission } = useAuth()
const canWriteAssets = computed(() => hasWritePermission('assets_ops'))
const { viewMode } = useViewMode('assets-ops', 'table')
const { currentLang, t } = useLanguage()

const assets = ref([])
// Count complete category records, independent of table filters and pagination.
const assetStats = computed(() => [
  {
    title: typeof t === 'function' ? t('ops_stat_total') : 'Total aset Ops',
    value: assets.value.length,
    icon: 'inventory_2',
    color: 'primary',
  },
  {
    title: typeof t === 'function' ? t('ops_status_active') : 'Aktif',
    value: assets.value.filter((asset) => asset.status === 'Aktif').length,
    icon: 'check_circle',
    color: 'success',
  },
  {
    title: typeof t === 'function' ? t('ops_status_maintenance') : 'Maintenance',
    value: assets.value.filter((asset) => asset.status === 'Maintenance').length,
    icon: 'build',
    color: 'warning',
  },
  {
    title: typeof t === 'function' ? t('ops_status_damaged') : 'Rusak',
    value: assets.value.filter((asset) => asset.status === 'Rusak').length,
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
const selectedKategori = ref('')
const selectedStatus = ref('')

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
const kategoriOptions = [
  'Point of Sales (POS)',
  'Self Service (KIOSK)',
  'Payment Terminal (EDC)',
  'Digital Display / Signage',
  'Barcode Scanner',
  'Kitchen Display (KDS)',
  'Lainnya',
]

const kondisiOptions = ['Baik', 'Rusak Ringan', 'Rusak Sedang', 'Rusak Berat']
const statusOptions = ['Aktif', 'Tidak Aktif', 'Maintenance', 'Rusak', 'Disposed']

// Label map (reaktif terhadap perubahan bahasa) untuk tampilan kondisi, status & kategori
const opsKondisiLabels = computed(() => ({
  Baik: t('ops_kondisi_baik'),
  'Rusak Ringan': t('ops_kondisi_ringan'),
  'Rusak Sedang': t('ops_kondisi_sedang'),
  'Rusak Berat': t('ops_kondisi_berat'),
}))

function opsKondisiLabel(kondisi) {
  return opsKondisiLabels.value[kondisi] || kondisi
}

const opsKondisiSelectOptions = computed(() =>
  kondisiOptions.map((kondisi) => ({ value: kondisi, label: opsKondisiLabel(kondisi) })),
)

const opsStatusLabels = computed(() => ({
  Aktif: t('ops_status_active'),
  'Tidak Aktif': t('ops_status_inactive'),
  Rusak: t('ops_status_damaged'),
}))

function opsStatusLabel(status) {
  return opsStatusLabels.value[status] || status
}

const opsStatusSelectOptions = computed(() =>
  statusOptions.map((status) => ({ value: status, label: opsStatusLabel(status) })),
)

const opsKategoriLabels = computed(() => ({
  Lainnya: t('ops_category_other'),
}))

function opsKategoriLabel(kategori) {
  return opsKategoriLabels.value[kategori] || kategori
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

const kategoriSelectOptions = computed(() =>
  mergeOptions(kategoriOptions, [...assets.value.map((a) => a.kategori), form.value.kategori]).map(
    (k) => ({ value: k, label: opsKategoriLabel(k) }),
  ),
)

// Filter option lists (include an empty "all" entry for CustomSelect)
const locationFilterOptions = computed(() => [
  { value: '', label: t('ops_filter_all_lokasi') },
  ...locationOptions.value,
])

const kategoriFilterOptions = computed(() => [
  { value: '', label: t('ops_filter_all_kategori') },
  ...kategoriSelectOptions.value,
])

const statusFilterOptions = computed(() => [
  { value: '', label: t('ops_filter_all_status') },
  ...statusOptions.map((s) => ({ value: s, label: opsStatusLabel(s) })),
])

// Form State
const emptyForm = () => ({
  hostname: '',
  nama_asset: '',
  kategori: 'Point of Sales (POS)',
  lokasi: 'Pluit',
  pic: '',
  tanggal_beli: '',
  total_asset_amount: 0,
  kondisi: 'Baik',
  status: 'Aktif',
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
      asset.kategori,
      asset.lokasi,
      asset.pic,
      asset.kondisi,
      asset.status,
    ]
      .join(' ')
      .toLocaleLowerCase('id-ID')

    return (
      (!query || searchable.includes(query)) &&
      (!selectedLocation.value || asset.lokasi === selectedLocation.value) &&
      (!selectedKategori.value || asset.kategori === selectedKategori.value) &&
      (!selectedStatus.value || asset.status === selectedStatus.value)
    )
  })
})

const paginatedAssets = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredAssets.value.slice(start, start + itemsPerPage.value)
})

watch([searchQuery, selectedLocation, selectedKategori, selectedStatus], () => {
  currentPage.value = 1
})

function resetFilters() {
  searchQuery.value = ''
  selectedLocation.value = ''
  selectedKategori.value = ''
  selectedStatus.value = ''
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
    const data = await getAllPages('/api/ops-assets')
    assets.value = (Array.isArray(data) ? data : []).map((a) => ({
      ...a,
      lokasi: normalizeLocation(a.lokasi),
    }))
  } catch (error) {
    pageError.value = error.message || t('ops_error_load')
  } finally {
    isLoading.value = false
    await nextTick()
    animateStagger('.ops-row-grid')
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
    nama_asset: asset.nama_asset || '',
    kategori: asset.kategori || 'Point of Sales (POS)',
    lokasi: asset.lokasi || 'Pluit',
    pic: asset.pic || '',
    tanggal_beli: asset.tanggal_beli ? asset.tanggal_beli.slice(0, 10) : '',
    total_asset_amount: asset.total_asset_amount || 0,
    kondisi: asset.kondisi || 'Baik',
    status: asset.status || 'Aktif',
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
    modalError.value = t('ops_err_hostname')
    return
  }
  if (!form.value.nama_asset) {
    modalError.value = t('ops_err_asset_name')
    return
  }
  if (!form.value.kategori) {
    modalError.value = t('ops_err_kategori')
    return
  }
  if (!form.value.lokasi) {
    modalError.value = t('ops_err_lokasi')
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      ...form.value,
      lokasi: normalizeLocation(form.value.lokasi),
      total_asset_amount: parseFloat(form.value.total_asset_amount) || 0,
      tanggal_beli: form.value.tanggal_beli || null,
    }

    if (modalMode.value === 'add') {
      await post('/api/ops-assets', payload)
    } else {
      await put(`/api/ops-assets/${selectedAsset.value.id}`, payload)
    }
    isSubmitting.value = false
    closeModal()
    await fetchData()
  } catch (err) {
    modalError.value = err.message || t('ops_error_save')
  } finally {
    isSubmitting.value = false
  }
}

async function confirmDelete() {
  if (!canWriteAssets.value || !selectedAsset.value) return
  isSubmitting.value = true
  modalError.value = ''
  try {
    await del(`/api/ops-assets/${selectedAsset.value.id}`)
    isSubmitting.value = false
    closeModal()
    await fetchData()
  } catch (err) {
    modalError.value = err.message || t('ops_error_delete')
  } finally {
    isSubmitting.value = false
  }
}

function getOpsActions(asset) {
  const actions = [
    {
      label: t('ops_action_view_detail'),
      icon: 'visibility',
      onClick: () => openDetails(asset),
      handler: () => openDetails(asset),
    },
    {
      label: t('ops_action_print_label'),
      icon: 'print',
      onClick: () => openLabelModal(asset),
      handler: () => openLabelModal(asset),
    },
  ]
  if (canWriteAssets.value) {
    actions.push({
      label: t('ops_action_edit'),
      icon: 'edit',
      onClick: () => openEdit(asset),
      handler: () => openEdit(asset),
    })
    actions.push({
      label: t('ops_action_delete'),
      icon: 'delete',
      danger: true,
      onClick: () => openDelete(asset),
      handler: () => openDelete(asset),
    })
  }
  return actions
}

function getOpsIcon(kategori) {
  const value = (kategori || '').toLowerCase()
  if (value.includes('self service') || value.includes('kiosk')) return 'devices'
  if (value.includes('point of sale') || value.includes('pos')) return 'point_of_sale'
  if (value.includes('payment') || value.includes('edc')) return 'credit_card'
  if (value.includes('display') || value.includes('signage')) return 'desktop_windows'
  if (value.includes('barcode') || value.includes('scanner')) return 'qr_code_scanner'
  if (value.includes('kitchen') || value.includes('dapur')) return 'soup_kitchen'
  return 'precision_manufacturing'
}

function formatStatusPillOps(status) {
  switch (status) {
    case 'Aktif':
      return { text: 'text-[#166534]', bg: 'bg-[#DCFCE7]', dot: 'bg-[#15803D]' }
    case 'Maintenance':
      return { text: 'text-[#854D0E]', bg: 'bg-[#FEF9C3]', dot: 'bg-[#CA8A04]' }
    case 'Tidak Aktif':
      return { text: 'text-[#475569]', bg: 'bg-[#F1F5F9]', dot: 'bg-[#5F7089]' }
    case 'Rusak':
      return { text: 'text-[#C2410C]', bg: 'bg-[#FFEDD5]', dot: 'bg-[#EA580C]' }
    case 'Disposed':
      return { text: 'text-[#991B1B]', bg: 'bg-[#FEE2E2]', dot: 'bg-[#DC2626]' }
    default:
      return { text: 'text-[#475569]', bg: 'bg-[#F1F5F9]', dot: 'bg-[#5F7089]' }
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString(currentLang.value === 'en' ? 'en-US' : 'id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div
    class="asset-workspace asset-inventory inventory-polish space-y-3"
    :data-testid="!isLoading ? 'page-ready' : undefined"
  >
    <!-- ── Page Header (komponen bersama; sama dengan halaman lain) ── -->
    <PageHeader
      :title="t('assets_ops_title')"
      :subtitle="t('assets_ops_subtitle')"
      icon="precision_manufacturing"
    >
      <div class="inventory-actions flex flex-wrap sm:flex-nowrap items-center gap-1.5">
        <button
          v-if="canWriteAssets"
          type="button"
          @click="openAdd"
          class="inventory-primary-action inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] bg-[#0A51B0] px-3 text-[11px] sm:text-[12px] font-semibold text-white shadow-2xs transition-all hover:bg-[#0A4391]"
          :title="t('ops_add_tooltip')"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[16px]">add</span>
          <span>{{ currentLang === 'en' ? 'Add Ops Asset' : 'Tambah Aset OPS' }}</span>
        </button>
        <div
          class="inventory-action-group flex items-center gap-1 rounded-[6px] border border-[#D7E3F2] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 p-0.5 h-8"
        >
          <button
            v-if="canWriteAssets"
            type="button"
            @click="showImportModal = true"
            class="inventory-action-button inline-flex h-full items-center gap-1 rounded-[4px] px-2 text-[11px] font-semibold text-[#0A51B0] dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700"
            :title="t('ops_import_tooltip')"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[15px]"
              >upload_file</span
            >{{ t('btn_import') }}
          </button>
          <button
            type="button"
            @click="showExportModal = true"
            class="inventory-action-button inline-flex h-full items-center gap-1 rounded-[4px] px-2 text-[11px] font-semibold text-[#0A51B0] dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700"
            :title="t('ops_export_tooltip')"
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
              :aria-label="t('ops_search_aria')"
              :placeholder="t('ops_search_placeholder')"
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

          <div class="flex w-full items-center justify-end">
            <button
              type="button"
              @click="showFilterModal = true"
              class="h-8 shrink-0 rounded-[6px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[12px] font-medium text-[#5F7089] hover:bg-white"
            >
              <span
                aria-hidden="true"
                class="material-symbols-outlined mr-1 align-middle text-[16px]"
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
              {{ t('ops_list_title') }} <span>{{ filteredAssets.length }}</span>
            </h3>
            <p>{{ t('ops_list_subtitle') }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-3">
            <AppViewToggle v-model="viewMode" />
          </div>
        </div>
      </div>
      <!-- Error Alert -->
      <div
        v-if="pageError"
        role="alert"
        class="flex items-center gap-2 bg-rose-50 px-4 py-3 text-xs text-rose-600 rounded-[6px] border border-rose-200"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[18px]">error</span>
        <span class="flex-1 font-semibold">{{ pageError }}</span>
        <button type="button" class="font-bold underline cursor-pointer" @click="fetchData">
          {{ t('retry') }}
        </button>
      </div>

      <!-- Loading State Skeleton -->
      <div v-else-if="isLoading" aria-busy="true" class="space-y-2.5">
        <div
          v-for="r in 6"
          :key="'ops-skel-' + r"
          class="ops-row-grid gap-3 xl:gap-4 rounded-[6px] border border-[#E2E8F0]/80 bg-white p-2.5 sm:p-3 shadow-2xs select-none"
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
            </div>
            <div class="flex flex-col gap-1 min-w-0">
              <BaseSkeleton width="45px" height="10px" radius="sm" />
              <BaseSkeleton width="75px" height="13px" radius="md" />
            </div>
            <div class="flex flex-col gap-1 min-w-0">
              <BaseSkeleton width="45px" height="10px" radius="sm" />
              <BaseSkeleton width="80px" height="13px" radius="md" />
              <BaseSkeleton width="65px" height="11px" radius="sm" />
            </div>
            <div class="flex flex-col gap-1 min-w-0">
              <BaseSkeleton width="55px" height="10px" radius="sm" />
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
          <!-- 2. Kategori & PIC -->
          <div class="hidden xl:flex flex-col gap-1 min-w-0">
            <BaseSkeleton width="60px" height="10px" radius="sm" />
            <BaseSkeleton width="90px" height="13px" radius="md" />
            <BaseSkeleton width="70px" height="11px" radius="sm" />
          </div>
          <!-- 3. Lokasi -->
          <div class="hidden xl:flex flex-col gap-1 min-w-0">
            <BaseSkeleton width="45px" height="10px" radius="sm" />
            <BaseSkeleton width="80px" height="13px" radius="md" />
            <BaseSkeleton width="70px" height="11px" radius="sm" />
          </div>
          <!-- 4. Amount -->
          <div class="hidden xl:flex flex-col gap-1 min-w-0">
            <BaseSkeleton width="55px" height="10px" radius="sm" />
            <BaseSkeleton width="95px" height="13px" radius="md" />
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

      <!-- Empty State -->
      <div
        v-else-if="filteredAssets.length === 0"
        class="py-8 px-3 text-center bg-white rounded-[6px] border border-[#E2E8F0]/80"
      >
        <div class="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-[6px] bg-[#F1F5F9] text-[#5F7089]"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[20px]"
              >precision_manufacturing</span
            >
          </span>
          <h3 class="text-[14px] font-semibold text-[#333333] mt-1">{{ t('ops_empty_title') }}</h3>
          <p class="text-[11px] text-[#5F7089] leading-relaxed">
            {{ t('ops_empty_desc') }}
          </p>
          <button
            v-if="canWriteAssets"
            type="button"
            @click="openAdd"
            class="mt-2 h-8 rounded-[6px] bg-[#0A51B0] px-3.5 text-[12px] font-medium text-white shadow-2xs hover:bg-[#0A4391] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[16px]">add</span>
            <span>{{ t('ops_add_asset_caps') }}</span>
          </button>
        </div>
      </div>

      <!-- Asset list -->
      <div v-else :class="{ 'ws-table-mode': viewMode === 'table' }">
        <!-- Mode Tabel (tampil di semua breakpoint saat dipilih) -->
        <div v-if="viewMode === 'table'" class="ws-data-table-wrap">
          <table class="ws-data-table">
            <caption class="sr-only">
              {{ t('ops_list_title') }}
            </caption>
            <colgroup>
              <col class="w-[22%]" />
              <col class="w-[14%]" />
              <col class="w-[15%]" />
              <col class="w-[12%]" />
              <col class="w-[11%]" />
              <col class="w-[12%]" />
              <col class="w-[14%]" />
              <col class="w-[6%]" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">{{ t('ops_th_asset_name') }}</th>
                <th scope="col">{{ t('ops_th_pic') }}</th>
                <th scope="col">{{ t('ops_th_location') }}</th>
                <th scope="col">{{ t('th_category') }}</th>
                <th scope="col">{{ t('status') }}</th>
                <th scope="col">{{ t('th_condition') }}</th>
                <th scope="col">{{ t('ops_th_value') }}</th>
                <th scope="col"><span class="sr-only">{{ t('actions') }}</span></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="asset in paginatedAssets"
                :key="asset.id"
                tabindex="0"
                :aria-label="t('ops_view_detail') + ' ' + (asset.nama_asset || t('ops_asset_word'))"
                @click="openDetails(asset)"
                @keydown.enter.self="openDetails(asset)"
                @keydown.space.prevent.self="openDetails(asset)"
              >
                <td>
                  <span class="ws-cell-main" :title="asset.nama_asset">{{
                    asset.nama_asset || '-'
                  }}</span>
                  <span class="ws-cell-sub">{{ asset.hostname || '-' }}</span>
                </td>
                <td>
                  <span class="ws-cell-main">{{ asset.pic || t('unassigned') }}</span>
                </td>
                <td>
                  <span class="ws-cell-main" :title="asset.lokasi">{{ asset.lokasi || '-' }}</span>
                  <span v-if="asset.tanggal_beli" class="ws-cell-sub"
                    >{{ t('ops_purchased_label') }}: {{ formatDate(asset.tanggal_beli) }}</span
                  >
                </td>
                <td>
                  <span class="ws-cell-main">{{ opsKategoriLabel(asset.kategori) || '-' }}</span>
                </td>
                <td>
                  <span class="ws-cell-main">{{ opsStatusLabel(asset.status) || '-' }}</span>
                </td>
                <td>
                  <span class="ws-cell-main">{{ opsKondisiLabel(asset.kondisi) || '-' }}</span>
                </td>
                <td>
                  <span class="ws-cell-main ws-cell-num">{{
                    formatCurrency(asset.total_asset_amount)
                  }}</span>
                </td>
                <td @click.stop>
                  <AppRowActions
                    :actions="getOpsActions(asset)"
                    :label="`${t('ops_actions_aria')} ${asset.hostname || ''}`"
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
            :aria-label="t('ops_view_detail') + ' ' + (asset.nama_asset || t('ops_asset_word'))"
            @click="openDetails(asset)"
            @keydown.enter.self="openDetails(asset)"
            @keydown.space.prevent.self="openDetails(asset)"
          >
            <div class="laptop-identity">
              <div class="laptop-icon" aria-hidden="true">
                <span aria-hidden="true" class="material-symbols-outlined">{{
                  getOpsIcon(asset.kategori)
                }}</span>
              </div>
              <div class="laptop-identity-text">
                <h4 :title="asset.nama_asset">{{ asset.nama_asset || '-' }}</h4>
                <p :title="opsKategoriLabel(asset.kategori)">{{ opsKategoriLabel(asset.kategori) || '-' }}</p>
                <span class="laptop-serial" :title="asset.hostname">{{
                  asset.hostname || '-'
                }}</span>
              </div>
            </div>
            <div class="laptop-holder laptop-field">
              <span class="laptop-label">{{ t('ops_card_pic') }}</span>
              <strong>{{ asset.pic || t('unassigned') }}</strong>
            </div>
            <div class="laptop-location laptop-field">
              <span class="laptop-label">{{ t('ops_th_location') }}</span>
              <strong :title="asset.lokasi">{{ asset.lokasi || '-' }}</strong>
              <span v-if="asset.tanggal_beli" class="laptop-secondary"
                >{{ t('ops_purchased_label') }}: {{ formatDate(asset.tanggal_beli) }}</span
              >
            </div>
            <div class="laptop-state">
              <span class="laptop-label">{{ t('status') }}</span>
              <span class="laptop-status">{{ opsStatusLabel(asset.status) || '-' }}</span>
              <span class="laptop-condition">{{ opsKondisiLabel(asset.kondisi) || '-' }}</span>
              <span
                class="laptop-secondary"
                :title="t('ops_total_value') + ': ' + formatCurrency(asset.total_asset_amount)"
                >{{ formatCurrency(asset.total_asset_amount) }}</span
              >
            </div>
            <div class="laptop-actions" @click.stop>
              <AppRowActions
                :actions="getOpsActions(asset)"
                :label="`${t('ops_actions_aria')} ${asset.hostname || ''}`"
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
      :title="t('ops_filter_title')"
      @close="showFilterModal = false"
      @apply="showFilterModal = false"
      @reset="resetFilters"
    >
      <CustomSelect
        v-model="selectedLocation"
        :options="locationFilterOptions"
        :aria-label="t('ops_aria_filter_location')"
        :block="true"
        height-class="h-8"
      />
      <CustomSelect
        v-model="selectedKategori"
        :options="kategoriFilterOptions"
        :aria-label="t('ops_aria_filter_category')"
        :block="true"
        height-class="h-8"
      />
      <CustomSelect
        v-model="selectedStatus"
        :options="statusFilterOptions"
        :aria-label="t('ops_aria_filter_status')"
        :block="true"
        height-class="h-8"
      />
    </FilterModal>

    <!-- Modal Form (Tambah / Edit) -->
    <AppModal
      panel-class="inventory-dialog"
      :is-open="showFormModal"
      :title="modalMode === 'add' ? t('ops_form_add_title') : t('ops_form_edit_title')"
      :subtitle="t('ops_form_subtitle')"
      icon="precision_manufacturing"
      size="lg"
      @close="closeModal"
    >
      <form
        @submit.prevent="submitForm"
        id="crud-AssetsOpsView"
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
          <h3 class="asset-form-section-title">{{ t('ops_section_identity') }}</h3>
          <!-- Hostname -->
          <div>
            <label for="ops-hostname" class="block text-[12px] font-bold text-[#333333] mb-1">
              {{ t('ops_label_hostname') }} <span class="text-rose-500">*</span>
            </label>
            <input
              id="ops-hostname"
              v-model="form.hostname"
              type="text"
              required
              :placeholder="t('ops_ph_hostname')"
              class="w-full h-8 px-3 text-[12px] rounded-[6px] border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
            />
          </div>

          <!-- Nama Asset -->
          <div>
            <label for="ops-nama-asset" class="block text-[12px] font-bold text-[#333333] mb-1">
              {{ t('ops_label_asset_name') }} <span class="text-rose-500">*</span>
            </label>
            <input
              id="ops-nama-asset"
              v-model="form.nama_asset"
              type="text"
              required
              :placeholder="t('ops_ph_asset_name')"
              class="w-full h-8 px-3 text-[12px] rounded-[6px] border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <h3 class="asset-form-section-title">{{ t('ops_section_category_placement') }}</h3>
          <!-- Kategori -->
          <div>
            <label class="block text-[12px] font-bold text-[#333333] mb-1">
              {{ t('th_category') }} <span class="text-rose-500">*</span>
            </label>
            <SearchableSelect
              v-model="form.kategori"
              :options="kategoriSelectOptions"
              value-key="value"
              label-key="label"
              :placeholder="t('ops_ph_select_category')"
            />
          </div>

          <!-- Lokasi Utama -->
          <div>
            <label class="block text-[12px] font-bold text-[#333333] mb-1">
              {{ t('ops_label_primary_location') }} <span class="text-rose-500">*</span>
            </label>
            <SearchableSelect
              v-model="form.lokasi"
              :options="locationOptions"
              value-key="value"
              label-key="label"
              :placeholder="t('ops_ph_select_location')"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <h3 class="asset-form-section-title">{{ t('ops_section_pic_purchase') }}</h3>
          <!-- PIC Penanggung Jawab -->
          <div>
            <label for="ops-pic" class="block text-[12px] font-bold text-[#333333] mb-1"
              >{{ t('ops_label_pic') }}</label
            >
            <input
              id="ops-pic"
              v-model="form.pic"
              type="text"
              :placeholder="t('ops_ph_pic')"
              class="w-full h-8 px-3 text-[12px] rounded-[6px] border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
            />
          </div>

          <!-- Tanggal Beli -->
          <div>
            <label for="ops-tanggal-beli" class="block text-[12px] font-bold text-[#333333] mb-1"
              >{{ t('ops_label_purchase_date') }}</label
            >
            <input
              id="ops-tanggal-beli"
              v-model="form.tanggal_beli"
              type="date"
              class="w-full h-8 px-3 text-[12px] rounded-[6px] border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <h3 class="asset-form-section-title">{{ t('ops_section_value_condition') }}</h3>
          <!-- Total Asset Amount -->
          <div>
            <label for="ops-total-amount" class="block text-[12px] font-bold text-[#333333] mb-1"
              >Total Amount (Rp)</label
            >
            <input
              id="ops-total-amount"
              v-model.number="form.total_asset_amount"
              type="number"
              min="0"
              step="1000"
              placeholder="0"
              class="w-full h-8 px-3 text-[12px] rounded-[6px] border border-[#E2E8F0] bg-white focus:border-[#0A51B0] focus:outline-none"
            />
          </div>

          <!-- Kondisi -->
          <div>
            <label class="block text-[12px] font-bold text-[#333333] mb-1">{{ t('filter_condition') }}</label>
            <CustomSelect
              v-model="form.kondisi"
              :options="opsKondisiSelectOptions"
              :aria-label="t('ops_aria_kondisi')"
              :placeholder="t('ops_ph_select_kondisi')"
              :block="true"
              height-class="h-8"
            />
          </div>

          <!-- Status -->
          <div>
            <label class="block text-[12px] font-bold text-[#333333] mb-1"
              >{{ t('ops_status_operational') }}</label
            >
            <CustomSelect
              v-model="form.status"
              :options="opsStatusSelectOptions"
              :aria-label="t('ops_status_operational')"
              :placeholder="t('ops_ph_select_status')"
              :block="true"
              height-class="h-8"
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
            form="crud-AssetsOpsView"
            :disabled="isSubmitting || !canWriteAssets"
            class="h-8 px-4 rounded-[6px] bg-[#0A51B0] text-[12px] font-bold text-white shadow-2xs hover:bg-[#0A4391] disabled:opacity-50 flex items-center gap-2"
          >
            <span
              v-if="isSubmitting"
              aria-hidden="true"
              class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
            ></span>
            <span>{{ isSubmitting ? t('ops_saving') : t('ops_save_asset') }}</span>
          </button>
        </div>
      </template>
    </AppModal>

    <!-- Modal Confirm Delete -->
    <AppModal
      panel-class="inventory-dialog"
      :is-open="showDeleteModal"
      :title="t('ops_delete_title')"
      size="sm"
      @close="closeModal"
    >
      <div class="asset-delete-content space-y-3">
        <p class="text-[12px] text-[#475569]">
          {{ t('ops_delete_confirm') }}
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
            {{ isSubmitting ? t('ops_deleting') : t('btn_yes_delete') }}
          </button>
        </div>
      </template>
    </AppModal>

    <!-- Modal Details View -->
    <AppModal
      panel-class="inventory-dialog"
      :is-open="showDetailsModal"
      :title="t('ops_details_title')"
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
              getOpsIcon(selectedAsset.kategori)
            }}</span>
          </div>
          <div>
            <h3 class="font-bold text-[#333333] text-[14px]">{{ selectedAsset.nama_asset }}</h3>
            <p class="font-mono text-[11px] text-[#5F7089]">{{ selectedAsset.hostname }}</p>
          </div>
        </div>

        <div class="asset-detail-fields">
          <div>
            <span class="text-[#5F7089] block text-[11px] font-medium">{{ t('th_category') }}</span>
            <span class="font-semibold text-[#333333]">{{ opsKategoriLabel(selectedAsset.kategori) }}</span>
          </div>

          <div>
            <span class="text-[#5F7089] block text-[11px] font-medium">{{ t('ops_th_location') }}</span>
            <span class="font-semibold text-[#333333]">{{ selectedAsset.lokasi }}</span>
          </div>

          <div>
            <span class="text-[#5F7089] block text-[11px] font-medium">{{ t('ops_details_pic') }}</span>
            <span class="text-[#333333] font-medium">{{
              selectedAsset.pic || t('ops_pic_not_set')
            }}</span>
          </div>

          <div>
            <span class="text-[#5F7089] block text-[11px] font-medium">{{ t('ops_label_purchase_date') }}</span>
            <span class="text-[#333333]">{{ formatDate(selectedAsset.tanggal_beli) }}</span>
          </div>

          <div>
            <span class="text-[#5F7089] block text-[11px] font-medium">Total Asset Amount</span>
            <span class="font-bold text-[#333333] text-[12px]">{{
              formatCurrency(selectedAsset.total_asset_amount)
            }}</span>
          </div>

          <div>
            <span class="text-[#5F7089] block text-[11px] font-medium">{{ t('ops_status_operational') }}</span>
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold mt-0.5"
              :class="[
                formatStatusPillOps(selectedAsset.status).bg,
                formatStatusPillOps(selectedAsset.status).text,
              ]"
            >
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="formatStatusPillOps(selectedAsset.status).dot"
              ></span>
              {{ opsStatusLabel(selectedAsset.status) }}
            </span>
          </div>
        </div>

        <div class="pt-2 border-t border-[#E2E8F0]">
          <span class="text-[#5F7089] block text-[11px] font-medium">{{ t('ops_details_kondisi') }}</span>
          <p class="text-[12px] text-[#333333] font-semibold mt-0.5">
            {{ selectedAsset.kondisi ? opsKondisiLabel(selectedAsset.kondisi) : t('ops_kondisi_baik') }}
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
      asset-type="ops"
      @close="showImportModal = false"
      @imported="handleImported"
    />
    <AssetCategoryExportModal
      :is-open="showExportModal"
      asset-type="ops"
      :assets="filteredAssets"
      @close="showExportModal = false"
    />
  </div>
</template>

<style scoped>
.ops-row-grid {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1280px) {
  .ops-row-grid {
    display: grid;
    grid-template-columns:
      minmax(220px, 2fr) minmax(140px, 1.1fr) minmax(140px, 1.1fr) minmax(130px, 1fr)
      minmax(130px, 1fr) 32px;
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

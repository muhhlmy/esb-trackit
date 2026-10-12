<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { api } from '../services/api.js'
import { useAuth } from '../composables/useAuth.js'
import { animateStagger } from '../composables/useGsap.js'
import { useViewMode } from '../composables/useViewMode.js'
import { useLanguage } from '../composables/useLanguage.js'
import AppViewToggle from '../components/ui/AppViewToggle.vue'
import AppModal from '../components/ui/AppModal.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import AppPagination from '../components/ui/AppPagination.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import SkeletonTable from '../components/ui/skeleton/SkeletonTable.vue'
import ShipmentImportModal from '../components/ui/ShipmentImportModal.vue'
import ShipmentExportModal from '../components/ui/ShipmentExportModal.vue'
import FilterModal from '../components/ui/FilterModal.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import StatCard from '../components/ui/StatCard.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import ErrorState from '../components/ui/ErrorState.vue'
import {
  ExternalLink,
  Pencil,
  Search,
  Trash2,
} from 'lucide-vue-next'

const { isSuperAdmin, hasWritePermission } = useAuth()
const canWriteShipments = computed(() => isSuperAdmin.value || hasWritePermission('shipments'))
const { viewMode } = useViewMode('shipments', 'table')
const { currentLang, t } = useLanguage()

// ── State Utama ──────────────────────────────────────────────
const shipments = ref([])
const summary = ref({
  total: 0,
  belum_dikirim: 0,
  pending: 0,
  sedang_dikirim: 0,
  diterima: 0,
  cancel: 0,
})
const totalRecords = ref(0)
const isLoading = ref(true)
const isSubmitting = ref(false)
const pageError = ref('')
const modalError = ref('')
const notification = ref(null)

const currentPage = ref(1)
const itemsPerPage = ref(10)

// ── Filter & Search ──────────────────────────────────────────
const searchQuery = ref('')
const filterStatus = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')

const STATUS_OPTIONS = computed(() => [
  { value: '', label: t('shipments_status_all') },
  { value: 'belum_dikirim', label: t('shipments_status_belum_dikirim'), dot: 'bg-slate-400' },
  { value: 'pending', label: t('shipments_status_pending'), dot: 'bg-amber-500' },
  { value: 'sedang_dikirim', label: t('shipments_status_sedang_dikirim'), dot: 'bg-blue-500' },
  { value: 'diterima', label: t('shipments_status_diterima'), dot: 'bg-emerald-500' },
  { value: 'cancel', label: t('shipments_status_cancel'), dot: 'bg-rose-500' },
])

const FORM_STATUS_OPTIONS = computed(() => [
  { value: 'belum_dikirim', label: t('shipments_status_belum_dikirim'), dot: 'bg-slate-400' },
  { value: 'pending', label: t('shipments_status_pending'), dot: 'bg-amber-500' },
  { value: 'sedang_dikirim', label: t('shipments_status_sedang_dikirim'), dot: 'bg-blue-500' },
  { value: 'diterima', label: t('shipments_status_diterima'), dot: 'bg-emerald-500' },
  { value: 'cancel', label: t('shipments_status_cancel'), dot: 'bg-rose-500' },
])

function getTodayString() {
  return new Date().toISOString().substring(0, 10)
}

// ── Form State ───────────────────────────────────────────────
const showFormModal = ref(false)
const showDeleteModal = ref(false)
const showImportModal = ref(false)
const showExportModal = ref(false)
const showFilterModal = ref(false)
const modalMode = ref('add') // 'add' | 'edit'
const selectedShipment = ref(null)

const emptyForm = () => ({
  request_date: getTodayString(),
  recipient_name: '',
  item_description: '',
  destination: '',
  tracking_number: '',
  status: 'belum_dikirim',
  delivery_proof_url: '',
})

const form = ref(emptyForm())

function getStatusBadgeType(status) {
  switch (status) {
    case 'belum_dikirim':
      return 'default'
    case 'pending':
      return 'warning'
    case 'sedang_dikirim':
      return 'info'
    case 'diterima':
      return 'success'
    case 'cancel':
      return 'danger'
    default:
      return 'default'
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'belum_dikirim':
      return t('shipments_status_belum_dikirim')
    case 'pending':
      return t('shipments_status_pending')
    case 'sedang_dikirim':
      return t('shipments_status_sedang_dikirim')
    case 'diterima':
      return t('shipments_status_diterima')
    case 'cancel':
      return t('shipments_status_cancel')
    default:
      return status || '-'
  }
}

function formatDate(val) {
  if (!val) return '-'
  try {
    const d = new Date(val)
    if (Number.isNaN(d.getTime())) return val
    return d.toLocaleDateString(currentLang.value === 'en' ? 'en-GB' : 'id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return val
  }
}

function toast(msg, type = 'success') {
  notification.value = { message: msg, type }
  setTimeout(() => {
    notification.value = null
  }, 3500)
}

// ── Fetch Data ───────────────────────────────────────────────
let searchDebounce = null
let fetchRequestId = 0

async function fetchData() {
  const requestId = ++fetchRequestId
  isLoading.value = true
  pageError.value = ''
  try {
    const params = {
      page: currentPage.value,
      pageSize: itemsPerPage.value,
    }
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim()
    if (filterStatus.value) params.status = filterStatus.value
    if (filterDateFrom.value) params.dateFrom = filterDateFrom.value
    if (filterDateTo.value) params.dateTo = filterDateTo.value

    const res = await api.getShipments(params)
    if (requestId !== fetchRequestId) return
    shipments.value = Array.isArray(res?.data) ? res.data : []
    totalRecords.value = Number(res?.total) || 0
    if (res?.summary) {
      summary.value = res.summary
    }
  } catch (err) {
    if (requestId !== fetchRequestId) return
    pageError.value = err.message || t('shipments_error_load')
  } finally {
    if (requestId === fetchRequestId) {
      isLoading.value = false
      await nextTick()
      animateStagger('tbody tr')
    }
  }
}

watch([filterStatus, filterDateFrom, filterDateTo], () => {
  currentPage.value = 1
  fetchData()
})

watch(searchQuery, () => {
  currentPage.value = 1
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    fetchData()
  }, 350)
})

function resetFilters() {
  searchQuery.value = ''
  filterStatus.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
  currentPage.value = 1
  fetchData()
}

async function handleImported() {
  showImportModal.value = false
  await fetchData()
}

// ── Modals & Actions ─────────────────────────────────────────
function openAdd() {
  if (!canWriteShipments.value) return
  modalMode.value = 'add'
  selectedShipment.value = null
  form.value = emptyForm()
  modalError.value = ''
  showFormModal.value = true
}

function openEdit(item) {
  if (!canWriteShipments.value) return
  modalMode.value = 'edit'
  selectedShipment.value = item
  form.value = {
    request_date: item.request_date || getTodayString(),
    recipient_name: item.recipient_name || '',
    item_description: item.item_description || '',
    destination: item.destination || '',
    tracking_number: item.tracking_number || '',
    status: item.status || 'belum_dikirim',
    delivery_proof_url: item.delivery_proof_url || '',
  }
  modalError.value = ''
  showFormModal.value = true
}

function openDelete(item) {
  if (!canWriteShipments.value) return
  selectedShipment.value = item
  modalError.value = ''
  showDeleteModal.value = true
}

function closeModal() {
  showFormModal.value = false
  showDeleteModal.value = false
  selectedShipment.value = null
  modalError.value = ''
}

async function saveShipment() {
  if (!canWriteShipments.value) return
  modalError.value = ''

  if (!form.value.request_date) {
    modalError.value = t('shipments_error_request_date')
    return
  }
  if (!form.value.recipient_name?.trim()) {
    modalError.value = t('shipments_error_recipient')
    return
  }
  if (!form.value.item_description?.trim()) {
    modalError.value = t('shipments_error_item')
    return
  }
  if (!form.value.destination?.trim()) {
    modalError.value = t('shipments_error_destination')
    return
  }
  if (form.value.delivery_proof_url?.trim()) {
    const trimmedUrl = form.value.delivery_proof_url.trim()
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      modalError.value = t('shipments_error_proof_url')
      return
    }
  }

  isSubmitting.value = true

  try {
    const payload = {
      request_date: form.value.request_date,
      recipient_name: form.value.recipient_name.trim(),
      item_description: form.value.item_description.trim(),
      destination: form.value.destination.trim(),
      tracking_number: form.value.tracking_number?.trim() || null,
      status: form.value.status || 'belum_dikirim',
      delivery_proof_url: form.value.delivery_proof_url?.trim() || null,
    }

    if (modalMode.value === 'add') {
      await api.createShipment(payload)
      toast(t('shipments_toast_added'))
    } else {
      await api.updateShipment(selectedShipment.value.id, payload)
      toast(t('shipments_toast_updated'))
    }

    closeModal()
    await fetchData()
  } catch (err) {
    modalError.value = err.message || t('shipments_error_save')
  } finally {
    isSubmitting.value = false
  }
}

async function confirmDelete() {
  if (!canWriteShipments.value || !selectedShipment.value) return
  isSubmitting.value = true
  modalError.value = ''

  try {
    await api.deleteShipment(selectedShipment.value.id)
    toast(t('shipments_toast_deleted'))
    closeModal()
    await fetchData()
  } catch (err) {
    modalError.value = err.message || t('shipments_error_delete')
  } finally {
    isSubmitting.value = false
  }
}

function onPageChange(page) {
  currentPage.value = page
  fetchData()
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div
    :data-testid="!isLoading ? 'page-ready' : undefined"
    class="admin-workspace shipments-workspace shipments-page flex min-w-0 flex-col gap-3"
  >
    <!-- Notification Toast -->
    <Transition name="fade">
      <div
        v-if="notification"
        class="fixed bottom-5 right-5 z-50 rounded-[6px] px-4 py-3 text-xs font-semibold text-white shadow-xl flex items-center gap-2"
        :class="notification.type === 'danger' ? 'bg-rose-600' : 'bg-emerald-600'"
      >
        <span>{{ notification.message }}</span>
      </div>
    </Transition>

    <!-- Page Header -->
    <PageHeader
      class="shipment-header"
      :title="t('shipments_title')"
      :subtitle="t('shipments_subtitle')"
      icon="local_shipping"
    >
      <div v-if="canWriteShipments" class="shipment-header-actions flex flex-wrap sm:flex-nowrap items-center gap-1.5">
        <button
          type="button"
          @click="openAdd"
          class="inventory-primary-action inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] bg-[#0A51B0] px-3 text-[11px] sm:text-[12px] font-semibold text-white shadow-2xs transition-all hover:bg-[#0A4391]"
          :title="t('btn_add_shipment')"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[16px]">add</span>
          <span>{{ t('btn_add_shipment') }}</span>
        </button>
        <div
          class="inventory-action-group flex items-center gap-1 rounded-[6px] border border-[#D7E3F2] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 p-0.5 h-8"
        >
          <button
            type="button"
            @click="showImportModal = true"
            class="inventory-action-button inline-flex h-full items-center gap-1 rounded-[4px] px-2 text-[11px] font-semibold text-[#0A51B0] dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[15px]">upload_file</span>
            {{ t('btn_import') }}
          </button>
          <button
            type="button"
            @click="showExportModal = true"
            class="inventory-action-button inline-flex h-full items-center gap-1 rounded-[4px] px-2 text-[11px] font-semibold text-[#0A51B0] dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[15px]">download</span>
            {{ t('btn_export') }}
          </button>
        </div>
      </div>
    </PageHeader>

    <!-- Summary Cards (Directly below Header) -->
    <div class="shipment-summary grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 lg:gap-3">
      <StatCard
        :title="currentLang === 'en' ? 'Total Shipments' : 'Total Pengiriman'"
        :value="summary.total"
        icon="local_shipping"
        color="primary"
        :subtitle="t('stat_all_tracking')"
      />
      <StatCard
        :title="currentLang === 'en' ? 'Unshipped' : 'Belum Dikirim'"
        :value="summary.belum_dikirim"
        icon="pending_actions"
        color="warning"
        :subtitle="t('stat_unshipped_sub')"
      />
      <StatCard
        :title="currentLang === 'en' ? 'In Transit' : 'Sedang Dikirim'"
        :value="summary.sedang_dikirim"
        icon="local_shipping"
        color="cyan"
        :subtitle="t('stat_in_transit_sub')"
      />
      <StatCard
        :title="currentLang === 'en' ? 'Delivered' : 'Diterima'"
        :value="summary.diterima"
        icon="task_alt"
        color="success"
        :subtitle="t('stat_delivered_sub')"
      />
    </div>

    <!-- Search & Filter Bar -->
    <div class="shipment-toolbar">
      <div class="shipment-search relative min-w-0">
        <Search
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687281] pointer-events-none"
        />
        <input
          v-model="searchQuery"
          :aria-label="t('filter_search')"
          type="text"
          :placeholder="t('search_placeholder_general')"
          class="h-full min-h-0 w-full rounded-[6px] border border-[#E2E8F0] bg-white pl-9 pr-3 text-xs text-[#333333] placeholder-[#687281] focus:border-[#0A51B0] focus:outline-none transition-all shadow-2xs"
        />
      </div>

      <button
        type="button"
        @click="showFilterModal = true"
        class="h-8 shrink-0 rounded-[6px] border border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 px-2.5 sm:px-3 text-xs font-medium text-[#5F7089] dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
      >
        <span aria-hidden="true" class="material-symbols-outlined mr-1 align-middle text-[16px]"
          >filter_alt</span
        >{{ t('filter') }}
      </button>
      <AppViewToggle v-model="viewMode" />
    </div>

    <!-- Main Content: Table & List -->
    <div
      class="shipment-list-surface rounded-xl border border-[#E2E8F0]/80 bg-white shadow-2xs overflow-hidden"
    >
      <div v-if="isLoading" aria-busy="true">
        <SkeletonTable preset="default" :rows="6" />
      </div>

      <ErrorState v-else-if="pageError" :message="pageError" @retry="fetchData" />

      <div v-else-if="shipments.length === 0" class="px-4 py-8">
        <EmptyState
          icon="local_shipping"
          :title="t('no_data')"
          :description="
            canWriteShipments
              ? t('shipments_empty_add')
              : t('shipments_empty_filtered')
          "
          :action-label="canWriteShipments ? t('btn_add_shipment') : ''"
          @action="openAdd"
        />
      </div>

      <div v-else class="w-full max-w-full overflow-hidden">
        <!-- Mode Tabel (Scrollable horizontal di mobile) -->
        <div v-if="viewMode === 'table'" class="shipment-table overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr
                class="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold text-[#5F7089] uppercase tracking-wider"
              >
                <th scope="col" class="py-3 px-4">{{ currentLang === 'en' ? 'Request Date' : 'Tanggal Request' }}</th>
                <th scope="col" class="py-3 px-4">{{ currentLang === 'en' ? 'Recipient' : 'Nama Penerima' }}</th>
                <th scope="col" class="py-3 px-4">{{ currentLang === 'en' ? 'Item Description' : 'Deskripsi Barang' }}</th>
                <th scope="col" class="py-3 px-4">{{ currentLang === 'en' ? 'Destination' : 'Tujuan Pengiriman' }}</th>
                <th scope="col" class="py-3 px-4">{{ currentLang === 'en' ? 'Tracking No' : 'No Resi' }}</th>
                <th scope="col" class="py-3 px-4">{{ t('status') }}</th>
                <th scope="col" class="py-3 px-4 text-center">{{ currentLang === 'en' ? 'Proof' : 'Bukti' }}</th>
                <th scope="col" v-if="canWriteShipments" class="py-3 px-4 text-right">{{ t('actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E2E8F0] text-xs text-[#333333]">
              <tr
                v-for="item in shipments"
                :key="item.id"
                class="hover:bg-[#F8FAFC] transition-colors"
              >
                <td class="py-3 px-4 whitespace-nowrap text-[#475569]">
                  {{ formatDate(item.request_date) }}
                </td>
                <td class="py-3 px-4 font-semibold text-[#333333]">
                  {{ item.recipient_name }}
                </td>
                <td class="py-3 px-4 max-w-[240px] truncate" :title="item.item_description">
                  {{ item.item_description }}
                </td>
                <td
                  class="py-3 px-4 max-w-[200px] truncate text-[#475569]"
                  :title="item.destination"
                >
                  {{ item.destination }}
                </td>
                <td class="py-3 px-4 font-mono text-[11px] text-[#475569]">
                  {{ item.tracking_number || '-' }}
                </td>
                <td class="py-3 px-4">
                  <AppBadge
                    class="shipment-status"
                    :type="getStatusBadgeType(item.status)"
                    :text="getStatusLabel(item.status)"
                  />
                </td>
                <td class="py-3 px-4 text-center">
                  <a
                    v-if="item.delivery_proof_url"
                    :href="item.delivery_proof_url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1 text-[12px] font-bold text-[#333333] hover:text-[#0A4391] hover:underline"
                    :title="t('shipments_proof_link_title')"
                  >
                    <span>{{ t('shipments_view_proof') }}</span>
                    <ExternalLink class="w-3 h-3" />
                  </a>
                  <span v-else class="text-[#687281]">-</span>
                </td>
                <td v-if="canWriteShipments" class="py-3 px-4 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      @click="openEdit(item)"
                      class="p-1.5 rounded-lg text-[#5F7089] hover:text-[#333333] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                      :title="t('shipments_edit_shipment')"
                      :aria-label="t('shipments_edit_shipment')"
                    >
                      <Pencil class="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      @click="openDelete(item)"
                      class="p-1.5 rounded-lg text-[#5F7089] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      :title="t('shipments_delete_shipment')"
                      :aria-label="t('shipments_delete_shipment')"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mode Kartu -->
        <ul
          v-if="viewMode === 'card'"
          class="shipment-cards grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-3 sm:p-3.5"
          :aria-label="t('shipments_list_aria')"
        >
          <li
            v-for="item in shipments"
            :key="item.id"
            class="p-3 sm:p-3.5 space-y-2.5 rounded-[6px] border border-[#E2E8F0] bg-white shadow-2xs hover:border-[#B8D4F5] transition-all"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold text-[#333333] truncate" :title="item.recipient_name">{{ item.recipient_name }}</p>
                <p class="text-[11px] text-[#5F7089] mt-0.5 truncate" :title="`${formatDate(item.request_date)} • ${item.destination}`">
                  {{ formatDate(item.request_date) }} &bull; {{ item.destination }}
                </p>
              </div>
              <AppBadge
                :type="getStatusBadgeType(item.status)"
                :text="getStatusLabel(item.status)"
              />
            </div>

            <p class="text-xs text-[#334155] bg-slate-50 p-2 rounded-lg line-clamp-2" :title="item.item_description">
              {{ item.item_description }}
            </p>

            <div class="flex items-center justify-between text-xs text-[#5F7089] pt-1">
              <div class="flex items-center gap-1.5 font-mono text-[11px]">
                <span class="text-[#687281]">{{ t('shipments_resi_label') }}:</span>
                <span>{{ item.tracking_number || '-' }}</span>
              </div>

              <a
                v-if="item.delivery_proof_url"
                :href="item.delivery_proof_url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-[11px] font-bold text-[#333333]"
              >
                <span>{{ t('shipments_view_proof') }}</span>
                <ExternalLink class="w-3 h-3" />
              </a>
            </div>

            <div
              v-if="canWriteShipments"
              class="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]"
            >
              <button
                type="button"
                @click="openEdit(item)"
                class="px-2.5 py-1 text-xs font-semibold text-[#333333] hover:bg-blue-50 rounded-md transition-colors flex items-center gap-1"
              >
                <Pencil class="w-3 h-3" />
                <span>{{ t('edit') }}</span>
              </button>
              <button
                type="button"
                @click="openDelete(item)"
                class="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-md transition-colors flex items-center gap-1"
              >
                <Trash2 class="w-3 h-3" />
                <span>{{ t('delete') }}</span>
              </button>
            </div>
          </li>
        </ul>

        <!-- Pagination Bar -->
        <div class="shipment-pagination">
          <AppPagination
            asset-style
            mobile-compact
            :current-page="currentPage"
            :total-items="totalRecords"
            :items-per-page="itemsPerPage"
            @page-change="onPageChange"
          />
        </div>
      </div>
    </div>

    <!-- Form Modal (Create / Edit) -->
    <AppModal
      panel-class="shipment-dialog"
      :is-open="showFormModal"
      :title="modalMode === 'add' ? t('btn_add_shipment') : t('shipments_modal_edit_title')"
      size="lg"
      icon="local_shipping"
      :subtitle="t('shipments_form_subtitle')"
      @close="closeModal"
    >
      <form id="shipment-form" @submit.prevent="saveShipment" class="shipment-form space-y-4">
        <div
          v-if="modalError"
          role="alert"
          class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold"
        >
          {{ modalError }}
        </div>

        <section class="shipment-entry-section">
          <h3>{{ t('shipments_section_info') }}</h3>
          <p class="shipment-entry-hint">{{ t('shipments_section_info_hint') }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                for="shipment-request_date"
                class="block text-xs font-bold text-[#333333] mb-1"
              >
                {{ t('shipments_form_request_date') }} <span class="text-rose-500">*</span>
              </label>
              <input
                id="shipment-request_date"
                v-model="form.request_date"
                type="date"
                required
                class="h-10 w-full rounded-xl border border-[#CBD5E1] px-3 text-xs text-[#333333] focus:border-[#0A51B0] focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-[#333333] mb-1">
                {{ t('status') }} <span class="text-rose-500">*</span>
              </label>
              <CustomSelect
                v-model="form.status"
                :options="FORM_STATUS_OPTIONS"
                :aria-label="t('shipments_aria_status')"
                :placeholder="t('shipments_placeholder_status')"
                :block="true"
                height-class="h-10"
              />
            </div>
          </div>
        </section>
        <section class="shipment-entry-section shipment-recipient-section">
          <h3>{{ t('shipments_section_recipient') }}</h3>
          <p class="shipment-entry-hint">
            {{ t('shipments_section_recipient_hint') }}
          </p>
          <div>
            <label
              for="shipment-recipient_name"
              class="block text-xs font-bold text-[#333333] mb-1"
            >
              {{ t('th_recipient_name') }} <span class="text-rose-500">*</span>
            </label>
            <input
              id="shipment-recipient_name"
              v-model="form.recipient_name"
              type="text"
              required
              maxlength="150"
              :placeholder="t('shipments_placeholder_recipient')"
              class="h-10 w-full rounded-xl border border-[#CBD5E1] px-3 text-xs text-[#333333] focus:border-[#0A51B0] focus:outline-none"
            />
          </div>

          <div>
            <label
              for="shipment-item_description"
              class="block text-xs font-bold text-[#333333] mb-1"
            >
              {{ t('th_item_description') }} <span class="text-rose-500">*</span>
            </label>
            <textarea
              id="shipment-item_description"
              v-model="form.item_description"
              rows="3"
              required
              maxlength="5000"
              :placeholder="t('shipments_placeholder_item')"
              class="w-full rounded-xl border border-[#CBD5E1] p-3 text-xs text-[#333333] focus:border-[#0A51B0] focus:outline-none"
            ></textarea>
          </div>

          <div>
            <label for="shipment-destination" class="block text-xs font-bold text-[#333333] mb-1">
              {{ t('th_delivery_destination') }} <span class="text-rose-500">*</span>
            </label>
            <input
              id="shipment-destination"
              v-model="form.destination"
              type="text"
              required
              maxlength="255"
              :placeholder="t('shipments_placeholder_destination')"
              class="h-10 w-full rounded-xl border border-[#CBD5E1] px-3 text-xs text-[#333333] focus:border-[#0A51B0] focus:outline-none"
            />
          </div>
        </section>
        <section class="shipment-entry-section">
          <h3>{{ t('shipments_section_tracking') }}</h3>
          <p class="shipment-entry-hint">
            {{ t('shipments_section_tracking_hint') }}
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                for="shipment-tracking_number"
                class="block text-xs font-bold text-[#333333] mb-1"
              >
                {{ t('th_tracking_number') }} <span class="text-[#687281] font-normal">({{ t('shipments_optional') }})</span>
              </label>
              <input
                id="shipment-tracking_number"
                v-model="form.tracking_number"
                type="text"
                maxlength="100"
                :placeholder="t('shipments_placeholder_tracking')"
                class="h-10 w-full rounded-xl border border-[#CBD5E1] px-3 text-xs text-[#333333] focus:border-[#0A51B0] focus:outline-none"
              />
            </div>

            <div>
              <label
                for="shipment-delivery_proof_url"
                class="block text-xs font-bold text-[#333333] mb-1"
              >
                {{ t('shipments_proof_link_label') }} <span class="text-[#687281] font-normal">({{ t('shipments_optional') }})</span>
              </label>
              <input
                id="shipment-delivery_proof_url"
                v-model="form.delivery_proof_url"
                type="url"
                maxlength="2048"
                :placeholder="t('shipments_placeholder_proof_url')"
                class="h-10 w-full rounded-xl border border-[#CBD5E1] px-3 text-xs text-[#333333] focus:border-[#0A51B0] focus:outline-none"
              />
            </div>
          </div>
        </section>
      </form>
      <template #footer>
        <div
          class="shipment-form-actions flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]"
        >
          <button
            type="button"
            @click="closeModal"
            class="h-9 rounded-lg border border-[#CBD5E1] px-4 text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9] cursor-pointer"
          >
            {{ t('cancel') }}
          </button>
          <button
            type="submit"
            form="shipment-form"
            :disabled="isSubmitting"
            class="h-9 rounded-lg bg-[#0A51B0] px-4 text-xs font-semibold text-white hover:bg-[#0A4391] disabled:opacity-50 cursor-pointer"
          >
            {{
              isSubmitting
                ? t('shipments_saving')
                : modalMode === 'add'
                  ? t('btn_add_shipment')
                  : t('shipments_save_changes')
            }}
          </button>
        </div>
      </template>
    </AppModal>

    <FilterModal
      panel-class="shipment-dialog"
      :is-open="showFilterModal"
      :title="t('shipments_filter_title')"
      @close="showFilterModal = false"
      @apply="showFilterModal = false"
      @reset="resetFilters"
    >
      <CustomSelect
        v-model="filterStatus"
        :options="STATUS_OPTIONS"
        :aria-label="t('shipments_aria_filter_status')"
        :block="true"
        height-class="h-10"
      />
      <input
        :aria-label="t('shipments_aria_date_from')"
        v-model="filterDateFrom"
        type="date"
        class="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs"
      />
      <input
        :aria-label="t('shipments_aria_date_to')"
        v-model="filterDateTo"
        type="date"
        class="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs"
      />
    </FilterModal>
    <ShipmentImportModal
      :is-open="showImportModal"
      @close="showImportModal = false"
      @imported="handleImported"
    />
    <ShipmentExportModal
      :is-open="showExportModal"
      :shipments="shipments"
      @close="showExportModal = false"
    />

    <!-- Delete Confirmation Modal -->
    <AppModal
      panel-class="shipment-dialog"
      :is-open="showDeleteModal"
      :title="t('shipments_delete_modal_title')"
      @close="closeModal"
    >
      <div class="space-y-4">
        <div
          v-if="modalError"
          role="alert"
          class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold"
        >
          {{ modalError }}
        </div>

        <p class="text-xs text-[#475569] leading-relaxed">
          {{ t('shipments_delete_msg_prefix') }} <strong class="text-[#333333]">{{ selectedShipment?.recipient_name }}</strong> {{ t('shipments_delete_msg_suffix') }}
        </p>
      </div>
      <template #footer>
        <div
          class="shipment-form-actions shipment-delete-actions flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]"
        >
          <button
            type="button"
            @click="closeModal"
            class="h-9 rounded-lg border border-[#CBD5E1] px-4 text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9] cursor-pointer"
          >
            {{ t('cancel') }}
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            @click="confirmDelete"
            class="h-9 rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
          >
            {{ isSubmitting ? t('shipments_deleting') : t('shipments_delete_data') }}
          </button>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.shipments-page {
  max-width: 1600px;
  margin-inline: auto;
  color: #333333;
}
.shipment-table {
  border-radius: var(--ui-radius-card, 0.875rem);
  border: 1px solid var(--ui-border, #e2e8f0);
  background: white;
}
.shipment-table table {
  table-layout: fixed;
}
.shipment-table th {
  text-transform: none;
  letter-spacing: 0;
  font-size: var(--fs-xs, 11px);
  font-weight: 600;
  color: #667283;
  padding: 6.5px 10px;
}
.shipment-table td {
  padding: 7px 10px;
  font-size: var(--fs-sm, 12px);
  overflow-wrap: anywhere;
}
.shipment-table th:nth-child(3) {
  width: 19%;
}
.shipment-table th:nth-child(4) {
  width: 16%;
}
.shipment-table th:nth-child(7) {
  width: 9%;
}
.shipment-table th:nth-child(8) {
  width: 8%;
}
.shipment-table td:nth-child(3),
.shipment-table td:nth-child(4) {
  white-space: normal;
}
.shipment-table td:nth-child(2) {
  color: #333333;
  font-weight: 600;
}
.shipment-table th:nth-child(6) {
  width: 132px;
}
.shipment-table td:nth-child(6) {
  white-space: nowrap;
  overflow-wrap: normal;
}
.shipment-cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}
.shipment-cards > li {
  background: white;
  border: 1px solid var(--ui-border, #e2e8f0);
  border-radius: var(--ui-radius-card, 6px);
  padding: 10px 12px;
  min-width: 0;
}
.shipment-cards > li > div:first-child {
  gap: 10px;
}
.shipment-cards > li > div:first-child > div {
  min-width: 0;
  overflow-wrap: anywhere;
}
.shipment-cards > li > div:first-child p:first-child {
  font-size: var(--fs-base, 14px);
  font-weight: 650;
  color: #333333;
}
.shipment-cards > li > div:first-child p:last-child {
  line-height: 1.7;
  margin-top: 6px;
}
.shipment-cards > li > p {
  padding: 8px 10px;
  line-height: 1.5;
  margin-top: 10px;
  margin-bottom: 10px;
  overflow-wrap: anywhere;
}
.shipment-cards > li > div:nth-of-type(2) {
  flex-wrap: wrap;
  gap: 12px;
}
.shipment-cards > li > div:nth-of-type(2) > div {
  min-width: 0;
  overflow-wrap: anywhere;
}
.shipment-cards button,
.shipment-cards a {
  min-height: 32px;
}
.shipment-cards button {
  padding-inline: 12px;
  cursor: pointer;
}
.shipment-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
}
.shipment-form > * {
  margin: 0;
}
.shipment-form > div:not([role='alert']) {
  min-width: 0;
}
.shipment-form label {
  font-size: var(--fs-form-label, 12px);
  font-weight: 500;
  color: #52647e;
  margin-bottom: 7px;
}
.shipment-form :is(input, textarea) {
  min-height: var(--control-height-lg, 34px);
  font-size: var(--fs-sm, 12px);
  border-radius: var(--ui-radius-control, 6px);
  border-color: #dce4ef;
  background: #fafbfd;
}
.shipment-form textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
}
.shipment-form :deep(button[aria-haspopup='listbox']) {
  min-height: var(--control-height-lg, 34px);
  border-radius: var(--ui-radius-control, 6px);
}
.shipment-form :is(input, textarea):focus {
  background: white;
  border-color: #097cde;
  box-shadow: 0 0 0 3px #097cde10;
}
.shipment-form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 0;
  border: 0;
}
.shipment-form-actions button {
  min-height: var(--control-height-lg, 34px);
  padding-inline: 12px;
  border-radius: var(--ui-radius-control, 6px);
  font-weight: 600;
}
.shipment-form-actions button[type='submit'] {
  background: #0a51b0;
}
.shipment-form-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.shipment-entry-section {
  padding: 10px 12px;
  border: 1px solid var(--ui-border, #e2e8f0);
  border-radius: var(--ui-radius-card, 6px);
}
.shipment-entry-section h3 {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: var(--fs-md, 13px);
  font-weight: 650;
  color: #333;
}
.shipment-entry-section h3 > span {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: #edf5ff;
  color: #0a51b0;
  font-size: var(--fs-2xs, 10px);
}
.shipment-entry-hint {
  margin: 7px 0 12px;
  font-size: var(--fs-xs, 11px);
  line-height: 1.5;
  color: #637288;
}
.shipment-entry-section > .grid {
  gap: 12px;
}
.shipment-recipient-section > div + div {
  margin-top: 18px;
}
.shipment-entry-section label {
  font-size: var(--fs-form-label, 12px);
  font-weight: 500;
}
.shipment-entry-section :is(input, textarea) {
  font-size: var(--fs-sm, 12px);
  min-height: var(--control-height-lg, 34px);
  background: #fafbfd;
}
.shipment-entry-section textarea {
  min-height: 96px;
  line-height: 1.5;
}
.shipment-entry-section :deep(button[aria-haspopup='listbox']) {
  min-height: var(--control-height-lg, 34px);
  background: #fafbfd;
}
.shipment-pagination {
  margin-top: 14px;
  padding: 0;
  border: 0;
}
.shipment-pagination :deep(.asset-pagination) {
  margin-top: 0;
}
.shipment-status {
  white-space: nowrap;
  flex-shrink: 0;
}
.shipment-status :deep(span) {
  flex-shrink: 0;
}
.shipments-page button:focus-visible,
.shipment-form-actions button:focus-visible {
  outline: 2px solid #097cde;
  outline-offset: 3px;
}
@media (min-width: 768px) and (max-width: 1279px) {
  .shipment-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 639px) {
  .shipment-cards > li {
    padding: 8px 10px;
  }
  .shipment-form :is(input, textarea),
  .shipment-form :deep(button[aria-haspopup='listbox']) {
    font-size: 16px;
  }
  .shipment-entry-section {
    padding: 10px 12px;
  }
  .shipment-entry-hint {
    margin-bottom: 12px;
  }
  .shipment-form-actions button {
    flex: 1;
    padding-inline: 12px;
  }
}

/* Page-owned spacing and controls; shared surfaces stay unchanged.
   Padding/radius mengikuti PageHeader.vue & token --ui-* (konsisten antarhalaman). */
.shipment-header {
  border-color: #dce5f1;
  box-shadow: none;
  flex-wrap: wrap;
}
.shipment-header :deep(.page-header-subtitle) {
  white-space: normal;
  line-height: 1.5;
}
.shipments-page .shipment-transfer-actions {
  padding: 3px;
  border: 1px solid #dce5f1;
  border-radius: 6px;
  background: #f4f8ff;
}
.shipments-page .shipment-transfer-actions button {
  min-width: 0;
  color: #0a51b0;
}
.shipments-page :is(button, input):focus-visible {
  outline: 2px solid #0a51b0;
  outline-offset: 2px;
}
.shipment-toolbar {
  padding: 10px 12px;
  border: 1px solid #dce5f1;
  border-radius: 6px;
  background: white;
  box-shadow: 0 2px 10px #0a51b008;
}
.shipment-toolbar > button {
  padding-inline: 12px;
  color: #0a51b0;
}
.shipment-search input {
  font-size: 12px;
  border-color: #dce5f1;
}
.shipment-summary > div {
  border-color: #dce5f1;
  box-shadow: 0 3px 12px #0a51b009;
}
.shipment-summary > div > div:first-child {
  color: #0a51b0;
}
.shipment-table {
  border-color: #dce5f1;
}
.shipment-table th {
  border-bottom: 1px solid #dce5f1;
  color: #52647e;
}
.shipment-table tbody tr:hover {
  background: #f4f8ff;
}
.shipment-table a {
  min-height: 32px;
  color: #0a51b0;
}
.shipment-cards > li {
  border-color: #dce5f1;
  box-shadow: 0 3px 12px #0a51b009;
}
.shipment-cards > li > p {
  background: #f4f8ff;
  border: 1px solid #e4edf8;
}
.shipment-cards a {
  color: #0a51b0;
}
:global(.shipment-dialog > div:first-child) {
  padding: 10px 12px;
  border-color: #dce5f1;
}
:global(.shipment-dialog .modal-body) {
  background: #fafcff;
}
:global(.shipment-dialog .shipment-entry-section) {
  background: white;
  border-color: #dce5f1;
  box-shadow: 0 2px 10px #0a51b008;
}
:global(.shipment-dialog :is(input, textarea, button):focus-visible) {
  outline: 2px solid #0a51b0;
  outline-offset: 2px;
}
:global(.shipment-dialog fieldset label) {
  min-height: 34px;
  align-items: center;
}
@media (max-width: 639px) {
  .shipment-toolbar {
    padding: 8px 10px;
  }
  :global(.shipment-dialog > div:first-child) {
    padding: 10px 12px;
  }
  :global(.shipment-dialog .shipment-entry-section) {
    padding: 10px 12px;
  }
}

.shipments-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.shipments-page > * {
  margin-block: 0;
}
.shipment-header-actions,
.shipment-transfer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.shipments-page .shipment-header-actions button {
  height: 34px;
  min-width: 0;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  justify-content: center;
}
.shipment-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.shipment-search {
  flex: 1;
  min-width: 200px;
  height: 34px;
}
.shipment-toolbar > button,
.shipment-toolbar :deep(button) {
  min-height: 32px;
  min-width: 32px;
}
.shipment-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.shipment-summary > div {
  min-width: 0;
}
.shipment-summary p {
  overflow-wrap: anywhere;
}
.shipment-list-surface {
  border: 0;
  background: transparent;
  box-shadow: none;
}
.shipment-list-surface button {
  min-height: 32px;
  min-width: 32px;
}
.shipment-table th:last-child {
  width: 112px;
}
.shipment-table td:last-child button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.shipment-cards > li > div:first-child > :last-child {
  flex-shrink: 0;
}
.shipment-cards > li > div:nth-of-type(2) > div {
  flex-wrap: wrap;
}
.shipment-cards[data-layout='card'] {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
:global(.shipment-dialog .modal-header),
:global(.shipment-dialog .modal-body),
:global(.shipment-dialog .modal-footer) {
  padding: 12px 14px;
}
:global(.shipment-dialog button) {
  min-height: 32px;
  min-width: 32px;
}
:global(.shipment-dialog .modal-footer button) {
  padding-inline: 12px;
  border-radius: 6px;
  font-size: 12px;
}
:global(.shipment-dialog input:not([type='radio']):not([type='checkbox']):not([type='file'])),
:global(.shipment-dialog select) {
  min-height: 34px;
}
:global(.shipment-dialog .modal-body) {
  overflow-wrap: anywhere;
}
@media (min-width: 1280px) {
  .shipment-cards[data-layout='table'] {
    display: none;
  }
}
@media (max-width: 1279px) {
  .shipment-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .shipment-cards[data-layout='card'] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 767px) {
  .shipment-cards[data-layout='card'] {
    grid-template-columns: minmax(0, 1fr);
  }
  .shipment-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
}
@media (max-width: 639px) {
  .shipment-header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
  .shipment-header-actions > button,
  .shipment-transfer-actions {
    flex: 1 1 100%;
  }
  .shipment-transfer-actions button {
    flex: 1;
  }
  .shipment-search {
    flex-basis: 100%;
  }
  :global(.shipment-dialog .modal-header),
  :global(.shipment-dialog .modal-body),
  :global(.shipment-dialog .modal-footer) {
    padding: 10px 12px;
  }
}
</style>

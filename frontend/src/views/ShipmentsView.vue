<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { api } from '../services/api.js'
import { useAuth } from '../composables/useAuth.js'
import { animateStagger } from '../composables/useGsap.js'
import AppModal from '../components/ui/AppModal.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import AppPagination from '../components/ui/AppPagination.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import SkeletonTable from '../components/ui/skeleton/SkeletonTable.vue'
import ShipmentImportModal from '../components/ui/ShipmentImportModal.vue'
import ShipmentExportModal from '../components/ui/ShipmentExportModal.vue'
import FilterModal from '../components/ui/FilterModal.vue'
import {
  ExternalLink,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
} from 'lucide-vue-next'

const { isSuperAdmin, hasWritePermission } = useAuth()
const canWriteShipments = computed(() => isSuperAdmin.value || hasWritePermission('shipments'))

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

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'belum_dikirim', label: 'Belum Dikirim', dot: 'bg-slate-400' },
  { value: 'pending', label: 'Pending', dot: 'bg-amber-500' },
  { value: 'sedang_dikirim', label: 'Sedang Dikirim', dot: 'bg-blue-500' },
  { value: 'diterima', label: 'Diterima', dot: 'bg-emerald-500' },
  { value: 'cancel', label: 'Cancel', dot: 'bg-rose-500' },
]

const FORM_STATUS_OPTIONS = [
  { value: 'belum_dikirim', label: 'Belum Dikirim', dot: 'bg-slate-400' },
  { value: 'pending', label: 'Pending', dot: 'bg-amber-500' },
  { value: 'sedang_dikirim', label: 'Sedang Dikirim', dot: 'bg-blue-500' },
  { value: 'diterima', label: 'Diterima', dot: 'bg-emerald-500' },
  { value: 'cancel', label: 'Cancel', dot: 'bg-rose-500' },
]

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
      return 'Belum Dikirim'
    case 'pending':
      return 'Pending'
    case 'sedang_dikirim':
      return 'Sedang Dikirim'
    case 'diterima':
      return 'Diterima'
    case 'cancel':
      return 'Cancel'
    default:
      return status || '-'
  }
}

function formatDate(val) {
  if (!val) return '-'
  try {
    const d = new Date(val)
    if (Number.isNaN(d.getTime())) return val
    return d.toLocaleDateString('id-ID', {
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

async function fetchData() {
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
    shipments.value = Array.isArray(res?.data) ? res.data : []
    totalRecords.value = Number(res?.total) || 0
    if (res?.summary) {
      summary.value = res.summary
    }
  } catch (err) {
    pageError.value = err.message || 'Gagal memuat data pengiriman.'
  } finally {
    isLoading.value = false
    await nextTick()
    animateStagger('tbody tr')
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
    modalError.value = 'Tanggal request wajib diisi.'
    return
  }
  if (!form.value.recipient_name?.trim()) {
    modalError.value = 'Nama penerima wajib diisi.'
    return
  }
  if (!form.value.item_description?.trim()) {
    modalError.value = 'Deskripsi barang wajib diisi.'
    return
  }
  if (!form.value.destination?.trim()) {
    modalError.value = 'Tujuan pengiriman wajib diisi.'
    return
  }
  if (form.value.delivery_proof_url?.trim()) {
    const trimmedUrl = form.value.delivery_proof_url.trim()
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      modalError.value = 'Link bukti pengiriman harus diawali dengan http:// atau https://.'
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
      toast('Data pengiriman berhasil ditambahkan.')
    } else {
      await api.updateShipment(selectedShipment.value.id, payload)
      toast('Data pengiriman berhasil diperbarui.')
    }

    closeModal()
    await fetchData()
  } catch (err) {
    modalError.value = err.message || 'Gagal menyimpan data pengiriman.'
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
    toast('Data pengiriman berhasil dihapus.')
    closeModal()
    await fetchData()
  } catch (err) {
    modalError.value = err.message || 'Gagal menghapus data pengiriman.'
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
  <div data-testid="page-ready" class="shipments-page space-y-4 sm:space-y-6 pb-12">
    <!-- Notification Toast -->
    <Transition name="fade">
      <div
        v-if="notification"
        class="fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl flex items-center gap-2"
        :class="notification.type === 'danger' ? 'bg-rose-600' : 'bg-emerald-600'"
      >
        <span>{{ notification.message }}</span>
      </div>
    </Transition>

    <!-- Top Card: Header & Search/Filters Bar -->
    <div
      class="shipment-toolbar rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5 shadow-2xs space-y-4"
    >
      <!-- Row 1: Title and Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-lg sm:text-xl font-bold text-[#333333] tracking-tight">Pengiriman</h1>
          <p class="text-[13px] text-[#64748B] mt-0.5 leading-normal">
            Pantau proses pengiriman barang dan aset kantor.
          </p>
        </div>

        <div v-if="canWriteShipments" class="flex items-center gap-2">
          <button
            type="button"
            @click="openAdd"
            class="toolbar-primary-action inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#0A51B0] px-3 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-[#0A4391] active:scale-95 sm:px-3.5"
            title="Tambah pengiriman baru"
          >
            <span class="material-symbols-outlined text-[16px]">add</span>
            <span>Tambah Pengiriman</span>
          </button>
          <div class="toolbar-action-group flex items-center gap-1 rounded-lg border border-[#D7E3F2] bg-[#F8FAFC] p-1">
            <button
              type="button"
              @click="showImportModal = true"
              class="toolbar-action-button inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-bold text-[#0A51B0] hover:bg-white"
            >
              <span class="material-symbols-outlined text-[15px]">upload_file</span>Import
            </button>
            <button
              type="button"
              @click="showExportModal = true"
              class="toolbar-action-button inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-bold text-[#0A51B0] hover:bg-white"
            >
              <span class="material-symbols-outlined text-[15px]">download</span>Export
            </button>
          </div>
        </div>
      </div>

      <!-- Row 2: Search Input & Filters Control Bar -->
      <div
        class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 w-full min-w-0 pt-3 border-t border-[#F1F5F9]"
      >
        <div class="relative h-9 min-w-0">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none"
          />
          <input
            v-model="searchQuery"
            aria-label="Cari pengiriman"
            type="text"
            placeholder="Cari penerima, barang, tujuan, atau no resi..."
            class="toolbar-search-input h-full min-h-0 w-full rounded-xl border border-[#E2E8F0] bg-white pl-9 pr-3 text-xs text-[#333333] placeholder-[#94A3B8] focus:border-[#0A51B0] focus:outline-none transition-all shadow-2xs"
          />
        </div>

        <button type="button" @click="showFilterModal = true" class="toolbar-filter-button h-9 shrink-0 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-semibold text-[#64748B] hover:bg-white"><span class="material-symbols-outlined mr-1 align-middle text-[16px]">filter_alt</span>Filter</button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div
        class="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs flex items-center gap-3.5"
      >
        <div
          class="h-11 w-11 rounded-xl bg-blue-50 text-[#333333] flex items-center justify-center shrink-0"
        >
          <Package class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <p class="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
            Total Pengiriman
          </p>
          <p class="text-xl sm:text-2xl font-bold text-[#333333] mt-0.5">
            {{ summary.total }}
          </p>
        </div>
      </div>

      <div
        class="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs flex items-center gap-3.5"
      >
        <div
          class="h-11 w-11 rounded-xl bg-slate-100 text-[#475569] flex items-center justify-center shrink-0"
        >
          <Package class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <p class="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
            Belum Dikirim
          </p>
          <p class="text-xl sm:text-2xl font-bold text-[#333333] mt-0.5">
            {{ summary.belum_dikirim }}
          </p>
        </div>
      </div>

      <div
        class="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs flex items-center gap-3.5"
      >
        <div
          class="h-11 w-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"
        >
          <Truck class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <p class="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
            Sedang Dikirim
          </p>
          <p class="text-xl sm:text-2xl font-bold text-[#333333] mt-0.5">
            {{ summary.sedang_dikirim }}
          </p>
        </div>
      </div>

      <div
        class="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs flex items-center gap-3.5"
      >
        <div
          class="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"
        >
          <Truck class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <p class="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Diterima</p>
          <p class="text-xl sm:text-2xl font-bold text-[#333333] mt-0.5">
            {{ summary.diterima }}
          </p>
        </div>
      </div>
    </div>

    <!-- Main Content: Table & List -->
    <div
      class="shipment-list-surface rounded-2xl border border-[#E2E8F0]/80 bg-white shadow-2xs overflow-hidden"
    >
      <div v-if="isLoading" aria-busy="true">
        <SkeletonTable preset="assets" :rows="6" />
      </div>

      <div v-else-if="pageError" class="p-8 text-center text-rose-600">
        <p class="font-bold text-sm">{{ pageError }}</p>
        <button
          type="button"
          @click="fetchData"
          class="mt-2 text-xs font-bold underline cursor-pointer inline-flex items-center gap-1.5"
        >
          <RefreshCw class="w-3.5 h-3.5" />
          <span>Coba Lagi</span>
        </button>
      </div>

      <div v-else-if="shipments.length === 0" class="px-4 py-12 text-center text-[#64748B]">
        <div
          class="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-[#94A3B8] mb-3"
        >
          <Package class="w-6 h-6" />
        </div>
        <p class="font-bold text-sm text-[#333333]">Belum ada data pengiriman.</p>
        <p class="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
          {{
            canWriteShipments
              ? 'Tambahkan pengiriman pertama untuk mulai melakukan tracking.'
              : 'Tidak ada data pengiriman yang cocok dengan filter yang dipilih.'
          }}
        </p>
        <button
          v-if="canWriteShipments"
          type="button"
          @click="openAdd"
          class="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0A51B0] text-white text-xs font-semibold hover:bg-[#0A4391] transition-all cursor-pointer shadow-2xs"
        >
          <Plus class="w-4 h-4" />
          <span>Tambah Pengiriman</span>
        </button>
      </div>

      <div v-else class="w-full max-w-full overflow-hidden">
        <!-- Desktop Table (>= lg) -->
        <div class="shipment-table hidden xl:block overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr
                class="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold text-[#64748B] uppercase tracking-wider"
              >
                <th class="py-3 px-4">Tanggal Request</th>
                <th class="py-3 px-4">Nama Penerima</th>
                <th class="py-3 px-4">Deskripsi Barang</th>
                <th class="py-3 px-4">Tujuan Pengiriman</th>
                <th class="py-3 px-4">No Resi</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4 text-center">Bukti</th>
                <th v-if="canWriteShipments" class="py-3 px-4 text-right">Aksi</th>
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
                    class="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#333333] hover:text-[#0A4391] hover:underline"
                    title="Buka link bukti pengiriman di tab baru"
                  >
                    <span>Lihat Bukti</span>
                    <ExternalLink class="w-3 h-3" />
                  </a>
                  <span v-else class="text-[#94A3B8]">-</span>
                </td>
                <td v-if="canWriteShipments" class="py-3 px-4 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      @click="openEdit(item)"
                      class="p-1.5 rounded-lg text-[#64748B] hover:text-[#333333] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                      title="Edit pengiriman"
                      aria-label="Edit pengiriman"
                    >
                      <Pencil class="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      @click="openDelete(item)"
                      class="p-1.5 rounded-lg text-[#64748B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus pengiriman"
                      aria-label="Hapus pengiriman"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Card List (< lg) -->
        <ul class="shipment-cards xl:hidden" aria-label="Daftar pengiriman">
          <li
            v-for="item in shipments"
            :key="item.id"
            class="p-4 space-y-2 hover:bg-[#F8FAFC] transition-colors"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-sm font-bold text-[#333333]">{{ item.recipient_name }}</p>
                <p class="text-[11px] text-[#64748B] mt-0.5">
                  {{ formatDate(item.request_date) }} &bull; {{ item.destination }}
                </p>
              </div>
              <AppBadge
                :type="getStatusBadgeType(item.status)"
                :text="getStatusLabel(item.status)"
              />
            </div>

            <p class="text-xs text-[#334155] bg-slate-50 p-2 rounded-lg">
              {{ item.item_description }}
            </p>

            <div class="flex items-center justify-between text-xs text-[#64748B] pt-1">
              <div class="flex items-center gap-1.5 font-mono text-[11px]">
                <span class="text-[#94A3B8]">Resi:</span>
                <span>{{ item.tracking_number || '-' }}</span>
              </div>

              <a
                v-if="item.delivery_proof_url"
                :href="item.delivery_proof_url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-[11px] font-bold text-[#333333]"
              >
                <span>Lihat Bukti</span>
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
                <span>Edit</span>
              </button>
              <button
                type="button"
                @click="openDelete(item)"
                class="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-md transition-colors flex items-center gap-1"
              >
                <Trash2 class="w-3 h-3" />
                <span>Hapus</span>
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
      :is-open="showFormModal"
      :title="modalMode === 'add' ? 'Tambah Pengiriman' : 'Edit Pengiriman'"
      size="lg"
      icon="local_shipping"
      subtitle="Lengkapi penerima, barang, dan tujuan. Kolom bertanda * wajib diisi."
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
          <h3><span>01</span>Informasi pengiriman</h3>
          <p class="shipment-entry-hint">Tentukan tanggal pengajuan dan status pengiriman.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                for="shipment-request_date"
                class="block text-xs font-bold text-[#333333] mb-1"
              >
                Tanggal pengajuan <span class="text-rose-500">*</span>
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
                Status <span class="text-rose-500">*</span>
              </label>
              <CustomSelect
                v-model="form.status"
                :options="FORM_STATUS_OPTIONS"
                aria-label="Status pengiriman"
                placeholder="Pilih status"
                :block="true"
                height-class="h-10"
              />
            </div>
          </div>
        </section>
        <section class="shipment-entry-section shipment-recipient-section">
          <h3><span>02</span>Penerima & barang</h3>
          <p class="shipment-entry-hint">
            Lengkapi penerima, tujuan, dan rincian barang yang dikirim.
          </p>
          <div>
            <label
              for="shipment-recipient_name"
              class="block text-xs font-bold text-[#333333] mb-1"
            >
              Nama Penerima <span class="text-rose-500">*</span>
            </label>
            <input
              id="shipment-recipient_name"
              v-model="form.recipient_name"
              type="text"
              required
              maxlength="150"
              placeholder="Contoh: Budi Santoso"
              class="h-10 w-full rounded-xl border border-[#CBD5E1] px-3 text-xs text-[#333333] focus:border-[#0A51B0] focus:outline-none"
            />
          </div>

          <div>
            <label
              for="shipment-item_description"
              class="block text-xs font-bold text-[#333333] mb-1"
            >
              Deskripsi Barang <span class="text-rose-500">*</span>
            </label>
            <textarea
              id="shipment-item_description"
              v-model="form.item_description"
              rows="3"
              required
              maxlength="5000"
              placeholder="Contoh: 1 Unit Laptop ThinkPad X1 Carbon + Charger & Mouse"
              class="w-full rounded-xl border border-[#CBD5E1] p-3 text-xs text-[#333333] focus:border-[#0A51B0] focus:outline-none"
            ></textarea>
          </div>

          <div>
            <label for="shipment-destination" class="block text-xs font-bold text-[#333333] mb-1">
              Tujuan Pengiriman <span class="text-rose-500">*</span>
            </label>
            <input
              id="shipment-destination"
              v-model="form.destination"
              type="text"
              required
              maxlength="255"
              placeholder="Contoh: Kantor Cabang Surabaya / Alamat Penerima"
              class="h-10 w-full rounded-xl border border-[#CBD5E1] px-3 text-xs text-[#333333] focus:border-[#0A51B0] focus:outline-none"
            />
          </div>
        </section>
        <section class="shipment-entry-section">
          <h3><span>03</span>Pelacakan & bukti</h3>
          <p class="shipment-entry-hint">
            Opsional. Lengkapi setelah nomor resi atau bukti tersedia.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                for="shipment-tracking_number"
                class="block text-xs font-bold text-[#333333] mb-1"
              >
                No Resi <span class="text-[#94A3B8] font-normal">(Opsional)</span>
              </label>
              <input
                id="shipment-tracking_number"
                v-model="form.tracking_number"
                type="text"
                maxlength="100"
                placeholder="Contoh: JNE-01234567"
                class="h-10 w-full rounded-xl border border-[#CBD5E1] px-3 text-xs text-[#333333] focus:border-[#0A51B0] focus:outline-none"
              />
            </div>

            <div>
              <label
                for="shipment-delivery_proof_url"
                class="block text-xs font-bold text-[#333333] mb-1"
              >
                Link Bukti Pengiriman <span class="text-[#94A3B8] font-normal">(Opsional)</span>
              </label>
              <input
                id="shipment-delivery_proof_url"
                v-model="form.delivery_proof_url"
                type="url"
                maxlength="2048"
                placeholder="https://example.com/bukti.jpg"
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
            Batal
          </button>
          <button
            type="submit"
            form="shipment-form"
            :disabled="isSubmitting"
            class="h-9 rounded-lg bg-[#0A51B0] px-4 text-xs font-semibold text-white hover:bg-[#0A4391] disabled:opacity-50 cursor-pointer"
          >
            {{
              isSubmitting
                ? 'Menyimpan...'
                : modalMode === 'add'
                  ? 'Tambah pengiriman'
                  : 'Simpan perubahan'
            }}
          </button>
        </div>
      </template>
    </AppModal>

    <FilterModal :is-open="showFilterModal" title="Filter Pengiriman" @close="showFilterModal = false" @apply="showFilterModal = false" @reset="resetFilters">
      <CustomSelect v-model="filterStatus" :options="STATUS_OPTIONS" aria-label="Filter status" :block="true" height-class="h-10" />
      <input v-model="filterDateFrom" type="date" class="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs" />
      <input v-model="filterDateTo" type="date" class="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs" />
    </FilterModal>
    <ShipmentImportModal :is-open="showImportModal" @close="showImportModal = false" @imported="showImportModal = false; fetchData()" />
    <ShipmentExportModal :is-open="showExportModal" :shipments="shipments" @close="showExportModal = false" />

    <!-- Delete Confirmation Modal -->
    <AppModal :is-open="showDeleteModal" title="Hapus Data Pengiriman" @close="closeModal">
      <div class="space-y-4">
        <div
          v-if="modalError"
          role="alert"
          class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold"
        >
          {{ modalError }}
        </div>

        <p class="text-xs text-[#475569] leading-relaxed">
          Data pengiriman untuk
          <strong class="text-[#333333]">{{ selectedShipment?.recipient_name }}</strong> akan
          dihapus. Tindakan ini tidak dapat dibatalkan.
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
            Batal
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            @click="confirmDelete"
            class="h-9 rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
          >
            {{ isSubmitting ? 'Menghapus...' : 'Hapus Data' }}
          </button>
        </div>
      </template>
    </AppModal>
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
.shipments-page {
  max-width: 1600px;
  margin-inline: auto;
  color: #333333;
}
.shipment-toolbar {
  background: transparent;
  border: 0;
  padding: 0;
  box-shadow: none;
}
.shipment-toolbar h1 {
  font-size: 26px;
  font-weight: 650;
  letter-spacing: -0.04em;
}
.shipment-toolbar > div:first-child {
  margin-bottom: 24px;
}
.shipment-toolbar > div:first-child > div:last-child > button {
  background: #0a51b0;
  min-height: 0;
  box-shadow: none;
}
.shipment-toolbar > div:first-child > div:last-child > div:first-child button {
  background: transparent;
  min-height: 0;
  box-shadow: none;
  color: #0a51b0;
}
.shipment-toolbar > div:first-child > div:last-child > div:first-child button:hover {
  background: white;
}
.shipment-toolbar > div:first-child > div:last-child > div:first-child button span {
  color: inherit;
}
.shipment-toolbar > div:nth-child(2) {
  padding: 16px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 12px;
  gap: 12px;
}
.shipment-toolbar input:not(.toolbar-search-input) {
  min-height: 42px;
  background: #fafbfd;
  border-color: #e2e8f0;
}
.shipment-list-surface {
  border: 0;
  background: transparent;
  overflow: visible;
  box-shadow: none;
}
.shipment-list-surface > div:last-child {
  overflow: visible;
}
.shipment-table {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: white;
}
.shipment-table table {
  table-layout: fixed;
}
.shipment-table th {
  text-transform: none;
  letter-spacing: 0;
  font-size: 11px;
  font-weight: 500;
  color: #8291a7;
  padding: 16px 12px;
}
.shipment-table td {
  padding: 20px 12px;
  font-size: 12px;
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
.shipment-table button {
  min-width: 32px;
  min-height: 36px;
  display: grid;
  place-items: center;
}
.shipment-cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}
.shipment-cards > li {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 13px;
  padding: 20px;
  min-width: 0;
}
.shipment-cards > li > div:first-child {
  gap: 12px;
}
.shipment-cards > li > div:first-child > div {
  min-width: 0;
  overflow-wrap: anywhere;
}
.shipment-cards > li > div:first-child p:first-child {
  font-size: 14px;
  font-weight: 650;
  color: #333333;
}
.shipment-cards > li > div:first-child p:last-child {
  line-height: 1.7;
  margin-top: 6px;
}
.shipment-cards > li > p {
  padding: 12px;
  line-height: 1.7;
  margin-top: 14px;
  margin-bottom: 14px;
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
  min-height: 44px;
}
.shipment-cards button {
  padding-inline: 14px;
  cursor: pointer;
}
.shipment-form {
  padding: 2px;
}
.shipment-form > div:not([role='alert']) {
  min-width: 0;
}
.shipment-form label {
  font-size: 12px;
  font-weight: 500;
  color: #52647e;
  margin-bottom: 7px;
}
.shipment-form :is(input, textarea) {
  min-height: 44px;
  font-size: 13px;
  border-radius: 8px;
  border-color: #dce4ef;
  background: #fafbfd;
}
.shipment-form textarea {
  resize: vertical;
  min-height: 96px;
  line-height: 1.7;
}
.shipment-form :deep(button[aria-haspopup='listbox']) {
  min-height: 44px;
  border-radius: 8px;
}
.shipment-form :is(input, textarea):focus {
  background: white;
  border-color: #097cde;
  box-shadow: 0 0 0 3px #097cde10;
}
.shipment-form-actions {
  padding: 0;
  border: 0;
  gap: 10px;
}
.shipment-form-actions button {
  min-height: 44px;
  padding-inline: 20px;
  border-radius: 8px;
}
.shipment-form-actions button[type='submit'] {
  background: #0a51b0;
}
.shipment-form-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
@media (min-width: 1280px) {
  .shipment-cards {
    display: none;
  }
}
@media (max-width: 639px) {
  .shipment-toolbar h1 {
    font-size: 23px;
  }
  .shipment-toolbar > div:first-child button {
    width: 100%;
    min-height: 44px;
  }
  .shipment-toolbar > div:nth-child(2) {
    padding: 14px;
  }
  .shipment-cards > li {
    padding: 16px;
  }
  .shipment-form :is(input, textarea),
  .shipment-form :deep(button[aria-haspopup='listbox']) {
    font-size: 16px;
  }
  .shipment-form-actions button {
    flex: 1;
  }
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
.shipment-table th:nth-child(6) {
  width: 132px;
}
.shipment-table td:nth-child(6) {
  white-space: nowrap;
  overflow-wrap: normal;
}
</style>

<style scoped>
.shipment-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 0;
}
.shipment-form > * {
  margin: 0;
}
.shipment-entry-section {
  padding: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}
.shipment-entry-section h3 {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
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
  font-size: 10px;
}
.shipment-entry-hint {
  margin: 7px 0 18px;
  font-size: 11px;
  line-height: 1.7;
  color: #71829b;
}
.shipment-entry-section > .grid {
  gap: 18px;
}
.shipment-recipient-section > div + div {
  margin-top: 18px;
}
.shipment-entry-section label {
  font-size: 12px;
  font-weight: 500;
}
.shipment-entry-section :is(input, textarea) {
  font-size: 13px;
  min-height: 44px;
  background: #fafbfd;
}
.shipment-entry-section textarea {
  min-height: 120px;
  line-height: 1.8;
}
.shipment-entry-section :deep(button[aria-haspopup='listbox']) {
  min-height: 44px;
  background: #fafbfd;
}
.shipment-form-actions {
  gap: 10px;
}
.shipment-form-actions button {
  font-weight: 600;
  min-height: 44px;
}
@media (max-width: 639px) {
  .shipment-entry-section {
    padding: 16px;
  }
  .shipment-entry-section :is(input, textarea),
  .shipment-entry-section :deep(button[aria-haspopup='listbox']) {
    font-size: 16px;
  }
  .shipment-entry-hint {
    margin-bottom: 16px;
  }
  .shipment-form-actions button {
    padding-inline: 12px;
  }
}
</style>

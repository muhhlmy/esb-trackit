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
import {
  ExternalLink,
  FilterX,
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
  <div data-testid="page-ready" class="space-y-4 sm:space-y-6 pb-12 select-none">
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
    <div class="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5 shadow-2xs space-y-4">
      <!-- Row 1: Title and Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight">Pengiriman</h1>
          <p class="text-[13px] text-[#64748B] mt-0.5 leading-normal">
            Pantau proses pengiriman barang dan aset kantor.
          </p>
        </div>

        <div v-if="canWriteShipments" class="flex items-center gap-2">
          <button
            type="button"
            @click="openAdd"
            class="h-10 sm:h-9 shrink-0 whitespace-nowrap rounded-lg bg-[#2563EB] px-4 text-xs font-semibold text-white shadow-2xs hover:bg-[#1D4ED8] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="Tambah pengiriman baru"
          >
            <Plus class="w-4 h-4" />
            <span>Tambah Pengiriman</span>
          </button>
        </div>
      </div>

      <!-- Row 2: Search Input & Filters Control Bar -->
      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2.5 w-full min-w-0 pt-3 border-t border-[#F1F5F9]"
      >
        <div class="relative min-w-0 lg:flex-1 lg:min-w-[220px]">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none"
          />
          <input
            v-model="searchQuery"
            aria-label="Cari pengiriman"
            type="text"
            placeholder="Cari penerima, barang, tujuan, atau no resi..."
            class="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white pl-9 pr-3 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none transition-all shadow-2xs"
          />
        </div>

        <div class="min-w-0 sm:w-[160px]">
          <CustomSelect
            v-model="filterStatus"
            :options="STATUS_OPTIONS"
            aria-label="Filter status pengiriman"
            placeholder="Semua Status"
            :block="true"
            height-class="h-10"
          />
        </div>

        <div class="flex items-center gap-1.5 min-w-0">
          <input
            v-model="filterDateFrom"
            type="date"
            aria-label="Tanggal Dari"
            title="Tanggal Dari"
            class="h-10 w-full sm:w-[140px] rounded-xl border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none transition-all shadow-2xs"
          />
          <span class="text-xs text-[#94A3B8]">-</span>
          <input
            v-model="filterDateTo"
            type="date"
            aria-label="Tanggal Sampai"
            title="Tanggal Sampai"
            class="h-10 w-full sm:w-[140px] rounded-xl border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none transition-all shadow-2xs"
          />
        </div>

        <button
          type="button"
          @click="resetFilters"
          class="h-10 shrink-0 whitespace-nowrap rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          title="Reset filter pencarian"
        >
          <FilterX class="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div
        class="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-2xs flex items-center gap-3.5"
      >
        <div
          class="h-11 w-11 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0"
        >
          <Package class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <p class="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
            Total Pengiriman
          </p>
          <p class="text-xl sm:text-2xl font-bold text-[#0F172A] mt-0.5">
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
          <p class="text-xl sm:text-2xl font-bold text-[#0F172A] mt-0.5">
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
          <p class="text-xl sm:text-2xl font-bold text-[#0F172A] mt-0.5">
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
          <p class="text-xl sm:text-2xl font-bold text-[#0F172A] mt-0.5">
            {{ summary.diterima }}
          </p>
        </div>
      </div>
    </div>

    <!-- Main Content: Table & List -->
    <div class="rounded-2xl border border-[#E2E8F0]/80 bg-white shadow-2xs overflow-hidden">
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
        <p class="font-bold text-sm text-[#0F172A]">Belum ada data pengiriman.</p>
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
          class="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] transition-all cursor-pointer shadow-2xs"
        >
          <Plus class="w-4 h-4" />
          <span>Tambah Pengiriman</span>
        </button>
      </div>

      <div v-else class="w-full max-w-full overflow-hidden">
        <!-- Desktop Table (>= lg) -->
        <div class="hidden lg:block overflow-x-auto">
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
            <tbody class="divide-y divide-[#E2E8F0] text-xs text-[#0F172A]">
              <tr
                v-for="item in shipments"
                :key="item.id"
                class="hover:bg-[#F8FAFC] transition-colors"
              >
                <td class="py-3 px-4 whitespace-nowrap text-[#475569]">
                  {{ formatDate(item.request_date) }}
                </td>
                <td class="py-3 px-4 font-semibold text-[#0F172A]">
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
                    class="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#2563EB] hover:text-[#1D4ED8] hover:underline"
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
                      class="p-1.5 rounded-lg text-[#64748B] hover:text-[#2563EB] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
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
        <ul class="divide-y divide-[#E2E8F0] lg:hidden" aria-label="Daftar pengiriman">
          <li
            v-for="item in shipments"
            :key="item.id"
            class="p-4 space-y-2 hover:bg-[#F8FAFC] transition-colors"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-sm font-bold text-[#0F172A]">{{ item.recipient_name }}</p>
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
                class="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB]"
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
                class="px-2.5 py-1 text-xs font-semibold text-[#2563EB] hover:bg-blue-50 rounded-md transition-colors flex items-center gap-1"
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
        <div class="border-t border-[#E2E8F0] p-3 sm:p-4">
          <AppPagination
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
      @close="closeModal"
    >
      <form @submit.prevent="saveShipment" class="space-y-4">
        <div
          v-if="modalError"
          class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold"
        >
          {{ modalError }}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label class="block text-xs font-bold text-[#0F172A] mb-1">
              Tanggal Request <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.request_date"
              type="date"
              required
              class="h-10 w-full rounded-xl border border-[#CBD5E1] px-3 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-[#0F172A] mb-1">
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

        <div>
          <label class="block text-xs font-bold text-[#0F172A] mb-1">
            Nama Penerima <span class="text-rose-500">*</span>
          </label>
          <input
            v-model="form.recipient_name"
            type="text"
            required
            maxlength="150"
            placeholder="Contoh: Budi Santoso"
            class="h-10 w-full rounded-xl border border-[#CBD5E1] px-3 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-[#0F172A] mb-1">
            Deskripsi Barang <span class="text-rose-500">*</span>
          </label>
          <textarea
            v-model="form.item_description"
            rows="3"
            required
            maxlength="5000"
            placeholder="Contoh: 1 Unit Laptop ThinkPad X1 Carbon + Charger & Mouse"
            class="w-full rounded-xl border border-[#CBD5E1] p-3 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
          ></textarea>
        </div>

        <div>
          <label class="block text-xs font-bold text-[#0F172A] mb-1">
            Tujuan Pengiriman <span class="text-rose-500">*</span>
          </label>
          <input
            v-model="form.destination"
            type="text"
            required
            maxlength="255"
            placeholder="Contoh: Kantor Cabang Surabaya / Alamat Penerima"
            class="h-10 w-full rounded-xl border border-[#CBD5E1] px-3 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label class="block text-xs font-bold text-[#0F172A] mb-1">
              No Resi <span class="text-[#94A3B8] font-normal">(Opsional)</span>
            </label>
            <input
              v-model="form.tracking_number"
              type="text"
              maxlength="100"
              placeholder="Contoh: JNE-01234567"
              class="h-10 w-full rounded-xl border border-[#CBD5E1] px-3 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-[#0F172A] mb-1">
              Link Bukti Pengiriman <span class="text-[#94A3B8] font-normal">(Opsional)</span>
            </label>
            <input
              v-model="form.delivery_proof_url"
              type="url"
              maxlength="2048"
              placeholder="https://example.com/bukti.jpg"
              class="h-10 w-full rounded-xl border border-[#CBD5E1] px-3 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
          <button
            type="button"
            @click="closeModal"
            class="h-9 rounded-lg border border-[#CBD5E1] px-4 text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9] cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="h-9 rounded-lg bg-[#2563EB] px-4 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50 cursor-pointer"
          >
            {{ isSubmitting ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- Delete Confirmation Modal -->
    <AppModal :is-open="showDeleteModal" title="Hapus Data Pengiriman" @close="closeModal">
      <div class="space-y-4">
        <div
          v-if="modalError"
          class="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold"
        >
          {{ modalError }}
        </div>

        <p class="text-xs text-[#475569] leading-relaxed">
          Data pengiriman untuk
          <strong class="text-[#0F172A]">{{ selectedShipment?.recipient_name }}</strong> akan
          dihapus. Tindakan ini tidak dapat dibatalkan.
        </p>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
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
      </div>
    </AppModal>
  </div>
</template>

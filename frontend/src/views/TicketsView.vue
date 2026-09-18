<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import { useAuth } from '@/composables/useAuth'
import { onTicketEvent } from '../composables/useTicketRealtime.js'
import { getStatusDotInfo, getPriorityInfo } from '../utils/ticketPresentation.js'
import { validateAttachmentFile } from '../utils/attachmentPolicy.js'
import AppModal from '../components/ui/AppModal.vue'
import AppRowActions from '../components/ui/AppRowActions.vue'
import { useViewMode } from '../composables/useViewMode.js'
import AppViewToggle from '../components/ui/AppViewToggle.vue'
import AppPagination from '../components/ui/AppPagination.vue'
import SearchableSelect from '../components/ui/SearchableSelect.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import FilterModal from '../components/ui/FilterModal.vue'
import TicketCaspRating from '../components/tickets/TicketCaspRating.vue'
import { animateStagger } from '../composables/useGsap.js'
import BaseSkeleton from '../components/ui/skeleton/BaseSkeleton.vue'
import AuthGateCard from '../components/common/AuthGateCard.vue'
import SkeletonList from '../components/ui/skeleton/SkeletonList.vue'

const route = useRoute()
const { get, getAllPages, post, put, del } = useApi()
const { user, isAuthenticated, isSuperAdmin, isAdmin, hasWritePermission } = useAuth()
const { viewMode } = useViewMode('tickets', 'table')

const TICKET_PRIORITY_OPTIONS = [
  { value: 'Low', label: 'Low', dot: 'bg-emerald-500' },
  { value: 'Medium', label: 'Medium', dot: 'bg-blue-500' },
  { value: 'High', label: 'High', dot: 'bg-amber-500' },
  { value: 'Critical', label: 'Critical', dot: 'bg-rose-500' },
]

const TICKET_STATUS_OPTIONS = [
  { value: 'Open', label: 'Open', dot: 'bg-emerald-500' },
  { value: 'In Progress', label: 'In Progress', dot: 'bg-blue-500' },
  { value: 'Pending', label: 'Pending', dot: 'bg-amber-500' },
  { value: 'Resolved', label: 'Resolved', dot: 'bg-teal-500' },
  { value: 'Closed', label: 'Closed', dot: 'bg-slate-400' },
]

const nowTick = ref(Date.now())
let tickerInterval = null

// ── Realtime SSE Handlers (optimistic patch, bukan full refetch) ──
const handleTicketCreated = (data) => {
  if (!data) return
  if (isAdmin.value || isSuperAdmin.value) {
    toast(
      `🔔 Tiket Baru! ${data.nomor_tiket || ''}: ${data.judul || 'Tanpa Judul'} — oleh ${data.pelapor || 'User'}`,
      'info',
    )
  }
  // Tiket baru mungkin di luar filter aktif; refetch untuk konsistensi.
  // Tapi hanya list, bukan stats (stats di-patch terpisah).
  fetchTickets(true)
  // Update stats secara optimistic (total +1, open +1 jika status Open)
  if (data.status_tiket === 'Open') {
    stats.value = {
      ...stats.value,
      totalTickets: (stats.value.totalTickets || 0) + 1,
      openTickets: (stats.value.openTickets || 0) + 1,
    }
  }
}

const handleTicketUpdated = (data) => {
  if (!data) return

  // Patch tiket di list secara optimistic dari payload event
  const idx = tickets.value.findIndex((t) => t.id === data.id)
  if (idx >= 0) {
    tickets.value[idx] = {
      ...tickets.value[idx],
      ...data,
      // Pertahankan field yang tidak ada di payload event
      deskripsi: tickets.value[idx].deskripsi,
      kategori: tickets.value[idx].kategori,
      pelapor: tickets.value[idx].pelapor,
      queue_id: tickets.value[idx].queue_id,
      pelapor_user_id: tickets.value[idx].pelapor_user_id,
      has_attachment: tickets.value[idx].has_attachment,
      queue_kode: tickets.value[idx].queue_kode,
      queue_nama: tickets.value[idx].queue_nama,
      pelapor_nama: tickets.value[idx].pelapor_nama,
      pelapor_nik: tickets.value[idx].pelapor_nik,
      pelapor_jabatan: tickets.value[idx].pelapor_jabatan,
      total_komentar: tickets.value[idx].total_komentar,
    }
  } else {
    // Tiket belum ada di list (mungkin di luar filter) → refetch
    fetchTickets(true)
  }

  // Update selectedTicket jika sedang dibuka di detail modal
  if (selectedTicket.value && data.id === selectedTicket.value.id) {
    selectedTicket.value = { ...selectedTicket.value, ...data }
    fetchTicketHistory(selectedTicket.value.id)
    fetchTicketComments(selectedTicket.value.id, true)
  }

  // Refetch stats untuk update counter (debounced via timeout)
  scheduleStatsRefresh()
}

const handleCommentCreated = (data) => {
  if (!data) return
  // Update total_komentar di list secara optimistic
  const ticketId = data.ticketId || data.id
  if (ticketId) {
    const idx = tickets.value.findIndex((t) => t.id === ticketId)
    if (idx >= 0) {
      tickets.value[idx] = {
        ...tickets.value[idx],
        total_komentar: (tickets.value[idx].total_komentar || 0) + 1,
      }
    }
  }
  // Refresh comments jika detail modal terbuka untuk tiket ini
  if (selectedTicket.value && ticketId === selectedTicket.value.id) {
    fetchTicketComments(selectedTicket.value.id, true)
  }
}

// Debounced stats refresh untuk menghindari burst request saat banyak event
let statsRefreshTimer = null
let searchDebounceTimer = null
function scheduleStatsRefresh() {
  if (statsRefreshTimer) clearTimeout(statsRefreshTimer)
  statsRefreshTimer = setTimeout(async () => {
    statsRefreshTimer = null
    try {
      const statsData = await get('/api/tickets/stats')
      if (statsData) stats.value = statsData
    } catch {
      // Silent fail; stats akan update di fetchTickets berikutnya
    }
  }, 500)
}

onMounted(async () => {
  tickerInterval = setInterval(() => {
    nowTick.value = Date.now()
  }, 30000)

  if (!isAdmin.value) {
    activeTab.value = 'all'
  }

  await fetchQueues()
  await fetchTickets()
  await openTicketFromQuery()

  // Muat daftar user untuk dropdown "Pelapor" (hanya dipakai admin/superadmin)
  if (isAdmin.value || isSuperAdmin.value) {
    fetchReporters()
  }

  // Subscribe ke SSE events (koneksi global dikelola di App.vue)
  unsubTicketCreated = onTicketEvent('TICKET_CREATED', handleTicketCreated)
  unsubTicketUpdated = onTicketEvent('TICKET_UPDATED', handleTicketUpdated)
  unsubCommentCreated = onTicketEvent('COMMENT_CREATED', handleCommentCreated)
})

let unsubTicketCreated = null
let unsubTicketUpdated = null
let unsubCommentCreated = null

onUnmounted(() => {
  if (tickerInterval) clearInterval(tickerInterval)
  if (statsRefreshTimer) clearTimeout(statsRefreshTimer)
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  stopChatPoll()
  unsubTicketCreated?.()
  unsubTicketUpdated?.()
  unsubCommentCreated?.()
})

// ── Queue / Tab state ─────────────────────────────────────────
const queues = ref([]) // list queue (HR, IT, GA, OPS)
const isQueuesLoading = ref(false)
const reporters = ref([]) // list user untuk dropdown pelapor (admin)
const isReportersLoading = ref(false)
const activeTab = ref('all') // 'all' | 'unassigned' | 'mine'
const filterQueue = ref('') // queue_id filter

// ── Ticket state ──────────────────────────────────────────────
const tickets = ref([])
const stats = ref({
  totalTickets: 0,
  pendingTickets: 0,
  openTickets: 0,
  closedTickets: 0,
  unassignedTickets: 0,
  assignedTickets: 0,
})
const isLoading = ref(true)
const isSubmitting = ref(false)
const searchQuery = ref('')
const filterStatus = ref('')
const filterPrioritas = ref('')
const filterKategori = ref('')
const showFilterModal = ref(false)
const sortOrder = ref('terbaru') // 'terbaru' | 'terlama'
const pageError = ref('')
const notification = ref(null)
const isClaiming = ref(null) // ticket id yang sedang di-claim

// Cache list default (tanpa search) agar saat search di-clear, list penuh
// langsung tampil tanpa menunggu fetch (menghindari flash "Inbox kosong").
let cachedDefaultTickets = []
// Token untuk mengabaikan response fetch yang sudah stale (race condition saat
// search berubah cepat); hanya response terbaru yang diterapkan.
let fetchRequestId = 0

const showFormModal = ref(false)
const showDeleteModal = ref(false)
const showDetailModal = ref(false)
const modalMode = ref('add')
const selectedTicket = ref(null)
const modalError = ref('')
const activeFormTab = ref('kendala')

const activeDetailTab = ref('detail')
const ticketHistory = ref([])
const isHistoryLoading = ref(false)

const ticketComments = ref([])
const isCommentsLoading = ref(false)
const newCommentText = ref('')
const commentAttachment = ref(null)
const commentAttachmentName = ref(null)
const isSubmittingComment = ref(false)
const isTicketAttachmentLoading = ref(false)
const ticketAttachmentError = ref('')
const attachmentChanged = ref(false)
let ticketAttachmentRequestVersion = 0

const emptyForm = () => ({
  judul: '',
  deskripsi: '',
  kategori: 'Support',
  queue_id: queues.value[0]?.id || '',
  prioritas: 'Medium',
  status_tiket: 'Open',
  assigned_to_user_id: null,
  pelapor_user_id: null,
  attachments: [],
})

const form = ref(emptyForm())

const selectedSupportUnit = ref('IT')

const itQueue = computed(
  () =>
    queues.value.find(
      (q) =>
        (q.kode || '').toUpperCase().includes('IT') || (q.nama || '').toUpperCase().includes('IT'),
    ) || queues.value[0],
)

const hrQueue = computed(() =>
  queues.value.find(
    (q) =>
      (q.kode || '').toUpperCase().includes('HR') ||
      (q.nama || '').toUpperCase().includes('HR') ||
      (q.nama || '').toUpperCase().includes('HUMAN'),
  ),
)

const gaQueue = computed(() =>
  queues.value.find(
    (q) =>
      (q.kode || '').toUpperCase().includes('GA') ||
      (q.nama || '').toUpperCase().includes('GA') ||
      (q.nama || '').toUpperCase().includes('GENERAL'),
  ),
)

function setSupportUnit(unit) {
  selectedSupportUnit.value = unit
  let targetQueue
  if (unit === 'HR') {
    targetQueue = hrQueue.value
  } else if (unit === 'GA') {
    targetQueue = gaQueue.value
  } else {
    targetQueue = itQueue.value
  }

  if (targetQueue) {
    form.value.queue_id = targetQueue.id
  } else if (queues.value.length > 0) {
    form.value.queue_id = queues.value[0].id
  }
}

function getQueueIcon(ticket) {
  const code = (ticket?.queue_kode || '').toUpperCase()
  const name = (ticket?.queue_nama || '').toUpperCase()
  if (code.includes('HR') || name.includes('HR') || name.includes('HUMAN')) return 'badge'
  if (code.includes('GA') || name.includes('GA') || name.includes('GENERAL'))
    return 'corporate_fare'
  return 'computer'
}

function getQueueTheme(ticket) {
  const code = (ticket?.queue_kode || '').toUpperCase()
  const name = (ticket?.queue_nama || '').toUpperCase()
  if (code.includes('HR') || name.includes('HR') || name.includes('HUMAN')) {
    return {
      badgeClass: 'bg-purple-50 text-purple-600 border border-purple-200/80',
      pillClass: 'bg-purple-50/80 text-purple-700 border-purple-200/80',
      icon: 'badge',
      label: ticket?.queue_nama || 'HR Support',
    }
  }
  if (code.includes('GA') || name.includes('GA') || name.includes('GENERAL')) {
    return {
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200/80',
      pillClass: 'bg-amber-50/80 text-amber-700 border-amber-200/80',
      icon: 'corporate_fare',
      label: ticket?.queue_nama || 'GA Support',
    }
  }
  return {
    badgeClass: 'bg-blue-50 text-blue-600 border border-blue-200/80',
    pillClass: 'bg-blue-50/80 text-blue-700 border-blue-200/80',
    icon: 'computer',
    label:
      ticket?.queue_nama || (ticket?.queue_kode ? `${ticket.queue_kode} Support` : 'IT Support'),
  }
}

const availableCategories = computed(() => {
  if (selectedSupportUnit.value === 'HR') {
    return [
      {
        value: 'Request',
        title: 'Request',
        desc: 'Permintaan Layanan & Surat HR',
      },
      {
        value: 'Support',
        title: 'Support',
        desc: 'Kendala & Masalah Kepegawaian',
      },
      {
        value: 'QNA',
        title: 'QNA',
        desc: 'Pertanyaan & Informasi HR',
      },
    ]
  }

  if (selectedSupportUnit.value === 'GA') {
    return [
      {
        value: 'Request',
        title: 'Request',
        desc: 'Permintaan Fasilitas & Perbaikan',
      },
      {
        value: 'Support',
        title: 'Support',
        desc: 'Kendala Fasilitas, Ruangan & AC',
      },
      {
        value: 'Incident',
        title: 'Incident',
        desc: 'Kerusakan & Insiden Gedung',
      },
    ]
  }

  return [
    {
      value: 'Request',
      title: 'Request',
      desc: 'Permintaan Akses & Perangkat',
    },
    {
      value: 'Support',
      title: 'Support',
      desc: 'Kendala PC, Laptop & Wi-Fi',
    },
    {
      value: 'Incident',
      title: 'Incident',
      desc: 'Gangguan Sistem & Jaringan',
    },
  ]
})

watch(
  () => selectedSupportUnit.value,
  () => {
    if (!form.value) return
    const validValues = availableCategories.value.map((c) => c.value)
    if (!validValues.includes(form.value.kategori)) {
      form.value.kategori = validValues[0] || 'Support'
    }
  },
  { immediate: true },
)

function handleFileChange(event) {
  const files = Array.from(event.target.files || [])
  if (!files.length) return

  for (const file of files) {
    const validationError = validateAttachmentFile(file)
    if (validationError) {
      modalError.value = validationError
      continue
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      form.value.attachments.push({ name: file.name, data: e.target.result })
      attachmentChanged.value = true
    }
    reader.readAsDataURL(file)
  }

  modalError.value = ''
  // Reset input value so selecting the same file again re-triggers change.
  event.target.value = ''
}

function removeAttachment(index) {
  form.value.attachments.splice(index, 1)
  attachmentChanged.value = true
}

function getAttachmentIcon(attachment, fileNameHint = '') {
  let name = ''
  let mimeOrData = ''

  if (typeof attachment === 'object' && attachment !== null) {
    name =
      attachment.name || attachment.nama || attachment.filename || attachment.attachment_name || ''
    mimeOrData = attachment.data || attachment.attachment || ''
  } else if (typeof attachment === 'string') {
    if (attachment.startsWith('data:')) {
      mimeOrData = attachment
    } else {
      name = attachment
    }
  }

  if (fileNameHint && typeof fileNameHint === 'string') {
    name = name || fileNameHint
  }

  // 1. Extract file extension from filename (most accurate)
  let ext = ''
  if (name) {
    const parts = name.trim().toLowerCase().split('.')
    if (parts.length > 1) {
      ext = parts.pop()
    }
  }

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic', 'tiff'].includes(ext)) {
    return 'image'
  }
  if (ext === 'pdf') {
    return 'picture_as_pdf'
  }
  if (['doc', 'docx', 'rtf', 'odt'].includes(ext)) {
    return 'description'
  }
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return 'table_chart'
  }
  if (['ppt', 'pptx', 'odp'].includes(ext)) {
    return 'slideshow'
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return 'folder_zip'
  }
  if (['txt', 'log', 'md', 'json', 'xml'].includes(ext)) {
    return 'article'
  }

  // 2. Fallback to MIME type header ONLY (e.g. data:image/png;base64,...)
  if (mimeOrData.startsWith('data:')) {
    const mimeHeader = (mimeOrData.split(';')[0] || '').toLowerCase()
    if (mimeHeader.includes('image')) return 'image'
    if (mimeHeader.includes('pdf')) return 'picture_as_pdf'
    if (mimeHeader.includes('word') || mimeHeader.includes('wordprocessingml')) return 'description'
    if (
      mimeHeader.includes('excel') ||
      mimeHeader.includes('spreadsheet') ||
      mimeHeader.includes('csv')
    )
      return 'table_chart'
    if (mimeHeader.includes('presentation') || mimeHeader.includes('powerpoint')) return 'slideshow'
    if (
      mimeHeader.includes('zip') ||
      mimeHeader.includes('compressed') ||
      mimeHeader.includes('rar')
    )
      return 'folder_zip'
    if (mimeHeader.includes('text/plain')) return 'article'
  }

  return 'attach_file'
}

function downloadAttachment(dataUrl, defaultFilename = 'lampiran-tiket') {
  if (!dataUrl || typeof dataUrl !== 'string') return
  let filename = defaultFilename
  if (dataUrl.startsWith('data:')) {
    const mimeHeader = dataUrl.split(';')[0] || ''
    const mime = (mimeHeader.split(':')[1] || '').toLowerCase()
    if (mime.includes('pdf') && !filename.endsWith('.pdf')) filename += '.pdf'
    else if (mime.includes('word') && !filename.endsWith('.docx')) filename += '.docx'
    else if (mime.includes('excel') && !filename.endsWith('.xlsx')) filename += '.xlsx'
    else if (mime.includes('csv') && !filename.endsWith('.csv')) filename += '.csv'
    else if (mime.includes('zip') && !filename.endsWith('.zip')) filename += '.zip'
    else if (mime.includes('png') && !filename.endsWith('.png')) filename += '.png'
    else if (mime.includes('jpeg') && !filename.endsWith('.jpg')) filename += '.jpg'
    else if (mime.includes('gif') && !filename.endsWith('.gif')) filename += '.gif'
    else if (mime.includes('webp') && !filename.endsWith('.webp')) filename += '.webp'
  }
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function handleCommentFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const validationError = validateAttachmentFile(file)
  if (validationError) {
    modalError.value = validationError
    return
  }
  modalError.value = ''
  const reader = new FileReader()
  reader.onload = (e) => {
    commentAttachment.value = e.target.result
    commentAttachmentName.value = file.name
  }
  reader.readAsDataURL(file)
}

function removeCommentAttachment() {
  commentAttachment.value = null
  commentAttachmentName.value = null
}

const filteredTickets = computed(() => {
  return tickets.value.filter((t) => {
    const matchStatus = !filterStatus.value || t.status_tiket === filterStatus.value
    const matchPrioritas = !filterPrioritas.value || t.prioritas === filterPrioritas.value
    const matchQueue = !filterQueue.value || t.queue_id === Number(filterQueue.value)
    const matchKategori =
      !filterKategori.value ||
      (t.kategori || '').toLowerCase() === filterKategori.value.toLowerCase()
    return matchStatus && matchPrioritas && matchQueue && matchKategori
  })
})

function resetFilters() {
  searchQuery.value = ''
  filterStatus.value = ''
  filterPrioritas.value = ''
  filterQueue.value = ''
  filterKategori.value = ''
  sortOrder.value = 'terbaru'
  fetchTickets()
}

const currentPage = ref(1)
const itemsPerPage = ref(10)

watch([searchQuery, filterStatus, filterPrioritas, filterQueue, filterKategori, activeTab], () => {
  currentPage.value = 1
})

// Live search: fetch ulang ke server saat keyword berubah (debounced singkat).
// Search dilakukan server-side; saat keyword dikosongkan langsung fetch (dengan
// loading state) agar list penuh segera muncul tanpa sempat tampil "kosong".
watch(searchQuery, (value) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)

  if (!value.trim()) {
    searchDebounceTimer = null
    // Restore list default dari cache secara instan (tanpa menunggu fetch),
    // sehingga tidak muncul flash "Inbox kosong".
    if (cachedDefaultTickets.length) {
      tickets.value = [...cachedDefaultTickets]
      isLoading.value = false
    }
    // Tetap refetch di background untuk memastikan data terkini.
    fetchTickets(true)
    return
  }

  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    fetchTickets(true)
  }, 150)
})

watch(
  () => [route.query.search, route.query.q],
  ([newSearch, newQ]) => {
    const term = newSearch || newQ
    if (typeof term === 'string') {
      searchQuery.value = term
    }
  },
  { immediate: true },
)

const paginatedTickets = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredTickets.value.slice(start, start + itemsPerPage.value)
})

const queueAdmins = ref({})

async function fetchQueueAdmins() {
  if (!isSuperAdmin.value) {
    queueAdmins.value = {}
    return
  }
  try {
    const adminMap = {}
    await Promise.all(
      queues.value.map(async (q) => {
        const data = await get(`/api/ticket-queues/${q.id}/admins`).catch(() => [])
        if (Array.isArray(data)) {
          adminMap[q.id] = data
        }
      }),
    )
    queueAdmins.value = adminMap
  } catch (err) {
    console.error('Gagal memuat admin queue:', err)
  }
}

function getAdminsForQueue(queueId) {
  if (!queueId) return []
  return queueAdmins.value[queueId] || []
}

async function fetchQueues() {
  isQueuesLoading.value = true
  try {
    const data = await get('/api/ticket-queues')
    if (Array.isArray(data)) {
      queues.value = data
      await fetchQueueAdmins()
    }
  } catch (err) {
    toast('Gagal memuat antrean tiket: ' + (err.message || 'Kesalahan jaringan'), 'error')
  } finally {
    isQueuesLoading.value = false
  }
}

async function fetchReporters() {
  isReportersLoading.value = true
  try {
    const data = await get('/api/tickets/reporters')
    const rows = Array.isArray(data?.reporters) ? data.reporters : []
    reporters.value = rows.map((u) => ({ id: Number(u.id), nama: u.nama }))
  } catch (err) {
    reporters.value = []
    toast('Gagal memuat daftar pelapor: ' + (err.message || 'Kesalahan jaringan'), 'error')
  } finally {
    isReportersLoading.value = false
  }
}

async function fetchTickets(silent = false) {
  const requestId = ++fetchRequestId
  if (!silent) isLoading.value = true
  pageError.value = ''
  try {
    const params = new URLSearchParams()
    if (activeTab.value !== 'all') params.set('tab', activeTab.value)
    if (filterQueue.value) params.set('queue_id', filterQueue.value)
    if (filterStatus.value) params.set('status', filterStatus.value)
    if (filterPrioritas.value) params.set('prioritas', filterPrioritas.value)
    if (searchQuery.value.trim()) params.set('search', searchQuery.value.trim())
    if (sortOrder.value && sortOrder.value !== 'terbaru') params.set('sort', sortOrder.value)

    const qs = params.toString()
    const [data, statsData] = await Promise.all([
      getAllPages(`/api/tickets${qs ? '?' + qs : ''}`, { limit: 100 }),
      get('/api/tickets/stats'),
    ])
    // Abaikan response stale (ada request lebih baru yang sudah dimulai).
    if (requestId !== fetchRequestId) return

    tickets.value = Array.isArray(data) ? data : []
    // Simpan cache list default (tanpa search) untuk restore instan saat clear.
    if (!searchQuery.value.trim()) {
      cachedDefaultTickets = [...tickets.value]
    }
    stats.value = statsData || {
      totalTickets: 0,
      pendingTickets: 0,
      openTickets: 0,
      closedTickets: 0,
      unassignedTickets: 0,
      assignedTickets: 0,
    }
  } catch (err) {
    if (requestId !== fetchRequestId) return
    if (!silent) {
      console.error('Gagal memuat tiket:', err)
      pageError.value = err.message || 'Gagal memuat data tiket.'
    }
  } finally {
    if (requestId === fetchRequestId) {
      isLoading.value = false
    }
    await nextTick()
    animateStagger('.tck-list-item')
  }
}

async function switchTab(tab) {
  activeTab.value = tab
  await fetchTickets()
}

async function fetchTicketHistory(ticketId) {
  isHistoryLoading.value = true
  try {
    const res = await get(`/api/tickets/${ticketId}/history`)
    ticketHistory.value = Array.isArray(res) ? res : []
  } catch (err) {
    console.error('Gagal memuat riwayat tiket:', err)
    ticketHistory.value = []
  } finally {
    isHistoryLoading.value = false
  }
}

async function fetchTicketComments(ticketId, silent = false) {
  if (!silent) isCommentsLoading.value = true
  try {
    const res = await get(`/api/tickets/${ticketId}/comments`)
    const previousComments = new Map(ticketComments.value.map((comment) => [comment.id, comment]))
    const newComments = (Array.isArray(res) ? res : []).map((comment) => {
      const previousComment = previousComments.get(comment.id)
      return {
        ...comment,
        attachment: previousComment?.attachment || null,
        is_attachment_loading: previousComment?.is_attachment_loading === true,
        attachment_error: previousComment?.attachment_error || '',
      }
    })
    const hadNewMsg = newComments.length > ticketComments.value.length
    ticketComments.value = newComments
    if (hadNewMsg && silent) {
      await nextTick()
      scrollChatToBottom()
    }
  } catch (err) {
    if (!silent) {
      console.error('Gagal memuat komentar tiket:', err)
      ticketComments.value = []
    }
  } finally {
    isCommentsLoading.value = false
  }
}

async function loadCommentAttachment(comment) {
  const ticketId = selectedTicket.value?.id
  if (
    !ticketId ||
    !comment?.has_attachment ||
    comment.attachment ||
    comment.is_attachment_loading
  ) {
    return
  }

  comment.is_attachment_loading = true
  comment.attachment_error = ''
  try {
    const result = await get(`/api/tickets/${ticketId}/comments/${comment.id}/attachment`)
    if (selectedTicket.value?.id !== ticketId) return

    const currentComment = ticketComments.value.find((item) => item.id === comment.id)
    if (currentComment && typeof result?.attachment === 'string') {
      currentComment.attachment = result.attachment
      currentComment.attachment_name = result.name || null
    }
  } catch (err) {
    if (selectedTicket.value?.id !== ticketId) return
    const currentComment = ticketComments.value.find((item) => item.id === comment.id)
    if (currentComment) {
      currentComment.attachment_error = err.message || 'Gagal memuat lampiran.'
    }
  } finally {
    const currentComment = ticketComments.value.find((item) => item.id === comment.id)
    if (currentComment) currentComment.is_attachment_loading = false
  }
}

const chatContainer = ref(null)
function scrollChatToBottom() {
  const el = chatContainer.value
  if (el) el.scrollTop = el.scrollHeight
}

async function openCommentsTab() {
  activeDetailTab.value = 'comments'
  await nextTick()
  scrollChatToBottom()
}

// Realtime chat comments are delivered via SSE (COMMENT_CREATED events)
function startChatPoll() {
  // Realtime updates handled via SSE
}
function stopChatPoll() {
  // Realtime updates handled via SSE
}

async function sendComment() {
  if (!newCommentText.value.trim() && !commentAttachment.value) return
  if (!selectedTicket.value) return

  isSubmittingComment.value = true
  try {
    await post(`/api/tickets/${selectedTicket.value.id}/comments`, {
      pesan: newCommentText.value.trim() || 'Melampirkan file',
      attachment: commentAttachment.value,
      attachment_name: commentAttachmentName.value,
    })
    newCommentText.value = ''
    commentAttachment.value = null
    commentAttachmentName.value = null
    await fetchTicketComments(selectedTicket.value.id)
    await nextTick()
    scrollChatToBottom()
  } catch (err) {
    console.error('Gagal mengirim komentar:', err)
  } finally {
    isSubmittingComment.value = false
  }
}

// ── Claim & Assign Ticket (dengan optimistic update) ──────────
async function claimTicket(ticket) {
  if (!ticket || isClaiming.value === ticket.id) return
  isClaiming.value = ticket.id

  const idx = tickets.value.findIndex((t) => t.id === ticket.id)
  const oldTicket = idx >= 0 ? { ...tickets.value[idx] } : null
  const oldSelectedTicket =
    selectedTicket.value?.id === ticket.id ? { ...selectedTicket.value } : null

  const currentUserName = user.value?.nama || 'Saya'
  const currentUserId = user.value?.id

  const updatedFields = {
    assigned_to_user_id: currentUserId,
    assigned_to: currentUserName,
    assigned_to_nama: currentUserName,
    status_tiket: 'In Progress',
  }

  // Optimistic: update UI segera di list dan detail modal
  if (idx >= 0) {
    tickets.value[idx] = {
      ...tickets.value[idx],
      ...updatedFields,
    }
  }

  if (selectedTicket.value?.id === ticket.id) {
    selectedTicket.value = {
      ...selectedTicket.value,
      ...updatedFields,
    }
  }

  try {
    const res = await post(`/api/tickets/${ticket.id}/claim`, {})
    toast(`Tiket '${ticket.judul}' berhasil diambil!`)

    if (selectedTicket.value?.id === ticket.id) {
      selectedTicket.value = {
        ...selectedTicket.value,
        ...res,
        assigned_to_user_id: currentUserId,
        assigned_to: currentUserName,
        assigned_to_nama: currentUserName,
        status_tiket: res?.status_tiket || 'In Progress',
      }
      fetchTicketHistory(ticket.id)
    }

    await fetchTickets(true)
    scheduleStatsRefresh()
  } catch (err) {
    // Rollback optimistic update
    if (idx >= 0 && oldTicket) {
      tickets.value[idx] = oldTicket
    }
    if (selectedTicket.value?.id === ticket.id && oldSelectedTicket) {
      selectedTicket.value = oldSelectedTicket
    }
    toast(err.message || 'Gagal mengambil tiket.', 'error')
  } finally {
    isClaiming.value = null
  }
}

async function assignTicket(ticket, targetUserId) {
  if (!ticket || !targetUserId) return
  showReassignDropdown.value = false
  isReassigning.value = true
  const idx = tickets.value.findIndex((t) => t.id === ticket.id)
  const oldTicket = idx >= 0 ? { ...tickets.value[idx] } : null
  try {
    await post(`/api/tickets/${ticket.id}/reassign`, { target_user_id: targetUserId })
    toast(`Tiket '${ticket.judul}' berhasil dialihkan.`)
    // Optimistic: update assignee di list & detail
    if (idx >= 0) {
      tickets.value[idx] = {
        ...tickets.value[idx],
        assigned_to_user_id: targetUserId,
        assigned_to: null,
        assigned_to_nama:
          getAdminsForQueue(ticket.queue_id).find((a) => a.id === targetUserId)?.nama || '',
      }
    }
    if (selectedTicket.value?.id === ticket.id) {
      selectedTicket.value = {
        ...selectedTicket.value,
        assigned_to_user_id: targetUserId,
        assigned_to_nama:
          getAdminsForQueue(ticket.queue_id).find((a) => a.id === targetUserId)?.nama || '',
      }
    }
    await fetchTickets(true)
    scheduleStatsRefresh()
  } catch (err) {
    if (idx >= 0 && oldTicket) tickets.value[idx] = oldTicket
    toast(err.message || 'Gagal mengalihkan tiket.', 'error')
  } finally {
    isReassigning.value = false
  }
}

function openAdd() {
  modalMode.value = 'add'
  selectedTicket.value = null
  form.value = emptyForm()
  setSupportUnit('IT')
  activeFormTab.value = 'kendala'
  attachmentChanged.value = false
  ticketAttachmentError.value = ''
  modalError.value = ''
  showFormModal.value = true
}

function openEdit(ticket) {
  modalMode.value = 'edit'
  selectedTicket.value = { ...ticket, attachments: null }
  form.value = {
    judul: ticket.judul || '',
    deskripsi: ticket.deskripsi || '',
    kategori: ticket.kategori || 'Support',
    queue_id: ticket.queue_id || '',
    prioritas: ticket.prioritas || 'Medium',
    status_tiket: ticket.status_tiket || 'Open',
    assigned_to_user_id: ticket.assigned_to_user_id || null,
    attachments: [],
  }
  const queueCode = (ticket.queue_kode || '').toUpperCase()
  const queueName = (ticket.queue_nama || '').toUpperCase()
  if (queueCode.includes('HR') || queueName.includes('HR') || queueName.includes('HUMAN')) {
    selectedSupportUnit.value = 'HR'
  } else if (
    queueCode.includes('GA') ||
    queueName.includes('GA') ||
    queueName.includes('GENERAL')
  ) {
    selectedSupportUnit.value = 'GA'
  } else {
    selectedSupportUnit.value = 'IT'
  }
  activeFormTab.value = 'kendala'
  attachmentChanged.value = false
  ticketAttachmentError.value = ''
  modalError.value = ''
  showFormModal.value = true
  if (ticket.has_attachment) loadSelectedTicketAttachment(ticket.id, 'edit')
}

function openDetail(ticket) {
  selectedTicket.value = { ...ticket, attachments: null }
  activeDetailTab.value = 'detail'
  ticketAttachmentError.value = ''
  showDetailModal.value = true
  if (ticket.has_attachment) loadSelectedTicketAttachment(ticket.id, 'detail')
  fetchTicketHistory(ticket.id)
  fetchTicketComments(ticket.id)
  startChatPoll(ticket.id)
}

async function openTicketFromQuery() {
  const queryId = route.query.id || route.query.ticket_id
  const queryNomor = route.query.nomor_tiket || route.query.nomor
  if (!queryId && !queryNomor) return

  let target = tickets.value.find(
    (t) =>
      (queryId && String(t.id) === String(queryId)) ||
      (queryNomor && (t.nomor_tiket === queryNomor || t.nomor_tiket === `#${queryNomor}`)),
  )

  if (!target && queryId) {
    try {
      const fetched = await get(`/api/tickets/${queryId}`)
      if (fetched && fetched.id) {
        target = fetched
      }
    } catch {
      // ignore
    }
  }

  if (target) {
    openDetail(target)
    if (route.query.tab === 'comments' || route.query.action === 'comment') {
      activeDetailTab.value = 'comments'
      await nextTick()
      scrollChatToBottom()
    }
  }
}

watch(
  () => [route.query.id, route.query.ticket_id, route.query.nomor_tiket, route.query.tab],
  ([newId, newTicketId, newNomor]) => {
    if (newId || newTicketId || newNomor) {
      openTicketFromQuery()
    }
  },
)

async function loadSelectedTicketAttachment(ticketId, target) {
  const requestVersion = ++ticketAttachmentRequestVersion
  isTicketAttachmentLoading.value = true
  ticketAttachmentError.value = ''
  try {
    const result = await get(`/api/tickets/${ticketId}/attachment`)
    if (
      requestVersion !== ticketAttachmentRequestVersion ||
      selectedTicket.value?.id !== ticketId ||
      !Array.isArray(result?.attachments)
    ) {
      return
    }

    if (target === 'edit') {
      // Preload existing attachments into the form list unless the user has
      // already modified them.
      if (!attachmentChanged.value) {
        form.value.attachments = result.attachments.map((a) => ({
          name: a.name || null,
          data: a.attachment,
        }))
      }
    } else {
      selectedTicket.value = { ...selectedTicket.value, attachments: result.attachments }
    }
  } catch (err) {
    if (
      requestVersion === ticketAttachmentRequestVersion &&
      selectedTicket.value?.id === ticketId
    ) {
      ticketAttachmentError.value = err.message || 'Gagal memuat lampiran tiket.'
    }
  } finally {
    if (requestVersion === ticketAttachmentRequestVersion) {
      isTicketAttachmentLoading.value = false
    }
  }
}

function openDelete(ticket) {
  selectedTicket.value = ticket
  modalError.value = ''
  showDeleteModal.value = true
}

const isUpdatingStatus = ref(false)
const showStatusDropdown = ref(false)
const showReassignDropdown = ref(false)
const isReassigning = ref(false)

function toggleStatusDropdown() {
  showStatusDropdown.value = !showStatusDropdown.value
}

function toggleReassignDropdown() {
  showReassignDropdown.value = !showReassignDropdown.value
}

function selectStatus(ticket, status) {
  showStatusDropdown.value = false
  updateTicketStatus(ticket, status)
}

function closeModal() {
  showStatusDropdown.value = false
  showReassignDropdown.value = false
  ticketAttachmentRequestVersion += 1
  isTicketAttachmentLoading.value = false
  ticketAttachmentError.value = ''
  showFormModal.value = false
  showDeleteModal.value = false
  showDetailModal.value = false
  selectedTicket.value = null
  activeFormTab.value = 'kendala'
  modalError.value = ''
  stopChatPoll()
  document.body.style.overflow = ''
}

async function updateTicketStatus(ticket, newStatus) {
  if (!ticket || !newStatus || isUpdatingStatus.value) return
  const oldStatus = ticket.status_tiket
  if (oldStatus === newStatus) return

  isUpdatingStatus.value = true
  try {
    // 1. Optimistic Update local ticket in state
    const idx = tickets.value.findIndex((t) => t.id === ticket.id)
    if (idx >= 0) {
      tickets.value[idx] = { ...tickets.value[idx], status_tiket: newStatus }
    }
    if (selectedTicket.value?.id === ticket.id) {
      selectedTicket.value = { ...selectedTicket.value, status_tiket: newStatus }
    }

    // 2. Perform API Mutation
    await put(`/api/tickets/${ticket.id}`, { status_tiket: newStatus })

    toast(`Status tiket ${ticket.nomor_tiket || ''} berhasil diubah menjadi '${newStatus}'.`)

    // 3. Revalidate ticket list & stats counters without full page reload
    await fetchTickets(true)

    // 4. If status changed to Closed, close modal and cleanup state cleanly
    if (newStatus === 'Closed') {
      closeModal()
    } else {
      // Re-fetch detail history & comments
      if (selectedTicket.value?.id === ticket.id) {
        fetchTicketHistory(ticket.id)
        fetchTicketComments(ticket.id)
      }
    }
  } catch (err) {
    // Rollback on error
    const idx = tickets.value.findIndex((t) => t.id === ticket.id)
    if (idx >= 0) {
      tickets.value[idx] = { ...tickets.value[idx], status_tiket: oldStatus }
    }
    if (selectedTicket.value?.id === ticket.id) {
      selectedTicket.value = { ...selectedTicket.value, status_tiket: oldStatus }
    }
    toast(err.message || 'Gagal memperbarui status tiket.', 'error')
  } finally {
    isUpdatingStatus.value = false
  }
}

async function saveTicket() {
  if (!form.value.judul?.trim()) {
    modalError.value = 'Judul tiket wajib diisi.'
    return
  }
  if (!form.value.queue_id) {
    modalError.value = 'Unit tujuan wajib dipilih.'
    return
  }

  isSubmitting.value = true
  modalError.value = ''

  try {
    const payload = {
      judul: form.value.judul.trim(),
      deskripsi: form.value.deskripsi || '',
      kategori: form.value.kategori || 'Support',
      queue_id: Number(form.value.queue_id),
      prioritas: form.value.prioritas,
    }

    if (modalMode.value === 'add') {
      payload.attachments = form.value.attachments || []
      if (isAdmin.value || isSuperAdmin.value) {
        const reporterId = form.value.pelapor_user_id
        payload.pelapor_user_id =
          reporterId === '' || reporterId == null ? null : Number(reporterId)
      }
      await post('/api/tickets', payload)
      toast('Tiket baru berhasil dibuat.')
      // Refetch untuk mendapatkan tiket baru dengan nomor_tiket final
      await fetchTickets()
    } else {
      if (attachmentChanged.value) payload.attachments = form.value.attachments || []
      // Optimistic update untuk edit mode
      const ticketId = selectedTicket.value.id
      const idx = tickets.value.findIndex((t) => t.id === ticketId)
      const oldTicket = idx >= 0 ? { ...tickets.value[idx] } : null
      if (idx >= 0) {
        tickets.value[idx] = {
          ...tickets.value[idx],
          judul: payload.judul,
          deskripsi: payload.deskripsi,
          prioritas: payload.prioritas,
          status_tiket: form.value.status_tiket,
        }
      }
      try {
        await put(`/api/tickets/${ticketId}`, {
          ...payload,
          status_tiket: form.value.status_tiket,
        })
        toast('Tiket berhasil diperbarui.')
        scheduleStatsRefresh()
      } catch (err) {
        // Rollback
        if (idx >= 0 && oldTicket) tickets.value[idx] = oldTicket
        throw err
      }
    }
    closeModal()
  } catch (err) {
    modalError.value = err.message || 'Gagal menyimpan tiket.'
  } finally {
    isSubmitting.value = false
  }
}

async function confirmDeleteTicket() {
  if (!selectedTicket.value) return
  isSubmitting.value = true
  modalError.value = ''

  try {
    await del(`/api/tickets/${selectedTicket.value.id}`)
    toast('Tiket berhasil dihapus.')
    closeModal()
    await fetchTickets()
  } catch (err) {
    modalError.value = err.message || 'Gagal menghapus tiket.'
  } finally {
    isSubmitting.value = false
  }
}

function formatDateTime(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  const diffSec = Math.floor((nowTick.value - date.getTime()) / 1000)
  if (diffSec < 60) return 'Baru saja'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m lalu`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}j lalu`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}h lalu`
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

function getTicketActions(ticket) {
  const actions = [
    {
      label: 'Lihat Detail Tiket',
      icon: 'visibility',
      onClick: () => openDetail(ticket),
    },
  ]

  if (isAdmin.value || isSuperAdmin.value) {
    if (
      !ticket.assigned_to_user_id &&
      !['Closed', 'Resolved', 'Cancelled'].includes(ticket.status_tiket)
    ) {
      actions.push({
        label: 'Ambil Tiket Ini',
        icon: 'person_add',
        onClick: () => claimTicket(ticket),
      })
    }

    if (hasWritePermission('tickets')) {
      actions.push({
        label: 'Edit & Status Tiket',
        icon: 'edit',
        onClick: () => openEdit(ticket),
      })
    }
  }

  if (isSuperAdmin.value) {
    actions.push({
      label: 'Hapus Tiket',
      icon: 'delete',
      danger: true,
      onClick: () => openDelete(ticket),
    })
  }
  return actions
}

function getAssigneeName(val, fallback = 'Unassigned') {
  if (!val) return fallback
  if (typeof val === 'string') return val
  if (typeof val === 'object' && val !== null) {
    return val.nama || val.name || val.username || fallback
  }
  return String(val)
}

let toastTimer
function toast(message, type = 'success') {
  window.clearTimeout(toastTimer)
  notification.value = { message, type }
  toastTimer = window.setTimeout(() => {
    notification.value = null
  }, 3500)
}
</script>

<template>
  <div v-if="!isAuthenticated" class="max-w-2xl mx-auto py-12 px-4">
    <AuthGateCard
      title="Sign in required"
      description="Please sign in to access your support tickets and create a support request."
      button-text="Sign In to Access Tickets"
    />
  </div>
  <div
    v-else
    class="flex min-w-0 flex-col gap-5"
    :data-testid="!isLoading ? 'page-ready' : undefined"
  >
    <!-- Toast Notification -->
    <Transition name="slide-right">
      <div
        v-if="notification"
        class="fixed left-4 right-4 top-4 z-[60] flex items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-xl sm:left-auto sm:right-5 sm:max-w-md"
        :class="notification.type === 'error' ? 'bg-[#FA896B]' : 'bg-[#13DEB9]'"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[20px]">{{
          notification.type === 'error' ? 'error' : 'check_circle'
        }}</span>
        <span class="text-[13px] font-bold">{{ notification.message }}</span>
      </div>
    </Transition>

    <!-- ── 1. Page Header & Quick KPI Stat Cards ───────── -->
    <div class="flex flex-col gap-3.5">
      <!-- Title Bar -->
      <div
        class="flex flex-row items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#E2E8F0]/80 shadow-2xs"
      >
        <div class="min-w-0 flex items-center gap-3">
          <div
            class="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-[#EDF5FF] text-[#0A5DBD] border border-[#B8D4F5]/40"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[22px] sm:text-[24px]"
              >confirmation_number</span
            >
          </div>
          <div class="min-w-0">
            <h1 class="text-lg sm:text-xl font-bold text-[#333333] tracking-tight truncate">
              {{ isAdmin || isSuperAdmin ? 'Ticket Inbox' : 'Tiket' }}
            </h1>
            <p class="text-xs font-normal text-[#5F7089] mt-0.5 truncate">
              {{
                isAdmin || isSuperAdmin
                  ? 'Kelola pengajuan dan penanganan kendala IT'
                  : 'Pengajuan dan layanan IT'
              }}
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="openAdd"
          class="h-9 shrink-0 whitespace-nowrap rounded-xl bg-[#0A51B0] px-3.5 sm:px-4 text-xs font-bold text-white shadow-2xs hover:bg-[#0A4391] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          :title="isAdmin || isSuperAdmin ? 'Buat tiket baru' : 'Request ticket baru'"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[16px]">add</span>
          <span>{{ isAdmin || isSuperAdmin ? 'Buat Tiket' : 'Request Ticket' }}</span>
        </button>
      </div>

      <!-- Quick KPI Stat Cards (4 Cards) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <!-- 1. Total Tiket -->
        <div
          class="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E2E8F0]/80 shadow-2xs hover:border-[#CBD5E1] transition-all"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[20px]">inbox</span>
          </div>
          <div class="min-w-0">
            <span class="text-[11px] font-medium text-[#5F7089] block truncate">Total Tiket</span>
            <span class="text-base sm:text-lg font-bold text-[#333333] tabular-nums">{{
              stats.totalTickets ?? 0
            }}</span>
          </div>
        </div>

        <!-- 2. Belum Ditugaskan / Unassigned -->
        <div
          class="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E2E8F0]/80 shadow-2xs hover:border-[#CBD5E1] transition-all"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            :class="
              (stats.unassignedTickets || 0) > 0
                ? 'bg-amber-50 text-amber-600 border border-amber-200/60'
                : 'bg-slate-100 text-slate-500'
            "
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[20px]"
              >assignment_late</span
            >
          </div>
          <div class="min-w-0">
            <span class="text-[11px] font-medium text-[#5F7089] block truncate">{{
              isAdmin || isSuperAdmin ? 'Belum Diambil' : 'Menunggu Respon'
            }}</span>
            <span
              class="text-base sm:text-lg font-bold tabular-nums"
              :class="(stats.unassignedTickets || 0) > 0 ? 'text-amber-600' : 'text-[#333333]'"
              >{{ stats.unassignedTickets ?? 0 }}</span
            >
          </div>
        </div>

        <!-- 3. Sedang Diproses -->
        <div
          class="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E2E8F0]/80 shadow-2xs hover:border-[#CBD5E1] transition-all"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF5FF] text-[#333333] border border-[#B8D4F5]/40"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[20px]"
              >pending_actions</span
            >
          </div>
          <div class="min-w-0">
            <span class="text-[11px] font-medium text-[#5F7089] block truncate"
              >Sedang Diproses</span
            >
            <span class="text-base sm:text-lg font-bold text-[#333333] tabular-nums">{{
              (stats.openTickets || 0) + (stats.pendingTickets || 0)
            }}</span>
          </div>
        </div>

        <!-- 4. Selesai / Resolved -->
        <div
          class="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E2E8F0]/80 shadow-2xs hover:border-[#CBD5E1] transition-all"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[20px]">task_alt</span>
          </div>
          <div class="min-w-0">
            <span class="text-[11px] font-medium text-[#5F7089] block truncate">Tiket Selesai</span>
            <span class="text-base sm:text-lg font-bold text-emerald-600 tabular-nums">{{
              stats.closedTickets ?? 0
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 2. Integrated Control Bar & Workspace Navigation (sticky mengikuti scroll) ─ -->
    <div class="tck-toolbar-sticky">
      <div
        class="flex flex-col gap-3.5 bg-white p-4 sm:p-5 rounded-2xl border border-[#E2E8F0]/80 shadow-2xs"
      >
        <!-- Top Row: Queue Tabs Switcher -->
        <div class="border-b border-[#F1F5F9] pb-3.5">
          <div
            class="flex items-center gap-2 overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5 w-full"
          >
            <button
              v-for="tab in !isAdmin && !isSuperAdmin
                ? [
                    { key: 'all', label: 'Semua Request' },
                    { key: 'open', label: 'Sedang Diproses' },
                    { key: 'closed', label: 'Selesai' },
                  ]
                : [
                    { key: 'all', label: 'Inbox', count: stats.totalTickets },
                    { key: 'unassigned', label: 'Belum Diambil', count: stats.unassignedTickets },
                    { key: 'assigned', label: 'Ditangani Saya', count: stats.assignedTickets },
                    { key: 'closed', label: 'Selesai', count: stats.closedTickets },
                  ]"
              :key="tab.key"
              type="button"
              @click="switchTab(tab.key)"
              class="flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 active:scale-95"
              :class="
                activeTab === tab.key
                  ? 'bg-[#0A51B0] text-white shadow-2xs'
                  : 'text-[#5F7089] bg-slate-50 hover:bg-slate-100 hover:text-[#333333] border border-slate-200/60'
              "
            >
              <span>{{ tab.label }}</span>
              <span
                v-if="tab.count !== undefined"
                class="inline-flex h-4.5 min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                :class="
                  activeTab === tab.key
                    ? 'bg-white/20 text-white'
                    : tab.key === 'unassigned' && tab.count > 0
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-200 text-[#475569]'
                "
              >
                {{ tab.count }}
              </span>
            </button>
          </div>
        </div>

        <!-- Bottom Row: Toolbar (Search on Top Row, Filters on Bottom Row) -->
        <div class="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5">
          <!-- Baris Atas: Search Input with Inline Clear (X) -->
          <div class="relative h-9 min-w-0">
            <span
              aria-hidden="true"
              class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#687281] pointer-events-none"
              >search</span
            >
            <input
              v-model="searchQuery"
              type="search"
              aria-label="Cari tiket, judul, nomor, atau pelapor"
              placeholder="Cari tiket, judul kendala, nomor tiket, atau pelapor..."
              class="toolbar-search-input h-full min-h-0 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-10 pr-9 text-xs font-medium text-[#333333] placeholder-[#687281] focus:border-[#0A51B0] focus:bg-white focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all"
            />
            <button
              v-if="searchQuery"
              type="button"
              aria-label="Hapus pencarian"
              @click="searchQuery = ''"
              class="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-[#687281] hover:bg-slate-200/60 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <span aria-hidden="true" class="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>

          <button
            type="button"
            @click="showFilterModal = true"
            class="toolbar-filter-button h-9 shrink-0 rounded-lg border border-[#E2E8F0] bg-slate-50 px-3 text-xs font-semibold text-slate-600 hover:bg-white"
          >
            <span aria-hidden="true" class="material-symbols-outlined mr-1 align-middle text-[16px]"
              >filter_alt</span
            >Filter
          </button>
        </div>
      </div>
    </div>

    <!-- ── 3. List Heading & Counter (sticky mengikuti scroll) ── -->
    <div class="tck-heading-sticky flex items-center justify-between gap-3 px-1">
      <div class="flex items-center gap-2">
        <h2 class="text-[14px] font-bold text-[#333333]">Daftar Tiket Kendala</h2>
        <span
          class="inline-flex items-center justify-center rounded-md bg-[#EDF5FF] px-2 py-0.5 text-[11px] font-bold text-[#333333] tabular-nums"
        >
          {{ filteredTickets.length }}
        </span>
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <AppViewToggle v-model="viewMode" />
        <span class="hidden sm:inline text-xs font-normal text-[#5F7089] tabular-nums">
          Menampilkan
          {{ paginatedTickets.length ? (currentPage - 1) * itemsPerPage + 1 : 0 }}–{{
            Math.min(currentPage * itemsPerPage, filteredTickets.length)
          }}
          dari {{ filteredTickets.length }} tiket
        </span>
      </div>
    </div>

    <!-- ── 4. Ticket Inbox / Issue List Surface ───────────── -->
    <div
      class="flex flex-col gap-3"
      :class="{ 'tck-table-mode ws-table-mode ws-force-card-off': viewMode === 'table' }"
    >
      <!-- Loading Skeleton (Matches refined 5-column card row) -->
      <div v-if="isLoading" aria-busy="true" class="flex flex-col gap-2.5">
        <div
          v-for="r in 4"
          :key="'tck-skel-' + r"
          class="bg-white rounded-xl border border-[#E2E8F0] p-4 lg:px-5 lg:py-4 select-none shadow-2xs"
        >
          <!-- Desktop Skeleton (>= 1024px / lg) -->
          <div
            class="hidden lg:grid lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_36px] items-center gap-5 min-w-0"
          >
            <!-- 1. Identitas Skeleton -->
            <div class="flex items-center gap-3 min-w-0">
              <BaseSkeleton width="42px" height="42px" radius="md" class="shrink-0" />
              <div class="flex flex-col gap-1.5 min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <BaseSkeleton width="85px" height="15px" radius="md" />
                  <BaseSkeleton width="65px" height="15px" radius="md" />
                </div>
                <BaseSkeleton :width="r % 2 === 0 ? '60%' : '80%'" height="15px" radius="md" />
                <BaseSkeleton :width="r % 2 === 0 ? '80%' : '55%'" height="12px" radius="sm" />
              </div>
            </div>
            <!-- 2. Pelapor Skeleton -->
            <div class="flex flex-col gap-1 min-w-0">
              <BaseSkeleton width="45px" height="10px" radius="sm" />
              <BaseSkeleton width="100px" height="13px" radius="md" />
              <BaseSkeleton width="60px" height="10px" radius="sm" />
            </div>
            <!-- 3. Penanggung Jawab Skeleton -->
            <div class="flex flex-col gap-1 min-w-0">
              <BaseSkeleton width="85px" height="10px" radius="sm" />
              <BaseSkeleton width="110px" height="13px" radius="md" />
              <BaseSkeleton width="70px" height="10px" radius="sm" />
            </div>
            <!-- 4. Status & Prioritas Skeleton -->
            <div class="flex flex-col gap-1.5 min-w-0">
              <div class="flex items-center gap-2">
                <BaseSkeleton width="75px" height="20px" radius="full" />
                <BaseSkeleton width="60px" height="20px" radius="md" />
              </div>
              <BaseSkeleton width="85px" height="11px" radius="sm" />
            </div>
            <!-- 5. Action Skeleton -->
            <div class="flex justify-end">
              <BaseSkeleton width="24px" height="24px" radius="md" />
            </div>
          </div>

          <!-- Mobile Skeleton (< 1024px / lg:hidden) -->
          <div class="ticket-mobile flex xl:hidden flex-col gap-3 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <BaseSkeleton width="38px" height="38px" radius="md" />
                <BaseSkeleton width="80px" height="16px" radius="md" />
                <BaseSkeleton width="60px" height="16px" radius="md" />
              </div>
              <BaseSkeleton width="20px" height="20px" radius="md" />
            </div>
            <div class="flex flex-col gap-1">
              <BaseSkeleton width="90%" height="15px" radius="md" />
              <BaseSkeleton width="70%" height="12px" radius="sm" />
            </div>
            <div
              class="grid grid-cols-2 gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100"
            >
              <div class="flex flex-col gap-1">
                <BaseSkeleton width="40px" height="10px" radius="sm" />
                <BaseSkeleton width="80px" height="12px" radius="md" />
              </div>
              <div class="flex flex-col gap-1">
                <BaseSkeleton width="65px" height="10px" radius="sm" />
                <BaseSkeleton width="80px" height="12px" radius="md" />
              </div>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-slate-100">
              <BaseSkeleton width="80px" height="18px" radius="full" />
              <BaseSkeleton width="65px" height="12px" radius="sm" />
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="pageError"
        class="rounded-2xl bg-rose-50 p-5 text-[13px] font-semibold text-rose-600 border border-rose-200 shadow-2xs"
      >
        {{ pageError }}
      </div>

      <!-- Content Surface (Clean & Modern Card-Row Components) -->
      <div v-else class="ticket-card-list flex flex-col gap-2.5">
        <!-- Mode Tabel (tampil ≥ 1280px) -->
        <div
          v-if="viewMode === 'table' && filteredTickets.length > 0"
          class="ws-data-table-wrap hidden xl:block"
        >
          <table class="ws-data-table">
            <caption class="sr-only">
              Daftar tiket kendala
            </caption>
            <colgroup>
              <col class="w-[26%]" />
              <col class="w-[15%]" />
              <col class="w-[15%]" />
              <col class="w-[12%]" />
              <col class="w-[12%]" />
              <col class="w-[13%]" />
              <col class="w-[7%]" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Tiket</th>
                <th scope="col">Pelapor</th>
                <th scope="col">Penanggung Jawab</th>
                <th scope="col">Status</th>
                <th scope="col">Prioritas</th>
                <th scope="col">Diperbarui</th>
                <th scope="col"><span class="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="ticket in paginatedTickets"
                :key="ticket.id"
                tabindex="0"
                :aria-label="'Lihat tiket ' + ticket.judul"
                @click="openDetail(ticket)"
                @keydown.enter.self="openDetail(ticket)"
                @keydown.space.prevent.self="openDetail(ticket)"
              >
                <td>
                  <span class="ws-cell-main" :title="ticket.judul">{{ ticket.judul }}</span>
                  <span class="ws-cell-sub font-mono tracking-wider">
                    {{ ticket.nomor_tiket || `TCK-${ticket.id}` }} ·
                    {{
                      ticket.queue_nama ||
                      (ticket.queue_kode ? `${ticket.queue_kode} Support` : 'IT Support')
                    }}
                  </span>
                </td>
                <td>
                  <span class="ws-cell-main">{{
                    ticket.pelapor_nama || ticket.pelapor || '—'
                  }}</span>
                </td>
                <td>
                  <span v-if="ticket.assigned_to_nama || ticket.assigned_to" class="ws-cell-main">{{
                    getAssigneeName(ticket.assigned_to_nama || ticket.assigned_to)
                  }}</span>
                  <span v-else class="ws-cell-main" style="color: #b45309">Belum ditugaskan</span>
                </td>
                <td>
                  <span class="ws-cell-main">{{
                    getStatusDotInfo(ticket.status_tiket).label
                  }}</span>
                </td>
                <td>
                  <span class="ws-cell-main">{{ getPriorityInfo(ticket.prioritas).label }}</span>
                </td>
                <td>
                  <span class="ws-cell-main">{{
                    formatRelativeTime(ticket.diperbarui_pada || ticket.dibuat_pada)
                  }}</span>
                </td>
                <td @click.stop>
                  <AppRowActions :actions="getTicketActions(ticket)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- ── UNIFIED TICKET CARDS (5-Column SaaS Card-Row based on Design.md Section 12) ── -->
        <div
          v-for="ticket in paginatedTickets"
          :key="ticket.id"
          @click="openDetail(ticket)"
          tabindex="0"
          :aria-label="'Lihat tiket ' + ticket.judul"
          @keydown.enter.self="openDetail(ticket)"
          @keydown.space.prevent.self="openDetail(ticket)"
          class="tck-list-item group relative bg-white rounded-xl border border-[#E2E8F0] hover:border-[#B8D4F5] hover:shadow-[0_3px_12px_rgba(23,43,77,0.06)] p-4 lg:px-5 lg:py-4 transition-all duration-150 cursor-pointer select-none active:scale-[0.997]"
        >
          <!-- ── DESKTOP VIEW (>= 1024px / lg) ── -->
          <!-- 5-Column SaaS Grid: Identitas (2.3fr) | Pelapor (1.2fr) | Penanggung Jawab (1.2fr) | Status & Prioritas (1.3fr) | Aksi (36px) -->
          <div
            class="ticket-desktop hidden xl:grid xl:grid-cols-[minmax(0,2.3fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_36px] items-center gap-5 min-w-0"
          >
            <!-- 1. Identitas Tiket & Kendala -->
            <div class="ticket-identity flex items-center gap-3 min-w-0">
              <!-- Avatar Box 42x42 -->
              <div
                class="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[11px] bg-[#EDF5FF] text-[#0A5DBD] border border-[#B8D4F5]/30 transition-transform group-hover:scale-105"
                :class="getQueueTheme(ticket).badgeClass"
              >
                <span aria-hidden="true" class="material-symbols-outlined text-[22px]">{{
                  getQueueIcon(ticket)
                }}</span>
              </div>

              <!-- Main Identitas Text -->
              <div class="flex flex-col gap-1 min-w-0 flex-1">
                <!-- Badges / Tags Baris Atas -->
                <div class="ticket-tags flex items-center gap-1.5 flex-wrap min-w-0">
                  <span
                    class="font-mono text-[11px] font-bold text-[#333333] bg-[#EDF5FF] px-2 py-0.5 rounded border border-[#B8D4F5]/30 tracking-wider shrink-0"
                  >
                    {{ ticket.nomor_tiket || `TCK-${ticket.id}` }}
                  </span>
                  <span
                    class="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded border shrink-0"
                    :class="getQueueTheme(ticket).pillClass"
                  >
                    {{
                      ticket.queue_nama ||
                      (ticket.queue_kode ? `${ticket.queue_kode} Support` : 'IT Support')
                    }}
                  </span>
                  <span
                    class="inline-flex items-center gap-1 text-[11px] font-medium text-[#5F7089] bg-slate-100 px-2 py-0.5 rounded shrink-0"
                  >
                    <span
                      aria-hidden="true"
                      class="material-symbols-outlined text-[12px] text-slate-400"
                      >label</span
                    >
                    {{ ticket.kategori || 'Support' }}
                  </span>
                </div>

                <!-- Judul Kendala -->
                <h4
                  class="text-[14px] font-[650] text-[#333333] group-hover:text-[#0A4391] transition-colors leading-snug truncate"
                  :title="ticket.judul"
                >
                  {{ ticket.judul }}
                </h4>

                <!-- Deskripsi Singkat -->
                <p
                  v-if="ticket.deskripsi"
                  class="text-[12px] text-[#5F7089] truncate leading-normal"
                  :title="ticket.deskripsi"
                >
                  {{ ticket.deskripsi }}
                </p>
              </div>
            </div>

            <!-- 2. Pelapor (Sesuai Kolom Pengguna di Design.md Section 12) -->
            <div class="flex flex-col min-w-0 gap-0.5">
              <span class="text-[11px] font-medium text-[#667283] block leading-none mb-0.5">
                Pelapor
              </span>
              <strong
                class="text-[12px] font-[550] text-[#334155] truncate block"
                :title="ticket.pelapor_nama || ticket.pelapor || 'User'"
              >
                {{ ticket.pelapor_nama || ticket.pelapor || '—' }}
              </strong>
              <span
                class="text-[11px] text-[#667283] truncate block"
                :title="
                  [ticket.pelapor_jabatan, ticket.pelapor_nik ? 'NIK ' + ticket.pelapor_nik : '']
                    .filter(Boolean)
                    .join(' · ')
                "
              >
                {{
                  [ticket.pelapor_jabatan, ticket.pelapor_nik ? 'NIK ' + ticket.pelapor_nik : '']
                    .filter(Boolean)
                    .join(' · ') || 'Internal User'
                }}
              </span>
            </div>

            <!-- 3. Penanggung Jawab / PIC -->
            <div class="flex flex-col min-w-0 gap-0.5">
              <span class="text-[11px] font-medium text-[#667283] block leading-none mb-0.5">
                Penanggung Jawab
              </span>
              <div
                v-if="ticket.assigned_to_nama || ticket.assigned_to"
                class="flex flex-col min-w-0"
              >
                <strong
                  class="text-[12px] font-[550] text-[#334155] truncate block"
                  :title="getAssigneeName(ticket.assigned_to_nama || ticket.assigned_to)"
                >
                  {{ getAssigneeName(ticket.assigned_to_nama || ticket.assigned_to) }}
                </strong>
                <span class="text-[11px] text-[#667283] truncate block">
                  {{ ticket.queue_kode ? `${ticket.queue_kode} Specialist` : 'Assigned Agent' }}
                </span>
              </div>
              <div v-else>
                <span
                  class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/80"
                  title="Belum ada teknisi yang menangani"
                >
                  <span
                    aria-hidden="true"
                    class="material-symbols-outlined text-[12px] text-amber-500"
                    >assignment_late</span
                  >
                  <span>Belum Ditugaskan</span>
                </span>
              </div>
            </div>

            <!-- 4. Status & Prioritas (Sesuai Kolom Status & Kondisi di Design.md Section 12) -->
            <div class="flex flex-col min-w-0 gap-1.5">
              <div class="flex items-center gap-1.5 flex-wrap">
                <!-- Status Pill -->
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all"
                  :class="getStatusDotInfo(ticket.status_tiket).badgeClass"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full shrink-0"
                    :class="getStatusDotInfo(ticket.status_tiket).dotClass"
                  ></span>
                  <span>{{ getStatusDotInfo(ticket.status_tiket).label }}</span>
                </span>

                <!-- Priority Badge -->
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border"
                  :class="getPriorityInfo(ticket.prioritas).class"
                  title="Prioritas"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[12px]">{{
                    getPriorityInfo(ticket.prioritas).icon
                  }}</span>
                  <span>{{ getPriorityInfo(ticket.prioritas).label }}</span>
                </span>
              </div>

              <!-- Time, Comments & Attachments -->
              <div class="flex items-center gap-2.5 text-[11px] text-[#667283] font-normal">
                <span class="flex items-center gap-1" title="Waktu pembaruan">
                  <span aria-hidden="true" class="material-symbols-outlined text-[12px]"
                    >schedule</span
                  >
                  <span>{{
                    formatRelativeTime(ticket.diperbarui_pada || ticket.dibuat_pada)
                  }}</span>
                </span>
                <span
                  v-if="ticket.total_komentar > 0"
                  class="flex items-center gap-1 text-[#0A5DBD] font-medium"
                  title="Komentar"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[12px]"
                    >chat_bubble_outline</span
                  >
                  <span>{{ ticket.total_komentar }}</span>
                </span>
                <span
                  v-if="ticket.has_attachment"
                  class="flex items-center gap-0.5 text-slate-400"
                  title="Lampiran"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[12px]"
                    >attach_file</span
                  >
                </span>
              </div>
            </div>

            <!-- 5. Tombol Opsi / Aksi (36px) -->
            <div class="flex justify-end items-center" @click.stop>
              <AppRowActions :actions="getTicketActions(ticket)" />
            </div>
          </div>

          <!-- ── MOBILE / TABLET VIEW (< 1024px / lg:hidden) ── -->
          <!-- Sesuai Design.md Section 12B: Grid multi-baris rapi -->
          <div class="flex lg:hidden flex-col gap-3 min-w-0">
            <!-- Baris 1: Avatar + Nomor Monospace + Queue Pill + Tombol Aksi di Kanan Atas -->
            <div class="flex items-center justify-between gap-2 min-w-0">
              <div class="flex items-center gap-2 min-w-0">
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EDF5FF] text-[#0A5DBD] border border-[#B8D4F5]/30"
                  :class="getQueueTheme(ticket).badgeClass"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[18px]">{{
                    getQueueIcon(ticket)
                  }}</span>
                </div>
                <span
                  class="font-mono text-[11px] font-bold text-[#333333] bg-[#EDF5FF] px-2 py-0.5 rounded border border-[#B8D4F5]/30 truncate"
                >
                  {{ ticket.nomor_tiket || `TCK-${ticket.id}` }}
                </span>
                <span
                  class="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded border truncate"
                  :class="getQueueTheme(ticket).pillClass"
                >
                  {{ ticket.queue_kode || ticket.queue_nama || 'IT' }}
                </span>
              </div>

              <!-- Tombol Aksi di Kanan Atas -->
              <div @click.stop class="shrink-0">
                <AppRowActions :actions="getTicketActions(ticket)" />
              </div>
            </div>

            <!-- Baris 2: Judul Kendala & Deskripsi Singkat -->
            <div class="flex flex-col gap-0.5 min-w-0">
              <h4
                class="text-[14px] font-[650] text-[#333333] group-hover:text-[#0A4391] transition-colors leading-snug line-clamp-2"
              >
                {{ ticket.judul }}
              </h4>
              <p
                v-if="ticket.deskripsi"
                class="text-[12px] text-[#5F7089] line-clamp-2 leading-relaxed"
              >
                {{ ticket.deskripsi }}
              </p>
            </div>

            <!-- Baris 3: Kolom Pemegang (Pelapor) & Penanggung Jawab Berdampingan Proporsional (Grid 2 Kolom) -->
            <div
              class="grid grid-cols-2 gap-3 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E5EAEF] text-xs"
            >
              <!-- Kolom Kiri: Pelapor -->
              <div class="flex flex-col min-w-0 gap-0.5">
                <span class="text-[10px] font-bold uppercase text-[#667283] tracking-wider"
                  >Pelapor</span
                >
                <strong
                  class="text-[12px] font-semibold text-[#333333] truncate block"
                  :title="ticket.pelapor_nama || ticket.pelapor || 'User'"
                >
                  {{ ticket.pelapor_nama || ticket.pelapor || '—' }}
                </strong>
                <span class="text-[11px] text-[#667283] truncate block">
                  {{
                    ticket.pelapor_jabatan ||
                    (ticket.pelapor_nik ? 'NIK ' + ticket.pelapor_nik : 'Internal User')
                  }}
                </span>
              </div>

              <!-- Kolom Kanan: Penanggung Jawab -->
              <div class="flex flex-col min-w-0 gap-0.5">
                <span class="text-[10px] font-bold uppercase text-[#667283] tracking-wider"
                  >Penanggung Jawab</span
                >
                <div v-if="ticket.assigned_to_nama || ticket.assigned_to" class="min-w-0">
                  <strong class="text-[12px] font-semibold text-[#334155] truncate block">
                    {{ getAssigneeName(ticket.assigned_to_nama || ticket.assigned_to) }}
                  </strong>
                  <span class="text-[11px] text-[#667283] truncate block">
                    {{ ticket.queue_kode ? `${ticket.queue_kode} Support` : 'Petugas' }}
                  </span>
                </div>
                <div v-else>
                  <span
                    class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700"
                  >
                    <span
                      aria-hidden="true"
                      class="material-symbols-outlined text-[12px] text-amber-500"
                      >assignment_late</span
                    >
                    <span>Belum Ditugaskan</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Baris 4: Garis Pemisah Tipis + Status Pill & Prioritas di Kiri, Waktu & Komentar di Kanan -->
            <div
              class="flex items-center justify-between gap-2 pt-2 border-t border-[#EDF1F6] text-[11px]"
            >
              <div class="flex items-center gap-1.5 flex-wrap">
                <!-- Status -->
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all"
                  :class="getStatusDotInfo(ticket.status_tiket).badgeClass"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full shrink-0"
                    :class="getStatusDotInfo(ticket.status_tiket).dotClass"
                  ></span>
                  <span>{{ getStatusDotInfo(ticket.status_tiket).label }}</span>
                </span>

                <!-- Priority -->
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                  :class="getPriorityInfo(ticket.prioritas).class"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[11px]">{{
                    getPriorityInfo(ticket.prioritas).icon
                  }}</span>
                  <span>{{ getPriorityInfo(ticket.prioritas).label }}</span>
                </span>
              </div>

              <!-- Secondary Meta: Time, Comments, Attachments -->
              <div class="flex items-center gap-2 text-[#667283] font-normal">
                <span class="flex items-center gap-1">
                  <span aria-hidden="true" class="material-symbols-outlined text-[12px]"
                    >schedule</span
                  >
                  <span>{{
                    formatRelativeTime(ticket.diperbarui_pada || ticket.dibuat_pada)
                  }}</span>
                </span>
                <span
                  v-if="ticket.total_komentar > 0"
                  class="flex items-center gap-1 text-[#0A5DBD] font-medium"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[12px]"
                    >chat_bubble_outline</span
                  >
                  <span>{{ ticket.total_komentar }}</span>
                </span>
                <span v-if="ticket.has_attachment" class="flex items-center gap-0.5 text-slate-400">
                  <span aria-hidden="true" class="material-symbols-outlined text-[12px]"
                    >attach_file</span
                  >
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── EMPTY STATES ── -->
        <div
          v-if="filteredTickets.length === 0"
          class="py-16 px-4 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs"
        >
          <div class="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
            <div
              class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3.5"
            >
              <span aria-hidden="true" class="material-symbols-outlined text-[28px]">inbox</span>
            </div>

            <!-- Empty state title -->
            <h3 class="text-base font-bold text-[#333333]">
              {{
                searchQuery || filterStatus || filterPrioritas || filterQueue || filterKategori
                  ? 'Tidak ada tiket yang cocok'
                  : !isAdmin && !isSuperAdmin
                    ? 'Belum ada request tiket'
                    : activeTab === 'all'
                      ? 'Inbox tiket kosong'
                      : 'Tidak ada tiket pada kategori ini'
              }}
            </h3>

            <!-- Empty state description -->
            <p class="mt-1 text-xs text-[#5F7089] max-w-xs leading-relaxed">
              {{
                searchQuery || filterStatus || filterPrioritas || filterQueue || filterKategori
                  ? 'Coba ubah kata kunci pencarian atau sesuaikan filter Anda.'
                  : !isAdmin && !isSuperAdmin
                    ? 'Pengajuan kendala atau bantuan IT Anda akan muncul di sini.'
                    : activeTab === 'all'
                      ? 'Tidak ada tiket yang menunggu penanganan saat ini.'
                      : 'Belum ada tiket pada tab yang dipilih.'
              }}
            </p>

            <button
              v-if="
                !searchQuery && !filterStatus && !filterPrioritas && !filterQueue && !filterKategori
              "
              type="button"
              @click="openAdd"
              class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0A51B0] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#0A4391] transition-all cursor-pointer active:scale-95"
            >
              <span aria-hidden="true" class="material-symbols-outlined text-[16px]">add</span>
              <span>{{
                !isAdmin && !isSuperAdmin ? 'Request Tiket Pertama' : 'Buat Tiket Baru'
              }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <AppPagination
        v-if="!isLoading && !pageError"
        v-model:currentPage="currentPage"
        :total-items="filteredTickets.length"
        :items-per-page="itemsPerPage"
        asset-style
        mobile-compact
      />
    </div>

    <FilterModal
      :is-open="showFilterModal"
      title="Filter Tiket"
      @close="showFilterModal = false"
      @apply="showFilterModal = false"
      @reset="resetFilters"
    >
      <CustomSelect
        v-model="filterStatus"
        :options="[{ value: '', label: 'Semua Status' }, ...TICKET_STATUS_OPTIONS]"
        aria-label="Filter status"
        :block="true"
      />
      <CustomSelect
        v-model="filterPrioritas"
        :options="[{ value: '', label: 'Semua Prioritas' }, ...TICKET_PRIORITY_OPTIONS]"
        aria-label="Filter prioritas"
        :block="true"
      />
      <CustomSelect
        v-model="filterQueue"
        :options="[
          { value: '', label: 'Semua Unit' },
          ...queues.map((q) => ({ value: q.id, label: `${q.kode} — ${q.nama}` })),
        ]"
        aria-label="Filter unit"
        :block="true"
      />
      <select
        v-model="filterKategori"
        class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"
      >
        <option value="">Semua Kategori</option>
        <option value="Incident">Incident</option>
        <option value="Request">Request</option>
        <option value="QNA">QNA</option>
      </select>
    </FilterModal>

    <!-- ── Create / Edit Ticket Modal (Unified Single Page Form) ─────── -->
    <AppModal
      :is-open="showFormModal"
      :title="
        modalMode === 'add'
          ? isAdmin || isSuperAdmin
            ? 'Buat Tiket Baru'
            : 'Request Ticket Baru'
          : 'Edit Tiket Kendala'
      "
      :subtitle="
        modalMode === 'add'
          ? isAdmin || isSuperAdmin
            ? 'Isi rincian kendala, unit support, dan lampiran di bawah ini'
            : 'Isi pengajuan permintaan bantuan IT kepada tim support'
          : 'Perbarui rincian kendala atau status tiket'
      "
      icon="confirmation_number"
      size="lg"
      @close="closeModal"
    >
      <form
        id="ticket-create-form"
        class="ticket-entry-form flex flex-col space-y-5"
        @submit.prevent="saveTicket"
      >
        <!-- Error Banner -->
        <div
          v-if="modalError"
          role="alert"
          class="rounded-lg bg-rose-50 border border-rose-200 px-3.5 py-2 text-[12px] font-semibold text-rose-600 shadow-2xs flex items-center gap-2"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[16px] shrink-0"
            >error</span
          >
          <span>{{ modalError }}</span>
        </div>

        <!-- Ticket field groups -->
        <div class="ticket-entry-fields space-y-4">
          <h3 class="ticket-entry-heading">Rincian kendala</h3>
          <!-- Pelapor (hanya untuk admin/superadmin saat buat tiket baru) -->
          <label
            v-if="modalMode === 'add' && (isAdmin || isSuperAdmin)"
            class="flex flex-col gap-1.5"
          >
            <span class="text-[12px] font-semibold text-[#2A3547]">Pelapor</span>
            <SearchableSelect
              v-model="form.pelapor_user_id"
              :options="reporters"
              value-key="id"
              label-key="nama"
              placeholder="Diri sendiri (Kosongkan)"
              search-placeholder="Cari nama user..."
              clearable
              aria-label="Pilih pelapor tiket"
              class="w-full"
            />
            <span class="text-[11px] text-[#66728d]"
              >Kosongkan untuk membuat tiket atas nama sendiri ({{ user?.nama || 'Anda' }}), atau
              pilih user lain.</span
            >
          </label>

          <!-- Judul Kendala -->
          <label class="flex flex-col gap-1.5">
            <span class="text-[12px] font-semibold text-[#2A3547]"
              >Judul Kendala <span class="text-[#FA896B]">*</span></span
            >
            <input
              v-model="form.judul"
              type="text"
              required
              maxlength="150"
              aria-label="Judul Tiket"
              placeholder="Contoh: Laptop tidak dapat terhubung ke Wi-Fi"
              class="h-10 w-full rounded-lg border border-[#E5EAEF] bg-white px-3 text-[12px] font-medium text-[#2A3547] placeholder-[#687281] focus:border-[#0A51B0] focus:outline-none transition-all shadow-2xs"
            />
          </label>

          <!-- Deskripsi -->
          <label class="flex flex-col gap-1.5">
            <span class="text-[12px] font-semibold text-[#2A3547]">Deskripsi Kendala</span>
            <textarea
              v-model="form.deskripsi"
              rows="3"
              aria-label="Deskripsi Kendala Tiket"
              placeholder="Jelaskan kendala secara singkat dan detail agar tim dapat membantu..."
              class="min-h-[80px] max-h-[140px] w-full rounded-lg border border-[#E5EAEF] bg-white p-2.5 text-[12px] font-medium text-[#2A3547] placeholder-[#687281] focus:border-[#0A51B0] focus:outline-none transition-all resize-y shadow-2xs"
            ></textarea>
          </label>

          <h3 class="ticket-entry-heading">Penanganan tiket</h3>
          <!-- Unit Support Target -->
          <div class="flex flex-col gap-1.5">
            <span class="text-[12px] font-semibold text-[#2A3547]"
              >Unit Support Target <span class="text-[#FA896B]">*</span></span
            >
            <div class="grid grid-cols-3 gap-2 sm:gap-3">
              <button
                type="button"
                @click="setSupportUnit('IT')"
                :aria-pressed="selectedSupportUnit === 'IT'"
                class="flex h-[72px] sm:h-[60px] flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-3 rounded-xl border p-2 sm:p-3 text-center sm:text-left transition-all cursor-pointer select-none active:scale-95"
                :class="
                  selectedSupportUnit === 'IT'
                    ? 'border-[#0A51B0] bg-[#ECF2FF] text-[#333333] ring-2 ring-[#0A51B0]/20 shadow-xs'
                    : 'border-[#E5EAEF] bg-white text-[#2A3547] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]'
                "
              >
                <div
                  class="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg"
                  :class="
                    selectedSupportUnit === 'IT'
                      ? 'bg-[#0A51B0] text-white'
                      : 'bg-[#F1F5F9] text-[#66728d]'
                  "
                >
                  <span
                    aria-hidden="true"
                    class="material-symbols-outlined text-[16px] sm:text-[18px]"
                    >computer</span
                  >
                </div>
                <div class="min-w-0">
                  <p class="text-[11px] sm:text-[13px] font-bold leading-tight truncate">
                    IT Support
                  </p>
                  <p class="hidden sm:block text-[11px] text-[#66728d] leading-tight mt-0.5">
                    Perangkat & Network
                  </p>
                </div>
              </button>

              <button
                type="button"
                @click="setSupportUnit('HR')"
                :aria-pressed="selectedSupportUnit === 'HR'"
                class="flex h-[72px] sm:h-[60px] flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-3 rounded-xl border p-2 sm:p-3 text-center sm:text-left transition-all cursor-pointer select-none active:scale-95"
                :class="
                  selectedSupportUnit === 'HR'
                    ? 'border-[#0A51B0] bg-[#ECF2FF] text-[#333333] ring-2 ring-[#0A51B0]/20 shadow-xs'
                    : 'border-[#E5EAEF] bg-white text-[#2A3547] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]'
                "
              >
                <div
                  class="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg"
                  :class="
                    selectedSupportUnit === 'HR'
                      ? 'bg-[#0A51B0] text-white'
                      : 'bg-[#F1F5F9] text-[#66728d]'
                  "
                >
                  <span
                    aria-hidden="true"
                    class="material-symbols-outlined text-[16px] sm:text-[18px]"
                    >badge</span
                  >
                </div>
                <div class="min-w-0">
                  <p class="text-[11px] sm:text-[13px] font-bold leading-tight truncate">
                    HR Support
                  </p>
                  <p class="hidden sm:block text-[11px] text-[#66728d] leading-tight mt-0.5">
                    Kepegawaian & Dokumen
                  </p>
                </div>
              </button>

              <button
                type="button"
                @click="setSupportUnit('GA')"
                :aria-pressed="selectedSupportUnit === 'GA'"
                class="flex h-[72px] sm:h-[60px] flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-3 rounded-xl border p-2 sm:p-3 text-center sm:text-left transition-all cursor-pointer select-none active:scale-95"
                :class="
                  selectedSupportUnit === 'GA'
                    ? 'border-[#0A51B0] bg-[#ECF2FF] text-[#333333] ring-2 ring-[#0A51B0]/20 shadow-xs'
                    : 'border-[#E5EAEF] bg-white text-[#2A3547] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]'
                "
              >
                <div
                  class="flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg"
                  :class="
                    selectedSupportUnit === 'GA'
                      ? 'bg-[#0A51B0] text-white'
                      : 'bg-[#F1F5F9] text-[#66728d]'
                  "
                >
                  <span
                    aria-hidden="true"
                    class="material-symbols-outlined text-[16px] sm:text-[18px]"
                    >corporate_fare</span
                  >
                </div>
                <div class="min-w-0">
                  <p class="text-[11px] sm:text-[13px] font-bold leading-tight truncate">
                    GA Support
                  </p>
                  <p class="hidden sm:block text-[11px] text-[#66728d] leading-tight mt-0.5">
                    Fasilitas & Gedung
                  </p>
                </div>
              </button>
            </div>
          </div>

          <!-- Kategori Tiket -->
          <div class="flex flex-col gap-1.5">
            <span class="text-[12px] font-semibold text-[#2A3547]"
              >Kategori Tiket {{ selectedSupportUnit }} <span class="text-[#FA896B]">*</span></span
            >
            <div class="grid grid-cols-3 gap-2 sm:gap-2.5">
              <button
                v-for="cat in availableCategories"
                :key="cat.value"
                type="button"
                @click="form.kategori = cat.value"
                :aria-pressed="form.kategori === cat.value"
                class="flex h-[56px] sm:h-[68px] flex-col items-center sm:items-start justify-center sm:justify-between rounded-xl border p-2 sm:p-2.5 text-center sm:text-left transition-all cursor-pointer select-none active:scale-95"
                :class="
                  form.kategori === cat.value
                    ? 'border-[#0A51B0] bg-[#ECF2FF] text-[#333333] ring-2 ring-[#0A51B0]/20 shadow-xs'
                    : 'border-[#E5EAEF] bg-white text-[#2A3547] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]'
                "
              >
                <div class="flex items-center justify-center sm:justify-between w-full">
                  <span class="text-[12px] sm:text-[12px] font-bold truncate">{{ cat.title }}</span>
                  <span
                    v-if="form.kategori === cat.value"
                    aria-hidden="true"
                    class="hidden sm:inline material-symbols-outlined text-[15px] text-[#333333]"
                    >check_circle</span
                  >
                </div>
                <span class="hidden sm:block text-[10px] text-[#66728d] leading-tight truncate">{{
                  cat.desc
                }}</span>
              </button>
            </div>
          </div>

          <!-- Prioritas & Status -->
          <div
            class="grid gap-3"
            :class="modalMode === 'edit' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'"
          >
            <!-- Prioritas -->
            <div class="flex flex-col gap-1.5 w-full">
              <span class="text-[12px] font-semibold text-[#2A3547]">Prioritas</span>
              <CustomSelect
                v-model="form.prioritas"
                :options="TICKET_PRIORITY_OPTIONS"
                aria-label="Prioritas"
                placeholder="Pilih prioritas"
                :block="true"
                height-class="h-10"
              />
            </div>

            <!-- Status Tiket (Edit Mode Only) -->
            <div v-if="modalMode === 'edit'" class="flex flex-col gap-1.5 w-full">
              <span class="text-[12px] font-semibold text-[#2A3547]">Status Tiket</span>
              <CustomSelect
                v-model="form.status_tiket"
                :options="TICKET_STATUS_OPTIONS"
                aria-label="Status Tiket"
                placeholder="Pilih status"
                :block="true"
                height-class="h-10"
              />
            </div>
          </div>

          <!-- Lampiran -->
          <div class="flex flex-col gap-1.5">
            <span class="text-[12px] font-semibold text-[#2A3547]">Lampiran (Opsional)</span>
            <div class="flex items-center gap-3 flex-wrap">
              <label
                class="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E5EAEF] bg-white px-3.5 text-[12px] font-bold text-[#2A3547] hover:bg-[#F8FAFC] hover:border-[#0A51B0] transition-all cursor-pointer select-none shadow-2xs"
              >
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[18px] text-[#333333]"
                  >attach_file</span
                >
                <span>Pilih File Lampiran</span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  class="hidden"
                  @change="handleFileChange"
                />
              </label>
              <span class="text-[11px] font-normal text-[#66728d]"
                >PNG, JPG, GIF, WEBP, PDF, Word, Excel, PowerPoint hingga 5 MB per file</span
              >
              <span
                v-if="isTicketAttachmentLoading"
                class="text-[11px] font-medium text-[#333333] flex items-center gap-1"
              >
                <span aria-hidden="true" class="material-symbols-outlined text-[14px] animate-spin"
                  >progress_activity</span
                >
                Memuat...
              </span>
            </div>

            <p v-if="ticketAttachmentError" class="text-[11px] font-medium text-rose-600">
              {{ ticketAttachmentError }}
            </p>

            <!-- Attachment List -->
            <ul v-if="form.attachments.length" class="space-y-2">
              <li
                v-for="(att, i) in form.attachments"
                :key="i"
                class="relative mt-2 flex items-center justify-between gap-3 rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] p-3"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ECF2FF] text-[#333333]"
                  >
                    <span aria-hidden="true" class="material-symbols-outlined text-[20px]">{{
                      getAttachmentIcon(att.data, att.name)
                    }}</span>
                  </div>
                  <div class="min-w-0">
                    <p class="text-[12px] font-bold text-[#2A3547] truncate">
                      {{ att.name || 'Lampiran' }}
                    </p>
                    <p class="text-[11px] text-[#66728d] truncate mt-0.5">
                      Siap diunggah bersama tiket
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  @click="removeAttachment(i)"
                  class="flex h-7 w-7 items-center justify-center rounded-lg text-[#66728d] hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
                  title="Hapus Lampiran"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[18px]"
                    >close</span
                  >
                </button>
              </li>
            </ul>
          </div>
        </div>
      </form>
      <template #footer>
        <!-- Footer Action Bar -->
        <div class="ticket-entry-footer">
          <button
            type="button"
            :disabled="isSubmitting"
            @click="closeModal"
            class="h-9 rounded-lg border border-[#E5EAEF] px-3.5 text-[12px] font-bold text-[#66728d] hover:bg-[#F8FAFC] hover:text-[#2A3547] transition-all cursor-pointer"
          >
            Batal
          </button>

          <button
            type="submit"
            form="ticket-create-form"
            :disabled="isSubmitting"
            class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0A51B0] px-4 text-[12px] font-bold text-white hover:bg-[#4A73E0] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span
              aria-hidden="true"
              v-if="isSubmitting"
              class="material-symbols-outlined text-[14px] animate-spin"
              >progress_activity</span
            >
            <span>{{
              isSubmitting
                ? 'Menyimpan...'
                : modalMode === 'add'
                  ? isAdmin || isSuperAdmin
                    ? 'Buat Tiket'
                    : 'Submit Request'
                  : 'Simpan Perubahan'
            }}</span>
          </button>
        </div>
      </template>
    </AppModal>

    <!-- ── Detail Ticket Modal (Modern SaaS Ticket Workspace) ─ -->
    <AppModal
      :is-open="showDetailModal"
      :title="selectedTicket?.nomor_tiket || 'Detail Tiket'"
      :subtitle="
        selectedTicket?.queue_nama ||
        (selectedTicket?.queue_kode ? `${selectedTicket.queue_kode} Support` : 'Support Ticket')
      "
      icon="confirmation_number"
      size="xl"
      @close="closeModal"
    >
      <div v-if="selectedTicket" class="flex min-w-0 flex-col text-[#333333] wrap-anywhere">
        <!-- HEADER AREA (Compact SaaS Title Block) -->
        <div
          class="flex items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 mb-4"
        >
          <div class="flex flex-col gap-2.5 min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="font-mono text-[12px] font-medium text-[#5F7089] bg-[#F1F5F9] px-2 py-0.5 rounded-md"
              >
                {{ selectedTicket.nomor_tiket }}
              </span>
              <span class="text-xs text-[#CBD5E1]">·</span>
              <div class="flex flex-wrap items-center gap-1.5">
                <span
                  class="h-1.5 w-1.5 rounded-full shrink-0"
                  :class="getStatusDotInfo(selectedTicket.status_tiket).dotClass"
                ></span>
                <span
                  class="text-xs font-semibold"
                  :class="getStatusDotInfo(selectedTicket.status_tiket).textClass"
                >
                  {{ getStatusDotInfo(selectedTicket.status_tiket).label }}
                </span>
              </div>
            </div>
            <h2
              class="text-base sm:text-[17px] font-bold text-[#333333] leading-relaxed wrap-anywhere"
            >
              {{ selectedTicket.judul }}
            </h2>
          </div>
        </div>

        <!-- NAVIGATION TABS (Clean Segmented Bar with Hover Effects) -->
        <div class="grid grid-cols-3 gap-1 rounded-xl bg-[#F1F5F9] p-1 mb-5">
          <button
            type="button"
            @click="activeDetailTab = 'detail'"
            class="group flex min-w-0 flex-wrap items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[#0A51B0]"
            :class="
              activeDetailTab === 'detail'
                ? 'bg-white text-[#333333] shadow-xs'
                : 'text-[#5F7089] hover:bg-white/70 hover:text-[#333333]'
            "
          >
            <span
              aria-hidden="true"
              class="material-symbols-outlined text-[15px] transition-colors duration-200"
              :class="
                activeDetailTab === 'detail'
                  ? 'text-[#333333]'
                  : 'text-[#5F7089] group-hover:text-[#333333]'
              "
              >info</span
            >
            <span>Ringkasan</span>
          </button>

          <button
            type="button"
            @click="activeDetailTab = 'history'"
            class="group flex min-w-0 flex-wrap items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[#0A51B0]"
            :class="
              activeDetailTab === 'history'
                ? 'bg-white text-[#333333] shadow-xs'
                : 'text-[#5F7089] hover:bg-white/70 hover:text-[#333333]'
            "
          >
            <span
              aria-hidden="true"
              class="material-symbols-outlined text-[15px] transition-colors duration-200"
              :class="
                activeDetailTab === 'history'
                  ? 'text-[#333333]'
                  : 'text-[#5F7089] group-hover:text-[#333333]'
              "
              >history</span
            >
            <span>Aktivitas</span>
            <span
              class="ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              :class="
                activeDetailTab === 'history'
                  ? 'bg-[#EDF5FF] text-[#333333]'
                  : 'bg-[#E2E8F0]/70 text-[#475569]'
              "
            >
              {{ ticketHistory.length }}
            </span>
          </button>

          <button
            type="button"
            @click="openCommentsTab"
            class="group flex min-w-0 flex-wrap items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-[#0A51B0]"
            :class="
              activeDetailTab === 'comments'
                ? 'bg-white text-[#333333] shadow-xs'
                : 'text-[#5F7089] hover:bg-white/70 hover:text-[#333333]'
            "
          >
            <span
              aria-hidden="true"
              class="material-symbols-outlined text-[15px] transition-colors duration-200"
              :class="
                activeDetailTab === 'comments'
                  ? 'text-[#333333]'
                  : 'text-[#5F7089] group-hover:text-[#333333]'
              "
              >forum</span
            >
            <span>Diskusi</span>
            <span
              class="ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              :class="
                activeDetailTab === 'comments'
                  ? 'bg-[#EDF5FF] text-[#333333]'
                  : 'bg-[#E2E8F0]/70 text-[#475569]'
              "
            >
              {{ ticketComments.length }}
            </span>
          </button>
        </div>

        <!-- MAIN SCROLL CONTENT AREA -->
        <div class="space-y-4">
          <!-- TAB 1: OVERVIEW -->
          <div v-if="activeDetailTab === 'detail'" class="space-y-4">
            <!-- Deskripsi Kendala -->
            <div class="space-y-2 rounded-xl border border-[#E2E8F0] p-4">
              <h3 class="text-[11px] font-semibold uppercase tracking-wider text-[#687281]">
                Deskripsi
              </h3>
              <p class="text-[13px] text-[#334155] leading-6 whitespace-pre-wrap wrap-anywhere">
                {{ selectedTicket.deskripsi || 'Tidak ada catatan deskripsi rincian.' }}
              </p>
            </div>

            <!-- Detail Tiket Grid (2-Column Desktop, 1-Column Mobile) -->
            <div class="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/60 p-4 space-y-4">
              <h3 class="text-[11px] font-semibold uppercase tracking-wider text-[#687281]">
                Detail Tiket
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-xs">
                <!-- Pelapor -->
                <div class="flex min-w-0 flex-col gap-1">
                  <span class="text-[11px] font-medium text-[#687281]">Pelapor</span>
                  <span class="font-semibold text-[#333333]">{{
                    selectedTicket.pelapor_nama || selectedTicket.pelapor || '—'
                  }}</span>
                  <span
                    v-if="selectedTicket.pelapor_jabatan || selectedTicket.pelapor_nik"
                    class="text-[11px] text-[#5F7089]"
                  >
                    {{ selectedTicket.pelapor_jabatan || 'User' }}
                    {{ selectedTicket.pelapor_nik ? '· NIK ' + selectedTicket.pelapor_nik : '' }}
                  </span>
                </div>

                <!-- Penanggung Jawab -->
                <div class="flex min-w-0 flex-col gap-1">
                  <span class="text-[11px] font-medium text-[#687281]">Penanggung Jawab</span>
                  <span
                    class="font-semibold"
                    :class="
                      selectedTicket.assigned_to_nama || selectedTicket.assigned_to
                        ? 'text-[#333333]'
                        : 'text-[#687281] italic'
                    "
                  >
                    {{
                      getAssigneeName(
                        selectedTicket.assigned_to_nama || selectedTicket.assigned_to,
                        'Belum ditetapkan',
                      )
                    }}
                  </span>
                </div>

                <!-- Kategori -->
                <div class="flex min-w-0 flex-col gap-1">
                  <span class="text-[11px] font-medium text-[#687281]">Kategori</span>
                  <span class="font-medium text-[#333333]">{{
                    selectedTicket.kategori || 'Support'
                  }}</span>
                </div>

                <!-- Priority -->
                <div class="flex min-w-0 flex-col gap-1">
                  <span class="text-[11px] font-medium text-[#687281]">Prioritas</span>
                  <span class="font-medium text-[#333333]">
                    {{ getPriorityInfo(selectedTicket.prioritas).label }}
                  </span>
                </div>

                <!-- Unit Tujuan -->
                <div class="flex min-w-0 flex-col gap-1">
                  <span class="text-[11px] font-medium text-[#687281]">Unit Tujuan</span>
                  <span class="font-medium text-[#333333]">{{
                    selectedTicket.queue_nama || selectedTicket.queue_kode || 'IT Support'
                  }}</span>
                </div>

                <!-- Created At -->
                <div class="flex min-w-0 flex-col gap-1">
                  <span class="text-[11px] font-medium text-[#687281]">Dibuat Pada</span>
                  <span class="font-medium text-[#334155]">{{
                    formatDateTime(selectedTicket.dibuat_pada)
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Attachment Display (Download-only List) -->
            <div v-if="isTicketAttachmentLoading" class="text-xs text-[#687281] py-2">
              Memuat lampiran tiket...
            </div>
            <div
              v-else-if="selectedTicket.attachments && selectedTicket.attachments.length"
              class="pt-4 border-t border-[#F1F5F9] space-y-2"
            >
              <h3
                class="text-[11px] font-semibold uppercase tracking-wider text-[#687281] flex items-center gap-1"
              >
                <span aria-hidden="true" class="material-symbols-outlined text-[15px]"
                  >attach_file</span
                >
                Lampiran
                <span class="text-[#CBD5E1] font-normal"
                  >({{ selectedTicket.attachments.length }})</span
                >
              </h3>
              <ul class="space-y-2">
                <li
                  v-for="(att, i) in selectedTicket.attachments"
                  :key="att.id"
                  class="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div
                      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ECF2FF] text-[#333333]"
                    >
                      <span aria-hidden="true" class="material-symbols-outlined text-[20px]">{{
                        getAttachmentIcon(att.attachment, att.name)
                      }}</span>
                    </div>
                    <div class="min-w-0">
                      <p class="text-[12px] font-bold text-[#2A3547] truncate">
                        {{ att.name || 'Lampiran' }}
                      </p>
                      <p class="text-[11px] text-[#66728d] truncate mt-0.5">
                        {{ att.nama_pengguna || 'Pengguna' }}
                        <template v-if="att.dibuat_pada">
                          · {{ formatDateTime(att.dibuat_pada) }}</template
                        >
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    @click="
                      downloadAttachment(
                        att.attachment,
                        att.name || 'lampiran-' + selectedTicket.nomor_tiket + '-' + (i + 1),
                      )
                    "
                    class="flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[11px] font-bold text-[#333333] hover:bg-[#EFF6FF] hover:border-[#0A51B0] transition-all cursor-pointer shadow-2xs shrink-0"
                  >
                    <span aria-hidden="true" class="material-symbols-outlined text-[16px]"
                      >download</span
                    >
                    <span>Unduh</span>
                  </button>
                </li>
              </ul>
            </div>

            <!-- Dedicated CASP Section -->
            <div class="pt-4 border-t border-[#F1F5F9]">
              <TicketCaspRating
                :ticket="selectedTicket"
                :ticket-id="selectedTicket.id"
                :ticket-status="selectedTicket.status_tiket"
                @rated="fetchTickets"
              />
            </div>
          </div>

          <!-- TAB 2: ACTIVITY TIMELINE -->
          <div v-else-if="activeDetailTab === 'history'" class="space-y-4">
            <div v-if="isHistoryLoading" class="p-2" aria-busy="true">
              <SkeletonList :items="4" :show-avatar="true" />
            </div>

            <div
              v-else-if="ticketHistory.length === 0"
              class="py-8 text-center text-xs text-[#687281]"
            >
              Belum ada riwayat aktivitas pada tiket ini.
            </div>

            <!-- Activity Timeline -->
            <div
              v-else
              class="relative pl-5 space-y-5 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-px before:bg-[#E2E8F0]"
            >
              <div
                v-for="log in ticketHistory"
                :key="log.id"
                class="relative flex flex-col gap-1 text-xs"
              >
                <!-- Dot on Timeline -->
                <div class="absolute -left-5 top-1 h-2 w-2 rounded-full bg-[#0A51B0]"></div>

                <!-- Event Header & Actor -->
                <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="font-semibold text-[#333333]">{{ log.aksi }}</span>
                    <span class="text-[11px] text-[#5F7089]"
                      >oleh <strong>{{ log.oleh_pengguna || 'Sistem' }}</strong></span
                    >
                  </div>
                  <span class="text-[11px] text-[#687281]">{{
                    formatDateTime(log.dibuat_pada)
                  }}</span>
                </div>

                <!-- Details / Diffs -->
                <div
                  v-if="log.perubahan"
                  class="text-[12px] text-[#475569] bg-[#F8FAFC] p-2.5 rounded-lg border border-[#F1F5F9] mt-0.5"
                >
                  {{ log.perubahan }}
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 3: DISCUSSION THREAD -->
          <div v-else-if="activeDetailTab === 'comments'" class="flex flex-col gap-3 min-h-0">
            <!-- Messages Container (scrollable inside the chat area) -->
            <div
              ref="chatContainer"
              class="flex max-h-[340px] min-h-[180px] flex-1 flex-col gap-4 overflow-y-auto rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]/50 p-3 sm:p-4"
            >
              <div
                v-if="isCommentsLoading"
                class="flex flex-col items-center justify-center py-6 gap-2 text-[#687281]"
              >
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[24px] animate-spin text-[#333333]"
                  >progress_activity</span
                >
                <span class="text-xs font-medium">Memuat percakapan...</span>
              </div>

              <div
                v-else-if="ticketComments.length === 0"
                class="flex flex-col items-center justify-center py-6 gap-1.5 text-center text-[#687281] my-auto"
              >
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[24px] text-[#687281]"
                  >chat_bubble_outline</span
                >
                <p class="text-xs font-semibold text-[#334155]">
                  Belum ada diskusi pada tiket ini.
                </p>
                <p class="text-[11px] text-[#5F7089]">Tulis komentar melalui form di bawah.</p>
              </div>

              <!-- Conversation Bubbles -->
              <div
                v-for="c in ticketComments"
                :key="c.id"
                class="flex flex-col gap-1 max-w-[85%]"
                :class="
                  c.nama_pengguna === user?.nama ? 'self-end items-end' : 'self-start items-start'
                "
              >
                <div
                  class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-[#5F7089]"
                >
                  <span class="font-bold text-[#334155]">{{ c.nama_pengguna }}</span>
                  <span class="capitalize">({{ c.role_pengguna || 'user' }})</span>
                  <span>·</span>
                  <span>{{ formatDateTime(c.dibuat_pada) }}</span>
                </div>

                <div
                  class="rounded-2xl px-4 py-2.5 text-xs leading-relaxed"
                  :class="
                    c.nama_pengguna === user?.nama
                      ? 'bg-[#EFF6FF] border border-[#DBEAFE] text-[#1E3A8A] rounded-br-xs'
                      : 'bg-[#F8FAFC] text-[#333333] border border-[#E2E8F0] rounded-bl-xs'
                  "
                >
                  <p class="whitespace-pre-wrap">{{ c.pesan }}</p>

                  <button
                    v-if="c.has_attachment && !c.attachment"
                    type="button"
                    :disabled="c.is_attachment_loading"
                    class="mt-2 flex items-center gap-1 rounded-lg border border-current/20 px-2 py-1 text-[10px] font-bold disabled:opacity-60 cursor-pointer"
                    @click="loadCommentAttachment(c)"
                  >
                    <span aria-hidden="true" class="material-symbols-outlined text-[14px]"
                      >attach_file</span
                    >
                    {{ c.is_attachment_loading ? 'Memuat...' : 'Muat lampiran' }}
                  </button>

                  <div
                    v-if="c.attachment"
                    class="mt-2 flex items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2"
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <div
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#ECF2FF] text-[#333333]"
                      >
                        <span aria-hidden="true" class="material-symbols-outlined text-[16px]">{{
                          getAttachmentIcon(c.attachment, c.attachment_name)
                        }}</span>
                      </div>
                      <span class="text-[11px] font-semibold text-[#334155] truncate">{{
                        c.attachment_name || 'Lampiran diskusi'
                      }}</span>
                    </div>
                    <button
                      type="button"
                      @click="
                        downloadAttachment(
                          c.attachment,
                          c.attachment_name || 'lampiran-diskusi-' + c.id,
                        )
                      "
                      class="flex h-7 items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2 text-[10px] font-bold text-[#333333] hover:bg-[#EFF6FF] hover:border-[#0A51B0] transition-all cursor-pointer shrink-0"
                    >
                      <span aria-hidden="true" class="material-symbols-outlined text-[14px]"
                        >download</span
                      >
                      <span>Unduh</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Comment Composer or Locked Notice -->
            <div
              v-if="['Resolved', 'Closed', 'Cancelled'].includes(selectedTicket.status_tiket)"
              class="flex shrink-0 items-center gap-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-xs font-medium text-[#5F7089]"
            >
              <span aria-hidden="true" class="material-symbols-outlined text-[16px] text-[#687281]"
                >lock</span
              >
              <span
                >Diskusi ditutup karena status tiket sudah {{ selectedTicket.status_tiket }}.</span
              >
            </div>

            <div
              v-else
              class="flex shrink-0 flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-white p-3"
            >
              <div
                v-if="commentAttachment"
                class="flex items-center justify-between gap-2 rounded-lg bg-[#F8FAFC] p-2 border border-[#E2E8F0]"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ECF2FF] text-[#333333]"
                  >
                    <span aria-hidden="true" class="material-symbols-outlined text-[16px]">{{
                      getAttachmentIcon(commentAttachment, commentAttachmentName)
                    }}</span>
                  </div>
                  <span class="text-xs font-bold text-[#333333] truncate">{{
                    commentAttachmentName || 'File lampiran siap dikirim'
                  }}</span>
                </div>
                <button
                  type="button"
                  @click="removeCommentAttachment"
                  aria-label="Hapus lampiran"
                  title="Hapus lampiran"
                  class="text-rose-500 hover:text-rose-700 cursor-pointer"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[16px]"
                    >close</span
                  >
                </button>
              </div>

              <form class="flex items-center gap-2" @submit.prevent="sendComment">
                <label
                  title="Lampirkan file (Gambar / Dokumen)"
                  aria-label="Lampirkan file"
                  class="group/btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-500 hover:text-blue-600 transition-all cursor-pointer select-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="w-[18px] h-[18px] min-w-[18px] min-h-[18px] shrink-0 text-slate-500 group-hover/btn:text-blue-600 transition-colors"
                    aria-hidden="true"
                  >
                    <path
                      d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"
                    />
                  </svg>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    class="hidden"
                    @change="handleCommentFileChange"
                  />
                </label>

                <input
                  v-model="newCommentText"
                  type="text"
                  aria-label="Tulis komentar tiket"
                  placeholder="Tulis komentar atau catatan perbaikan..."
                  class="h-10 flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-xs font-medium text-slate-900 placeholder-[#5F7089] outline-none transition-all focus:bg-white focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0]/20"
                />

                <button
                  type="submit"
                  :disabled="isSubmittingComment || (!newCommentText.trim() && !commentAttachment)"
                  class="flex h-10 px-3.5 sm:px-4 items-center justify-center gap-1.5 rounded-xl bg-[#0A51B0] text-xs font-bold text-white shadow-2xs hover:bg-[#0A4391] disabled:opacity-40 transition-all cursor-pointer shrink-0 active:scale-95"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[16px]">send</span>
                  <span class="hidden sm:inline">Kirim</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- Ticket management actions -->
        <div
          v-if="isAdmin || isSuperAdmin"
          class="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 mt-5"
        >
          <p class="text-[11px] font-semibold uppercase tracking-wider text-[#5F7089]">
            Kelola tiket
          </p>
          <div
            class="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 w-full sm:w-auto"
          >
            <!-- Custom Modern & Minimalist Status Selector Dropdown -->
            <div
              v-if="!['Closed', 'Resolved', 'Cancelled'].includes(selectedTicket.status_tiket)"
              class="relative w-full sm:w-auto text-left"
            >
              <button
                type="button"
                :disabled="isUpdatingStatus"
                @click="toggleStatusDropdown"
                aria-label="Ubah status tiket"
                aria-haspopup="true"
                :aria-expanded="showStatusDropdown"
                class="inline-flex h-9 w-full sm:w-auto items-center justify-between sm:justify-center gap-2 rounded-xl border bg-white px-3.5 text-xs font-bold text-[#2A3547] shadow-2xs hover:bg-[#F8FAFC] hover:border-[#0A51B0] transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                :class="
                  showStatusDropdown
                    ? 'border-[#0A51B0] ring-2 ring-[#0A51B0]/15'
                    : 'border-[#E5EAEF]'
                "
              >
                <div class="flex items-center gap-2">
                  <span
                    class="h-2 w-2 rounded-full shrink-0"
                    :class="getStatusDotInfo(selectedTicket.status_tiket).dotClass"
                  ></span>
                  <span>{{ getStatusDotInfo(selectedTicket.status_tiket).label }}</span>
                </div>
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[16px] text-[#66728d] transition-transform duration-200"
                  :class="{ 'rotate-180 text-[#333333]': showStatusDropdown }"
                  >expand_more</span
                >
              </button>

              <!-- Dropdown Menu Popover -->
              <Transition name="fade">
                <div
                  v-if="showStatusDropdown"
                  class="absolute bottom-full left-0 mb-1.5 w-full sm:w-44 rounded-xl border border-[#E5EAEF] bg-white p-1.5 shadow-lg z-50 focus:outline-none"
                >
                  <button
                    v-for="st in [
                      { value: 'Open', label: 'Open', dot: 'bg-emerald-500' },
                      { value: 'In Progress', label: 'In Progress', dot: 'bg-blue-500' },
                      { value: 'Pending', label: 'Pending', dot: 'bg-amber-500' },
                      { value: 'Resolved', label: 'Resolved', dot: 'bg-teal-500' },
                      { value: 'Closed', label: 'Closed', dot: 'bg-slate-400' },
                    ]"
                    :key="st.value"
                    type="button"
                    @click="selectStatus(selectedTicket, st.value)"
                    class="flex h-8 w-full items-center justify-between rounded-lg px-2.5 text-xs font-medium text-[#2A3547] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    :class="
                      selectedTicket.status_tiket === st.value
                        ? 'bg-[#ECF2FF] font-bold text-[#333333]'
                        : ''
                    "
                  >
                    <div class="flex items-center gap-2">
                      <span class="h-2 w-2 rounded-full" :class="st.dot"></span>
                      <span>{{ st.label }}</span>
                    </div>
                    <span
                      v-if="selectedTicket.status_tiket === st.value"
                      aria-hidden="true"
                      class="material-symbols-outlined text-[15px] text-[#333333]"
                      >check</span
                    >
                  </button>
                </div>
              </Transition>
            </div>

            <!-- Claim Button -->
            <button
              v-if="
                !selectedTicket.assigned_to_user_id &&
                !['Closed', 'Resolved', 'Cancelled'].includes(selectedTicket.status_tiket)
              "
              type="button"
              @click="claimTicket(selectedTicket)"
              :disabled="isClaiming === selectedTicket.id"
              class="h-9 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0A51B0] px-3.5 text-xs font-bold text-white shadow-2xs hover:bg-[#0A4391] disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <span aria-hidden="true" class="material-symbols-outlined text-[16px]"
                >person_add</span
              >
              <span>{{
                isClaiming === selectedTicket.id ? 'Mengambil...' : 'Ambil Tiket Ini'
              }}</span>
            </button>

            <!-- Assign to Admin (Superadmin only) -->
            <div v-if="isSuperAdmin" class="relative w-full sm:w-auto text-left">
              <button
                type="button"
                :disabled="
                  isReassigning ||
                  ['Closed', 'Resolved', 'Cancelled'].includes(selectedTicket.status_tiket)
                "
                @click="toggleReassignDropdown"
                aria-label="Assign tiket ke admin unit"
                aria-haspopup="true"
                :aria-expanded="showReassignDropdown"
                class="inline-flex h-9 w-full sm:w-auto items-center justify-between sm:justify-center gap-1.5 rounded-xl border border-[#E5EAEF] bg-white px-3.5 text-xs font-bold text-[#2A3547] shadow-2xs hover:bg-[#F8FAFC] hover:border-[#0A51B0] transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap active:scale-95"
              >
                <div class="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    class="material-symbols-outlined text-[16px] text-[#333333]"
                    >assignment_ind</span
                  >
                  <span>Assign ke Admin</span>
                </div>
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[16px] text-[#66728d]"
                  >expand_more</span
                >
              </button>

              <Transition name="fade">
                <div
                  v-if="showReassignDropdown"
                  class="absolute bottom-full left-0 mb-1.5 w-full sm:w-64 rounded-xl border border-[#E5EAEF] bg-white p-1.5 shadow-lg z-50"
                >
                  <p
                    class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#687281]"
                  >
                    Admin unit {{ selectedTicket.queue_nama || selectedTicket.queue_kode || '—' }}
                  </p>
                  <button
                    v-for="admin in getAdminsForQueue(selectedTicket.queue_id)"
                    :key="admin.id"
                    type="button"
                    :disabled="isReassigning"
                    @click="assignTicket(selectedTicket, admin.id)"
                    class="flex h-8 w-full items-center justify-between rounded-lg px-2.5 text-xs font-medium text-[#2A3547] hover:bg-[#F8FAFC] transition-colors cursor-pointer disabled:opacity-50"
                    :class="
                      selectedTicket.assigned_to_user_id === admin.id
                        ? 'bg-[#ECF2FF] font-bold text-[#333333]'
                        : ''
                    "
                  >
                    <span class="truncate">{{ admin.nama }}</span>
                    <span
                      v-if="selectedTicket.assigned_to_user_id === admin.id"
                      aria-hidden="true"
                      class="material-symbols-outlined text-[15px] text-[#333333]"
                      >check</span
                    >
                  </button>
                  <p
                    v-if="getAdminsForQueue(selectedTicket.queue_id).length === 0"
                    class="px-2 py-3 text-center text-[11px] text-[#687281]"
                  >
                    Tidak ada admin terdaftar di unit ini.
                  </p>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            @click="closeModal"
            class="h-10 w-full sm:w-auto rounded-xl bg-[#0A51B0] px-5 text-xs font-semibold text-white hover:bg-[#0A4391] transition-colors cursor-pointer active:scale-95"
          >
            Tutup
          </button>
        </div>
      </template>
    </AppModal>

    <!-- ── Delete Confirmation Modal ────────────────────── -->
    <AppModal :is-open="showDeleteModal" title="Hapus Tiket" size="sm" @close="closeModal">
      <div class="flex flex-col items-center gap-4 text-center">
        <div
          v-if="modalError"
          class="w-full rounded-xl bg-[#FDEDE8] p-3 text-left text-[12px] font-bold text-[#FA896B]"
        >
          {{ modalError }}
        </div>
        <div
          class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FDEDE8] text-[#FA896B]"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[28px]">warning</span>
        </div>
        <div>
          <h4 class="text-[16px] font-extrabold text-[#2A3547]">
            Hapus Tiket {{ selectedTicket?.nomor_tiket }}?
          </h4>
          <p class="mt-1 text-[12px] text-[#66728d]">
            Data tiket akan dihapus permanen dari sistem.
          </p>
        </div>
        <div class="flex w-full gap-3 mt-2">
          <button
            type="button"
            :disabled="isSubmitting"
            @click="closeModal"
            class="h-10 flex-1 rounded-xl border border-[#DFE5EF] text-[12px] font-semibold text-[#2A3547]"
          >
            Batal
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            @click="confirmDeleteTicket"
            class="h-10 flex-1 rounded-xl bg-[#FA896B] text-[12px] font-bold text-white hover:bg-[#E06748]"
          >
            {{ isSubmitting ? 'Menghapus...' : 'Ya, Hapus' }}
          </button>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
@import '../assets/ws-table.css';

/* ── Sticky toolbar & heading (scroll container: app-main) ── */
.tck-toolbar-sticky {
  position: sticky;
  top: 0;
  z-index: 20;
}
.tck-toolbar-sticky > div {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.94);
  box-shadow:
    0 1px 0 #eef2f7,
    0 10px 28px -20px rgba(23, 43, 77, 0.28);
}
.tck-heading-sticky {
  position: sticky;
  top: 0;
  z-index: 15;
  background: rgba(248, 250, 252, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  box-shadow: 0 1px 0 #eef2f7;
  padding: 4px 4px;
  margin-top: -2px;
}
/* Mode tabel: kartu disembunyikan di desktop (≥ 1280px) */
@media (min-width: 1280px) {
  .tck-table-mode .ticket-card-list > .tck-list-item {
    display: none;
  }
}

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
.ticket-card-list {
  gap: 12px;
}
.ticket-card-list .tck-list-item {
  padding: 20px;
  border-radius: 14px;
  border-color: #e2e8f0;
  box-shadow: none;
}
.ticket-card-list .tck-list-item:focus-visible {
  outline: 2px solid #097cde;
  outline-offset: 3px;
}
.ticket-card-list .tck-list-item:hover {
  border-color: #b8d4f5;
  box-shadow: 0 3px 12px #0a51b008;
}
.ticket-card-list h4 {
  font-size: 14px;
  line-height: 1.6;
  letter-spacing: -0.015em;
}
.ticket-card-list p {
  color: #667283;
  font-size: 12px;
}
.ticket-tags > span:first-child {
  background: transparent;
  border: 0;
  padding: 0;
  color: #637288;
  font-size: 10px;
  letter-spacing: 0.025em;
  font-weight: 500;
}
.ticket-tags > span:nth-child(2) {
  border: 0;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 500;
}
.ticket-tags > span:nth-child(3) {
  background: transparent;
  padding: 0;
  font-size: 10px;
  font-weight: 400;
}
.ticket-tags > span:nth-child(3) > span {
  display: none;
}
.ticket-identity {
  align-items: flex-start;
}
.ticket-identity > div:first-child {
  width: 36px;
  height: 36px;
  border: 0;
  margin-top: 2px;
}
.ticket-identity > div:last-child {
  gap: 7px;
}
.ticket-desktop h4 {
  white-space: normal;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.ticket-desktop > div:nth-child(3) > div > span {
  background: transparent;
  border: 0;
  padding: 0;
  font-weight: 400;
}
.ticket-desktop > div:nth-child(4) > div:first-child {
  gap: 8px;
}
.ticket-desktop > div:nth-child(4) > div:first-child > span {
  font-weight: 550;
  font-size: 10px;
}
.ticket-desktop > div:nth-child(4) > div:first-child > span:last-child {
  background: transparent;
  border: 0;
  padding-inline: 0;
}
.ticket-mobile {
  gap: 16px;
}
.ticket-mobile > div:first-child > div:first-child {
  flex-wrap: wrap;
  gap: 7px;
}
.ticket-mobile > div:first-child > div:first-child > span {
  border: 0;
  background: #f1f5f9;
  font-weight: 500;
  font-size: 10px;
}
.ticket-mobile > div:nth-child(2) {
  gap: 6px;
}
.ticket-mobile > div:nth-child(3) {
  padding: 14px 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  border-top: 1px solid #edf1f6;
}
.ticket-mobile > div:nth-child(3) > div > span:first-child {
  text-transform: none;
  letter-spacing: 0;
  font-size: 11px;
  font-weight: 400;
}
.ticket-mobile > div:nth-child(3) strong {
  white-space: normal;
  overflow-wrap: anywhere;
  font-weight: 550;
}
.ticket-mobile > div:last-child {
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 14px;
}
.ticket-card-list .animate-pulse {
  animation: none;
}
.ticket-mobile :deep(button) {
  min-width: 44px;
  min-height: 44px;
}
@media (min-width: 768px) and (max-width: 1279px) {
  .ticket-card-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}
@media (min-width: 1280px) {
  .ticket-desktop {
    grid-template-columns: minmax(0, 2.8fr) minmax(0, 1.1fr) minmax(0, 1.2fr) minmax(0, 1.2fr) 32px;
    gap: 24px;
  }
  .ticket-card-list .tck-list-item {
    padding: 22px;
  }
}
@media (max-width: 639px) {
  .ticket-card-list .tck-list-item {
    padding: 16px;
  }
}
</style>

<style scoped>
.ticket-entry-form {
  padding: 0;
}
.ticket-entry-fields {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.ticket-entry-fields > * {
  margin: 0;
}
.ticket-entry-heading {
  font-size: 14px;
  font-weight: 650;
  color: #333;
  padding-bottom: 12px;
  border-bottom: 1px solid #edf1f6;
}
.ticket-entry-heading:not(:first-child) {
  margin-top: 6px;
}
.ticket-entry-form input:not([type='file']),
.ticket-entry-form textarea {
  background: #fafbfd;
  border-color: #dce4ef;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 400;
  min-height: 44px;
}
.ticket-entry-form textarea {
  min-height: 150px;
  max-height: 360px;
  padding: 14px;
  line-height: 1.8;
}
.ticket-entry-form :deep(button[aria-haspopup='listbox']) {
  min-height: 44px;
  border-radius: 8px;
  font-size: 13px;
}
.ticket-entry-form button[aria-pressed] {
  box-shadow: none;
  min-height: 64px;
  border-radius: 10px;
}
.ticket-entry-form button[aria-pressed='true'] {
  background: #edf5ff;
  border-color: #0a51b0;
  outline: none;
  --tw-ring-shadow: 0 0 #0000;
}
.ticket-entry-form button[aria-pressed] p {
  font-weight: 550;
}
.ticket-entry-form li button {
  min-width: 40px;
  min-height: 44px;
}
.ticket-entry-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.ticket-entry-footer button {
  min-height: 44px;
  border-radius: 8px;
  padding: 0 20px;
  font-size: 12px;
  font-weight: 600;
}
.ticket-entry-footer button[type='submit'] {
  background: #0a51b0;
}
.ticket-entry-footer button[type='submit']:hover {
  background: #0a4391;
}
.ticket-entry-form button:focus-visible,
.ticket-entry-footer button:focus-visible {
  outline: 2px solid #097cde;
  outline-offset: 3px;
}
@media (max-width: 639px) {
  .ticket-entry-form input:not([type='file']),
  .ticket-entry-form textarea,
  .ticket-entry-form :deep(button[aria-haspopup='listbox']) {
    font-size: 16px;
  }
  .ticket-entry-form textarea {
    min-height: 170px;
  }
  .ticket-entry-form button[aria-pressed] {
    padding: 10px 5px;
    min-height: 72px;
  }
  .ticket-entry-footer button {
    flex: 1;
    justify-content: center;
  }
}
</style>

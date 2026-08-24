<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import { useAuth } from '@/composables/useAuth'
import { onTicketEvent } from '../composables/useTicketRealtime.js'
import { validateAttachmentFile } from '../utils/attachmentPolicy.js'
import AppModal from '../components/ui/AppModal.vue'
import AppRowActions from '../components/ui/AppRowActions.vue'
import AppPagination from '../components/ui/AppPagination.vue'
import SearchableSelect from '../components/ui/SearchableSelect.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import TicketCaspRating from '../components/tickets/TicketCaspRating.vue'
import { animateStagger } from '../composables/useGsap.js'
import BaseSkeleton from '../components/ui/skeleton/BaseSkeleton.vue'
import SkeletonList from '../components/ui/skeleton/SkeletonList.vue'

const route = useRoute()
const { get, post, put, del } = useApi()
const { user, isSuperAdmin, isAdmin, hasWritePermission } = useAuth()

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
const reporters = ref([]) // list user untuk dropdown pelapor (admin)
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

function nextTicketStep() {
  if (activeFormTab.value === 'kendala') {
    if (!form.value.judul || !form.value.judul.trim()) {
      modalError.value = 'Judul kendala wajib diisi.'
      return
    }
    activeFormTab.value = 'penanganan'
  } else if (activeFormTab.value === 'penanganan') {
    if (!form.value.queue_id) {
      modalError.value = 'Unit tujuan wajib dipilih.'
      return
    }
    activeFormTab.value = 'lampiran'
  }
  modalError.value = ''
}



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

const hasTicketValidationErrors = computed(() => {
  if (activeFormTab.value === 'kendala') {
    return !form.value.judul || !form.value.judul.trim()
  }
  if (activeFormTab.value === 'penanganan') {
    return !form.value.queue_id
  }
  if (activeFormTab.value === 'lampiran') {
    return !form.value.judul || !form.value.judul.trim() || !form.value.queue_id
  }
  return false
})

const selectedSupportUnit = ref('IT')

const itQueue = computed(
  () =>
    queues.value.find(
      (q) =>
        (q.kode || '').toUpperCase().includes('IT') ||
        (q.nama || '').toUpperCase().includes('IT'),
    ) || queues.value[0],
)

const hrQueue = computed(
  () =>
    queues.value.find(
      (q) =>
        (q.kode || '').toUpperCase().includes('HR') ||
        (q.nama || '').toUpperCase().includes('HR') ||
        (q.nama || '').toUpperCase().includes('HUMAN'),
    ),
)

const gaQueue = computed(
  () =>
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
  if (code.includes('GA') || name.includes('GA') || name.includes('GENERAL')) return 'corporate_fare'
  return 'computer'
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
        desc: 'Permintaan Fasilitas, Perbaikan & Perlengkapan GA',
      },
      {
        value: 'Support',
        title: 'Support',
        desc: 'Kendala Fasilitas, Ruangan & AC / Maintenance',
      },
      {
        value: 'Incident',
        title: 'Incident',
        desc: 'Insiden Darurat & Damage Gedung/Fasilitas',
      },
    ]
  }

  return [
    {
      value: 'Request',
      title: 'Request',
      desc: 'Permintaan Akses, Hardware & Software',
    },
    {
      value: 'Support',
      title: 'Support',
      desc: 'Kendala Teknis, PC/Laptop & Wi-Fi',
    },
    {
      value: 'Incident',
      title: 'Incident',
      desc: 'Insiden Critical System / Network Down',
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

function getAttachmentIcon(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return 'attach_file'
  const lower = dataUrl.toLowerCase()
  if (lower.includes('pdf')) return 'picture_as_pdf'
  if (
    lower.includes('presentation') ||
    lower.includes('powerpoint') ||
    lower.includes('mspowerpoint')
  ) {
    return 'slideshow'
  }
  if (lower.includes('word') || lower.includes('msword') || lower.includes('docx')) return 'description'
  if (lower.includes('excel') || lower.includes('sheet') || lower.includes('csv')) return 'table_chart'
  if (lower.includes('zip') || lower.includes('rar') || lower.includes('compressed')) return 'folder_zip'
  if (lower.includes('image')) return 'image'
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
      !filterKategori.value || (t.kategori || '').toLowerCase() === filterKategori.value.toLowerCase()
    return matchStatus && matchPrioritas && matchQueue && matchKategori
  })
})

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

// eslint-disable-next-line no-unused-vars
function getAdminsForQueue(queueId) {
  if (!queueId) return []
  return queueAdmins.value[queueId] || []
}

async function fetchQueues() {
  try {
    const data = await get('/api/ticket-queues')
    if (Array.isArray(data)) {
      queues.value = data
      await fetchQueueAdmins()
    }
  } catch (err) {
    void err
  }
}

async function fetchReporters() {
  try {
    const data = await get('/api/tickets/reporters')
    const rows = Array.isArray(data?.reporters) ? data.reporters : []
    reporters.value = rows.map((u) => ({ id: Number(u.id), nama: u.nama }))
  } catch (err) {
    reporters.value = []
    void err
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
      get(`/api/tickets${qs ? '?' + qs : ''}`),
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
function startChatPoll(_ticketId) {
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
  isClaiming.value = ticket.id
  // Optimistic: update UI segera, jangan tunggu SSE/polling
  const idx = tickets.value.findIndex((t) => t.id === ticket.id)
  if (idx >= 0) {
    tickets.value[idx] = {
      ...tickets.value[idx],
      assigned_to_user_id: user.value?.id,
      assigned_to: user.value?.nama,
      assigned_to_nama: user.value?.nama,
      status_tiket: 'In Progress',
    }
  }
  try {
    await post(`/api/tickets/${ticket.id}/claim`, {})
    toast(`Tiket '${ticket.judul}' berhasil diambil!`)
    // Refetch stats untuk update counter (unassigned -1, dll)
    scheduleStatsRefresh()
  } catch (err) {
    // Rollback optimistic update
    if (idx >= 0) {
      tickets.value[idx] = {
        ...tickets.value[idx],
        assigned_to_user_id: ticket.assigned_to_user_id,
        assigned_to: ticket.assigned_to,
        assigned_to_nama: ticket.assigned_to_nama,
        status_tiket: ticket.status_tiket,
      }
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
        assigned_to_nama: getAdminsForQueue(ticket.queue_id).find((a) => a.id === targetUserId)?.nama || '',
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
  } else if (queueCode.includes('GA') || queueName.includes('GA') || queueName.includes('GENERAL')) {
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
        payload.pelapor_user_id = reporterId === '' || reporterId == null ? null : Number(reporterId)
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

function getSlaHours(prioritas) {
  const p = (prioritas || '').toLowerCase()
  if (p.includes('critical') || p.includes('urgent') || p.includes('4h')) return 4
  if (p.includes('high') || p.includes('1day')) return 24
  if (p.includes('medium') || p.includes('3d')) return 72
  if (p.includes('low') || p.includes('7d')) return 168
  return 72
}

function getSlaCountdownInfo(ticket) {
  if (!ticket || !ticket.dibuat_pada) {
    return { text: ticket?.prioritas || 'Medium (3d)', isOverdue: false, isClosed: false }
  }

  if (ticket.status_tiket === 'Closed') {
    return { text: '✓ Selesai', isOverdue: false, isClosed: true }
  }

  const createdAt = new Date(ticket.dibuat_pada).getTime()
  const hours = getSlaHours(ticket.prioritas)
  const deadline = createdAt + hours * 60 * 60 * 1000
  const diffMs = deadline - nowTick.value

  const isOverdue = diffMs < 0
  const absDiff = Math.abs(diffMs)

  const diffSec = Math.floor(absDiff / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  const remHours = diffHours % 24
  const remMin = diffMin % 60

  let formatted
  if (diffDays > 0) {
    formatted = `${diffDays}h ${remHours}j`
  } else if (diffHours > 0) {
    formatted = `${diffHours}j ${remMin}m`
  } else {
    formatted = `${remMin}m`
  }

  if (isOverdue) {
    return {
      text: `⚠️ Terlewat ${formatted}`,
      isOverdue: true,
      isClosed: false,
    }
  }

  return {
    text: `⏱️ ${formatted} sisa`,
    isOverdue: false,
    isClosed: false,
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

function getStatusDotInfo(status) {
  const s = (status || '').toLowerCase()
  if (s === 'open')
    return {
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-700 font-semibold',
      badgeClass: 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80',
      label: 'Open',
    }
  if (s === 'in progress')
    return {
      dotClass: 'bg-blue-500',
      textClass: 'text-blue-700 font-semibold',
      badgeClass: 'bg-blue-50/90 text-blue-700 border-blue-200/80',
      label: 'In Progress',
    }
  if (s === 'pending')
    return {
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-700 font-semibold',
      badgeClass: 'bg-amber-50/90 text-amber-700 border-amber-200/80',
      label: 'Pending',
    }
  if (s === 'resolved')
    return {
      dotClass: 'bg-teal-500',
      textClass: 'text-teal-700 font-semibold',
      badgeClass: 'bg-teal-50/90 text-teal-700 border-teal-200/80',
      label: 'Resolved',
    }
  if (s === 'closed')
    return {
      dotClass: 'bg-slate-400',
      textClass: 'text-slate-600 font-medium',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200/80',
      label: 'Closed',
    }
  if (s === 'cancelled')
    return {
      dotClass: 'bg-rose-500',
      textClass: 'text-rose-600 font-medium',
      badgeClass: 'bg-rose-50/90 text-rose-700 border-rose-200/80',
      label: 'Cancelled',
    }
  return {
    dotClass: 'bg-slate-400',
    textClass: 'text-slate-600 font-medium',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200/80',
    label: status || 'Open',
  }
}

function getPriorityInfo(prioritas) {
  const p = (prioritas || '').toLowerCase()
  if (p.includes('critical') || p.includes('urgent') || p.includes('4h')) {
    return { label: 'Critical', class: 'text-rose-700 font-bold bg-rose-50 border-rose-200/80', icon: 'warning' }
  }
  if (p.includes('high') || p.includes('1day')) {
    return { label: 'High', class: 'text-amber-800 font-semibold bg-amber-50 border-amber-200/80', icon: 'priority_high' }
  }
  if (p.includes('medium') || p.includes('3d')) {
    return { label: 'Medium', class: 'text-slate-700 font-medium bg-slate-100/90 border-slate-200/80', icon: 'remove' }
  }
  return { label: 'Low', class: 'text-slate-600 font-medium bg-slate-50 border-slate-200/60', icon: 'arrow_downward' }
}

function getSlaInfo(ticket) {
  const sla = getSlaCountdownInfo(ticket)
  if (sla.isClosed) return { text: '✓ Selesai', class: 'bg-slate-50 text-slate-500 border-slate-200', icon: 'check_circle' }
  if (sla.isOverdue) return { text: sla.text, class: 'bg-rose-50 text-rose-700 border-rose-200/80 font-semibold', icon: 'timer_off' }
  return { text: sla.text, class: 'bg-slate-50 text-slate-600 border-slate-200/70', icon: 'schedule' }
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
  <div class="flex min-w-0 flex-col gap-5" :data-testid="!isLoading ? 'page-ready' : undefined">
    <!-- Toast Notification -->
    <Transition name="slide-right">
      <div
        v-if="notification"
        class="fixed left-4 right-4 top-4 z-[60] flex items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-xl sm:left-auto sm:right-5 sm:max-w-md"
        :class="notification.type === 'error' ? 'bg-[#FA896B]' : 'bg-[#13DEB9]'"
      >
        <span class="material-symbols-outlined text-[20px]">{{
          notification.type === 'error' ? 'error' : 'check_circle'
        }}</span>
        <span class="text-[13px] font-bold">{{ notification.message }}</span>
      </div>
    </Transition>

    <!-- ── 1. Page Header ───────────────────────────────── -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0]/80 shadow-2xs"
    >
      <div>
        <h1 class="text-xl font-bold text-[#0F172A] tracking-tight">
          {{ isAdmin || isSuperAdmin ? 'Ticket Inbox' : 'Tiket' }}
        </h1>
        <p class="text-xs font-normal text-[#64748B] mt-0.5">
          {{
            isAdmin || isSuperAdmin ? 'Kelola pengajuan dan kendala IT' : 'Pengajuan dan layanan IT'
          }}
        </p>
      </div>

      <button
        type="button"
        @click="openAdd"
        class="h-9 shrink-0 whitespace-nowrap rounded-xl bg-[#2563EB] px-4 text-xs font-bold text-white shadow-2xs hover:bg-[#1D4ED8] transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
        :title="isAdmin || isSuperAdmin ? 'Buat tiket baru' : 'Request ticket baru'"
      >
        <span class="material-symbols-outlined text-[16px]">add</span>
        <span>{{ isAdmin || isSuperAdmin ? 'Buat Tiket' : 'Request Ticket' }}</span>
      </button>
    </div>

    <!-- ── 2. Integrated Control Bar & Workspace Navigation ─ -->
    <div class="flex flex-col gap-3 bg-white p-4 rounded-2xl border border-[#E2E8F0]/80 shadow-2xs">
      <!-- Top Row: Queue Tabs & Secondary Summary -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
        <!-- Ticket Queue Navigation (Tabs) -->
        <div class="flex items-center gap-1.5 overflow-x-auto">
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
            class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
            :class="
              activeTab === tab.key
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
            "
          >
            <span>{{ tab.label }}</span>
            <span
              v-if="tab.count !== undefined"
              class="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
              :class="
                activeTab === tab.key
                  ? 'bg-white/20 text-white'
                  : tab.key === 'unassigned' && tab.count > 0
                    ? 'bg-rose-500 text-white'
                    : 'bg-[#F1F5F9] text-[#64748B]'
              "
            >
              {{ tab.count }}
            </span>
          </button>
        </div>

        <!-- Secondary Summary (Quiet metadata) -->
        <div
          class="text-[12px] font-medium text-[#64748B] flex items-center gap-1.5 shrink-0 select-none"
        >
          <span
            ><strong class="text-[#0F172A] font-bold">{{ stats.totalTickets }}</strong> Inbox</span
          >
          <span>·</span>
          <span
            ><strong class="text-emerald-600 font-bold">{{ stats.openTickets }}</strong> Open</span
          >
          <span>·</span>
          <span
            ><strong class="text-amber-600 font-bold">{{ stats.pendingTickets }}</strong>
            Pending</span
          >
          <span>·</span>
          <span
            ><strong class="text-slate-600 font-bold">{{ stats.closedTickets }}</strong>
            Closed</span
          >
        </div>
      </div>

      <!-- Bottom Row: Toolbar (Search + Filters) -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[220px]">
          <span
            class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#94A3B8] pointer-events-none"
            >search</span
          >
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Cari ticket, judul, nomor, pelapor..."
            class="h-9 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:bg-white focus:outline-none transition-all"
          />
        </div>

        <!-- Filter Options -->
        <div class="flex items-center gap-2 flex-wrap">
          <CustomSelect
            v-model="filterStatus"
            :options="[
              { value: '', label: 'Status: Semua' },
              { value: 'Open', label: 'Open' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Resolved', label: 'Resolved' },
              { value: 'Closed', label: 'Closed' },
            ]"
            aria-label="Filter status"
            @change="fetchTickets"
          />

          <CustomSelect
            v-model="filterPrioritas"
            :options="[
              { value: '', label: 'Priority: Semua' },
              { value: 'Critical', label: 'Critical' },
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Low', label: 'Low' },
            ]"
            aria-label="Filter priority"
            @change="fetchTickets"
          />

          <CustomSelect
            v-model="filterQueue"
            :options="[
              { value: '', label: 'Unit: Semua' },
              ...queues.map((q) => ({ value: q.id, label: `${q.kode} — ${q.nama}` })),
            ]"
            aria-label="Filter unit"
            @change="fetchTickets"
          />

          <CustomSelect
            v-model="filterKategori"
            :options="[
              { value: '', label: 'Kategori: Semua' },
              { value: 'Request', label: 'Request' },
              { value: 'Support', label: 'Support' },
              { value: 'Incident', label: 'Incident' },
              { value: 'QNA', label: 'QNA' },
            ]"
            aria-label="Filter kategori"
            @change="fetchTickets"
          />

          <CustomSelect
            v-model="sortOrder"
            :options="[
              { value: 'terbaru', label: 'Terbaru' },
              { value: 'terlama', label: 'Terlama' },
            ]"
            aria-label="Urutkan tiket"
            width-class="w-32"
            align="right"
            @change="fetchTickets"
          />
        </div>
      </div>
    </div>

    <!-- ── 3. Ticket Inbox / Issue List Surface ───────────── -->
    <div class="flex flex-col gap-3">
      <!-- Loading Skeleton (Matches refined compact card layout) -->
      <div v-if="isLoading" aria-busy="true" class="flex flex-col gap-2.5">
        <div
          v-for="r in 4"
          :key="'tck-skel-' + r"
          class="flex flex-col gap-2.5 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-white select-none shadow-2xs"
        >
          <div class="flex items-center justify-between">
            <BaseSkeleton width="90px" height="14px" radius="sm" />
            <BaseSkeleton width="80px" height="22px" radius="full" />
          </div>

          <div class="flex flex-col gap-1">
            <BaseSkeleton :width="r % 2 === 0 ? '55%' : '70%'" height="16px" radius="md" />
            <BaseSkeleton :width="r % 2 === 0 ? '80%' : '60%'" height="13px" radius="sm" />
          </div>

          <div class="flex items-center gap-4 pt-1">
            <BaseSkeleton width="90px" height="14px" radius="sm" />
            <BaseSkeleton width="80px" height="14px" radius="sm" />
            <BaseSkeleton width="70px" height="20px" radius="md" />
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="pageError" class="rounded-xl bg-rose-50 p-5 text-[13px] font-semibold text-rose-600 border border-rose-200">
        {{ pageError }}
      </div>

      <!-- Content Surface (Refined Compact Ticket Cards) -->
      <div v-else class="flex flex-col gap-2.5">
        <!-- ── USER ROLE TICKET CARDS ── -->
        <template v-if="!isAdmin && !isSuperAdmin">
          <div
            v-for="ticket in paginatedTickets"
            :key="ticket.id"
            @click="openDetail(ticket)"
            class="tck-list-item group relative flex flex-col bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs p-3.5 sm:p-4 transition-all duration-200 cursor-pointer select-none gap-2"
          >
            <!-- TOP ROW: Subtle Ticket ID (Left) | Status Badge & Chevron (Right) -->
            <div class="flex items-center justify-between gap-3 min-w-0">
              <span class="text-[11.5px] font-mono font-medium text-slate-400 tracking-wide">
                {{ ticket.nomor_tiket || `TCK-${ticket.id}` }}
              </span>

              <div class="flex items-center gap-2 shrink-0">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold border transition-all"
                  :class="getStatusDotInfo(ticket.status_tiket).badgeClass"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full shrink-0"
                    :class="getStatusDotInfo(ticket.status_tiket).dotClass"
                  ></span>
                  <span>{{ getStatusDotInfo(ticket.status_tiket).label }}</span>
                </span>

                <span
                  class="material-symbols-outlined text-[18px] text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all"
                >
                  chevron_right
                </span>
              </div>
            </div>

            <!-- MAIN CONTENT: Prominent Title & Short Description -->
            <div class="flex flex-col gap-0.5 min-w-0">
              <h3 class="text-[15px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-1">
                {{ ticket.judul }}
              </h3>
              <p v-if="ticket.deskripsi" class="text-[12.5px] font-normal text-slate-500 line-clamp-1 leading-relaxed">
                {{ ticket.deskripsi }}
              </p>
            </div>

            <!-- METADATA & FOOTER ROW: Unit, Category, Priority, SLA, & Timestamp -->
            <div class="flex items-center justify-between gap-3 text-[12px] pt-1.5 border-t border-slate-100 flex-wrap sm:flex-nowrap">
              <div class="flex items-center gap-x-4 gap-y-1 flex-wrap text-slate-600">
                <!-- Unit / Queue -->
                <span class="flex items-center gap-1.5 font-medium text-slate-700" title="Unit Tujuan">
                  <span class="material-symbols-outlined text-[15px] text-slate-400">
                    {{ getQueueIcon(ticket) }}
                  </span>
                  <span>{{ ticket.queue_nama || (ticket.queue_kode ? `${ticket.queue_kode} Support` : 'IT Support') }}</span>
                </span>

                <!-- Category -->
                <span class="flex items-center gap-1.5 text-slate-500" title="Kategori Ticket">
                  <span class="material-symbols-outlined text-[15px] text-slate-400">label</span>
                  <span>{{ ticket.kategori || 'Support' }}</span>
                </span>

                <!-- Priority (Subtle Badge) -->
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border"
                  :class="getPriorityInfo(ticket.prioritas).class"
                  title="Prioritas"
                >
                  <span class="material-symbols-outlined text-[13px]">
                    {{ getPriorityInfo(ticket.prioritas).icon }}
                  </span>
                  <span>Priority: {{ getPriorityInfo(ticket.prioritas).label }}</span>
                </span>

                <!-- SLA Countdown -->
                <span class="flex items-center gap-1 font-medium" :class="getSlaInfo(ticket).isOverdue ? 'text-rose-600' : 'text-slate-600'" title="SLA Ticket">
                  <span class="material-symbols-outlined text-[15px]" :class="getSlaInfo(ticket).isOverdue ? 'text-rose-500' : 'text-slate-400'">
                    {{ getSlaInfo(ticket).icon }}
                  </span>
                  <span>SLA {{ getSlaInfo(ticket).text }}</span>
                </span>
              </div>

              <!-- Secondary Information (Timestamp, Comments, Attachments) -->
              <div class="flex items-center gap-3 text-[11.5px] text-slate-400 shrink-0 font-normal ml-auto sm:ml-0">
                <span class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-[13.5px]">schedule</span>
                  <span>{{ formatRelativeTime(ticket.diperbarui_pada || ticket.dibuat_pada) }}</span>
                </span>

                <span v-if="ticket.total_komentar > 0" class="flex items-center gap-1" title="Komentar">
                  <span class="material-symbols-outlined text-[13.5px]">chat_bubble_outline</span>
                  <span>{{ ticket.total_komentar }}</span>
                </span>

                <span v-if="ticket.has_attachment" class="flex items-center gap-1" title="Lampiran">
                  <span class="material-symbols-outlined text-[13.5px]">attach_file</span>
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- ── ADMIN / SUPERADMIN ROLE TICKET CARDS ── -->
        <template v-else>
          <div
            v-for="ticket in paginatedTickets"
            :key="ticket.id"
            @click="openDetail(ticket)"
            class="tck-list-item group relative flex flex-col bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs p-3.5 sm:p-4 transition-all duration-200 cursor-pointer select-none gap-2"
          >
            <!-- TOP ROW: Subtle Ticket ID (Left) | Status Badge & Row Action Menu (Right) -->
            <div class="flex items-center justify-between gap-3 min-w-0">
              <span class="text-[11.5px] font-mono font-medium text-slate-400 tracking-wide">
                {{ ticket.nomor_tiket || `TCK-${ticket.id}` }}
              </span>

              <div class="flex items-center gap-2 shrink-0">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold border transition-all"
                  :class="getStatusDotInfo(ticket.status_tiket).badgeClass"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full shrink-0"
                    :class="getStatusDotInfo(ticket.status_tiket).dotClass"
                  ></span>
                  <span>{{ getStatusDotInfo(ticket.status_tiket).label }}</span>
                </span>

                <div @click.stop class="shrink-0">
                  <AppRowActions :actions="getTicketActions(ticket)" />
                </div>
              </div>
            </div>

            <!-- MAIN CONTENT: Prominent Title & Short Description -->
            <div class="flex flex-col gap-0.5 min-w-0">
              <h3 class="text-[15px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-1">
                {{ ticket.judul }}
              </h3>
              <p v-if="ticket.deskripsi" class="text-[12.5px] font-normal text-slate-500 line-clamp-1 leading-relaxed">
                {{ ticket.deskripsi }}
              </p>
            </div>

            <!-- METADATA ROW 1: Requester, Unit, Category (Plain Text + Icons) -->
            <div class="flex items-center gap-x-4 gap-y-1 flex-wrap text-[12px] text-slate-600">
              <!-- Requester / Pelapor -->
              <span class="flex items-center gap-1.5 font-medium text-slate-700" title="Pelapor / Requester">
                <span class="material-symbols-outlined text-[15px] text-slate-400">person</span>
                <span>{{ ticket.pelapor_nama || ticket.pelapor || 'User' }}</span>
              </span>

              <!-- Support Unit / Queue -->
              <span class="flex items-center gap-1.5 font-medium text-slate-700" title="Unit Tujuan">
                <span class="material-symbols-outlined text-[15px] text-slate-400">
                  {{ getQueueIcon(ticket) }}
                </span>
                <span>{{ ticket.queue_nama || (ticket.queue_kode ? `${ticket.queue_kode} Support` : 'IT Support') }}</span>
              </span>

              <!-- Category -->
              <span class="flex items-center gap-1.5 text-slate-500" title="Kategori Ticket">
                <span class="material-symbols-outlined text-[15px] text-slate-400">label</span>
                <span>{{ ticket.kategori || 'Support' }}</span>
              </span>
            </div>

            <!-- METADATA ROW 2 & FOOTER: Priority Badge, SLA, Assignee, & Timestamp -->
            <div class="flex items-center justify-between gap-3 text-[12px] pt-1.5 border-t border-slate-100 flex-wrap sm:flex-nowrap">
              <div class="flex items-center gap-x-4 gap-y-1 flex-wrap text-slate-600">
                <!-- Priority (Subtle Badge) -->
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border"
                  :class="getPriorityInfo(ticket.prioritas).class"
                  title="Prioritas"
                >
                  <span class="material-symbols-outlined text-[13px]">
                    {{ getPriorityInfo(ticket.prioritas).icon }}
                  </span>
                  <span>Priority: {{ getPriorityInfo(ticket.prioritas).label }}</span>
                </span>

                <!-- SLA Countdown -->
                <span class="flex items-center gap-1 font-medium" :class="getSlaInfo(ticket).isOverdue ? 'text-rose-600' : 'text-slate-600'" title="SLA Ticket">
                  <span class="material-symbols-outlined text-[15px]" :class="getSlaInfo(ticket).isOverdue ? 'text-rose-500' : 'text-slate-400'">
                    {{ getSlaInfo(ticket).icon }}
                  </span>
                  <span>SLA {{ getSlaInfo(ticket).text }}</span>
                </span>

                <!-- Assignee -->
                <span
                  class="flex items-center gap-1 font-medium"
                  :class="ticket.assigned_to_nama || ticket.assigned_to ? 'text-slate-700' : 'text-amber-700 font-semibold'"
                  title="Penanggung Jawab / Assignee"
                >
                  <span
                    class="material-symbols-outlined text-[15px]"
                    :class="ticket.assigned_to_nama || ticket.assigned_to ? 'text-slate-400' : 'text-amber-500'"
                  >
                    {{ ticket.assigned_to_nama || ticket.assigned_to ? 'person_pin' : 'warning' }}
                  </span>
                  <span>{{ ticket.assigned_to_nama || ticket.assigned_to ? getAssigneeName(ticket.assigned_to_nama || ticket.assigned_to) : 'Unassigned' }}</span>
                </span>
              </div>

              <!-- Secondary Information (Timestamp, Comments, Attachments) -->
              <div class="flex items-center gap-3 text-[11.5px] text-slate-400 shrink-0 font-normal ml-auto sm:ml-0">
                <span class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-[13.5px]">schedule</span>
                  <span>{{ formatRelativeTime(ticket.diperbarui_pada || ticket.dibuat_pada) }}</span>
                </span>

                <span v-if="ticket.total_komentar > 0" class="flex items-center gap-1" title="Komentar">
                  <span class="material-symbols-outlined text-[13.5px]">chat_bubble_outline</span>
                  <span>{{ ticket.total_komentar }}</span>
                </span>

                <span v-if="ticket.has_attachment" class="flex items-center gap-1" title="Lampiran">
                  <span class="material-symbols-outlined text-[13.5px]">attach_file</span>
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- ── EMPTY STATES ── -->
        <div v-if="filteredTickets.length === 0" class="py-16 text-center bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div class="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1F5F9] text-[#94A3B8] mb-3"
            >
              <span class="material-symbols-outlined text-[24px]">inbox</span>
            </div>

            <!-- Empty state title -->
            <h3 class="text-sm font-bold text-[#0F172A]">
              {{
                searchQuery || filterStatus || filterPrioritas || filterQueue
                  ? 'Tidak ada ticket yang cocok'
                  : !isAdmin && !isSuperAdmin
                    ? 'Belum ada request'
                    : activeTab === 'all'
                      ? 'Inbox kosong'
                      : 'Tidak ada ticket'
              }}
            </h3>

            <!-- Empty state description -->
            <p class="mt-1 text-xs text-[#64748B] max-w-xs">
              {{
                searchQuery || filterStatus || filterPrioritas || filterQueue
                  ? 'Coba ubah pencarian atau filter.'
                  : !isAdmin && !isSuperAdmin
                    ? 'Pengajuan bantuan IT Anda akan muncul di sini.'
                    : activeTab === 'all'
                      ? 'Tidak ada ticket yang menunggu penanganan.'
                      : 'Belum ada ticket pada kategori ini.'
              }}
            </p>

            <button
              v-if="!searchQuery && !filterStatus && !filterPrioritas && !filterQueue"
              type="button"
              @click="openAdd"
              class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#1D4ED8] transition-all cursor-pointer"
            >
              <span class="material-symbols-outlined text-[16px]">add</span>
              <span>{{
                !isAdmin && !isSuperAdmin ? 'Request Ticket Pertama' : 'Buat Tiket Baru'
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
      />
    </div>

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
      <form class="flex flex-col space-y-5" @submit.prevent="saveTicket">
        <!-- Error Banner -->
        <div
          v-if="modalError"
          role="alert"
          class="rounded-lg bg-rose-50 border border-rose-200 px-3.5 py-2 text-[11.5px] font-semibold text-rose-600 shadow-2xs flex items-center gap-2"
        >
          <span class="material-symbols-outlined text-[16px] shrink-0">error</span>
          <span>{{ modalError }}</span>
        </div>

        <!-- All inputs in a single flat list (no per-category grouping) -->
        <div class="space-y-4">
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
            <span class="text-[10.5px] text-[#7C8BAC]"
              >Kosongkan untuk membuat tiket atas nama sendiri ({{ user?.nama || 'Anda' }}), atau pilih user lain.</span
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
              placeholder="Contoh: Laptop tidak dapat terhubung ke Wi-Fi"
              class="h-10 w-full rounded-lg border border-[#E5EAEF] bg-white px-3 text-[12px] font-medium text-[#2A3547] placeholder-[#94A3B8] focus:border-[#5D87FF] focus:outline-none transition-all shadow-2xs"
            />
          </label>

          <!-- Deskripsi -->
          <label class="flex flex-col gap-1.5">
            <span class="text-[12px] font-semibold text-[#2A3547]">Deskripsi Kendala</span>
            <textarea
              v-model="form.deskripsi"
              rows="3"
              placeholder="Jelaskan kendala secara singkat dan detail agar tim dapat membantu..."
              class="min-h-[80px] max-h-[140px] w-full rounded-lg border border-[#E5EAEF] bg-white p-2.5 text-[12px] font-medium text-[#2A3547] placeholder-[#94A3B8] focus:border-[#5D87FF] focus:outline-none transition-all resize-y shadow-2xs"
            ></textarea>
          </label>

          <!-- Unit Support Target -->
          <div class="flex flex-col gap-1.5">
            <span class="text-[12px] font-semibold text-[#2A3547]"
              >Unit Support Target <span class="text-[#FA896B]">*</span></span
            >
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                @click="setSupportUnit('IT')"
                class="flex h-[60px] items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer select-none"
                :class="
                  selectedSupportUnit === 'IT'
                    ? 'border-[#5D87FF] bg-[#ECF2FF] text-[#5D87FF] ring-2 ring-[#5D87FF]/20 shadow-xs'
                    : 'border-[#E5EAEF] bg-white text-[#2A3547] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]'
                "
              >
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  :class="selectedSupportUnit === 'IT' ? 'bg-[#5D87FF] text-white' : 'bg-[#F1F5F9] text-[#7C8BAC]'"
                >
                  <span class="material-symbols-outlined text-[18px]">computer</span>
                </div>
                <div>
                  <p class="text-[12.5px] font-bold">IT Support</p>
                  <p class="text-[10.5px] text-[#7C8BAC] leading-tight">Perangkat, Network & Software</p>
                </div>
              </button>

              <button
                type="button"
                @click="setSupportUnit('HR')"
                class="flex h-[60px] items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer select-none"
                :class="
                  selectedSupportUnit === 'HR'
                    ? 'border-[#5D87FF] bg-[#ECF2FF] text-[#5D87FF] ring-2 ring-[#5D87FF]/20 shadow-xs'
                    : 'border-[#E5EAEF] bg-white text-[#2A3547] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]'
                "
              >
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  :class="selectedSupportUnit === 'HR' ? 'bg-[#5D87FF] text-white' : 'bg-[#F1F5F9] text-[#7C8BAC]'"
                >
                  <span class="material-symbols-outlined text-[18px]">badge</span>
                </div>
                <div>
                  <p class="text-[12.5px] font-bold">HR Support</p>
                  <p class="text-[10.5px] text-[#7C8BAC] leading-tight">Kepegawaian, Dokumen & QNA</p>
                </div>
              </button>

              <button
                type="button"
                @click="setSupportUnit('GA')"
                class="flex h-[60px] items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer select-none"
                :class="
                  selectedSupportUnit === 'GA'
                    ? 'border-[#5D87FF] bg-[#ECF2FF] text-[#5D87FF] ring-2 ring-[#5D87FF]/20 shadow-xs'
                    : 'border-[#E5EAEF] bg-white text-[#2A3547] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]'
                "
              >
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  :class="selectedSupportUnit === 'GA' ? 'bg-[#5D87FF] text-white' : 'bg-[#F1F5F9] text-[#7C8BAC]'"
                >
                  <span class="material-symbols-outlined text-[18px]">corporate_fare</span>
                </div>
                <div>
                  <p class="text-[12.5px] font-bold">GA Support</p>
                  <p class="text-[10.5px] text-[#7C8BAC] leading-tight">Fasilitas, Gedung & Logistik</p>
                </div>
              </button>
            </div>
          </div>

          <!-- Kategori Tiket -->
          <div class="flex flex-col gap-1.5">
            <span class="text-[12px] font-semibold text-[#2A3547]"
              >Kategori Tiket {{ selectedSupportUnit }} <span class="text-[#FA896B]">*</span></span
            >
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                v-for="cat in availableCategories"
                :key="cat.value"
                type="button"
                @click="form.kategori = cat.value"
                class="flex h-[68px] flex-col justify-between rounded-xl border p-2.5 text-left transition-all cursor-pointer select-none"
                :class="
                  form.kategori === cat.value
                    ? 'border-[#5D87FF] bg-[#ECF2FF] text-[#5D87FF] ring-2 ring-[#5D87FF]/20 shadow-xs'
                    : 'border-[#E5EAEF] bg-white text-[#2A3547] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]'
                "
              >
                <div class="flex items-center justify-between">
                  <span class="text-[12px] font-bold">{{ cat.title }}</span>
                  <span
                    v-if="form.kategori === cat.value"
                    class="material-symbols-outlined text-[15px] text-[#5D87FF]"
                    >check_circle</span
                  >
                </div>
                <span class="text-[10px] text-[#7C8BAC] leading-tight">{{ cat.desc }}</span>
              </button>
            </div>
          </div>

          <!-- Prioritas SLA & Status -->
          <div
            class="grid gap-3"
            :class="modalMode === 'edit' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'"
          >
            <!-- Prioritas SLA -->
            <label class="flex flex-col gap-1.5 w-full">
              <span class="text-[12px] font-semibold text-[#2A3547]">Prioritas SLA</span>
              <select
                v-model="form.prioritas"
                class="h-10 w-full rounded-lg border border-[#E5EAEF] bg-white px-3 text-[12px] font-medium text-[#2A3547] focus:border-[#5D87FF] focus:outline-none transition-all appearance-none cursor-pointer shadow-2xs"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </label>

            <!-- Status Tiket (Edit Mode Only) -->
            <label v-if="modalMode === 'edit'" class="flex flex-col gap-1.5 w-full">
              <span class="text-[12px] font-semibold text-[#2A3547]">Status Tiket</span>
              <select
                v-model="form.status_tiket"
                class="h-10 w-full rounded-lg border border-[#E5EAEF] bg-white px-3 text-[12px] font-medium text-[#2A3547] focus:border-[#5D87FF] focus:outline-none transition-all appearance-none cursor-pointer shadow-2xs"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </label>
          </div>

          <!-- Lampiran -->
          <div class="flex flex-col gap-1.5">
            <span class="text-[12px] font-semibold text-[#2A3547]">Lampiran (Opsional)</span>
            <div class="flex items-center gap-3 flex-wrap">
              <label
                class="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E5EAEF] bg-white px-3.5 text-[12px] font-bold text-[#2A3547] hover:bg-[#F8FAFC] hover:border-[#5D87FF] transition-all cursor-pointer select-none shadow-2xs"
              >
                <span class="material-symbols-outlined text-[18px] text-[#5D87FF]"
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
              <span class="text-[11px] font-normal text-[#7C8BAC]"
                >PNG, JPG, GIF, WEBP, PDF, Word, Excel, PowerPoint hingga 5 MB per file</span
              >
              <span
                v-if="isTicketAttachmentLoading"
                class="text-[11px] font-medium text-[#5D87FF] flex items-center gap-1"
              >
                <span class="material-symbols-outlined text-[14px] animate-spin"
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
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ECF2FF] text-[#2563EB]"
                  >
                    <span class="material-symbols-outlined text-[20px]">{{ getAttachmentIcon(att.data) }}</span>
                  </div>
                  <div class="min-w-0">
                    <p class="text-[12px] font-bold text-[#2A3547] truncate">{{ att.name || 'Lampiran' }}</p>
                    <p class="text-[10.5px] text-[#7C8BAC] truncate mt-0.5">
                      Siap diunggah bersama tiket
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  @click="removeAttachment(i)"
                  class="flex h-7 w-7 items-center justify-center rounded-lg text-[#7C8BAC] hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
                  title="Hapus Lampiran"
                >
                  <span class="material-symbols-outlined text-[18px]">close</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <!-- Footer Action Bar -->
        <div class="flex items-center justify-between pt-4 mt-5 border-t border-[#E5EAEF]">
          <button
            type="button"
            :disabled="isSubmitting"
            @click="closeModal"
            class="h-9 rounded-lg border border-[#E5EAEF] px-3.5 text-[12px] font-bold text-[#7C8BAC] hover:bg-[#F8FAFC] hover:text-[#2A3547] transition-all cursor-pointer"
          >
            Batal
          </button>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#5D87FF] px-4 text-[12px] font-bold text-white hover:bg-[#4A73E0] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span v-if="isSubmitting" class="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
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
      </form>
    </AppModal>

    <!-- ── Detail Ticket Modal (Modern SaaS Ticket Workspace) ─ -->
    <AppModal :is-open="showDetailModal" title="" size="xl" @close="closeModal">
      <div v-if="selectedTicket" class="flex flex-col text-[#0F172A]">
        <!-- HEADER AREA (Compact SaaS Title Block) -->
        <div class="flex items-center justify-between gap-4 border-b border-[#F1F5F9] pb-4 mb-4">
          <div class="flex flex-col gap-1 min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span
                class="font-mono text-xs font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md"
              >
                {{ selectedTicket.nomor_tiket }}
              </span>
              <span class="text-xs text-[#CBD5E1]">·</span>
              <div class="flex items-center gap-1.5">
                <span
                  class="h-2 w-2 rounded-full shrink-0"
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
            <h2 class="text-[17px] font-bold text-[#0F172A] leading-snug line-clamp-2">
              {{ selectedTicket.judul }}
            </h2>
          </div>
        </div>

        <!-- NAVIGATION TABS (Clean Segmented Bar with Hover Effects) -->
        <div class="flex items-center gap-1 border-b border-[#F1F5F9] pb-3 mb-5">
          <button
            type="button"
            @click="activeDetailTab = 'detail'"
            class="group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer select-none"
            :class="
              activeDetailTab === 'detail'
                ? 'bg-[#EFF6FF] text-[#2563EB] shadow-xs ring-1 ring-[#2563EB]/20'
                : 'text-[#64748B] hover:bg-[#DBEAFE] hover:text-[#1D4ED8] hover:shadow-sm hover:ring-1 hover:ring-[#2563EB]/30 hover:-translate-y-px'
            "
          >
            <span class="material-symbols-outlined text-[16px] transition-colors duration-200" :class="activeDetailTab === 'detail' ? 'text-[#2563EB]' : 'text-[#64748B] group-hover:text-[#1D4ED8]'">info</span>
            <span>Overview</span>
          </button>

          <button
            type="button"
            @click="activeDetailTab = 'history'"
            class="group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer select-none"
            :class="
              activeDetailTab === 'history'
                ? 'bg-[#EFF6FF] text-[#2563EB] shadow-xs ring-1 ring-[#2563EB]/20'
                : 'text-[#64748B] hover:bg-[#DBEAFE] hover:text-[#1D4ED8] hover:shadow-sm hover:ring-1 hover:ring-[#2563EB]/30 hover:-translate-y-px'
            "
          >
            <span class="material-symbols-outlined text-[16px] transition-colors duration-200" :class="activeDetailTab === 'history' ? 'text-[#2563EB]' : 'text-[#64748B] group-hover:text-[#1D4ED8]'">history</span>
            <span>Activity</span>
            <span
              class="ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-medium"
              :class="activeDetailTab === 'history' ? 'bg-[#2563EB]/10 text-[#2563EB]' : 'bg-[#E2E8F0]/70 text-[#475569]'"
            >
              {{ ticketHistory.length }}
            </span>
          </button>

          <button
            type="button"
            @click="openCommentsTab"
            class="group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer select-none"
            :class="
              activeDetailTab === 'comments'
                ? 'bg-[#EFF6FF] text-[#2563EB] shadow-xs ring-1 ring-[#2563EB]/20'
                : 'text-[#64748B] hover:bg-[#DBEAFE] hover:text-[#1D4ED8] hover:shadow-sm hover:ring-1 hover:ring-[#2563EB]/30 hover:-translate-y-px'
            "
          >
            <span class="material-symbols-outlined text-[16px] transition-colors duration-200" :class="activeDetailTab === 'comments' ? 'text-[#2563EB]' : 'text-[#64748B] group-hover:text-[#1D4ED8]'">forum</span>
            <span>Discussion</span>
            <span
              class="ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-medium"
              :class="activeDetailTab === 'comments' ? 'bg-[#2563EB]/10 text-[#2563EB]' : 'bg-[#E2E8F0]/70 text-[#475569]'"
            >
              {{ ticketComments.length }}
            </span>
          </button>
        </div>

        <!-- MAIN SCROLL CONTENT AREA -->
        <div class="space-y-6">
          <!-- TAB 1: OVERVIEW -->
          <div v-if="activeDetailTab === 'detail'" class="space-y-6">
            <!-- Deskripsi Kendala -->
            <div class="space-y-1.5">
              <h3 class="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                Deskripsi
              </h3>
              <p class="text-xs text-[#334155] leading-relaxed whitespace-pre-wrap">
                {{ selectedTicket.deskripsi || 'Tidak ada catatan deskripsi rincian.' }}
              </p>
            </div>

            <!-- Detail Tiket Grid (2-Column Desktop, 1-Column Mobile) -->
            <div class="pt-4 border-t border-[#F1F5F9] space-y-3">
              <h3 class="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                Detail Tiket
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-xs">
                <!-- Pelapor -->
                <div class="flex flex-col gap-0.5">
                  <span class="text-[11px] font-medium text-[#94A3B8]">Pelapor</span>
                  <span class="font-semibold text-[#0F172A]">{{
                    selectedTicket.pelapor_nama || selectedTicket.pelapor || '—'
                  }}</span>
                  <span
                    v-if="selectedTicket.pelapor_jabatan || selectedTicket.pelapor_nik"
                    class="text-[11px] text-[#64748B]"
                  >
                    {{ selectedTicket.pelapor_jabatan || 'User' }}
                    {{ selectedTicket.pelapor_nik ? '· NIK ' + selectedTicket.pelapor_nik : '' }}
                  </span>
                </div>

                <!-- Penanggung Jawab -->
                <div class="flex flex-col gap-0.5">
                  <span class="text-[11px] font-medium text-[#94A3B8]">Assignee</span>
                  <span
                    class="font-semibold"
                    :class="
                      selectedTicket.assigned_to_nama || selectedTicket.assigned_to
                        ? 'text-[#0F172A]'
                        : 'text-[#94A3B8] italic'
                    "
                  >
                    {{
                      getAssigneeName(
                        selectedTicket.assigned_to_nama || selectedTicket.assigned_to,
                        'Unassigned',
                      )
                    }}
                  </span>
                </div>

                <!-- Kategori -->
                <div class="flex flex-col gap-0.5">
                  <span class="text-[11px] font-medium text-[#94A3B8]">Kategori</span>
                  <span class="font-medium text-[#0F172A]">{{
                    selectedTicket.kategori || 'Support'
                  }}</span>
                </div>

                <!-- Priority & SLA -->
                <div class="flex flex-col gap-0.5">
                  <span class="text-[11px] font-medium text-[#94A3B8]">Priority & SLA</span>
                  <span class="font-medium text-[#0F172A]">
                    {{ getPriorityInfo(selectedTicket.prioritas).label }} ·
                    <span :class="getSlaInfo(selectedTicket).class">{{
                      getSlaInfo(selectedTicket).text
                    }}</span>
                  </span>
                </div>

                <!-- Unit Tujuan -->
                <div class="flex flex-col gap-0.5">
                  <span class="text-[11px] font-medium text-[#94A3B8]">Unit Tujuan</span>
                  <span class="font-medium text-[#0F172A]">{{
                    selectedTicket.queue_nama || selectedTicket.queue_kode || 'IT Support'
                  }}</span>
                </div>

                <!-- Created At -->
                <div class="flex flex-col gap-0.5">
                  <span class="text-[11px] font-medium text-[#94A3B8]">Dibuat Pada</span>
                  <span class="font-medium text-[#334155]">{{
                    formatDateTime(selectedTicket.dibuat_pada)
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Attachment Display (Download-only List) -->
            <div v-if="isTicketAttachmentLoading" class="text-xs text-[#94A3B8] py-2">
              Memuat lampiran tiket...
            </div>
            <div
              v-else-if="selectedTicket.attachments && selectedTicket.attachments.length"
              class="pt-4 border-t border-[#F1F5F9] space-y-2"
            >
              <h3
                class="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1"
              >
                <span class="material-symbols-outlined text-[15px]">attach_file</span> Lampiran
                <span class="text-[#CBD5E1] font-normal">({{ selectedTicket.attachments.length }})</span>
              </h3>
              <ul class="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                <li
                  v-for="(att, i) in selectedTicket.attachments"
                  :key="att.id"
                  class="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div
                      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ECF2FF] text-[#2563EB]"
                    >
                      <span class="material-symbols-outlined text-[20px]">{{ getAttachmentIcon(att.attachment) }}</span>
                    </div>
                    <div class="min-w-0">
                      <p class="text-[12px] font-bold text-[#2A3547] truncate">
                        {{ att.name || 'Lampiran' }}
                      </p>
                      <p class="text-[10.5px] text-[#7C8BAC] truncate mt-0.5">
                        {{ att.nama_pengguna || 'Pengguna' }}
                        <template v-if="att.dibuat_pada"> · {{ formatDateTime(att.dibuat_pada) }}</template>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    @click="downloadAttachment(att.attachment, att.name || 'lampiran-' + selectedTicket.nomor_tiket + '-' + (i + 1))"
                    class="flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[11px] font-bold text-[#2563EB] hover:bg-[#EFF6FF] hover:border-[#2563EB] transition-all cursor-pointer shadow-2xs shrink-0"
                  >
                    <span class="material-symbols-outlined text-[16px]">download</span>
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
              class="py-8 text-center text-xs text-[#94A3B8]"
            >
              Belum ada riwayat aktivitas pada ticket ini.
            </div>

            <!-- Activity Timeline -->
            <div
              v-else
              class="relative pl-5 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-[#E2E8F0]"
            >
              <div
                v-for="log in ticketHistory"
                :key="log.id"
                class="relative flex flex-col gap-1 text-xs"
              >
                <!-- Dot on Timeline -->
                <div class="absolute -left-5 top-1 h-2 w-2 rounded-full bg-[#2563EB]"></div>

                <!-- Event Header & Actor -->
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5">
                    <span class="font-semibold text-[#0F172A]">{{ log.aksi }}</span>
                    <span class="text-[11px] text-[#64748B]"
                      >oleh <strong>{{ log.oleh_pengguna || 'Sistem' }}</strong></span
                    >
                  </div>
                  <span class="text-[11px] text-[#94A3B8]">{{
                    formatDateTime(log.dibuat_pada)
                  }}</span>
                </div>

                <!-- Details / Diffs -->
                <div
                  v-if="log.perubahan"
                  class="text-[11.5px] text-[#475569] bg-[#F8FAFC] p-2.5 rounded-lg border border-[#F1F5F9] mt-0.5"
                >
                  {{ log.perubahan }}
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 3: DISCUSSION THREAD -->
          <div
            v-else-if="activeDetailTab === 'comments'"
            class="flex max-h-[60vh] min-h-0 flex-col gap-3"
          >
            <!-- Messages Container (scrollable inside the chat area) -->
            <div
              ref="chatContainer"
              class="flex min-h-[120px] flex-1 flex-col gap-3 overflow-y-auto pr-1"
            >
              <div
                v-if="isCommentsLoading"
                class="flex flex-col items-center justify-center py-10 gap-2 text-[#94A3B8]"
              >
                <span class="material-symbols-outlined text-[24px] animate-spin text-[#2563EB]"
                  >progress_activity</span
                >
                <span class="text-xs font-medium">Memuat percakapan...</span>
              </div>

              <div
                v-else-if="ticketComments.length === 0"
                class="flex flex-col items-center justify-center py-10 gap-2 text-center text-[#94A3B8]"
              >
                <span class="material-symbols-outlined text-[28px]">chat_bubble_outline</span>
                <p class="text-xs font-semibold text-[#334155]">
                  Belum ada diskusi pada ticket ini.
                </p>
                <p class="text-[11px]">Tulis komentar melalui form di bawah.</p>
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
                <div class="flex items-center gap-1.5 text-[10.5px] text-[#94A3B8]">
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
                      : 'bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] rounded-bl-xs'
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
                    <span class="material-symbols-outlined text-[14px]">attach_file</span>
                    {{ c.is_attachment_loading ? 'Memuat...' : 'Muat lampiran' }}
                  </button>

                  <div
                    v-if="c.attachment"
                    class="mt-2 flex items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2"
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#ECF2FF] text-[#2563EB]">
                        <span class="material-symbols-outlined text-[16px]">{{ getAttachmentIcon(c.attachment) }}</span>
                      </div>
                      <span class="text-[11px] font-semibold text-[#334155] truncate">{{ c.attachment_name || 'Lampiran diskusi' }}</span>
                    </div>
                    <button
                      type="button"
                      @click="downloadAttachment(c.attachment, c.attachment_name || 'lampiran-diskusi-' + c.id)"
                      class="flex h-7 items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2 text-[10px] font-bold text-[#2563EB] hover:bg-[#EFF6FF] hover:border-[#2563EB] transition-all cursor-pointer shrink-0"
                    >
                      <span class="material-symbols-outlined text-[14px]">download</span>
                      <span>Unduh</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Comment Composer or Locked Notice -->
            <div
              v-if="['Resolved', 'Closed', 'Cancelled'].includes(selectedTicket.status_tiket)"
              class="flex shrink-0 items-center gap-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-xs font-medium text-[#64748B]"
            >
              <span class="material-symbols-outlined text-[16px] text-[#94A3B8]">lock</span>
              <span
                >Discussion ditutup karena status ticket sudah
                {{ selectedTicket.status_tiket }}.</span
              >
            </div>

            <div v-else class="flex shrink-0 flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-white p-3">
              <div
                v-if="commentAttachment"
                class="flex items-center justify-between gap-2 rounded-lg bg-[#F8FAFC] p-2 border border-[#E2E8F0]"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ECF2FF] text-[#2563EB]">
                    <span class="material-symbols-outlined text-[16px]">{{ getAttachmentIcon(commentAttachment) }}</span>
                  </div>
                  <span class="text-xs font-bold text-[#0F172A] truncate"
                    >{{ commentAttachmentName || 'File lampiran siap dikirim' }}</span
                  >
                </div>
                <button
                  type="button"
                  @click="removeCommentAttachment"
                  class="text-rose-500 hover:text-rose-700 cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[16px]">close</span>
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
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
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
                  placeholder="Tulis komentar atau catatan perbaikan..."
                  class="h-10 flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
                />

                <button
                  type="submit"
                  :disabled="isSubmittingComment || (!newCommentText.trim() && !commentAttachment)"
                  class="flex h-10 px-4 items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] text-xs font-bold text-white shadow-2xs hover:bg-[#1D4ED8] disabled:opacity-40 transition-all cursor-pointer shrink-0"
                >
                  <span class="material-symbols-outlined text-[16px]">send</span>
                  <span>Kirim</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- FOOTER ACTION BAR (Admin Status Selector & Claim Actions) -->
        <div
          v-if="isAdmin || isSuperAdmin"
          class="flex items-center justify-between gap-4 border-t border-[#F1F5F9] pt-4 mt-6"
        >
          <div class="flex items-center gap-2">
            <!-- Custom Modern & Minimalist Status Selector Dropdown -->
            <div
              v-if="!['Closed', 'Resolved', 'Cancelled'].includes(selectedTicket.status_tiket)"
              class="relative inline-block text-left"
            >
              <button
                type="button"
                :disabled="isUpdatingStatus"
                @click="toggleStatusDropdown"
                class="inline-flex h-9 items-center gap-2 rounded-xl border border-[#E5EAEF] bg-white px-3.5 text-xs font-bold text-[#2A3547] shadow-2xs hover:bg-[#F8FAFC] hover:border-[#5D87FF] transition-all cursor-pointer disabled:opacity-50"
              >
                <span
                  class="h-2 w-2 rounded-full shrink-0"
                  :class="getStatusDotInfo(selectedTicket.status_tiket).dotClass"
                ></span>
                <span>{{ getStatusDotInfo(selectedTicket.status_tiket).label }}</span>
                <span class="material-symbols-outlined text-[16px] text-[#7C8BAC]">expand_more</span>
              </button>

              <!-- Dropdown Menu Popover -->
              <Transition name="fade">
                <div
                  v-if="showStatusDropdown"
                  class="absolute bottom-full left-0 mb-1.5 w-44 rounded-xl border border-[#E5EAEF] bg-white p-1.5 shadow-lg z-50 focus:outline-none"
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
                    :class="selectedTicket.status_tiket === st.value ? 'bg-[#ECF2FF] font-bold text-[#5D87FF]' : ''"
                  >
                    <div class="flex items-center gap-2">
                      <span class="h-2 w-2 rounded-full" :class="st.dot"></span>
                      <span>{{ st.label }}</span>
                    </div>
                    <span
                      v-if="selectedTicket.status_tiket === st.value"
                      class="material-symbols-outlined text-[15px] text-[#5D87FF]"
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
              class="h-9 inline-flex items-center gap-1.5 rounded-xl bg-[#5D87FF] px-3.5 text-xs font-bold text-white shadow-2xs hover:bg-[#4570EA] disabled:opacity-50 transition-all cursor-pointer"
            >
              <span class="material-symbols-outlined text-[16px]">person_add</span>
              <span>{{
                isClaiming === selectedTicket.id ? 'Mengambil...' : 'Ambil Tiket Ini'
              }}</span>
            </button>
          </div>

          <!-- Assign to Admin (Superadmin only) -->
          <div v-if="isSuperAdmin" class="relative inline-block text-left">
            <button
              type="button"
              :disabled="isReassigning || ['Closed', 'Resolved', 'Cancelled'].includes(selectedTicket.status_tiket)"
              @click="toggleReassignDropdown"
              class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E5EAEF] bg-white px-3.5 text-xs font-bold text-[#2A3547] shadow-2xs hover:bg-[#F8FAFC] hover:border-[#5D87FF] transition-all cursor-pointer disabled:opacity-50"
            >
              <span class="material-symbols-outlined text-[16px] text-[#2563EB]">assignment_ind</span>
              <span>Assign ke Admin</span>
              <span class="material-symbols-outlined text-[16px] text-[#7C8BAC]">expand_more</span>
            </button>

            <Transition name="fade">
              <div
                v-if="showReassignDropdown"
                class="absolute bottom-full left-0 mb-1.5 w-64 rounded-xl border border-[#E5EAEF] bg-white p-1.5 shadow-lg z-50"
              >
                <p class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  Admin unit {{ selectedTicket.queue_nama || selectedTicket.queue_kode || '—' }}
                </p>
                <button
                  v-for="admin in getAdminsForQueue(selectedTicket.queue_id)"
                  :key="admin.id"
                  type="button"
                  :disabled="isReassigning"
                  @click="assignTicket(selectedTicket, admin.id)"
                  class="flex h-8 w-full items-center justify-between rounded-lg px-2.5 text-xs font-medium text-[#2A3547] hover:bg-[#F8FAFC] transition-colors cursor-pointer disabled:opacity-50"
                  :class="selectedTicket.assigned_to_user_id === admin.id ? 'bg-[#ECF2FF] font-bold text-[#5D87FF]' : ''"
                >
                  <span class="truncate">{{ admin.nama }}</span>
                  <span
                    v-if="selectedTicket.assigned_to_user_id === admin.id"
                    class="material-symbols-outlined text-[15px] text-[#5D87FF]"
                    >check</span
                  >
                </button>
                <p
                  v-if="getAdminsForQueue(selectedTicket.queue_id).length === 0"
                  class="px-2 py-3 text-center text-[11px] text-[#94A3B8]"
                >
                  Tidak ada admin terdaftar di unit ini.
                </p>
              </div>
            </Transition>
          </div>

          <!-- Default Close Button -->
          <div class="flex items-center justify-end gap-2 ml-auto">
            <button
              type="button"
              @click="closeModal"
              class="h-9 rounded-xl border border-[#E5EAEF] px-4 text-xs font-bold text-[#7C8BAC] hover:bg-[#F8FAFC] hover:text-[#2A3547] transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
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
          <span class="material-symbols-outlined text-[28px]">warning</span>
        </div>
        <div>
          <h4 class="text-[16px] font-extrabold text-[#2A3547]">
            Hapus Tiket {{ selectedTicket?.nomor_tiket }}?
          </h4>
          <p class="mt-1 text-[12px] text-[#7C8BAC]">
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

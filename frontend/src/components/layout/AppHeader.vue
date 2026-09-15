<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useApi } from '@/composables/useApi'
import { useTicketEvents } from '@/composables/useTicketEvents'
import SkeletonList from '../ui/skeleton/SkeletonList.vue'
import AppModal from '../ui/AppModal.vue'

defineProps({
  isMobileOpen: { type: Boolean, default: false },
  isCollapsed: { type: Boolean, default: false },
})
defineEmits(['toggle-mobile', 'toggle-collapse'])

const route = useRoute()
const router = useRouter()
const { user, logout, hasPermission, isSuperAdmin } = useAuth()
const { get, post } = useApi()
const { connect: connectSSE, disconnect: disconnectSSE, on: onSSE, off: offSSE } = useTicketEvents()

// Search & UI State
const searchQuery = ref('')
const searchInputRef = ref(null)
const mobileSearchInputRef = ref(null)
const searchContainerRef = ref(null)
const isSearchOpen = ref(false)
const isFetchingSearch = ref(false)
const searchTabFilter = ref('ALL') // ALL, ASSETS, KARYAWAN, TICKETS, USERS

const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
function handleWindowResize() {
  windowWidth.value = window.innerWidth
}
const searchPlaceholder = computed(() => {
  if (windowWidth.value < 640) return 'Cari aset, tiket...'
  if (windowWidth.value < 1024) return 'Cari aset, tiket, user...'
  return 'Cari aset, karyawan, tiket, atau user...'
})

const profileMenuButtonRef = ref(null)
const isProfileOpen = ref(false)

// Password Modal State
const showPasswordModal = ref(false)
const isSubmittingPassword = ref(false)
const passwordModalError = ref('')
const passwordSuccessMessage = ref('')
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

async function openChangePassword() {
  isProfileOpen.value = false
  await nextTick()
  profileMenuButtonRef.value?.focus()
  passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  passwordModalError.value = ''
  passwordSuccessMessage.value = ''
  showPasswordModal.value = true
}

function closePasswordModal() {
  showPasswordModal.value = false
  passwordModalError.value = ''
  passwordSuccessMessage.value = ''
}

async function submitChangePassword() {
  const { currentPassword, newPassword, confirmPassword } = passwordForm.value
  if (!currentPassword) {
    passwordModalError.value = 'Password saat ini wajib diisi.'
    return
  }
  if (!newPassword || newPassword.length < 8) {
    passwordModalError.value = 'Password baru minimal 8 karakter.'
    return
  }
  if (newPassword !== confirmPassword) {
    passwordModalError.value = 'Konfirmasi password baru tidak cocok.'
    return
  }

  isSubmittingPassword.value = true
  passwordModalError.value = ''
  passwordSuccessMessage.value = ''

  try {
    const res = await post('/api/auth/change-password', { currentPassword, newPassword })
    passwordSuccessMessage.value = res.message || 'Password berhasil diperbarui.'
    setTimeout(() => {
      closePasswordModal()
    }, 1500)
  } catch (err) {
    passwordModalError.value = err.message || 'Gagal mengganti password.'
  } finally {
    isSubmittingPassword.value = false
  }
}

const isNotifOpen = ref(false)

// Datasets for Global Search
const allAssets = ref([])
const allKaryawan = ref([])
const allTickets = ref([])
const allUsers = ref([])
const hasLoadedSearch = ref(false)

// Notification / Activity State
const notificationsList = ref([])
const knownTicketStates = ref({})
const knownTicketIds = ref(new Set())
const isFetchingNotif = ref(false)
const notifFilter = ref('ALL')

const realtimeToast = ref(null)

function showRealtimeToast(title, message, nomorTiket = '', type = 'CREATED') {
  if (realtimeToast.value?.timer) clearTimeout(realtimeToast.value.timer)
  const timer = setTimeout(() => {
    realtimeToast.value = null
  }, 5000)
  realtimeToast.value = {
    id: `toast_${Date.now()}`,
    title,
    message,
    nomorTiket,
    type,
    timer,
  }
}

function loadNotifications() {
  try {
    const stored = localStorage.getItem('app_notifications')
    if (stored) notificationsList.value = JSON.parse(stored)
    const storedStates = localStorage.getItem('known_ticket_states')
    if (storedStates) knownTicketStates.value = JSON.parse(storedStates)
  } catch {
    // Silently fail for localStorage access
  }
}

function persistNotifications() {
  try {
    localStorage.setItem('app_notifications', JSON.stringify(notificationsList.value))
    localStorage.setItem('known_ticket_states', JSON.stringify(knownTicketStates.value))
  } catch {
    // Silently fail for localStorage access
  }
}

function addNotificationItem({
  ticketId,
  type,
  title,
  message,
  nomor_tiket,
  judul_tiket,
  status_tiket,
  prioritas,
  pelapor,
  timestamp,
}) {
  const ts = timestamp || Date.now()
  const msg =
    message || (type === 'CREATED' ? 'Tiket baru telah dibuat' : 'Detail tiket diperbarui')

  const recentDuplicate = notificationsList.value.find(
    (n) =>
      n.ticketId === ticketId &&
      n.type === type &&
      n.message === msg &&
      Date.now() - (n.timestamp || 0) < 3000,
  )
  if (recentDuplicate) return

  const notif = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ticketId,
    type,
    title:
      title ||
      (type === 'CREATED'
        ? 'Tiket Baru Masuk'
        : type === 'COMMENT'
          ? 'Komentar Baru'
          : 'Perubahan Tiket'),
    message: msg,
    nomor_tiket: nomor_tiket || `#${ticketId}`,
    judul_tiket: judul_tiket || 'Tiket',
    status_tiket: status_tiket || 'Open',
    prioritas: prioritas || 'Medium (3d)',
    pelapor: pelapor || '',
    timestamp: ts,
    isRead: false,
  }

  notificationsList.value = [notif, ...notificationsList.value]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 50)
  persistNotifications()
}

function seedNotificationsFromTickets(ticketsList) {
  if (notificationsList.value.length > 0) {
    for (const t of ticketsList) {
      if (t.id != null) knownTicketIds.value.add(String(t.id))
    }
    return
  }
  const items = ticketsList.slice(0, 10).map((t) => ({
    id: `notif_seed_${t.id}`,
    ticketId: t.id,
    type: 'CREATED',
    title: 'Tiket Masuk',
    message: t.judul,
    nomor_tiket: t.nomor_tiket,
    judul_tiket: t.judul,
    status_tiket: t.status_tiket,
    prioritas: t.prioritas,
    pelapor: t.pelapor || t.pelapor_nama || '',
    timestamp: new Date(t.diperbarui_pada || t.dibuat_pada).getTime(),
    isRead: true,
  }))
  notificationsList.value = items
  for (const t of ticketsList) {
    if (t.id != null) knownTicketIds.value.add(String(t.id))
  }
  persistNotifications()
}

function syncTicketStatusChanges(ticketsList) {
  if (!Array.isArray(ticketsList)) return
  const isFirstLoad = Object.keys(knownTicketStates.value).length === 0

  for (const t of ticketsList) {
    const ticketKey = String(t.id)
    const prev = knownTicketStates.value[t.id]

    if (!isFirstLoad && !knownTicketIds.value.has(ticketKey)) {
      addNotificationItem({
        ticketId: t.id,
        type: 'CREATED',
        title: 'Tiket Baru Masuk',
        message: t.judul || 'Tiket baru telah dibuat',
        nomor_tiket: t.nomor_tiket,
        judul_tiket: t.judul,
        status_tiket: t.status_tiket,
        prioritas: t.prioritas,
        pelapor: t.pelapor || t.pelapor_nama || '',
        timestamp: new Date(t.dibuat_pada || Date.now()).getTime(),
      })
    }

    if (prev && !isFirstLoad) {
      if (prev.status && prev.status !== t.status_tiket) {
        addNotificationItem({
          ticketId: t.id,
          type: `UPDATED`,
          title: `Perubahan Tiket: ${t.judul}`,
          message: `Status: '${prev.status}' → '${t.status_tiket}'`,
          nomor_tiket: t.nomor_tiket,
          judul_tiket: t.judul,
          status_tiket: t.status_tiket,
          prioritas: t.prioritas,
          pelapor: t.pelapor || t.pelapor_nama || '',
          timestamp: new Date(t.diperbarui_pada || Date.now()).getTime(),
        })
      }
    }

    knownTicketStates.value[t.id] = {
      status: t.status_tiket,
      assignedTo: t.assigned_to,
      updatedAt: t.diperbarui_pada,
    }
    knownTicketIds.value.add(ticketKey)
  }

  persistNotifications()
}

const latestNotifications = computed(() => {
  let list = [...notificationsList.value]
  if (notifFilter.value !== 'ALL') {
    list = list.filter((n) => n.type === notifFilter.value)
  }
  list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
  return list.slice(0, 8)
})

const unreadCount = computed(() => notificationsList.value.filter((n) => !n.isRead).length)

const notifCounts = computed(() => {
  const all = notificationsList.value || []
  return {
    ALL: all.length,
    CREATED: all.filter((n) => n.type === 'CREATED').length,
    UPDATED: all.filter((n) => n.type === 'UPDATED').length,
    COMMENT: all.filter((n) => n.type === 'COMMENT').length,
  }
})

const notifTabs = computed(() => [
  { key: 'ALL', label: 'Semua', count: notifCounts.value.ALL },
  { key: 'CREATED', label: 'Baru', count: notifCounts.value.CREATED },
  { key: 'UPDATED', label: 'Update', count: notifCounts.value.UPDATED },
  { key: 'COMMENT', label: 'Komentar', count: notifCounts.value.COMMENT },
])

function formatStatusDot(status) {
  const s = (status || '').toLowerCase()
  if (s === 'open' || s === 'baru') return 'bg-sky-500'
  if (s === 'sedang ditangani' || s === 'in progress' || s === 'in_progress') return 'bg-blue-500'
  if (s === 'pending' || s.includes('menunggu')) return 'bg-amber-500'
  if (s === 'selesai' || s === 'resolved' || s === 'closed') return 'bg-emerald-500'
  return 'bg-slate-400'
}

async function fetchTickets() {
  if (isFetchingNotif.value) return
  isFetchingNotif.value = true
  try {
    const data = await get('/api/tickets')
    if (Array.isArray(data)) {
      allTickets.value = data
      seedNotificationsFromTickets(data)
      syncTicketStatusChanges(data)
    }
  } catch {
    // Silently fail
  } finally {
    isFetchingNotif.value = false
  }
}

// ── Global Search Fetch & Filtering ──────────────────────────
async function initGlobalSearchData() {
  isSearchOpen.value = true
  isNotifOpen.value = false
  isProfileOpen.value = false

  nextTick(() => {
    if (windowWidth.value < 768 && mobileSearchInputRef.value) {
      mobileSearchInputRef.value.focus()
    }
  })

  if (hasLoadedSearch.value || isFetchingSearch.value) return
  isFetchingSearch.value = true
  try {
    const promises = [
      get('/api/assets?all=true').catch(() => []),
      get('/api/karyawan?all=true').catch(() => []),
      get('/api/tickets').catch(() => []),
    ]
    if (hasPermission('users')) {
      promises.push(get('/api/users').catch(() => []))
    }
    const [assetsData, karyawanData, ticketsData, usersData] = await Promise.all(promises)

    if (Array.isArray(assetsData)) allAssets.value = assetsData
    if (Array.isArray(karyawanData)) allKaryawan.value = karyawanData
    if (Array.isArray(ticketsData)) allTickets.value = ticketsData
    if (Array.isArray(usersData)) allUsers.value = usersData
    hasLoadedSearch.value = true
  } finally {
    isFetchingSearch.value = false
  }
}

const searchResults = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) {
    return { assets: [], karyawan: [], tickets: [], users: [], totalCount: 0 }
  }

  const assets = allAssets.value
    .filter(
      (a) =>
        String(a.label_aset || '')
          .toLowerCase()
          .includes(q) ||
        String(a.hostname || '')
          .toLowerCase()
          .includes(q) ||
        String(a.nomor_seri || '')
          .toLowerCase()
          .includes(q) ||
        String(a.spesifikasi || '')
          .toLowerCase()
          .includes(q) ||
        String(a.catatan_aset || '')
          .toLowerCase()
          .includes(q) ||
        String(a.tipe_perangkat || '')
          .toLowerCase()
          .includes(q) ||
        String(a.merek || '')
          .toLowerCase()
          .includes(q) ||
        String(a.model || '')
          .toLowerCase()
          .includes(q) ||
        String(a.lokasi_aset || '')
          .toLowerCase()
          .includes(q),
    )
    .slice(0, 6)

  const karyawan = allKaryawan.value
    .filter(
      (k) =>
        String(k.nama_karyawan || '')
          .toLowerCase()
          .includes(q) ||
        String(k.nik || '')
          .toLowerCase()
          .includes(q) ||
        String(k.departemen || '')
          .toLowerCase()
          .includes(q) ||
        String(k.email_kantor || '')
          .toLowerCase()
          .includes(q),
    )
    .slice(0, 6)

  const tickets = allTickets.value
    .filter(
      (t) =>
        String(t.nomor_tiket || '')
          .toLowerCase()
          .includes(q) ||
        String(t.judul || '')
          .toLowerCase()
          .includes(q) ||
        String(t.deskripsi || '')
          .toLowerCase()
          .includes(q) ||
        String(t.pelapor || t.pelapor_nama || '')
          .toLowerCase()
          .includes(q),
    )
    .slice(0, 6)

  const users = allUsers.value
    .filter(
      (u) =>
        String(u.nama || '')
          .toLowerCase()
          .includes(q) ||
        String(u.email || '')
          .toLowerCase()
          .includes(q) ||
        String(u.role || '')
          .toLowerCase()
          .includes(q),
    )
    .slice(0, 6)

  const totalCount = assets.length + karyawan.length + tickets.length + users.length

  return { assets, karyawan, tickets, users, totalCount }
})

function closeSearch() {
  isSearchOpen.value = false
}

// Click-outside: tutup panel search jika klik terjadi di luar area search
// (input + result card). Tidak menutup jika klik di dalam container search.
function handleClickOutside(event) {
  if (!isSearchOpen.value) return
  // Pada mobile (< 768px), search overlay bersifat fullscreen dan ditutup eksplisit lewat tombol kembali atau navigasi
  if (windowWidth.value < 768) return

  const container = searchContainerRef.value
  if (container && !container.contains(event.target)) {
    closeSearch()
  }
}

function clearSearch() {
  searchQuery.value = ''
  if (windowWidth.value < 768 && mobileSearchInputRef.value) {
    mobileSearchInputRef.value.focus()
  } else if (searchInputRef.value) {
    searchInputRef.value.focus()
  }
}

function submitSearch() {
  const query = searchQuery.value.trim()
  if (!query) return
  closeSearch()

  // Determine best tab or navigate to current route if assets
  if (route.path === '/tickets') {
    router.push({ path: '/tickets', query: { search: query } })
  } else if (route.path === '/users') {
    router.push({ path: '/users', query: { q: query } })
  } else {
    router.push({ path: '/assets', query: { q: query } })
  }
}

function selectResultAsset(asset) {
  closeSearch()
  router.push({
    path: '/assets',
    query: { q: asset.label_aset || asset.nomor_seri || asset.hostname },
  })
}

function selectResultKaryawan(karyawan) {
  closeSearch()
  router.push({ path: '/assets', query: { q: karyawan.nama_karyawan || karyawan.nik } })
}

function selectResultTicket(ticket) {
  closeSearch()
  router.push({ path: '/tickets', query: { search: ticket.nomor_tiket } })
}

function selectResultUser(userItem) {
  closeSearch()
  router.push({ path: '/users', query: { q: userItem.email || userItem.nama } })
}

// Keydown Shortcut listener (Ctrl+K or Cmd+K)
function handleGlobalKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    if (searchInputRef.value) {
      searchInputRef.value.focus()
      initGlobalSearchData()
    }
  } else if (e.key === 'Escape') {
    closeSearch()
    isNotifOpen.value = false
    isProfileOpen.value = false
  }
}

function toggleNotif() {
  isNotifOpen.value = !isNotifOpen.value
  if (isNotifOpen.value) {
    notifFilter.value = 'ALL'
    markAllNotificationsRead()
  }
  isProfileOpen.value = false
  isSearchOpen.value = false
}

function markAllNotificationsRead() {
  notificationsList.value.forEach((n) => {
    n.isRead = true
  })
  persistNotifications()
}

function goToNotif(notif) {
  notif.isRead = true
  persistNotifications()
  isNotifOpen.value = false
  router.push({ path: '/tickets', query: { search: notif.nomor_tiket } })
}

function goToAllTickets() {
  isNotifOpen.value = false
  router.push('/tickets')
}

function relativeTime(dateStrOrMs) {
  if (!dateStrOrMs) return ''
  const timestamp = typeof dateStrOrMs === 'number' ? dateStrOrMs : new Date(dateStrOrMs).getTime()
  const diff = Date.now() - timestamp
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Baru saja'
  if (m < 60) return `${m} mnt lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  const d = Math.floor(h / 24)
  return `${d} hari lalu`
}

function quickSearchPreset(query, tabKey) {
  searchQuery.value = query
  searchTabFilter.value = tabKey
}

function toggleProfileMenu() {
  isProfileOpen.value = !isProfileOpen.value
  isNotifOpen.value = false
  isSearchOpen.value = false
}

function openMyAssets() {
  isProfileOpen.value = false
  router.push('/my-assets')
}

function performLogout() {
  isProfileOpen.value = false
  logout()
}

const pageTitle = computed(() => route.meta?.title || 'Karyawan')
const pageSubtitle = computed(() => route.meta?.subtitle || 'Kelola data karyawan')

watch(
  () => [route.path, route.query.q, route.query.search],
  () => {
    isNotifOpen.value = false
    isProfileOpen.value = false
    isSearchOpen.value = false
  },
  { immediate: true },
)

function handleSseTicketCreated(data) {
  if (data && typeof data === 'object') {
    const title = 'Tiket Baru Masuk'
    const msg = `${data.nomor_tiket ? data.nomor_tiket + ': ' : ''}${data.judul || 'Tanpa Judul'}${data.pelapor ? ' — oleh ' + data.pelapor : ''}`
    addNotificationItem({
      ticketId: data.id,
      type: 'CREATED',
      title,
      message: data.judul || 'Tiket baru telah dibuat',
      nomor_tiket: data.nomor_tiket,
      judul_tiket: data.judul,
      status_tiket: data.status_tiket,
      prioritas: data.prioritas,
      pelapor: data.pelapor,
    })
    showRealtimeToast(title, msg, data.nomor_tiket, 'CREATED')
    if (!allTickets.value.some((t) => t.id === data.id)) {
      allTickets.value = [data, ...allTickets.value]
    }
  }
  fetchTickets()
}

function handleSseTicketUpdated(data) {
  if (data && data.id != null) {
    const changesText =
      Array.isArray(data.changes) && data.changes.length > 0
        ? data.changes.join('. ')
        : 'Detail tiket diperbarui'
    const title = data.nomor_tiket ? `Perubahan Tiket ${data.nomor_tiket}` : 'Perubahan Tiket'
    const msg = `${data.judul ? data.judul + ' — ' : ''}${changesText}`

    addNotificationItem({
      ticketId: data.id,
      type: 'UPDATED',
      title: data.judul ? `Perubahan Tiket: ${data.judul}` : 'Perubahan Tiket',
      message: changesText,
      nomor_tiket: data.nomor_tiket,
      judul_tiket: data.judul,
      status_tiket: data.status_tiket,
      prioritas: data.prioritas,
      pelapor: data.pelapor,
    })
    showRealtimeToast(title, msg, data.nomor_tiket, 'UPDATED')
  }
  fetchTickets()
}

function handleSseCommentCreated(data) {
  if (data && (data.ticketId != null || data.id != null)) {
    const ticketId = data.ticketId || data.id
    const targetTicket = allTickets.value.find((t) => t.id === ticketId)
    const nomorTiket = targetTicket?.nomor_tiket || `#${ticketId}`
    const title = `Komentar Baru (${nomorTiket})`
    const msg = targetTicket
      ? `Pada tiket '${targetTicket.judul}'`
      : 'Komentar baru ditambahkan pada tiket'

    addNotificationItem({
      ticketId,
      type: 'COMMENT',
      title: targetTicket ? `Komentar: ${targetTicket.judul}` : 'Komentar Baru',
      message: 'Komentar baru ditambahkan pada tiket',
      nomor_tiket: targetTicket?.nomor_tiket,
      judul_tiket: targetTicket?.judul,
      status_tiket: targetTicket?.status_tiket,
      prioritas: targetTicket?.prioritas,
      pelapor: targetTicket?.pelapor,
    })
    showRealtimeToast(title, msg, nomorTiket, 'COMMENT')
  }
  fetchTickets()
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('resize', handleWindowResize)
  document.addEventListener('click', handleClickOutside)
  if (!hasPermission('tickets')) return
  loadNotifications()
  fetchTickets()

  connectSSE()
  onSSE('TICKET_CREATED', handleSseTicketCreated)
  onSSE('TICKET_UPDATED', handleSseTicketUpdated)
  onSSE('COMMENT_CREATED', handleSseCommentCreated)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('resize', handleWindowResize)
  document.removeEventListener('click', handleClickOutside)
  offSSE('TICKET_CREATED', handleSseTicketCreated)
  offSSE('TICKET_UPDATED', handleSseTicketUpdated)
  offSSE('COMMENT_CREATED', handleSseCommentCreated)
  disconnectSSE()
})
</script>

<template>
  <header
    class="app-header relative z-30 flex h-14 md:h-[64px] items-center justify-between px-3 md:px-5 shrink-0 border-b border-[#E5EAEF] bg-white/95 backdrop-blur-md"
  >
    <!-- 1. LEFT: Navigation Drawer Toggle & Page Titles -->
    <div class="flex items-center gap-2 md:gap-2.5 md:shrink-0 min-w-0">
      <!-- Toggle Mobile Drawer (lg:hidden) -->
      <button
        type="button"
        :aria-expanded="isMobileOpen ? 'true' : 'false'"
        aria-controls="app-navigation"
        aria-label="Buka Navigasi Mobile"
        title="Buka Navigasi Mobile"
        class="flex lg:hidden h-9 w-9 md:h-8 md:w-8 shrink-0 items-center justify-center rounded-lg text-[#2A3547] hover:bg-[#EDF5FF] hover:text-[#333333] transition-all cursor-pointer active:scale-95 touch-manipulation"
        @click="$emit('toggle-mobile')"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[20px]">menu</span>
      </button>

      <div class="min-w-0">
        <h1
          class="text-sm wrap-anywhere md:truncate md:text-[15px] font-semibold tracking-tight text-[#333333] leading-tight"
        >
          {{ pageTitle }}
        </h1>
        <p
          class="hidden md:block truncate text-[10px] font-medium text-[#637288] leading-relaxed mt-1"
        >
          {{ pageSubtitle }}
        </p>
      </div>
    </div>

    <!-- 2. CENTER: Main Global Search Bar (Desktop Only) -->
    <div
      ref="searchContainerRef"
      class="contents md:flex md:flex-1 md:max-w-md lg:max-w-lg md:mx-4 relative justify-center z-40 min-w-0"
    >
      <form
        role="search"
        @submit.prevent="submitSearch"
        class="hidden md:flex relative items-center w-full"
      >
          <label for="global-main-search" class="sr-only">Cari Global</label>

          <span
            aria-hidden="true"
            class="material-symbols-outlined absolute left-2.5 sm:left-3 text-[16px] sm:text-[17px] text-[#475569] pointer-events-none transition-colors"
          >
            search
          </span>

          <input
            id="global-main-search"
            ref="searchInputRef"
            v-model="searchQuery"
            type="search"
            autocomplete="off"
            @focus="initGlobalSearchData"
            :placeholder="searchPlaceholder"
            class="h-11 md:h-9 w-full rounded-lg md:rounded-lg border border-[#DFE5EF] bg-[#F8FAFC] pl-10 md:pl-9 pr-12 md:pr-20 text-[11px] sm:text-xs font-medium text-[#333333] placeholder-[#5F7089] outline-none transition-all focus:bg-white focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/20 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          />

          <!-- Action Buttons / Hotkey Indicator -->
          <div class="absolute right-0 md:right-2 flex items-center gap-1">
            <button
              v-if="searchQuery"
              type="button"
              @click="clearSearch"
              aria-label="Bersihkan pencarian"
              class="flex h-11 w-11 md:h-6 md:w-6 items-center justify-center rounded-full text-[#475569] hover:bg-[#F1F5F9] hover:text-[#333333] transition-all cursor-pointer touch-manipulation"
              title="Bersihkan Pencarian"
            >
              <span aria-hidden="true" class="material-symbols-outlined text-[15px]">close</span>
            </button>

            <button
              type="submit"
              :disabled="!searchQuery.trim()"
              v-if="searchQuery.trim()"
              class="hidden md:flex items-center gap-1 rounded-lg bg-[#EFF6FF] px-2.5 py-1 text-[10px] font-extrabold text-[#0A4391] hover:bg-[#0A4391] hover:text-white disabled:opacity-40 transition-all cursor-pointer"
            >
              Cari
            </button>

            <kbd
              v-if="!searchQuery"
              class="hidden md:inline-flex items-center rounded-md border border-[#E2E8F0] bg-white px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[#475569] shadow-2xs"
            >
              Ctrl K
            </kbd>
          </div>
        </form>

        <!-- 3. LIVE GLOBAL SEARCH OVERLAY DROPDOWN (Adaptive Mobile Full-screen & Desktop Dropdown) -->
        <Teleport to="body" :disabled="windowWidth >= 768">
          <Transition name="dropdown">
            <div
              v-if="isSearchOpen"
              class="header-search-panel fixed inset-0 z-[9999] flex flex-col bg-white md:inset-auto md:absolute md:top-full md:left-0 md:right-0 md:mt-2 md:max-h-[500px] md:w-full md:rounded-2xl md:border md:border-[#E5EAEF] md:shadow-2xl md:z-50 overflow-hidden text-left"
            >
              <!-- Mobile-Only Dedicated Search Top Bar (Replaces blurred navbar with crisp, active search header) -->
              <div
                class="flex h-16 shrink-0 items-center gap-2 border-b border-[#E5EAEF] px-2.5 sm:px-3 bg-white md:hidden"
              >
                <!-- Back button to close search -->
                <button
                  type="button"
                  @click="closeSearch"
                  aria-label="Tutup pencarian"
                  title="Tutup pencarian"
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#5F7089] hover:bg-[#F1F5F9] active:scale-95 touch-manipulation cursor-pointer"
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[22px]">arrow_back</span>
                </button>

                <!-- Dedicated Mobile Search Input -->
                <div class="relative flex flex-1 items-center min-w-0">
                  <span
                    aria-hidden="true" class="material-symbols-outlined absolute left-3 text-[17px] text-[#333333] pointer-events-none"
                  >
                    search
                  </span>
                  <input
                    id="mobile-overlay-search-input"
                    aria-label="Cari aset, tiket, karyawan, atau pengguna"
                    @keydown.enter.prevent="submitSearch"
                    ref="mobileSearchInputRef"
                    v-model="searchQuery"
                    type="search"
                    autocomplete="off"
                    autocapitalize="off"
                    spellcheck="false"
                    placeholder="Cari aset, tiket, karyawan, user..."
                    class="h-11 w-full rounded-xl border border-[#DFE5EF] bg-[#F8FAFC] pl-9 pr-11 text-xs font-medium text-[#333333] placeholder-[#5F7089] outline-none transition-all focus:bg-white focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/20 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                  />
                  <button
                    v-if="searchQuery"
                    type="button"
                    @click="clearSearch"
                    aria-label="Bersihkan kata kunci"
                    class="absolute right-0 flex h-11 w-11 items-center justify-center rounded-full text-[#5F7089] hover:bg-[#E2E8F0] active:scale-90 touch-manipulation cursor-pointer"
                  >
                    <span aria-hidden="true" class="material-symbols-outlined text-[15px]">close</span>
                  </button>
                </div>

                <!-- Quick Submit Button on Mobile -->
                <button
                  type="button"
                  @click="submitSearch"
                  :disabled="!searchQuery.trim()"
                  class="flex min-h-11 shrink-0 items-center px-2 py-1 text-xs font-bold text-[#333333] disabled:opacity-30 active:scale-95 touch-manipulation cursor-pointer"
                >
                  Cari
                </button>
              </div>

              <!-- Filter Tabs -->
              <div class="search-filter-tabs" aria-label="Kategori pencarian">
                <button
                  v-for="tab in [
                    { key: 'ALL', label: 'Semua', icon: 'grid_view' },
                    {
                      key: 'ASSETS',
                      label: 'Aset',
                      icon: 'devices',
                      count: searchResults.assets.length,
                    },
                    {
                      key: 'KARYAWAN',
                      label: 'Karyawan',
                      icon: 'badge',
                      count: searchResults.karyawan.length,
                    },
                    {
                      key: 'TICKETS',
                      label: 'Tiket',
                      icon: 'confirmation_number',
                      count: searchResults.tickets.length,
                    },
                    {
                      key: 'USERS',
                      label: 'User',
                      icon: 'manage_accounts',
                      count: searchResults.users.length,
                    },
                  ]"
                  :key="tab.key"
                  type="button"
                  @click="searchTabFilter = tab.key"
                  :aria-pressed="searchTabFilter === tab.key"
                  class="search-filter-tab flex min-h-11 md:min-h-0 items-center gap-1 shrink-0 rounded-lg px-2 sm:px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer touch-manipulation active:scale-95"
                  :class="
                    searchTabFilter === tab.key
                      ? 'bg-[#0A51B0] text-white shadow-xs'
                      : 'text-[#5F7089] hover:bg-[#ECF2FF] hover:text-[#333333]'
                  "
                >
                  <span aria-hidden="true" class="material-symbols-outlined text-[14px]">{{ tab.icon }}</span>
                  <span>{{ tab.label }}</span>
                  <span
                    v-if="searchQuery.trim() && tab.count !== undefined"
                    class="ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-extrabold"
                    :class="
                      searchTabFilter === tab.key
                        ? 'bg-white/25 text-white'
                        : 'bg-[#E2E8F0] text-[#475569]'
                    "
                    >{{ tab.count }}</span
                  >
                </button>
              </div>

              <!-- Loading State -->
              <div
                v-if="isFetchingSearch"
                role="status"
                aria-live="polite"
                class="flex items-center justify-center gap-2 py-8 text-[12px] text-[#687281]"
              >
                <div
                  class="w-4 h-4 border-2 border-[#E2E8F0] border-t-[#0A51B0] rounded-full animate-spin"
                ></div>
                Memuat data pencarian...
              </div>

              <!-- Initial Prompt State (No query typed yet) -->
              <div
                v-else-if="!searchQuery.trim()"
                class="search-start p-4 sm:p-5 text-center overflow-y-auto"
              >
                <p
                  class="text-[11px] sm:text-[11px] font-bold uppercase tracking-wider text-[#687281] mb-2.5"
                >
                  Mulai pencarian Anda
                </p>
                <div class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    @click="quickSearchPreset('Laptop', 'ASSETS')"
                    class="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-[11px] font-semibold text-[#475569] hover:border-[#0A51B0] hover:text-[#333333] transition-all cursor-pointer active:scale-95 touch-manipulation shadow-2xs"
                  >
                    Laptop
                  </button>
                  <button
                    type="button"
                    @click="quickSearchPreset('Tiket', 'TICKETS')"
                    class="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-[11px] font-semibold text-[#475569] hover:border-[#0A51B0] hover:text-[#333333] transition-all cursor-pointer active:scale-95 touch-manipulation shadow-2xs"
                  >
                    Tiket
                  </button>
                  <button
                    type="button"
                    @click="quickSearchPreset('Active', 'KARYAWAN')"
                    class="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-[11px] font-semibold text-[#475569] hover:border-[#0A51B0] hover:text-[#333333] transition-all cursor-pointer active:scale-95 touch-manipulation shadow-2xs"
                  >
                    Karyawan aktif
                  </button>
                </div>
              </div>

              <!-- No Results Found -->
              <div
                v-else-if="
                  searchResults.totalCount === 0 ||
                  (searchTabFilter !== 'ALL' &&
                    !searchResults[
                      {
                        ASSETS: 'assets',
                        KARYAWAN: 'karyawan',
                        TICKETS: 'tickets',
                        USERS: 'users',
                      }[searchTabFilter]
                    ]?.length)
                "
                class="flex flex-col items-center justify-center py-8 text-center px-4"
              >
                <span aria-hidden="true" class="material-symbols-outlined text-[36px] text-[#CBD5E1]">search_off</span>
                <p class="text-[12px] font-semibold text-[#5F7089] mt-1">
                  Tidak ada hasil ditemukan untuk "{{ searchQuery }}"
                </p>
                <p class="text-[11px] text-[#687281]">
                  Coba kata kunci lain atau pilih kategori pencarian yang sesuai.
                </p>
              </div>

              <!-- SEARCH RESULTS DISPLAY LIST -->
              <div
                v-else
                class="search-result-list flex-1 overflow-y-auto divide-y divide-[#F1F5F9]"
              >
                <!-- Category 1: ASET IT -->
                <div
                  v-if="
                    (searchTabFilter === 'ALL' || searchTabFilter === 'ASSETS') &&
                    searchResults.assets.length > 0
                  "
                >
                  <div
                    class="px-3.5 sm:px-4 py-1.5 bg-[#F8FAFC] text-[10px] font-extrabold uppercase tracking-wider text-[#333333] flex items-center justify-between"
                  >
                    <span>Aset IT ({{ searchResults.assets.length }})</span>
                  </div>
                  <button
                    v-for="item in searchResults.assets"
                    :key="'asset_' + item.id_aset"
                    type="button"
                    @click="selectResultAsset(item)"
                    class="w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 hover:bg-[#F0F5FF] transition-all text-left group cursor-pointer touch-manipulation"
                  >
                    <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ECF2FF] text-[#333333] group-hover:bg-[#0A51B0] group-hover:text-white transition-all"
                      >
                        <span aria-hidden="true" class="material-symbols-outlined text-[17px]">devices</span>
                      </div>
                      <div class="min-w-0">
                        <p
                          class="text-[12px] font-bold text-[#2A3547] truncate group-hover:text-[#333333]"
                        >
                          {{ item.label_aset || item.hostname || 'Aset' }}
                        </p>
                        <p class="text-[10px] font-medium text-[#637288] truncate">
                          {{ item.nomor_seri ? 'SN: ' + item.nomor_seri : '' }}
                          <span v-if="item.tipe_perangkat"> · {{ item.tipe_perangkat }}</span>
                          <span v-if="item.merek"> · {{ item.merek }} {{ item.model }}</span>
                          <span v-if="item.spesifikasi" class="text-amber-600 font-semibold">
                            · {{ item.spesifikasi }}</span
                          >
                        </p>
                      </div>
                    </div>
                    <span
                      aria-hidden="true" class="material-symbols-outlined text-[16px] text-[#CBD5E1] group-hover:text-[#333333] shrink-0"
                      >chevron_right</span
                    >
                  </button>
                </div>

                <!-- Category 2: KARYAWAN -->
                <div
                  v-if="
                    (searchTabFilter === 'ALL' || searchTabFilter === 'KARYAWAN') &&
                    searchResults.karyawan.length > 0
                  "
                >
                  <div
                    class="px-3.5 sm:px-4 py-1.5 bg-[#F8FAFC] text-[10px] font-extrabold uppercase tracking-wider text-[#13DEB9] flex items-center justify-between"
                  >
                    <span>Karyawan ({{ searchResults.karyawan.length }})</span>
                  </div>
                  <button
                    v-for="item in searchResults.karyawan"
                    :key="'karyawan_' + item.id_karyawan"
                    type="button"
                    @click="selectResultKaryawan(item)"
                    class="w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 hover:bg-[#E6FFFA] transition-all text-left group cursor-pointer touch-manipulation"
                  >
                    <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E6FFFA] text-[#13DEB9] group-hover:bg-[#13DEB9] group-hover:text-white transition-all"
                      >
                        <span aria-hidden="true" class="material-symbols-outlined text-[17px]">badge</span>
                      </div>
                      <div class="min-w-0">
                        <p
                          class="text-[12px] font-bold text-[#2A3547] truncate group-hover:text-[#13DEB9]"
                        >
                          {{ item.nama_karyawan }}
                        </p>
                        <p class="text-[10px] font-medium text-[#637288] truncate">
                          NIK: {{ item.nik }}
                          <span v-if="item.departemen">· {{ item.departemen }}</span>
                        </p>
                      </div>
                    </div>
                    <span
                      aria-hidden="true" class="material-symbols-outlined text-[16px] text-[#CBD5E1] group-hover:text-[#13DEB9] shrink-0"
                      >chevron_right</span
                    >
                  </button>
                </div>

                <!-- Category 3: TIKET -->
                <div
                  v-if="
                    (searchTabFilter === 'ALL' || searchTabFilter === 'TICKETS') &&
                    searchResults.tickets.length > 0
                  "
                >
                  <div
                    class="px-3.5 sm:px-4 py-1.5 bg-[#F8FAFC] text-[10px] font-extrabold uppercase tracking-wider text-[#FA896B] flex items-center justify-between"
                  >
                    <span>Tiket Helpdesk ({{ searchResults.tickets.length }})</span>
                  </div>
                  <button
                    v-for="item in searchResults.tickets"
                    :key="'ticket_' + item.id"
                    type="button"
                    @click="selectResultTicket(item)"
                    class="w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 hover:bg-[#FDF2F0] transition-all text-left group cursor-pointer touch-manipulation"
                  >
                    <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FDEDE8] text-[#FA896B] group-hover:bg-[#FA896B] group-hover:text-white transition-all"
                      >
                        <span aria-hidden="true" class="material-symbols-outlined text-[17px]"
                          >confirmation_number</span
                        >
                      </div>
                      <div class="min-w-0">
                        <p
                          class="text-[12px] font-bold text-[#2A3547] truncate group-hover:text-[#FA896B]"
                        >
                          {{ item.nomor_tiket }}: {{ item.judul }}
                        </p>
                        <p class="text-[10px] font-medium text-[#637288] truncate">
                          Pelapor: {{ item.pelapor || 'User' }} · Status: {{ item.status_tiket }}
                        </p>
                      </div>
                    </div>
                    <span
                      aria-hidden="true" class="material-symbols-outlined text-[16px] text-[#CBD5E1] group-hover:text-[#FA896B] shrink-0"
                      >chevron_right</span
                    >
                  </button>
                </div>

                <!-- Category 4: USERS -->
                <div
                  v-if="
                    (searchTabFilter === 'ALL' || searchTabFilter === 'USERS') &&
                    searchResults.users.length > 0
                  "
                >
                  <div
                    class="px-3.5 sm:px-4 py-1.5 bg-[#F8FAFC] text-[10px] font-extrabold uppercase tracking-wider text-[#7C3AED] flex items-center justify-between"
                  >
                    <span>Pengguna ({{ searchResults.users.length }})</span>
                  </div>
                  <button
                    v-for="item in searchResults.users"
                    :key="'user_' + item.id"
                    type="button"
                    @click="selectResultUser(item)"
                    class="w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 hover:bg-[#F3E8FF] transition-all text-left group cursor-pointer touch-manipulation"
                  >
                    <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-all"
                      >
                        <span aria-hidden="true" class="material-symbols-outlined text-[17px]">manage_accounts</span>
                      </div>
                      <div class="min-w-0">
                        <p
                          class="text-[12px] font-bold text-[#2A3547] truncate group-hover:text-[#7C3AED]"
                        >
                          {{ item.nama }} ({{ item.email }})
                        </p>
                        <p class="text-[10px] font-medium text-[#637288] uppercase tracking-wide">
                          Role: {{ item.role }}
                        </p>
                      </div>
                    </div>
                    <span
                      aria-hidden="true" class="material-symbols-outlined text-[16px] text-[#CBD5E1] group-hover:text-[#7C3AED] shrink-0"
                      >chevron_right</span
                    >
                  </button>
                </div>
              </div>

              <!-- Popup Footer -->
              <div
                class="search-popup-footer px-3.5 sm:px-4 py-2.5 sm:py-2.5 border-t border-[#F1F5F9] bg-[#FAFBFC] flex items-center justify-between text-[11px] font-semibold text-[#637288] shrink-0 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
              >
                <span class="hidden md:inline">
                  Tekan
                  <kbd class="font-mono bg-white px-1 border border-[#E2E8F0] rounded">ENTER</kbd>
                  untuk cari semua
                </span>
                <span class="md:hidden text-[#687281] text-[11px]">
                  {{ searchResults.totalCount }} hasil ditemukan
                </span>
                <button
                  type="button"
                  @click="submitSearch"
                  :disabled="!searchQuery.trim() || isFetchingSearch"
                  class="text-[#333333] hover:text-[#0A4391] hover:underline font-bold transition-colors cursor-pointer touch-manipulation ml-auto"
                >
                  Lihat Hasil Lengkap →
                </button>
              </div>
            </div>
          </Transition>
        </Teleport>

        <!-- Desktop Backdrop overlay when search is open (hidden on mobile, zero blur) -->
        <div
          v-if="isSearchOpen"
          class="hidden md:block fixed inset-0 z-40 bg-transparent"
          @click="closeSearch"
        ></div>
    </div>

    <!-- 3. RIGHT: Actions (Mobile Search, Notification Bell & Profile Menu) -->
    <div class="flex shrink-0 items-center gap-1 sm:gap-1.5 md:gap-2.5 z-40">
      <!-- Mobile Search Trigger Button (md:hidden) -->
      <button
        type="button"
        @click="initGlobalSearchData"
        aria-label="Cari Global"
        title="Cari Global (Aset, Tiket, Karyawan, User)"
        class="flex md:hidden h-9 w-9 items-center justify-center rounded-xl text-[#5F7089] hover:bg-[#F8FAFC] hover:text-[#333333] transition-all cursor-pointer select-none active:scale-95 touch-manipulation"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[20px]">search</span>
      </button>

      <!-- Notification Bell -->
      <div class="relative">
        <button
          id="notif-bell-btn"
          aria-label="Notifikasi"
          :aria-expanded="isNotifOpen"
          aria-controls="header-notifications"
          type="button"
          :title="unreadCount > 0 ? `Notifikasi (${unreadCount})` : 'Notifikasi'"
          @click="toggleNotif"
          class="relative flex h-9 w-9 items-center justify-center rounded-xl text-[#5F7089] hover:bg-[#F8FAFC] hover:text-[#333333] transition-all cursor-pointer select-none active:scale-95 touch-manipulation"
          :class="isNotifOpen ? 'bg-[#EDF5FF] text-[#333333]' : ''"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[20px]"
            >notifications</span
          >
          <Transition name="badge-pop">
            <span
              v-if="unreadCount > 0"
              class="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#0A51B0] px-1 text-[9.5px] font-bold text-white shadow-2xs"
              >{{ unreadCount > 9 ? '9+' : unreadCount }}</span
            >
          </Transition>
        </button>

        <!-- Notification Popover Panel -->
        <Transition name="dropdown">
          <div
            v-if="isNotifOpen"
            id="header-notifications"
            class="header-popover fixed left-3 right-3 top-[4rem] max-h-[calc(100dvh-4.75rem)] flex flex-col md:max-h-[calc(100dvh-4.5rem)] md:absolute md:left-auto md:top-auto md:right-0 md:mt-2 md:w-96 rounded-2xl border border-[#E2E8F0] bg-white shadow-xl z-50 overflow-hidden outline-none"
            @click.stop
          >
            <!-- 1. Header -->
            <div
              class="flex items-center justify-between px-4 py-3 border-b border-[#F1F5F9] bg-white"
            >
              <div class="flex items-center gap-2">
                <span aria-hidden="true" class="material-symbols-outlined text-[18px] text-[#333333]"
                  >notifications</span
                >
                <h3 class="text-xs font-bold text-[#333333]">Notifikasi</h3>
                <span
                  v-if="unreadCount > 0"
                  class="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#EFF6FF] px-1.5 text-[10px] font-bold text-[#333333] border border-[#BFDBFE]"
                  >{{ unreadCount }}</span
                >
              </div>
              <button
                type="button"
                @click="isNotifOpen = false"
                class="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-[#F8FAFC] text-[#5F7089] transition-colors cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <span aria-hidden="true" class="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <!-- 2. Segmented Tab Navigation -->
            <div
              class="flex items-center gap-1 px-3 py-2 border-b border-[#F1F5F9] bg-[#F8FAFC]/60 overflow-x-auto custom-scrollbar"
            >
              <button
                v-for="tab in notifTabs"
                :key="tab.key"
                type="button"
                @click="notifFilter = tab.key"
                class="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-all cursor-pointer select-none whitespace-nowrap"
                :class="
                  notifFilter === tab.key
                    ? 'bg-[#EFF6FF] text-[#333333] font-semibold border border-[#BFDBFE]/60'
                    : 'text-[#5F7089] hover:text-[#333333] hover:bg-white font-medium'
                "
              >
                <span>{{ tab.label }}</span>
                <span
                  v-if="tab.count > 0"
                  class="text-[10px] px-1 rounded-md"
                  :class="notifFilter === tab.key ? 'text-[#333333] font-bold' : 'text-[#687281]'"
                  >{{ tab.count }}</span
                >
              </button>
            </div>

            <!-- 3. Notification List (Sole Scrollable Body) -->
            <div
              class="min-h-0 flex-1 md:max-h-[380px] overflow-y-auto custom-scrollbar divide-y divide-[#F1F5F9]"
            >
              <div
                v-if="isFetchingNotif && latestNotifications.length === 0"
                class="p-2"
                aria-busy="true"
              >
                <SkeletonList :items="4" :show-avatar="true" />
              </div>

              <!-- Polished Empty State -->
              <div
                v-else-if="latestNotifications.length === 0"
                class="flex flex-col items-center justify-center gap-1.5 py-10 px-4 text-center"
              >
                <span aria-hidden="true" class="material-symbols-outlined text-[32px] text-[#CBD5E1]"
                  >notifications_off</span
                >
                <p class="text-xs font-semibold text-[#333333]">Tidak ada notifikasi</p>
                <p class="text-[11px] text-[#5F7089]">Belum ada aktivitas baru di kategori ini.</p>
              </div>

              <!-- Compact Activity Item -->
              <button
                v-for="notif in latestNotifications"
                :key="notif.id"
                type="button"
                @click="goToNotif(notif)"
                class="w-full flex items-start gap-2.5 px-3.5 py-3 text-left transition-all group cursor-pointer hover:bg-[#F8FAFC]"
                :class="!notif.isRead ? 'bg-[#F8FAFC]/80' : 'bg-white'"
              >
                <!-- Unread indicator dot -->
                <div class="mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
                  <span v-if="!notif.isRead" class="h-1.5 w-1.5 rounded-full bg-[#0A51B0]"></span>
                </div>

                <!-- Content Block -->
                <div class="min-w-0 flex-1">
                  <!-- Primary Title / Event -->
                  <p
                    class="text-xs truncate leading-snug transition-colors group-hover:text-[#333333]"
                    :class="
                      !notif.isRead ? 'font-bold text-[#333333]' : 'font-semibold text-[#334155]'
                    "
                  >
                    {{ notif.title }}
                  </p>

                  <!-- Secondary Detail / Description -->
                  <p
                    class="text-[12px] font-normal text-[#5F7089] mt-0.5 line-clamp-2 leading-relaxed"
                  >
                    {{ notif.message }}
                  </p>

                  <!-- Metadata -->
                  <div
                    class="flex items-center gap-1.5 text-[11px] font-normal text-[#687281] mt-1 flex-wrap"
                  >
                    <span>{{ notif.nomor_tiket }}</span>
                    <template v-if="notif.status_tiket">
                      <span>•</span>
                      <span class="inline-flex items-center gap-1">
                        <span
                          class="h-1.5 w-1.5 rounded-full shrink-0"
                          :class="formatStatusDot(notif.status_tiket)"
                        ></span>
                        <span class="capitalize text-[#475569] font-medium">{{
                          notif.status_tiket
                        }}</span>
                      </span>
                    </template>
                    <span>•</span>
                    <span>{{ relativeTime(notif.timestamp) }}</span>
                  </div>
                </div>

                <!-- Action Chevron -->
                <span
                  aria-hidden="true" class="material-symbols-outlined text-[16px] text-[#CBD5E1] group-hover:text-[#333333] shrink-0 mt-0.5 transition-colors"
                >
                  chevron_right
                </span>
              </button>
            </div>

            <!-- 4. Subtle Footer -->
            <div class="px-4 py-2.5 border-t border-[#F1F5F9] bg-[#F8FAFC]/50 text-center">
              <button
                type="button"
                @click="goToAllTickets"
                class="inline-flex items-center gap-1 text-xs font-semibold text-[#333333] hover:text-[#0A4391] hover:underline cursor-pointer transition-colors"
              >
                <span>Lihat semua aktivitas</span>
                <span aria-hidden="true" class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </Transition>

        <div v-if="isNotifOpen" class="fixed inset-0 z-40" @click="isNotifOpen = false"></div>
      </div>

      <div class="hidden md:block h-6 w-px bg-[#E5EAEF] mx-1"></div>

      <!-- User Profile (Top-Right Primary User Identity) -->
      <div class="relative">
        <button
          type="button"
          ref="profileMenuButtonRef"
          @click="toggleProfileMenu"
          aria-label="Menu profil"
          :aria-expanded="isProfileOpen"
          aria-controls="header-profile"
          class="flex items-center gap-2 rounded-xl p-1.5 transition-all hover:bg-[#F8FAFC] cursor-pointer select-none"
          :class="isProfileOpen ? 'bg-[#F8FAFC]' : ''"
        >
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A51B0] text-xs font-bold text-white shadow-2xs"
          >
            {{ (user && user.nama ? user.nama.charAt(0) : 'U').toUpperCase() }}
          </div>
          <div class="hidden text-left lg:block">
            <p class="text-xs font-bold text-[#333333] leading-tight truncate max-w-[140px]">
              {{ user ? user.nama : 'Pengguna' }}
            </p>
            <p
              class="text-[11px] font-normal text-[#5F7089] leading-tight truncate max-w-[140px] capitalize"
            >
              {{ user?.role || 'Guest' }} {{ user?.nik ? '· ' + user.nik : '' }}
            </p>
          </div>
          <span
            aria-hidden="true" class="material-symbols-outlined text-[16px] header-profile-chevron text-[#687281] hidden lg:block"
            >expand_more</span
          >
        </button>

        <!-- Profile Popover Menu -->
        <Transition name="dropdown">
          <div
            v-if="isProfileOpen"
            id="header-profile"
            class="header-popover fixed left-3 right-3 top-[4rem] max-h-[calc(100dvh-4.75rem)] overflow-y-auto md:absolute md:left-auto md:top-auto md:right-0 md:mt-2 md:w-56 rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl z-50 outline-none"
            @click.stop
          >
            <!-- Account Header -->
            <div class="px-3 py-2 border-b border-[#F1F5F9] mb-1">
              <p class="text-xs font-bold text-[#333333] truncate">
                {{ user ? user.nama : 'Pengguna' }}
              </p>
              <p class="text-[11px] font-normal text-[#5F7089] truncate capitalize mt-0.5">
                {{ user?.role || 'Guest' }} {{ user?.nik ? '· ' + user.nik : '' }}
              </p>
              <p v-if="user?.email" class="text-[11px] text-[#687281] truncate mt-0.5">
                {{ user.email }}
              </p>
            </div>

            <!-- Account Actions -->
            <div class="space-y-0.5">
              <button
                type="button"
                @click="openMyAssets"
                class="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#F8FAFC] hover:text-[#333333] transition-colors text-left cursor-pointer"
              >
                <span aria-hidden="true" class="material-symbols-outlined text-[16px] text-[#5F7089]">badge</span>
                <span>Aset Saya</span>
              </button>

              <button
                type="button"
                @click="openChangePassword"
                class="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#F8FAFC] hover:text-[#333333] transition-colors text-left cursor-pointer"
              >
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[16px] text-[#5F7089]"
                  >key</span
                >
                <span>Ganti Password</span>
              </button>

              <button
                v-if="isSuperAdmin"
                type="button"
                @click="
                  () => {
                    router.push('/export')
                    isProfileOpen = false
                  }
                "
                class="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
              >
                <span aria-hidden="true" class="material-symbols-outlined text-[16px]">restart_alt</span>
                <span>Reset Database</span>
              </button>

              <div class="my-1 border-t border-[#F1F5F9]"></div>

              <button
                type="button"
                data-testid="logout-button"
                @click="performLogout"
                class="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
              >
                <span aria-hidden="true" class="material-symbols-outlined text-[16px]">logout</span>
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </Transition>

        <div v-if="isProfileOpen" class="fixed inset-0 z-40" @click="isProfileOpen = false"></div>
      </div>
    </div>
  </header>

  <!-- Modal Ganti Password Akun -->
  <AppModal :is-open="showPasswordModal" title="Ganti Password Akun" @close="closePasswordModal">
    <form @submit.prevent="submitChangePassword" class="password-form space-y-4">
      <div
        v-if="passwordModalError"
        role="alert"
        class="rounded-xl bg-rose-50 p-3 text-[12px] font-semibold text-rose-600"
      >
        {{ passwordModalError }}
      </div>

      <div
        v-if="passwordSuccessMessage"
        role="status"
        class="rounded-xl bg-emerald-50 p-3 text-[12px] font-semibold text-emerald-600"
      >
        {{ passwordSuccessMessage }}
      </div>

      <div>
        <label
          for="account-currentPassword"
          class="block text-[11px] font-bold uppercase tracking-wider text-[#637288] mb-1"
          >Password Saat Ini *</label
        >
        <input
          id="account-currentPassword"
          autocomplete="current-password"
          v-model="passwordForm.currentPassword"
          type="password"
          required
          placeholder="Masukkan password Anda saat ini"
          class="w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-[13px] text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
        />
      </div>

      <div>
        <label
          for="account-newPassword"
          class="block text-[11px] font-bold uppercase tracking-wider text-[#637288] mb-1"
          >Password Baru (min 8 karakter) *</label
        >
        <input
          id="account-newPassword"
          autocomplete="new-password"
          v-model="passwordForm.newPassword"
          type="password"
          required
          minlength="8"
          placeholder="Masukkan password baru"
          class="w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-[13px] text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
        />
      </div>

      <div>
        <label
          for="account-confirmPassword"
          class="block text-[11px] font-bold uppercase tracking-wider text-[#637288] mb-1"
          >Konfirmasi Password Baru *</label
        >
        <input
          id="account-confirmPassword"
          autocomplete="new-password"
          v-model="passwordForm.confirmPassword"
          type="password"
          required
          minlength="8"
          placeholder="Ketik ulang password baru"
          class="w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] px-3 py-2 text-[13px] text-[#2A3547] focus:outline-none focus:border-[#0A51B0]"
        />
      </div>

      <div
        class="grid grid-cols-1 sm:flex sm:items-center sm:justify-end gap-2 pt-4 border-t border-[#E5EAEF]"
      >
        <button
          type="button"
          @click="closePasswordModal"
          class="rounded-xl border border-[#E5EAEF] px-4 py-2 text-[12px] font-bold text-[#637288] hover:bg-gray-50 transition-all cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          :disabled="isSubmittingPassword"
          class="rounded-xl bg-[#0A51B0] px-4 py-2 text-[12px] font-bold text-white shadow-md hover:bg-[#0A4391] transition-all cursor-pointer disabled:opacity-60"
        >
          {{ isSubmittingPassword ? 'Menyimpan...' : 'Simpan Password Baru' }}
        </button>
      </div>
    </form>
  </AppModal>
</template>

<style scoped>
.header-search-panel {
  border-color: #e2e8f0;
}
.search-filter-tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  padding: 12px;
  border-bottom: 1px solid #edf1f6;
  background: #fff;
  flex-shrink: 0;
}
.search-filter-tab {
  min-height: 36px;
  border-radius: 7px;
  padding: 7px 9px;
  font-size: 11px;
  font-weight: 550;
  gap: 5px;
}
.search-filter-tab[aria-pressed='true'] {
  background: #eaf1fc;
  color: #234b83;
  box-shadow: none;
}
.search-filter-tab[aria-pressed='true'] > span:last-child:not(:nth-child(2)) {
  background: #d8e5f8;
  color: #234b83;
}
.search-start {
  padding: 26px 18px;
}
.search-start > p {
  text-transform: none;
  letter-spacing: 0;
  font-size: 13px;
  color: #52647e;
  font-weight: 600;
  margin-bottom: 14px;
}
.search-start button {
  border-radius: 8px;
  box-shadow: none;
  min-height: 38px;
  font-weight: 500;
}
.search-result-list {
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #d5deeb transparent;
}
.search-result-list > div > div:first-child {
  background: #f8fafc;
  color: #637288;
  padding: 10px 16px;
  font-weight: 600;
  letter-spacing: 0.06em;
}
.search-result-list > div > button {
  min-height: 64px;
  gap: 12px;
  padding: 12px 16px;
}
.search-result-list > div > button:hover {
  background: #f4f7fc;
}
.search-result-list button p:first-child {
  font-weight: 600;
  color: #333333;
  font-size: 12px;
}
.search-result-list button p + p {
  font-size: 11px;
  color: #637288;
  margin-top: 4px;
}
.search-result-list button > div {
  flex: 1;
}
.search-result-list button > div > div:first-child {
  border-radius: 9px;
  background: #EDF5FF;
  color: #527bad;
}
.search-popup-footer {
  gap: 12px;
  font-size: 10px;
  font-weight: 500;
}
.search-popup-footer button {
  min-height: 36px;
  font-size: 11px;
  font-weight: 600;
}
.search-popup-footer button:disabled {
  color: #687281;
  cursor: default;
  text-decoration: none;
}
.header-search-panel > div {
  min-height: 0;
}
.search-result-list button > div > div:last-child {
  flex: 1;
  min-width: 0;
}
@media (min-width: 768px) and (max-width: 1023px) {
  .header-search-panel.header-search-panel {
    width: 100%;
    min-width: 0;
  }
  .search-filter-tabs.search-filter-tabs {
    flex-wrap: wrap;
  }
  .search-filter-tab {
    flex-basis: auto;
    min-width: 0;
  }
}
.header-search-panel :is(button, input):focus-visible {
  outline: 2px solid #097CDE;
  outline-offset: -2px;
}
@media (min-width: 768px) {
  .header-search-panel {
    width: max(100%, 520px);
    max-width: calc(100vw - 40px);
    right: 0;
    left: auto;
    max-height: min(560px, calc(100dvh - 88px));
    border-radius: 12px;
    box-shadow: 0 14px 42px #172b4d20;
  }
  .search-filter-tabs {
    flex-wrap: nowrap;
  }
  .search-filter-tab {
    flex: 1;
    justify-content: center;
    padding-left: 6px;
    padding-right: 6px;
  }
  .search-result-list {
    max-height: 380px;
  }
}
@media (max-width: 767px) {
  .header-search-panel {
    height: 100dvh;
  }
  .search-filter-tabs {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 3px;
    padding: 10px 8px;
  }
  .search-filter-tab {
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    gap: 4px;
    padding: 8px 2px;
    font-size: 10px;
    min-height: 48px;
  }
  .search-filter-tab > span:first-child {
    display: none;
  }
  .search-result-list {
    max-height: none;
  }
  .search-popup-footer {
    margin-top: auto;
  }
  .search-popup-footer button {
    min-height: 44px;
  }
  .search-start button {
    min-height: 44px;
  }
}

.app-header {
  border-color: #e3e9f1;
  background: #fff;
}
.app-header #global-main-search {
  border-color: #e3e9f1;
  background: #f7f9fc;
}
.app-header #global-main-search:focus {
  background: white;
}
.app-header button[aria-label='Menu profil'] > div:first-child {
  background: #eaf1fc;
  color: #234b83;
  border-radius: 50%;
  box-shadow: none;
}
.app-header button[aria-label='Menu profil'] {
  min-height: 44px;
}
.app-header button[aria-label='Menu profil'] p:first-child {
  font-weight: 600;
}
.header-popover {
  border-radius: 12px;
}
@media (min-width: 768px) {
  .app-header #global-main-search {
    height: 40px;
  }
  .app-header button[aria-label='Buka Navigasi Mobile'] {
    width: 40px;
    height: 44px;
  }
}

@media (width < 40rem) {
  .password-form input[type='password'] {
    min-height: 2.75rem;
    font-size: 1rem;
  }
  .password-form button {
    min-height: 2.75rem;
  }
}

@media (width < 64rem) {
  .header-profile-chevron {
    display: none;
  }
}
@media (width < 48rem) {
  .app-header #global-main-search,
  .header-search-panel input[type='search'] {
    font-size: 1rem;
  }
  .header-popover button {
    min-height: 2.75rem;
  }
  .header-popover > div:not(.overflow-y-auto) {
    flex-shrink: 0;
  }
  .header-popover .truncate {
    white-space: normal;
    overflow-wrap: anywhere;
  }
  .header-popover p {
    overflow-wrap: anywhere;
  }
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.badge-pop-enter-active {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.badge-pop-leave-active {
  transition: all 0.15s ease;
}
.badge-pop-enter-from,
.badge-pop-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
@media (prefers-reduced-motion: reduce) {
  .dropdown-enter-active,
  .dropdown-leave-active,
  .badge-pop-enter-active,
  .badge-pop-leave-active {
    transition: none;
  }
}
</style>

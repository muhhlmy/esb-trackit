import { computed, ref, watch } from 'vue'
import { useAuth } from './useAuth'
import { useApi } from './useApi'
import { useTicketEvents } from './useTicketEvents'
import SkeletonList from '../components/ui/skeleton/SkeletonList.vue'

export function useNotifications() {
  const { hasPermission } = useAuth()
  const { get } = useApi()
  const { connect: connectSSE, disconnect: disconnectSSE, on: onSSE, off: offSSE } = useTicketEvents()

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
      // Silently fail
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
      message ||
      (type === 'CREATED' ? 'Tiket baru telah dibuat' : 'Detail tiket diperbarui')

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
            type: 'UPDATED',
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
    if (s === 'sedang ditangani' || s === 'in progress' || s === 'in_progress')
      return 'bg-blue-500'
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
        seedNotificationsFromTickets(data)
        syncTicketStatusChanges(data)
      }
    } catch {
      // Silently fail
    } finally {
      isFetchingNotif.value = false
    }
  }

  function markAllNotificationsRead() {
    notificationsList.value.forEach((n) => {
      n.isRead = true
    })
    persistNotifications()
  }

  function relativeTime(dateStrOrMs) {
    if (!dateStrOrMs) return ''
    const timestamp =
      typeof dateStrOrMs === 'number' ? dateStrOrMs : new Date(dateStrOrMs).getTime()
    const diff = Date.now() - timestamp
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'Baru saja'
    if (m < 60) return `${m} mnt lalu`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} jam lalu`
    const d = Math.floor(h / 24)
    return `${d} hari lalu`
  }

  // Event handlers for SSE
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
      if (!notificationsList.value.some((t) => t.id === data.id)) {
        // event-driven fresh ticket should eventually sync via fetchTickets
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
      const targetTicket = notificationsList.value.find((t) => t.id === ticketId) || null
      // fallback: search allTickets not available here; keep simple
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

  function connectTicketRealtime() {
    connectSSE()
    onSSE('TICKET_CREATED', handleSseTicketCreated)
    onSSE('TICKET_UPDATED', handleSseTicketUpdated)
    onSSE('COMMENT_CREATED', handleSseCommentCreated)
  }

  function disconnectTicketRealtime() {
    offSSE('TICKET_CREATED', handleSseTicketCreated)
    offSSE('TICKET_UPDATED', handleSseTicketUpdated)
    offSSE('COMMENT_CREATED', handleSseCommentCreated)
    disconnectSSE()
  }

  return {
    notificationsList,
    knownTicketStates,
    knownTicketIds,
    isFetchingNotif,
    notifFilter,
    realtimeToast,
    latestNotifications,
    unreadCount,
    notifCounts,
    notifTabs,
    formatStatusDot,
    loadNotifications,
    persistNotifications,
    addNotificationItem,
    seedNotificationsFromTickets,
    syncTicketStatusChanges,
    fetchTickets,
    markAllNotificationsRead,
    relativeTime,
    connectTicketRealtime,
    disconnectTicketRealtime,
    showRealtimeToast,
  }
}

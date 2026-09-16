import { ref, computed } from 'vue'
import { api } from '../services/api.js'
import { useToast } from './useToast.js'

const cases = ref([])
const activeCaseId = ref(null)
const selectedCategory = ref('all')
const selectedSeverity = ref('all')
const searchQuery = ref('')
function loadRecentSearches() {
  if (typeof localStorage === 'undefined') return []
  try {
    const stored = JSON.parse(localStorage.getItem('esb_recent_searches') || '[]')
    return Array.isArray(stored)
      ? stored.filter((item) => typeof item === 'string').slice(0, 5)
      : []
  } catch {
    localStorage.removeItem('esb_recent_searches')
    return []
  }
}

const recentSearches = ref(loadRecentSearches())
const isLoading = ref(false)

// Drawer state
const isDrawerOpen = ref(false)
const drawerMode = ref('create') // 'create' | 'edit'
const editingCase = ref(null)

function normalizeCase(c) {
  return c ? { ...c, id: Number(c.id) } : null
}

function normalizeList(data) {
  const list = Array.isArray(data) ? data : data?.data || []
  return list.map(normalizeCase).filter(Boolean)
}

// Payload case yang dikirim ke backend (sesuai CASE_FIELDS di caseController).
// Buang field UI/local yang tidak diterima API: id, created_at, updated_at.
const CASE_PAYLOAD_FIELDS = [
  'title',
  'category',
  'severity',
  'tags',
  'summary',
  'problemContext',
  'contentHtml',
  'actionSteps',
  'dosAndDonts',
  'snippets',
  'status',
  'isCustom',
  'sort_order',
]

function toCasePayload(data) {
  const out = {}
  for (const key of CASE_PAYLOAD_FIELDS) {
    if (data?.[key] !== undefined) out[key] = data[key]
  }
  return out
}

export function useCases() {
  const { showToast } = useToast()

  // Public Help Center: hanya case berstatus PUBLISHED
  async function fetchCases() {
    isLoading.value = true
    try {
      cases.value = normalizeList(await api.getPublicCases())
      if (!activeCaseId.value && cases.value.length) {
        activeCaseId.value = cases.value[0].id
      }
    } catch {
      // Fail-safe: tampilkan empty state; detail teknis tidak dibocorkan ke UI.
      cases.value = []
    } finally {
      isLoading.value = false
    }
  }

  // Admin CMS: semua case (termasuk DRAFT)
  async function fetchAllCases() {
    isLoading.value = true
    try {
      cases.value = normalizeList(await api.getCases())
      if (!activeCaseId.value && cases.value.length) {
        activeCaseId.value = cases.value[0].id
      }
    } catch (err) {
      cases.value = []
      showToast(err?.message || 'Gagal memuat data artikel Admin CMS.', 'error')
    } finally {
      isLoading.value = false
    }
  }

  const filteredCases = computed(() => {
    return cases.value.filter((c) => {
      const matchCategory =
        selectedCategory.value === 'all' || c.category === selectedCategory.value
      const matchSeverity =
        selectedSeverity.value === 'all' || c.severity === selectedSeverity.value

      if (!matchCategory || !matchSeverity) return false

      if (!searchQuery.value.trim()) return true

      const q = searchQuery.value.toLowerCase().trim()
      const matchTitle = (c.title || '').toLowerCase().includes(q)
      const matchSummary = (c.summary || '').toLowerCase().includes(q)
      const matchContent = (c.contentHtml || '').toLowerCase().includes(q)
      const matchTags =
        Array.isArray(c.tags) && c.tags.some((t) => (t || '').toLowerCase().includes(q))

      return matchTitle || matchSummary || matchContent || matchTags
    })
  })

  // True bila user sedang mencari dan tidak ada case yang cocok
  const hasNoSearchResult = computed(() => {
    return !!searchQuery.value.trim() && filteredCases.value.length === 0
  })

  const activeCase = computed(() => {
    if (hasNoSearchResult.value) return null
    return (
      cases.value.find((c) => c.id === activeCaseId.value) ||
      filteredCases.value[0] ||
      cases.value[0] ||
      null
    )
  })

  function selectCase(id) {
    activeCaseId.value = Number(id)
  }

  function setCategory(cat) {
    selectedCategory.value = cat
  }

  function setSeverity(sev) {
    selectedSeverity.value = sev
  }

  function setSearch(query) {
    const normalizedQuery = typeof query === 'string' ? query.trim() : ''
    searchQuery.value = normalizedQuery
    if (normalizedQuery && !recentSearches.value.includes(normalizedQuery)) {
      recentSearches.value = [normalizedQuery, ...recentSearches.value.slice(0, 4)]
      try {
        localStorage.setItem('esb_recent_searches', JSON.stringify(recentSearches.value))
      } catch {
        // Penyimpanan lokal bersifat opsional (private mode/quota dapat menolaknya).
      }
    }
    if (normalizedQuery) {
      queueMicrotask(() => {
        api.logKbSearch(normalizedQuery, filteredCases.value.length).catch(() => {})
      })
    }
  }

  function clearSearch() {
    searchQuery.value = ''
  }

  function clearRecentSearches() {
    recentSearches.value = []
    try {
      localStorage.removeItem('esb_recent_searches')
    } catch {
      // Penyimpanan lokal bersifat opsional.
    }
  }

  function openCreateDrawer() {
    drawerMode.value = 'create'
    editingCase.value = {
      title: '',
      category: 'hardware',
      severity: 'medium',
      tags: [],
      summary: '',
      problemContext: '',
      actionSteps: [],
      dosAndDonts: { dos: [], donts: [] },
      snippets: [],
      status: 'PUBLISHED',
    }
    isDrawerOpen.value = true
  }

  function openEditDrawer(caseItem) {
    drawerMode.value = 'edit'
    editingCase.value = JSON.parse(JSON.stringify(caseItem))
    isDrawerOpen.value = true
  }

  function closeDrawer() {
    isDrawerOpen.value = false
    editingCase.value = null
  }

  async function saveCase(formData, { showNotification = true } = {}) {
    const existingId = formData?.id ? Number(formData.id) : null
    const payload = toCasePayload(formData)
    try {
      let saved
      if (existingId) {
        saved = normalizeCase(await api.updateCase(existingId, payload))
        const idx = cases.value.findIndex((c) => c.id === saved.id)
        if (idx !== -1) cases.value[idx] = saved
        else cases.value.unshift(saved)
        if (showNotification) {
          showToast('Perubahan Case berhasil disimpan!', 'success')
        }
      } else {
        saved = normalizeCase(await api.createCase(payload))
        cases.value.unshift(saved)
        activeCaseId.value = saved.id
        if (showNotification) {
          showToast('Case baru berhasil disimpan!', 'success')
        }
      }
      closeDrawer()
      return saved
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan case.', 'error')
      return null
    }
  }

  async function deleteCase(id) {
    try {
      await api.deleteCase(id)
      cases.value = cases.value.filter((c) => Number(c.id) !== Number(id))
      if (Number(activeCaseId.value) === Number(id)) {
        activeCaseId.value = cases.value[0]?.id ?? null
      }
      showToast('Case berhasil dihapus.', 'info')
      closeDrawer()
      return true
    } catch (err) {
      showToast(err.message || 'Gagal menghapus case.', 'error')
      return false
    }
  }

  return {
    cases,
    activeCaseId,
    activeCase,
    selectedCategory,
    selectedSeverity,
    searchQuery,
    recentSearches,
    filteredCases,
    hasNoSearchResult,
    isLoading,
    isDrawerOpen,
    drawerMode,
    editingCase,
    fetchCases,
    fetchAllCases,
    selectCase,
    setCategory,
    setSeverity,
    setSearch,
    clearSearch,
    clearRecentSearches,
    openCreateDrawer,
    openEditDrawer,
    closeDrawer,
    saveCase,
    deleteCase,
  }
}

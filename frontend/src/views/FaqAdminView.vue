<script setup>
// FaqAdminView.vue — CMS FAQ Help Center (list, add, edit, delete)
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import { useToast } from '../composables/useToast.js'
import { useAuth } from '../composables/useAuth.js'
import { useKbCategories } from '../composables/useKbCategories.js'
import AppModal from '../components/ui/AppModal.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import {
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  Search,
  HelpCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  X,
  FolderOpen,
} from 'lucide-vue-next'

const { get, post, put, del } = useApi()
const { showToast } = useToast()
const { hasWritePermission } = useAuth()
const canWrite = computed(() => hasWritePermission('knowledge_base'))

const FAQ_CATEGORIES = [
  'Account & Access',
  'Devices & Hardware',
  'Network & VPN',
  'Software & Applications',
  'Security & Compliance',
  'General & Policies',
]

// Kategori FAQ mengikuti Data Karyawan/Kategori di kb_categories (sumber yang
// sama dengan halaman /admin/kb-categories dan editor artikel). Opsi statis
// hanya fallback jika data DB belum dimuat.
const { categories: kbCategories, fetchAllCategories } = useKbCategories()

const categoryOptions = computed(() => {
  const fromDb = kbCategories.value.map((c) => ({ value: c.title, label: c.title }))
  const seen = new Set(fromDb.map((c) => c.value))
  return [
    ...fromDb,
    ...FAQ_CATEGORIES.filter((c) => !seen.has(c)).map((c) => ({ value: c, label: c })),
  ]
})

const categoryFilterOptions = computed(() => [
  { value: 'all', label: 'All Categories' },
  ...categoryOptions.value,
])

const faqStatusFormOptions = [
  { value: 'DRAFT', label: 'Draft', dot: 'bg-amber-500' },
  { value: 'PUBLISHED', label: 'Published', dot: 'bg-emerald-500' },
]

const faqs = ref([])
const isLoading = ref(true)
const pageError = ref('')

const searchQuery = ref('')
const selectedCategory = ref('all')
const selectedStatus = ref('all') // 'all', 'PUBLISHED', 'DRAFT'

const showFormModal = ref(false)
const showDeleteModal = ref(false)
const modalMode = ref('add') // 'add' | 'edit'
const isSubmitting = ref(false)
const modalError = ref('')
const selectedFaq = ref(null)

const emptyForm = () => ({
  question: '',
  answer: '',
  category: FAQ_CATEGORIES[0],
  status: 'DRAFT',
  sort_order: 0,
})
const form = ref(emptyForm())

async function fetchFaqs() {
  isLoading.value = true
  pageError.value = ''
  try {
    faqs.value = await get('/api/faqs')
  } catch (err) {
    pageError.value = err.message || 'Unable to load FAQs.'
  } finally {
    isLoading.value = false
  }
}

const filteredFaqs = computed(() => {
  return faqs.value.filter((f) => {
    // Category match
    const matchCat = selectedCategory.value === 'all' || f.category === selectedCategory.value
    if (!matchCat) return false

    // Status match
    if (selectedStatus.value !== 'all') {
      const caseStatus = f.status || 'DRAFT'
      if (caseStatus !== selectedStatus.value) return false
    }

    // Search query match
    if (!searchQuery.value.trim()) return true
    const q = searchQuery.value.toLowerCase().trim()
    return (
      (f.question || '').toLowerCase().includes(q) ||
      (f.answer || '').toLowerCase().includes(q) ||
      (f.category || '').toLowerCase().includes(q)
    )
  })
})

const stats = computed(() => {
  const total = faqs.value.length
  const published = faqs.value.filter((f) => f.status === 'PUBLISHED').length
  const draft = faqs.value.filter((f) => f.status === 'DRAFT' || !f.status).length
  return { total, published, draft }
})

function openAdd() {
  if (!canWrite.value) return
  modalMode.value = 'add'
  modalError.value = ''
  form.value = emptyForm()
  showFormModal.value = true
}

function openEdit(faq) {
  if (!canWrite.value) return
  modalMode.value = 'edit'
  modalError.value = ''
  selectedFaq.value = faq
  form.value = {
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    status: faq.status,
    sort_order: faq.sort_order,
  }
  showFormModal.value = true
}

function openDelete(faq) {
  if (!canWrite.value) return
  selectedFaq.value = faq
  showDeleteModal.value = true
}

function closeFormModal() {
  showFormModal.value = false
  selectedFaq.value = null
}

function closeDeleteModal() {
  showDeleteModal.value = false
  selectedFaq.value = null
}

function clearFilters() {
  searchQuery.value = ''
  selectedCategory.value = 'all'
  selectedStatus.value = 'all'
}

async function saveFaq() {
  if (!canWrite.value) return
  modalError.value = ''
  if (!form.value.question.trim()) {
    modalError.value = 'Pertanyaan wajib diisi.'
    return
  }
  if (!form.value.answer.trim()) {
    modalError.value = 'Jawaban wajib diisi.'
    return
  }
  if (!form.value.category) {
    modalError.value = 'Kategori wajib dipilih.'
    return
  }

  isSubmitting.value = true
  try {
    const payload = {
      question: form.value.question.trim(),
      answer: form.value.answer.trim(),
      category: form.value.category,
      status: form.value.status,
      sort_order: Number(form.value.sort_order) || 0,
    }

    if (modalMode.value === 'add') {
      await post('/api/faqs', payload)
      showToast('FAQ berhasil ditambahkan.', 'success')
    } else {
      await put(`/api/faqs/${selectedFaq.value.id}`, payload)
      showToast('FAQ berhasil diperbarui.', 'success')
    }
    closeFormModal()
    await fetchFaqs()
  } catch (err) {
    modalError.value = err.message || 'Gagal menyimpan FAQ.'
  } finally {
    isSubmitting.value = false
  }
}

async function confirmDelete() {
  if (!canWrite.value) return
  isSubmitting.value = true
  try {
    await del(`/api/faqs/${selectedFaq.value.id}`)
    showToast('FAQ berhasil dihapus.', 'info')
    closeDeleteModal()
    await fetchFaqs()
  } catch (err) {
    showToast(err.message || 'Gagal menghapus FAQ.', 'error')
  } finally {
    isSubmitting.value = false
  }
}

function formatDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getCategoryBadgeClass(category) {
  const cat = (category || '').toLowerCase()
  if (cat.includes('account') || cat.includes('access'))
    return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60'
  if (cat.includes('device') || cat.includes('hardware'))
    return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60'
  if (cat.includes('network') || cat.includes('vpn'))
    return 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60'
  if (cat.includes('software') || cat.includes('app'))
    return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60'
  if (cat.includes('security') || cat.includes('compliance'))
    return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60'
  return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60'
}

onMounted(() => {
  fetchFaqs()
  fetchAllCategories().catch(() => {
    /* fallback ke daftar statis di atas */
  })
})
</script>

<template>
  <div class="kb-management admin-workspace max-w-7xl mx-auto space-y-6 select-none font-sans">
    <!-- Top Navigation & Header Card -->
    <div
      class="admin-page-header ws-toolbar-flat flex flex-col items-start sm:items-center justify-between gap-3.5 bg-white border border-[#E2E8F0]/80 p-3.5 sm:p-4.5 rounded-2xl shadow-2xs"
    >
      <div class="space-y-1 sm:space-y-1.5 w-full sm:w-auto">
        <!-- Breadcrumb -->
        <div
          class="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-[#5F7089] dark:text-slate-400"
        >
          <RouterLink to="/" class="hover:text-[#333333] transition-colors flex items-center gap-1">
            <span>Help Center</span>
          </RouterLink>
          <ChevronRight class="w-3 h-3 text-slate-400" />
          <span class="text-[#333333] font-bold">FAQ Management</span>
        </div>

        <h1
          class="text-xl sm:text-3xl font-extrabold text-[#333333] dark:text-white tracking-tight flex items-center gap-2 flex-wrap"
        >
          <span>FAQ Management</span>
          <span
            class="text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-bold bg-[#ECF2FF] dark:bg-indigo-950/80 text-[#333333] dark:text-indigo-300 border border-[#0A51B0]/20"
          >
            Admin CMS
          </span>
        </h1>

        <p
          class="text-xs sm:text-sm text-[#5F7089] dark:text-slate-400 font-medium leading-relaxed"
        >
          Kelola daftar pertanyaan dan jawaban yang tampil di Help Center publik.
        </p>
      </div>

      <button
        v-if="canWrite"
        @click="openAdd"
        class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0A51B0] hover:bg-[#0A4391] text-white shadow-sm shadow-[#0A51B0]/25 hover:shadow-md transition-all cursor-pointer active:scale-95 touch-manipulation shrink-0"
      >
        <Plus class="w-4 h-4" />
        <span>Add New FAQ</span>
      </button>
    </div>

    <!-- Quick Metrics Grid (3 Columns Balanced) -->
    <div class="grid grid-cols-3 gap-2 sm:gap-4">
      <!-- Total Questions -->
      <div
        class="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 group hover:border-[#0A51B0]/40 transition-all"
      >
        <div class="space-y-0.5 sm:space-y-1 min-w-0">
          <span
            class="text-[10px] sm:text-xs font-semibold text-[#5F7089] dark:text-slate-400 truncate block"
            >Total Questions</span
          >
          <p
            class="text-lg sm:text-3xl font-extrabold text-[#333333] dark:text-white tracking-tight tabular-nums"
          >
            {{ stats.total }}
          </p>
          <span
            class="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60"
          >
            Active FAQs
          </span>
        </div>
        <div
          class="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-[#ECF2FF] dark:bg-indigo-950/60 text-[#333333] dark:text-indigo-400 flex items-center justify-center border border-[#0A51B0]/20 group-hover:scale-105 transition-transform shrink-0 self-start sm:self-auto"
        >
          <HelpCircle class="w-3.5 h-3.5 sm:w-6 sm:h-6" />
        </div>
      </div>

      <!-- Published FAQs -->
      <div
        class="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 group hover:border-emerald-500/40 transition-all"
      >
        <div class="space-y-0.5 sm:space-y-1 min-w-0">
          <span
            class="text-[10px] sm:text-xs font-semibold text-[#5F7089] dark:text-slate-400 truncate block"
            >Published</span
          >
          <p
            class="text-lg sm:text-3xl font-extrabold text-[#333333] dark:text-white tracking-tight tabular-nums"
          >
            {{ stats.published }}
          </p>
          <span
            class="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60"
          >
            Live on Portal
          </span>
        </div>
        <div
          class="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform shrink-0 self-start sm:self-auto"
        >
          <CheckCircle class="w-3.5 h-3.5 sm:w-6 sm:h-6" />
        </div>
      </div>

      <!-- Draft FAQs -->
      <div
        class="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 group hover:border-amber-500/40 transition-all"
      >
        <div class="space-y-0.5 sm:space-y-1 min-w-0">
          <span
            class="text-[10px] sm:text-xs font-semibold text-[#5F7089] dark:text-slate-400 truncate block"
            >Drafts</span
          >
          <p
            class="text-lg sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight tabular-nums"
          >
            {{ stats.draft }}
          </p>
          <span
            class="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/60"
          >
            In Review
          </span>
        </div>
        <div
          class="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform shrink-0 self-start sm:self-auto"
        >
          <Clock class="w-3.5 h-3.5 sm:w-6 sm:h-6" />
        </div>
      </div>
    </div>

    <!-- Error State Alert -->
    <div
      v-if="pageError"
      class="flex items-center justify-between gap-4 rounded-xl sm:rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3.5 sm:p-4 text-xs font-bold text-rose-700 dark:text-rose-300"
    >
      <span>{{ pageError }}</span>
      <button
        @click="fetchFaqs"
        class="inline-flex items-center gap-1.5 font-extrabold underline cursor-pointer"
      >
        <RefreshCw class="h-3.5 w-3.5" /> Retry
      </button>
    </div>

    <!-- Search & Filters Toolbar -->
    <div
      class="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#E5EAEF] dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4"
    >
      <!-- Left: Search Input -->
      <div class="relative flex-1 sm:max-w-md w-full">
        <Search
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687281] pointer-events-none"
        />
        <input
          v-model="searchQuery"
          type="text"
          aria-label="Cari pertanyaan atau jawaban FAQ"
          placeholder="Search questions or answer keywords…"
          class="w-full bg-[#F8FAFC] dark:bg-slate-800/80 border border-[#E5EAEF] dark:border-slate-700 rounded-xl pl-9 sm:pl-10 pr-9 py-2 text-xs sm:text-sm font-medium text-[#333333] dark:text-white placeholder-[#687281] focus:outline-none focus:border-[#0A51B0] focus:bg-white dark:focus:bg-slate-900 transition-all"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
          title="Clear search"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Right: Status & Category Controls -->
      <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        <!-- Status Segmented Control -->
        <div
          class="flex items-center p-0.5 sm:p-1 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5EAEF] dark:border-slate-700 text-xs flex-1 sm:flex-none"
        >
          <button
            v-for="st in [
              { key: 'all', label: 'All' },
              { key: 'PUBLISHED', label: 'Published' },
              { key: 'DRAFT', label: 'Draft' },
            ]"
            :key="st.key"
            @click="selectedStatus = st.key"
            class="flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-center active:scale-95 touch-manipulation"
            :class="
              selectedStatus === st.key
                ? 'bg-white dark:bg-slate-900 text-[#333333] dark:text-indigo-400 shadow-2xs'
                : 'text-[#5F7089] dark:text-slate-400 hover:text-[#333333] dark:hover:text-white'
            "
          >
            {{ st.label }}
          </button>
        </div>

        <!-- Category Select -->
        <div class="relative flex-1 sm:flex-none sm:w-44">
          <CustomSelect
            v-model="selectedCategory"
            :options="categoryFilterOptions"
            aria-label="Filter category"
            placeholder="All Categories"
            :block="true"
            height-class="h-9"
          />
        </div>

        <!-- Clear Filters Button -->
        <button
          v-if="searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'"
          @click="clearFilters"
          class="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer active:scale-95 touch-manipulation shrink-0"
          title="Reset Filters"
        >
          Clear Filters
        </button>
      </div>
    </div>

    <!-- Data Table Container -->
    <div
      class="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5EAEF] dark:border-slate-800 overflow-hidden shadow-xs"
    >
      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="py-12 px-6 text-center text-xs font-bold text-[#5F7089] dark:text-slate-400 flex items-center justify-center gap-2"
      >
        <RefreshCw class="w-4 h-4 animate-spin text-[#333333]" />
        <span>Loading FAQ entries...</span>
      </div>
      <!-- Table / Cards Content -->
      <div v-else>
        <!-- Empty State -->
        <div v-if="filteredFaqs.length === 0" class="py-12 px-6 text-center">
          <div class="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
            <div
              class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-1"
            >
              <FolderOpen class="w-6 h-6" />
            </div>
            <p class="text-sm font-extrabold text-[#333333] dark:text-white">
              No FAQ entries found
            </p>
            <p class="text-xs text-[#5F7089] dark:text-slate-400">
              No FAQs match your current search query or active filter settings.
            </p>
            <button
              @click="clearFilters"
              class="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-[#ECF2FF] dark:bg-indigo-950 text-[#333333] hover:bg-[#0A51B0] hover:text-white transition-all cursor-pointer active:scale-95 touch-manipulation"
            >
              Reset All Filters
            </button>
          </div>
        </div>

        <template v-else>
          <!-- MOBILE CARD VIEW (< md) -->
          <div class="xl:hidden divide-y divide-[#E5EAEF] dark:divide-slate-800">
            <div
              v-for="f in filteredFaqs"
              :key="'mob-' + f.id"
              class="p-4 space-y-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
            >
              <!-- Top Row: Category Badge + Status + Actions -->
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0 flex-wrap">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold border capitalize shrink-0"
                    :class="getCategoryBadgeClass(f.category)"
                  >
                    {{ f.category }}
                  </span>
                  <span
                    class="inline-flex items-center gap-1 text-[11px] font-bold shrink-0"
                    :class="
                      f.status === 'PUBLISHED'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    "
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full shrink-0"
                      :class="f.status === 'PUBLISHED' ? 'bg-emerald-500' : 'bg-amber-500'"
                    ></span>
                    <span>{{ f.status === 'PUBLISHED' ? 'Published' : 'Draft' }}</span>
                  </span>
                </div>

                <!-- Action buttons -->
                <div v-if="canWrite" class="flex items-center gap-1.5 shrink-0">
                  <button
                    @click="openEdit(f)"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#0A51B0] hover:bg-[#0A4391] text-white transition-all cursor-pointer shadow-xs active:scale-95 touch-manipulation"
                    title="Edit FAQ"
                  >
                    <Edit3 class="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    @click="openDelete(f)"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer active:scale-95 touch-manipulation"
                    title="Delete FAQ"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Question Title -->
              <h3
                class="text-xs sm:text-sm font-extrabold text-[#333333] dark:text-white leading-snug break-words"
              >
                {{ f.question }}
              </h3>

              <!-- Answer Snippet -->
              <p
                class="text-[12px] text-[#5F7089] dark:text-slate-400 font-normal leading-relaxed line-clamp-3 break-words bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80"
              >
                {{ f.answer }}
              </p>

              <!-- Footer Metadata: Sort Order & Updated Date -->
              <div
                class="flex items-center justify-between text-[11px] text-[#5F7089] dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60 font-medium"
              >
                <span class="font-mono text-slate-500 dark:text-slate-400">
                  Order:
                  <strong class="text-[#333333] dark:text-white">#{{ f.sort_order || 0 }}</strong>
                </span>
                <span> Updated {{ formatDate(f.updated_at) }} </span>
              </div>
            </div>
          </div>

          <!-- DESKTOP TABLE VIEW (>= md) -->
          <div class="hidden xl:block overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead
                class="bg-[#F8FAFC] dark:bg-slate-950/80 border-b border-[#E5EAEF] dark:border-slate-800 text-[#5F7089] dark:text-slate-400 font-extrabold uppercase tracking-wider text-[11px]"
              >
                <tr>
                  <th scope="col" class="py-4 px-6">Question &amp; Answer</th>
                  <th scope="col" class="py-4 px-4">Category</th>
                  <th scope="col" class="py-4 px-4">Status</th>
                  <th scope="col" class="py-4 px-4">Sort Order</th>
                  <th scope="col" class="py-4 px-4">Updated</th>
                  <th scope="col" v-if="canWrite" class="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E5EAEF] dark:divide-slate-800">
                <tr
                  v-for="f in filteredFaqs"
                  :key="f.id"
                  class="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 transition-colors group"
                >
                  <!-- Question & Answer Snippet -->
                  <td class="py-4 px-6">
                    <div
                      class="font-extrabold text-[#333333] dark:text-white text-xs max-w-md group-hover:text-[#333333] transition-colors"
                    >
                      {{ f.question }}
                    </div>
                    <div
                      class="text-[11px] text-[#5F7089] dark:text-slate-400 line-clamp-1 mt-1 font-normal max-w-md"
                    >
                      {{ f.answer }}
                    </div>
                  </td>

                  <!-- Category Badge -->
                  <td class="py-4 px-4">
                    <span
                      class="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-extrabold border capitalize"
                      :class="getCategoryBadgeClass(f.category)"
                    >
                      {{ f.category }}
                    </span>
                  </td>

                  <!-- Status Badge -->
                  <td class="py-4 px-4">
                    <span
                      class="inline-flex items-center gap-1.5 text-xs font-bold"
                      :class="
                        f.status === 'PUBLISHED'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      "
                    >
                      <span
                        class="w-2 h-2 rounded-full"
                        :class="f.status === 'PUBLISHED' ? 'bg-emerald-500' : 'bg-amber-500'"
                      ></span>
                      <span>{{ f.status === 'PUBLISHED' ? 'Published' : 'Draft' }}</span>
                    </span>
                  </td>

                  <!-- Sort Order -->
                  <td
                    class="py-4 px-4 font-mono text-xs font-semibold text-[#5F7089] dark:text-slate-400"
                  >
                    #{{ f.sort_order || 0 }}
                  </td>

                  <!-- Updated Date -->
                  <td class="py-4 px-4 text-[#5F7089] dark:text-slate-400 font-medium">
                    {{ formatDate(f.updated_at) }}
                  </td>

                  <!-- Actions -->
                  <td v-if="canWrite" class="py-4 px-6 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        @click="openEdit(f)"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0A51B0] hover:bg-[#0A4391] text-white transition-all cursor-pointer shadow-xs active:scale-95"
                        title="Edit FAQ"
                      >
                        <Edit3 class="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        @click="openDelete(f)"
                        class="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete FAQ"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>

    <!-- Add / Edit Form Modal -->
    <AppModal
      :is-open="showFormModal"
      :title="modalMode === 'add' ? 'Tambah FAQ' : 'Edit FAQ'"
      subtitle="Tulis pertanyaan dan jawaban yang membantu pengguna Help Center."
      icon="quiz"
      size="lg"
      @close="closeFormModal"
    >
      <form id="faq-entry" @submit.prevent="saveFaq" class="admin-entry-form faq-content-form">
        <section class="faq-content-section">
          <h3>Konten FAQ</h3>
          <p class="faq-section-hint">Kolom bertanda * wajib diisi.</p>
          <div>
            <label
              for="faq-question"
              class="mb-1.5 block text-xs font-bold text-[#333333] dark:text-slate-200"
              >Pertanyaan <span class="text-rose-600">*</span></label
            >
            <input
              id="faq-question"
              v-model="form.question"
              required
              type="text"
              placeholder="Contoh: Bagaimana cara mereset kata sandi akun?"
              class="w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] dark:bg-slate-800 px-3.5 py-2.5 text-base sm:text-xs font-semibold text-[#333333] dark:text-slate-100 placeholder-[#687281] focus:border-[#0A51B0] focus:outline-none transition-all"
            />
          </div>

          <div>
            <label
              for="faq-answer"
              class="mb-1.5 block text-xs font-bold text-[#333333] dark:text-slate-200"
              >Jawaban <span class="text-rose-600">*</span></label
            >
            <textarea
              id="faq-answer"
              v-model="form.answer"
              required
              rows="5"
              placeholder="Tuliskan jawaban atau langkah penyelesaian yang mudah diikuti…"
              class="w-full min-h-[140px] resize-y rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] dark:bg-slate-800 p-3.5 text-base sm:text-xs font-medium leading-[1.8] text-[#333333] dark:text-slate-100 placeholder-[#687281] focus:border-[#0A51B0] focus:outline-none transition-all"
            ></textarea>
          </div>
        </section>
        <section class="faq-settings-section">
          <h3>Pengaturan publikasi</h3>
          <div class="faq-settings-grid grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div class="col-span-2 sm:col-span-1">
              <label class="mb-1.5 block text-xs font-bold text-[#333333] dark:text-slate-200"
                >Kategori <span class="text-rose-600">*</span></label
              >
              <CustomSelect
                v-model="form.category"
                :options="categoryOptions"
                aria-label="Kategori FAQ"
                placeholder="Pilih kategori"
                :block="true"
                height-class="h-10"
              />
            </div>

            <div class="col-span-1">
              <label class="mb-1.5 block text-xs font-bold text-[#333333] dark:text-slate-200"
                >Status</label
              >
              <CustomSelect
                v-model="form.status"
                :options="faqStatusFormOptions"
                aria-label="Status FAQ"
                placeholder="Pilih status"
                :block="true"
                height-class="h-10"
              />
            </div>

            <div class="col-span-1">
              <label
                for="faq-sort-order"
                class="mb-1.5 block text-xs font-bold text-[#333333] dark:text-slate-200"
                >Urutan</label
              >
              <input
                id="faq-sort-order"
                v-model.number="form.sort_order"
                type="number"
                min="0"
                step="1"
                class="w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] dark:bg-slate-800 px-3.5 py-2.5 text-base sm:text-xs font-semibold text-[#333333] dark:text-slate-100 focus:border-[#0A51B0] focus:outline-none transition-all"
              />
            </div>
          </div>
        </section>
        <p
          role="alert"
          v-if="modalError"
          class="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200"
        >
          {{ modalError }}
        </p>
      </form>
      <template #footer>
        <div
          class="admin-modal-actions faq-form-footer flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2"
        >
          <button
            type="button"
            @click="closeFormModal"
            class="w-full sm:w-auto rounded-xl border border-[#E5EAEF] dark:border-slate-700 px-4 py-2.5 sm:py-2 text-xs font-bold text-[#475569] dark:text-slate-300 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95 touch-manipulation text-center"
          >
            Batal
          </button>
          <button
            type="submit"
            form="faq-entry"
            :disabled="isSubmitting"
            class="w-full sm:w-auto rounded-xl bg-[#0A51B0] hover:bg-[#0A4391] px-5 py-2.5 sm:py-2 text-xs font-bold text-white shadow-md shadow-[#0A51B0]/20 transition-all disabled:opacity-50 cursor-pointer active:scale-95 touch-manipulation text-center"
          >
            {{ isSubmitting ? 'Menyimpan...' : 'Simpan FAQ' }}
          </button>
        </div>
      </template>
    </AppModal>

    <!-- Delete Confirmation Modal -->
    <AppModal
      :is-open="showDeleteModal"
      title="Hapus FAQ?"
      icon="delete"
      size="sm"
      @close="closeDeleteModal"
    >
      <div class="space-y-4 pt-1">
        <p class="text-xs font-medium text-[#475569] dark:text-slate-300 leading-relaxed">
          FAQ ini akan dihapus permanen dari Help Center. Tindakan ini tidak dapat dibatalkan.
        </p>
      </div>
      <template #footer>
        <div class="admin-modal-actions flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
          <button
            @click="closeDeleteModal"
            class="w-full sm:w-auto rounded-xl border border-[#E5EAEF] dark:border-slate-700 px-4 py-2.5 sm:py-2 text-xs font-bold text-[#475569] dark:text-slate-300 hover:bg-[#F8FAFC] dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95 touch-manipulation text-center"
          >
            Batal
          </button>
          <button
            @click="confirmDelete"
            :disabled="isSubmitting"
            class="w-full sm:w-auto rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2.5 sm:py-2 text-xs font-bold text-white shadow-xs disabled:opacity-50 cursor-pointer active:scale-95 touch-manipulation text-center"
          >
            Hapus
          </button>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<style scoped src="../assets/admin-workspace.css"></style>
<style scoped src="../assets/ws-table.css"></style>

<style scoped>
.kb-management table td:first-child {
  width: 38%;
}
.kb-management table td:first-child :is(p, h3) {
  white-space: normal;
  line-height: 1.7;
}
.kb-management table td:first-child h3 {
  font-size: 14px;
  font-weight: 650;
}
.kb-management table th {
  background: #f8fafc;
}
.kb-management .xl\:hidden > div {
  padding: 20px;
  gap: 14px;
}
.kb-management .xl\:hidden h3 {
  font-size: 15px;
  line-height: 1.6;
}
.kb-management .xl\:hidden p {
  line-height: 1.7;
}
.kb-category-drawer {
  max-width: 520px;
}
.kb-category-drawer > div:first-child {
  padding: 20px 24px;
}
.kb-category-drawer > div:nth-child(2) {
  padding: 24px;
}
.kb-category-drawer :is(input, textarea, select) {
  min-height: 44px;
  border-radius: 8px;
  font-size: 13px;
  border-color: #dce4ef;
}
.kb-category-drawer label {
  font-size: 12px;
  font-weight: 500;
}
.kb-category-drawer > div:last-child {
  padding: 16px 24px;
}
.kb-category-drawer button {
  min-height: 40px;
}
.kb-category-drawer > div:last-child button {
  min-height: 44px;
  border-radius: 8px;
}
@media (max-width: 639px) {
  .kb-management .xl\:hidden > div {
    padding: 16px;
  }
  .kb-management button {
    min-height: 44px;
  }
  .kb-category-drawer :is(input, textarea, select) {
    font-size: 16px;
  }
  .kb-category-drawer > div:nth-child(2) {
    padding: 20px 16px;
  }
  .kb-category-drawer > div:last-child button {
    flex: 1;
  }
}
</style>

<style scoped>
.faq-content-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0;
}
.faq-content-section,
.faq-settings-section {
  padding: 20px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}
.faq-content-form h3 {
  font-size: 13px;
  font-weight: 650;
  color: #333;
  margin-bottom: 8px;
}
.faq-section-hint {
  color: #667283;
  font-size: 11px;
  margin-bottom: 18px;
}
.faq-content-section > div + div {
  margin-top: 18px;
}
.faq-content-form label {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 7px;
}
.faq-content-form :is(input, textarea) {
  background: #fafbfd;
  font-weight: 400;
  border-color: #dce4ef;
  border-radius: 8px;
  font-size: 13px;
}
.faq-content-form textarea {
  min-height: 180px;
  line-height: 1.8;
  resize: vertical;
}
.faq-settings-grid {
  margin-top: 18px;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 0.7fr);
}
.faq-settings-grid > div {
  min-width: 0;
}
.faq-content-form :deep(button[aria-haspopup='listbox']) {
  min-height: 44px;
  font-size: 13px;
}
.faq-form-footer {
  flex-direction: row;
}
.faq-form-footer button {
  min-height: 44px;
}
@media (max-width: 639px) {
  .faq-content-section,
  .faq-settings-section {
    padding: 16px;
  }
  .faq-settings-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .faq-settings-grid > div:first-child {
    grid-column: 1 / -1;
  }
  .faq-content-form :is(input, textarea),
  .faq-content-form :deep(button[aria-haspopup='listbox']) {
    font-size: 16px;
  }
  .faq-content-form textarea {
    min-height: 200px;
  }
  .faq-form-footer button {
    width: auto;
    flex: 1;
  }
}
</style>

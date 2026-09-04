<script setup>
// FaqAdminView.vue — CMS FAQ Help Center (list, add, edit, delete)
import { computed, onMounted, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import { useToast } from '../composables/useToast.js'
import AppModal from '../components/ui/AppModal.vue'
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
  ArrowUpDown,
  AlertTriangle
} from 'lucide-vue-next'

const router = useRouter()
const { get, post, put, del } = useApi()
const { showToast } = useToast()

const FAQ_CATEGORIES = [
  'Account & Access',
  'Devices & Hardware',
  'Network & VPN',
  'Software & Applications',
  'Security & Compliance',
  'General IT Support',
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
  modalMode.value = 'add'
  modalError.value = ''
  form.value = emptyForm()
  showFormModal.value = true
}

function openEdit(faq) {
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

onMounted(fetchFaqs)
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6 select-none font-sans">
    
    <!-- Top Navigation & Header Card -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 p-6 rounded-2xl shadow-sm">
      <div class="space-y-1.5">
        <!-- Breadcrumb -->
        <div class="flex items-center gap-2 text-xs font-semibold text-[#64748B] dark:text-slate-400">
          <RouterLink to="/" class="hover:text-[#5D87FF] transition-colors flex items-center gap-1">
            <span>Help Center</span>
          </RouterLink>
          <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
          <span class="text-[#5D87FF] font-bold">FAQ Management</span>
        </div>

        <h1 class="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2.5">
          <span>FAQ Management</span>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#ECF2FF] dark:bg-indigo-950/80 text-[#5D87FF] dark:text-indigo-300 border border-[#5D87FF]/20">
            Admin CMS
          </span>
        </h1>

        <p class="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 font-medium">
          Kelola daftar pertanyaan dan jawaban yang tampil di Help Center publik.
        </p>
      </div>

      <button
        @click="openAdd"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#5D87FF] hover:bg-[#4570EA] text-white shadow-md shadow-[#5D87FF]/25 hover:shadow-lg transition-all cursor-pointer active:scale-95 shrink-0"
      >
        <Plus class="w-4 h-4" />
        <span>Add New FAQ</span>
      </button>
    </div>

    <!-- Quick Metrics Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <!-- Total Questions -->
      <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 shadow-xs flex items-center justify-between group hover:border-[#5D87FF]/40 transition-all">
        <div class="space-y-1">
          <span class="text-xs font-semibold text-[#64748B] dark:text-slate-400">Total Questions</span>
          <p class="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
            {{ stats.total }}
          </p>
          <span class="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60">
            Active FAQs
          </span>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-[#ECF2FF] dark:bg-indigo-950/60 text-[#5D87FF] dark:text-indigo-400 flex items-center justify-center border border-[#5D87FF]/20 group-hover:scale-105 transition-transform">
          <HelpCircle class="w-6 h-6" />
        </div>
      </div>

      <!-- Published FAQs -->
      <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 shadow-xs flex items-center justify-between group hover:border-emerald-500/40 transition-all">
        <div class="space-y-1">
          <span class="text-xs font-semibold text-[#64748B] dark:text-slate-400">Published</span>
          <p class="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
            {{ stats.published }}
          </p>
          <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60">
            Live on Portal
          </span>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
          <CheckCircle class="w-6 h-6" />
        </div>
      </div>

      <!-- Draft FAQs -->
      <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 shadow-xs flex items-center justify-between group hover:border-amber-500/40 transition-all">
        <div class="space-y-1">
          <span class="text-xs font-semibold text-[#64748B] dark:text-slate-400">Drafts</span>
          <p class="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
            {{ stats.draft }}
          </p>
          <span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/60">
            In Review
          </span>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
          <Clock class="w-6 h-6" />
        </div>
      </div>
    </div>

    <!-- Error State Alert -->
    <div
      v-if="pageError"
      class="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs font-bold text-rose-700 dark:text-rose-300"
    >
      <span>{{ pageError }}</span>
      <button @click="fetchFaqs" class="inline-flex items-center gap-1.5 font-extrabold underline cursor-pointer">
        <RefreshCw class="h-3.5 w-3.5" /> Retry
      </button>
    </div>

    <!-- Search & Filters Toolbar -->
    <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-[#E5EAEF] dark:border-slate-800 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
      
      <!-- Left: Search Input -->
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
        <input
          v-model="searchQuery"
          type="text"
          aria-label="Cari pertanyaan atau jawaban FAQ"
          placeholder="Search questions or answer keywords..."
          class="w-full bg-[#F8FAFC] dark:bg-slate-800/80 border border-[#E5EAEF] dark:border-slate-700 rounded-xl pl-10 pr-9 py-2 text-xs font-medium text-[#0F172A] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#5D87FF] focus:bg-white dark:focus:bg-slate-900 transition-all"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Right: Status & Category Controls -->
      <div class="flex flex-wrap items-center gap-2">
        
        <!-- Status Segmented Control -->
        <div class="flex items-center p-1 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5EAEF] dark:border-slate-700 text-xs">
          <button
            v-for="st in [
              { key: 'all', label: 'All' },
              { key: 'PUBLISHED', label: 'Published' },
              { key: 'DRAFT', label: 'Draft' }
            ]"
            :key="st.key"
            @click="selectedStatus = st.key"
            class="px-3 py-1 rounded-lg font-bold transition-all cursor-pointer"
            :class="selectedStatus === st.key
              ? 'bg-white dark:bg-slate-900 text-[#5D87FF] dark:text-indigo-400 shadow-2xs'
              : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'"
          >
            {{ st.label }}
          </button>
        </div>

        <!-- Category Select -->
        <div class="relative">
          <select
            v-model="selectedCategory"
            class="bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5EAEF] dark:border-slate-700 rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#5D87FF] cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option v-for="cat in FAQ_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>

        <!-- Clear Filters Button -->
        <button
          v-if="searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'"
          @click="clearFilters"
          class="px-2.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          title="Reset Filters"
        >
          Clear Filters
        </button>
      </div>
    </div>

    <!-- Data Table Container -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5EAEF] dark:border-slate-800 overflow-hidden shadow-xs">
      
      <!-- Loading State -->
      <div v-if="isLoading" class="py-12 px-6 text-center text-xs font-bold text-[#64748B] dark:text-slate-400 flex items-center justify-center gap-2">
        <RefreshCw class="w-4 h-4 animate-spin text-[#5D87FF]" />
        <span>Loading FAQ entries...</span>
      </div>

      <!-- Table Content -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead class="bg-[#F8FAFC] dark:bg-slate-950/80 border-b border-[#E5EAEF] dark:border-slate-800 text-[#64748B] dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10.5px]">
            <tr>
              <th class="py-4 px-6">Question &amp; Answer</th>
              <th class="py-4 px-4">Category</th>
              <th class="py-4 px-4">Status</th>
              <th class="py-4 px-4">Sort Order</th>
              <th class="py-4 px-4">Updated</th>
              <th class="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#E5EAEF] dark:divide-slate-800">
            
            <!-- Empty State -->
            <tr v-if="filteredFaqs.length === 0">
              <td colspan="6" class="py-12 px-6 text-center">
                <div class="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                  <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-1">
                    <FolderOpen class="w-6 h-6" />
                  </div>
                  <p class="text-sm font-extrabold text-[#0F172A] dark:text-white">No FAQ entries found</p>
                  <p class="text-xs text-[#64748B] dark:text-slate-400">
                    No FAQs match your current search query or active filter settings.
                  </p>
                  <button
                    @click="clearFilters"
                    class="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-[#ECF2FF] dark:bg-indigo-950 text-[#5D87FF] hover:bg-[#5D87FF] hover:text-white transition-all cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              </td>
            </tr>

            <!-- FAQ Rows -->
            <tr v-for="f in filteredFaqs" :key="f.id" class="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 transition-colors group">
              <!-- Question & Answer Snippet -->
              <td class="py-4 px-6">
                <div class="font-extrabold text-[#0F172A] dark:text-white text-xs max-w-md group-hover:text-[#5D87FF] transition-colors">
                  {{ f.question }}
                </div>
                <div class="text-[11px] text-[#64748B] dark:text-slate-400 line-clamp-1 mt-1 font-normal max-w-md">
                  {{ f.answer }}
                </div>
              </td>

              <!-- Category Badge -->
              <td class="py-4 px-4">
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold border capitalize"
                  :class="getCategoryBadgeClass(f.category)"
                >
                  {{ f.category }}
                </span>
              </td>

              <!-- Status Badge -->
              <td class="py-4 px-4">
                <span
                  class="inline-flex items-center gap-1.5 text-xs font-bold"
                  :class="f.status === 'PUBLISHED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'"
                >
                  <span
                    class="w-2 h-2 rounded-full"
                    :class="f.status === 'PUBLISHED' ? 'bg-emerald-500' : 'bg-amber-500'"
                  ></span>
                  <span>{{ f.status === 'PUBLISHED' ? 'Published' : 'Draft' }}</span>
                </span>
              </td>

              <!-- Sort Order -->
              <td class="py-4 px-4 font-mono text-xs font-semibold text-[#64748B] dark:text-slate-400">
                #{{ f.sort_order || 0 }}
              </td>

              <!-- Updated Date -->
              <td class="py-4 px-4 text-[#64748B] dark:text-slate-400 font-medium">
                {{ formatDate(f.updated_at) }}
              </td>

              <!-- Actions -->
              <td class="py-4 px-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEdit(f)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#5D87FF] hover:bg-[#4570EA] text-white transition-all cursor-pointer shadow-xs active:scale-95"
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
    </div>

    <!-- Add / Edit Form Modal -->
    <AppModal
      :is-open="showFormModal"
      :title="modalMode === 'add' ? 'Add New FAQ' : 'Edit FAQ Entry'"
      subtitle="Content & Category Settings for Help Center"
      icon="quiz"
      size="lg"
      @close="closeFormModal"
    >
      <form @submit.prevent="saveFaq" class="space-y-4 pt-1">
        <div>
          <label for="faq-question" class="mb-1.5 block text-xs font-bold text-[#0F172A] dark:text-slate-200">Question</label>
          <input
            id="faq-question"
            v-model="form.question"
            type="text"
            placeholder="e.g. Bagaimana cara mereset password Google Workspace?"
            class="w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-[#0F172A] dark:text-slate-100 focus:border-[#5D87FF] focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label for="faq-answer" class="mb-1.5 block text-xs font-bold text-[#0F172A] dark:text-slate-200">Answer</label>
          <textarea
            id="faq-answer"
            v-model="form.answer"
            rows="5"
            placeholder="Tulis langkah-langkah atau jawaban secara detail..."
            class="w-full resize-y rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] dark:bg-slate-800 px-3.5 py-2.5 text-xs font-medium text-[#0F172A] dark:text-slate-100 focus:border-[#5D87FF] focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all leading-relaxed"
          ></textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label for="faq-category" class="mb-1.5 block text-xs font-bold text-[#0F172A] dark:text-slate-200">Category</label>
            <select
              id="faq-category"
              v-model="form.category"
              class="w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-[#0F172A] dark:text-slate-100 focus:border-[#5D87FF] focus:outline-none transition-all cursor-pointer"
            >
              <option v-for="c in FAQ_CATEGORIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>

          <div>
            <label for="faq-status" class="mb-1.5 block text-xs font-bold text-[#0F172A] dark:text-slate-200">Status</label>
            <select
              id="faq-status"
              v-model="form.status"
              class="w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-[#0F172A] dark:text-slate-100 focus:border-[#5D87FF] focus:outline-none transition-all cursor-pointer"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>

          <div>
            <label for="faq-sort-order" class="mb-1.5 block text-xs font-bold text-[#0F172A] dark:text-slate-200">Sort Order</label>
            <input
              id="faq-sort-order"
              v-model.number="form.sort_order"
              type="number"
              min="0"
              step="1"
              class="w-full rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] dark:bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-[#0F172A] dark:text-slate-100 focus:border-[#5D87FF] focus:outline-none transition-all"
            />
          </div>
        </div>

        <p v-if="modalError" class="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200">
          {{ modalError }}
        </p>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="closeFormModal"
            class="rounded-xl border border-[#E5EAEF] px-4 py-2 text-xs font-bold text-[#475569] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="rounded-xl bg-[#5D87FF] hover:bg-[#4570EA] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#5D87FF]/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {{ isSubmitting ? 'Saving...' : 'Save FAQ' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- Delete Confirmation Modal -->
    <AppModal
      :is-open="showDeleteModal"
      title="Delete FAQ Entry?"
      icon="delete"
      size="sm"
      @close="closeDeleteModal"
    >
      <div class="space-y-4 pt-1">
        <p class="text-xs font-medium text-[#475569] dark:text-slate-300 leading-relaxed">
          Are you sure you want to delete this FAQ entry? It will be permanently removed from the Help Center.
        </p>
        <div class="flex justify-end gap-2 pt-2">
          <button
            @click="closeDeleteModal"
            class="rounded-xl border border-[#E5EAEF] px-4 py-2 text-xs font-bold text-[#475569] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            @click="confirmDelete"
            :disabled="isSubmitting"
            class="rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-bold text-white shadow-xs disabled:opacity-50 cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useCases } from '@/composables/useCases'
import { useAuth } from '@/composables/useAuth'
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  Search,
  ArrowLeft,
  CheckCircle,
  Clock,
  Sparkles,
  ThumbsUp,
  Filter,
  X,
  ChevronRight,
  ShieldCheck,
  Tag,
  AlertTriangle,
  FolderOpen
} from 'lucide-vue-next'

const router = useRouter()
const { cases, deleteCase, fetchAllCases } = useCases()
const { user } = useAuth()

const searchQuery = ref('')
const selectedCategory = ref('all')
const selectedStatus = ref('all') // 'all', 'PUBLISHED', 'DRAFT'
const deleteConfirmId = ref(null)

onMounted(() => {
  fetchAllCases()
})

const filteredCases = computed(() => {
  return cases.value.filter((c) => {
    // Category match
    const matchCat = selectedCategory.value === 'all' || c.category === selectedCategory.value
    if (!matchCat) return false

    // Status match
    if (selectedStatus.value !== 'all') {
      const caseStatus = c.status || 'PUBLISHED'
      if (caseStatus !== selectedStatus.value) return false
    }

    // Search query match
    if (!searchQuery.value.trim()) return true
    const q = searchQuery.value.toLowerCase().trim()
    return (
      (c.title || '').toLowerCase().includes(q) ||
      (c.summary || '').toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q) ||
      (c.tags || []).some((t) => t.toLowerCase().includes(q))
    )
  })
})

const stats = computed(() => {
  const total = cases.value.length
  const published = cases.value.filter((c) => (c.status || 'PUBLISHED') === 'PUBLISHED').length
  const custom = cases.value.filter((c) => c.isCustom).length
  return { total, published, custom }
})

function editDoc(id) {
  router.push(`/admin/editor/${id}`)
}

function createNewDoc() {
  router.push('/admin/editor')
}

function confirmDelete(id) {
  deleteConfirmId.value = id
}

function executeDelete() {
  if (deleteConfirmId.value) {
    deleteCase(deleteConfirmId.value)
    deleteConfirmId.value = null
  }
}

function clearFilters() {
  searchQuery.value = ''
  selectedCategory.value = 'all'
  selectedStatus.value = 'all'
}

function getCategoryBadgeClass(category) {
  const cat = (category || '').toLowerCase()
  if (cat === 'hardware') return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60'
  if (cat === 'software' || cat === 'git') return 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60'
  if (cat === 'workplace') return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60'
  if (cat === 'environment') return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60'
  if (cat === 'backend') return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60'
  return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
}
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-[#0F172A] dark:text-slate-100 p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200 select-none">
    <div class="max-w-7xl mx-auto space-y-6">
      
      <!-- Top Navigation & Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div class="space-y-1.5">
          <!-- Breadcrumb -->
          <div class="flex items-center gap-2 text-xs font-semibold text-[#64748B] dark:text-slate-400">
            <RouterLink to="/" class="hover:text-[#5D87FF] transition-colors flex items-center gap-1">
              <span>Help Center</span>
            </RouterLink>
            <ChevronRight class="w-3.5 h-3.5 text-slate-400" />
            <span class="text-[#5D87FF] font-bold">Admin CMS</span>
          </div>

          <h1 class="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight flex items-center gap-2.5">
            <span>Knowledge Base CMS</span>
            <span class="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[#ECF2FF] dark:bg-indigo-950/80 text-[#5D87FF] dark:text-indigo-300 border border-[#5D87FF]/20">
              Admin Portal
            </span>
          </h1>

          <p class="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 font-medium">
            Manage, edit, and publish engineering SOPs and incident playbooks.
          </p>
        </div>

        <button
          @click="createNewDoc"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#5D87FF] hover:bg-[#4570EA] text-white shadow-md shadow-[#5D87FF]/25 hover:shadow-lg transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Plus class="w-4 h-4" />
          <span>Create New SOP</span>
        </button>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total SOP Documents -->
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 shadow-xs flex items-center justify-between group hover:border-[#5D87FF]/40 transition-all">
          <div class="space-y-1">
            <span class="text-xs font-semibold text-[#64748B] dark:text-slate-400">Total SOPs</span>
            <p class="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              {{ stats.total }}
            </p>
            <span class="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60">
              Active Documents
            </span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-[#ECF2FF] dark:bg-indigo-950/60 text-[#5D87FF] dark:text-indigo-400 flex items-center justify-center border border-[#5D87FF]/20 group-hover:scale-105 transition-transform">
            <FileText class="w-6 h-6" />
          </div>
        </div>

        <!-- Published Articles -->
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 shadow-xs flex items-center justify-between group hover:border-emerald-500/40 transition-all">
          <div class="space-y-1">
            <span class="text-xs font-semibold text-[#64748B] dark:text-slate-400">Published</span>
            <p class="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              {{ stats.published }}
            </p>
            <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60">
              100% Live
            </span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
            <CheckCircle class="w-6 h-6" />
          </div>
        </div>

        <!-- Custom Articles -->
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 shadow-xs flex items-center justify-between group hover:border-purple-500/40 transition-all">
          <div class="space-y-1">
            <span class="text-xs font-semibold text-[#64748B] dark:text-slate-400">Custom Playbooks</span>
            <p class="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
              {{ stats.custom }}
            </p>
            <span class="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200/60 dark:border-purple-800/60">
              User Generated
            </span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-105 transition-transform">
            <Sparkles class="w-6 h-6" />
          </div>
        </div>

        <!-- Avg Helpful Ratio -->
        <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 shadow-xs flex items-center justify-between group hover:border-amber-500/40 transition-all">
          <div class="space-y-1">
            <span class="text-xs font-semibold text-[#64748B] dark:text-slate-400">Avg Helpful Ratio</span>
            <p class="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
              96%
            </p>
            <span class="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/60">
              Positive Feedback
            </span>
          </div>
          <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
            <ThumbsUp class="w-6 h-6" />
          </div>
        </div>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-[#E5EAEF] dark:border-slate-800 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
        
        <!-- Left: Search Bar -->
        <div class="relative flex-1 max-w-md">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search SOP title, description, or tag..."
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

        <!-- Right: Segmented Status & Category Filters -->
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

          <!-- Category Select Dropdown -->
          <div class="relative">
            <select
              v-model="selectedCategory"
              class="bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5EAEF] dark:border-slate-700 rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#5D87FF] cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="hardware">Hardware</option>
              <option value="software">Software</option>
              <option value="git">Git</option>
              <option value="workplace">Workplace</option>
              <option value="environment">Environment</option>
              <option value="backend">Backend</option>
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

      <!-- Articles Data Table Container -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5EAEF] dark:border-slate-800 overflow-hidden shadow-xs">
        
        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-[#F8FAFC] dark:bg-slate-950/80 border-b border-[#E5EAEF] dark:border-slate-800 text-[#64748B] dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10.5px]">
              <tr>
                <th class="py-4 px-6">Documentation Title</th>
                <th class="py-4 px-4">Category</th>
                <th class="py-4 px-4">Severity</th>
                <th class="py-4 px-4">Tags</th>
                <th class="py-4 px-4">Status</th>
                <th class="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E5EAEF] dark:divide-slate-800">
              
              <!-- Empty State -->
              <tr v-if="filteredCases.length === 0">
                <td colspan="6" class="py-12 px-6 text-center">
                  <div class="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-1">
                      <FolderOpen class="w-6 h-6" />
                    </div>
                    <p class="text-sm font-extrabold text-[#0F172A] dark:text-white">No SOP documents found</p>
                    <p class="text-xs text-[#64748B] dark:text-slate-400">
                      No documentation matches your active filters or search terms.
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

              <!-- Article Rows -->
              <tr
                v-for="c in filteredCases"
                :key="c.id"
                class="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 transition-colors group"
              >
                <!-- Title & Description -->
                <td class="py-4 px-6">
                  <div class="font-extrabold text-[#0F172A] dark:text-white text-xs max-w-md group-hover:text-[#5D87FF] transition-colors">
                    {{ c.title }}
                  </div>
                  <div class="text-[11px] text-[#64748B] dark:text-slate-400 line-clamp-1 mt-0.5 font-normal">
                    {{ c.summary }}
                  </div>
                </td>

                <!-- Category Badge -->
                <td class="py-4 px-4">
                  <span
                    class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold border capitalize"
                    :class="getCategoryBadgeClass(c.category)"
                  >
                    {{ c.category || 'General' }}
                  </span>
                </td>

                <!-- Severity Pill -->
                <td class="py-4 px-4">
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wide"
                    :class="{
                      'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800': c.severity === 'high',
                      'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800': c.severity === 'medium',
                      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800': c.severity === 'low' || !c.severity
                    }"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :class="{
                        'bg-rose-500': c.severity === 'high',
                        'bg-amber-500': c.severity === 'medium',
                        'bg-emerald-500': c.severity === 'low' || !c.severity
                      }"
                    ></span>
                    <span>{{ c.severity || 'low' }}</span>
                  </span>
                </td>

                <!-- Tags -->
                <td class="py-4 px-4">
                  <div class="flex flex-wrap gap-1 max-w-xs">
                    <span
                      v-for="t in (c.tags || []).slice(0, 2)"
                      :key="t"
                      class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      #{{ t }}
                    </span>
                  </div>
                </td>

                <!-- Status -->
                <td class="py-4 px-4">
                  <span
                    class="inline-flex items-center gap-1.5 text-xs font-bold"
                    :class="c.status === 'DRAFT' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'"
                  >
                    <span
                      class="w-2 h-2 rounded-full"
                      :class="c.status === 'DRAFT' ? 'bg-amber-500' : 'bg-emerald-500'"
                    ></span>
                    <span>{{ c.status === 'DRAFT' ? 'Draft' : 'Published' }}</span>
                  </span>
                </td>

                <!-- Actions -->
                <td class="py-4 px-6 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      @click="editDoc(c.id)"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#5D87FF] hover:bg-[#4570EA] text-white transition-all cursor-pointer shadow-xs active:scale-95"
                      title="Edit in DocEditor"
                    >
                      <Edit3 class="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      @click="confirmDelete(c.id)"
                      class="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete SOP Article"
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

    </div>

    <!-- Delete Confirmation Modal -->
    <Transition name="fade">
      <div
        v-if="deleteConfirmId"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      >
        <div class="bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
          <div class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200">
            <AlertTriangle class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-extrabold text-[#0F172A] dark:text-white">Delete SOP Document?</h3>
            <p class="text-xs text-[#64748B] dark:text-slate-400 mt-1 leading-relaxed">
              Are you sure you want to delete this SOP? This action cannot be undone.
            </p>
          </div>
          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              @click="deleteConfirmId = null"
              class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="executeDelete"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              Delete SOP
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

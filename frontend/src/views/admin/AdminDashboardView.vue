<script setup>
import AppModal from '../../components/ui/AppModal.vue'
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useCases } from '@/composables/useCases'
import gsap from 'gsap'
import { isReducedMotion } from '@/composables/useGsap'
import CustomSelect from '@/components/ui/CustomSelect.vue'
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  Search,
  CheckCircle,
  Sparkles,
  X,
  ChevronRight,
  FolderOpen,
  MoreVertical,
  LayoutGrid,
} from 'lucide-vue-next'

const router = useRouter()
const { cases, deleteCase, fetchAllCases } = useCases()

const searchQuery = ref('')
const selectedCategory = ref('all')
const selectedStatus = ref('all') // 'all', 'PUBLISHED', 'DRAFT'

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Semua Kategori' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'software', label: 'Software' },
  { value: 'git', label: 'Git' },
  { value: 'workplace', label: 'Workplace' },
  { value: 'environment', label: 'Environment' },
  { value: 'backend', label: 'Backend' },
]

const deleteConfirmId = ref(null)
const actionMenu = ref(null) // { id, top, left }
const mainScope = ref(null)

function toggleActionMenu(id, e) {
  if (e) e.stopPropagation()
  if (actionMenu.value?.id === id) {
    actionMenu.value = null
    return
  }
  const rect = e.currentTarget.getBoundingClientRect()
  const left = Math.max(8, Math.min(rect.right - 160, window.innerWidth - 168))
  actionMenu.value = { id, top: rect.bottom + 4, left }
}

function closeActionMenu() {
  actionMenu.value = null
}

onMounted(async () => {
  fetchAllCases()
  if (isReducedMotion()) return
  await nextTick()
  if (!mainScope.value) return

  gsap.context(() => {
    gsap.fromTo(
      '.gsap-admin-el',
      { opacity: 0, y: 10, scale: 0.99 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.35,
        stagger: 0.05,
        ease: 'power2.out',
        clearProps: 'all',
      },
    )
  }, mainScope.value)
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
  if (cat === 'hardware') return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
  if (cat === 'software' || cat === 'git')
    return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
  if (cat === 'workplace')
    return 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300'
  if (cat === 'environment')
    return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
  if (cat === 'backend')
    return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
  return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
}
</script>

<template>
  <div ref="mainScope" class="cms-page w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 font-sans">
    <!-- Header Card -->
    <div
      class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4 bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm gsap-admin-el"
    >
      <div class="space-y-1 sm:space-y-1.5 w-full sm:w-auto">
        <!-- Breadcrumb -->
        <div
          class="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold text-[#64748B] dark:text-slate-400"
        >
          <RouterLink
            to="/dashboard"
            class="hover:text-[#333333] transition-colors flex items-center gap-1"
          >
            <span>Dashboard</span>
          </RouterLink>
          <ChevronRight class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
          <span class="text-[#333333] font-bold">Admin CMS</span>
        </div>

        <h1
          class="text-xl sm:text-3xl font-extrabold text-[#333333] dark:text-white tracking-tight flex items-center gap-2"
        >
          <span>Knowledge Base</span>
          <span
            class="text-[10.5px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-bold bg-[#ECF2FF] dark:bg-indigo-950/80 text-[#333333] dark:text-indigo-300 border border-[#0A51B0]/20"
          >
            Admin CMS
          </span>
        </h1>

        <p class="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 font-medium">
          Kelola panduan dan artikel knowledge base.
        </p>
      </div>

      <button
        @click="createNewDoc"
        class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0A51B0] hover:bg-[#0A4391] text-white shadow-md shadow-[#0A51B0]/25 hover:shadow-lg transition-all cursor-pointer active:scale-95 shrink-0 touch-manipulation"
      >
        <Plus class="w-4 h-4" />
        <span>Dokumen Baru</span>
      </button>
    </div>

    <!-- Quick Nav: Kelola Kategori KB -->
    <div class="gsap-admin-el">
      <RouterLink
        to="/admin/kb-categories"
        class="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 hover:border-[#0A51B0] dark:hover:border-[#0A51B0] transition-colors group shadow-2xs"
      >
        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div
            class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#ECF2FF] dark:bg-slate-800 text-[#333333] dark:text-indigo-300 flex items-center justify-center group-hover:bg-[#0A51B0] group-hover:text-white transition-colors shrink-0"
          >
            <LayoutGrid class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <div class="text-xs sm:text-sm font-semibold text-[#333333] dark:text-white truncate">
              Kategori Knowledge Base
            </div>
            <div
              class="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400 font-normal truncate"
            >
              Kelola topic cards yang tampil di Browse Topics Help Center.
            </div>
          </div>
        </div>
        <ChevronRight
          class="w-4 h-4 text-[#94A3B8] group-hover:text-[#333333] group-hover:translate-x-0.5 transition-all shrink-0 ml-2"
        />
      </RouterLink>
    </div>

    <!-- Stats Row (Balanced 3 columns on mobile and desktop) -->
    <div class="grid grid-cols-3 gap-2 sm:gap-4 gsap-admin-el">
      <!-- Total -->
      <div
        class="p-3 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
      >
        <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1.5 sm:mb-3">
          <div
            class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0"
          >
            <FileText class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span
            class="text-[10px] sm:text-xs font-semibold text-[#64748B] dark:text-slate-400 truncate"
            >Total Panduan</span
          >
        </div>
        <p
          class="text-lg sm:text-2xl font-bold text-[#333333] dark:text-white tracking-tight tabular-nums"
        >
          {{ stats.total }}
        </p>
      </div>

      <!-- Published -->
      <div
        class="p-3 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
      >
        <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1.5 sm:mb-3">
          <div
            class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
          >
            <CheckCircle class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span
            class="text-[10px] sm:text-xs font-semibold text-[#64748B] dark:text-slate-400 truncate"
            >Published</span
          >
        </div>
        <p
          class="text-lg sm:text-2xl font-bold text-[#333333] dark:text-white tracking-tight tabular-nums"
        >
          {{ stats.published }}
        </p>
      </div>

      <!-- Custom -->
      <div
        class="p-3 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
      >
        <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1.5 sm:mb-3">
          <div
            class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0"
          >
            <Sparkles class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span
            class="text-[10px] sm:text-xs font-semibold text-[#64748B] dark:text-slate-400 truncate"
            >Custom</span
          >
        </div>
        <p
          class="text-lg sm:text-2xl font-bold text-[#333333] dark:text-white tracking-tight tabular-nums"
        >
          {{ stats.custom }}
        </p>
      </div>
    </div>

    <!-- Toolbar -->
    <div
      class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 gsap-admin-el"
    >
      <!-- Search -->
      <div class="relative flex-1 sm:max-w-sm">
        <Search
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari judul, deskripsi, atau tag..."
          class="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl pl-9 pr-9 py-2 sm:py-2.5 text-xs sm:text-sm font-normal text-[#333333] dark:text-white placeholder-[#94A3B8] dark:placeholder-slate-500 focus:outline-none focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 transition-all shadow-2xs"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer touch-manipulation"
          title="Hapus pencarian"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- Status Segmented Control -->
        <div
          class="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs shrink-0 overflow-x-auto no-scrollbar"
        >
          <button
            v-for="st in [
              { key: 'all', label: 'Semua' },
              { key: 'PUBLISHED', label: 'Published' },
              { key: 'DRAFT', label: 'Draft' },
            ]"
            :key="st.key"
            @click="selectedStatus = st.key"
            class="px-2.5 sm:px-3 py-1.5 rounded-md font-semibold text-[11px] sm:text-xs transition-all cursor-pointer focus:outline-none active:scale-95 touch-manipulation"
            :class="
              selectedStatus === st.key
                ? 'bg-white dark:bg-slate-900 text-[#333333] dark:text-white shadow-xs'
                : 'text-[#64748B] dark:text-slate-400 hover:text-[#333333] dark:hover:text-slate-200'
            "
          >
            {{ st.label }}
          </button>
        </div>

        <!-- Category Select -->
        <div class="flex-1 sm:flex-none sm:w-44">
          <CustomSelect
            v-model="selectedCategory"
            :options="CATEGORY_OPTIONS"
            aria-label="Kategori"
            placeholder="Semua Kategori"
            :block="true"
            height-class="h-9"
          />
        </div>

        <!-- Clear Filters -->
        <button
          v-if="searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'"
          @click="clearFilters"
          class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-[#64748B] dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0 touch-manipulation"
        >
          Reset
        </button>
      </div>
    </div>

    <!-- Document List Container (Responsive Mobile Cards + Desktop Table) -->
    <div
      class="bg-white dark:bg-slate-900 rounded-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden gsap-admin-el shadow-sm"
    >
      <!-- MOBILE CARD VIEW (< md) -->
      <div class="cms-cards xl:hidden divide-y divide-[#F1F5F9] dark:divide-slate-800/60">
        <!-- Mobile Empty State -->
        <div v-if="filteredCases.length === 0" class="py-12 px-4 text-center">
          <div
            class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2"
          >
            <FolderOpen class="w-5 h-5" />
          </div>
          <p class="text-sm font-semibold text-[#333333] dark:text-slate-200">Tidak ada dokumen</p>
          <p class="text-xs text-[#64748B] dark:text-slate-400 font-normal mt-0.5">
            Tidak ada dokumen yang cocok dengan filter atau pencarian.
          </p>
          <button
            @click="clearFilters"
            class="mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-[#333333] dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Reset Filter
          </button>
        </div>

        <!-- Mobile Document Cards -->
        <div
          v-for="c in filteredCases"
          :key="'mobile_' + c.id"
          class="p-3.5 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/30 transition-colors flex flex-col gap-2.5"
        >
          <!-- Card Header: Badges & Direct Action Buttons -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 flex-wrap min-w-0">
              <!-- Category Badge -->
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold capitalize shrink-0"
                :class="getCategoryBadgeClass(c.category)"
              >
                {{ c.category || 'General' }}
              </span>

              <!-- Status Badge -->
              <span
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium shrink-0"
                :class="
                  c.status === 'DRAFT'
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50'
                "
              >
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :class="c.status === 'DRAFT' ? 'bg-amber-500' : 'bg-emerald-500'"
                ></span>
                <span>{{ c.status === 'DRAFT' ? 'Draft' : 'Published' }}</span>
              </span>
            </div>

            <!-- Direct Action Buttons on Mobile Card Header -->
            <div class="flex items-center gap-1 shrink-0">
              <button
                @click="editDoc(c.id)"
                class="flex items-center justify-center h-7 px-2.5 gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-[#0A51B0] hover:text-white text-[11px] font-semibold transition-all active:scale-95 touch-manipulation cursor-pointer"
                title="Edit Dokumen"
              >
                <Edit3 class="w-3 h-3" />
                <span>Edit</span>
              </button>
              <button
                @click="confirmDelete(c.id)"
                class="flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors active:scale-95 touch-manipulation cursor-pointer"
                title="Hapus Dokumen"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Card Body: Title & Summary -->
          <div class="cursor-pointer" @click="editDoc(c.id)">
            <h3
              class="text-[13px] font-bold text-[#333333] dark:text-slate-100 hover:text-[#333333] transition-colors leading-snug"
            >
              {{ c.title }}
            </h3>
            <p
              class="text-xs text-[#64748B] dark:text-slate-400 line-clamp-2 mt-1 font-normal leading-relaxed"
            >
              {{ c.summary }}
            </p>
          </div>

          <!-- Card Footer: Severity & Tags -->
          <div
            class="flex items-center justify-between gap-2 pt-1.5 border-t border-[#F1F5F9] dark:border-slate-800/60 text-[11px]"
          >
            <!-- Severity -->
            <div class="flex items-center gap-1 text-[#64748B] dark:text-slate-400">
              <span class="text-[10px] uppercase font-bold text-[#94A3B8]">Severity:</span>
              <span
                class="inline-flex items-center gap-1 font-medium capitalize"
                :class="{
                  'text-rose-600 dark:text-rose-400': c.severity === 'high',
                  'text-amber-600 dark:text-amber-400': c.severity === 'medium',
                  'text-emerald-600 dark:text-emerald-400': c.severity === 'low' || !c.severity,
                }"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full shrink-0"
                  :class="{
                    'bg-rose-500': c.severity === 'high',
                    'bg-amber-500': c.severity === 'medium',
                    'bg-emerald-500': c.severity === 'low' || !c.severity,
                  }"
                ></span>
                <span>{{ c.severity || 'low' }}</span>
              </span>
            </div>

            <!-- Tags -->
            <div class="flex items-center gap-1 overflow-hidden shrink-0">
              <span
                v-for="t in (c.tags || []).slice(0, 2)"
                :key="t"
                class="px-1.5 py-0.2 rounded bg-slate-50 dark:bg-slate-800/80 text-[10px] text-[#94A3B8] dark:text-slate-400 font-mono truncate max-w-[90px]"
              >
                #{{ t }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- DESKTOP TABLE VIEW (>= md) -->
      <div class="hidden xl:block overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse">
          <thead
            class="border-b border-[#E2E8F0] dark:border-slate-800 text-[#64748B] dark:text-slate-400 font-medium text-xs"
          >
            <tr>
              <th class="py-3 px-5 font-medium">Dokumen</th>
              <th class="py-3 px-4 font-medium">Kategori</th>
              <th class="py-3 px-4 font-medium">Severity</th>
              <th class="py-3 px-4 font-medium">Tag</th>
              <th class="py-3 px-4 font-medium">Status</th>
              <th class="py-3 px-5 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F1F5F9] dark:divide-slate-800/60">
            <!-- Empty State -->
            <tr v-if="filteredCases.length === 0">
              <td colspan="6" class="py-16 px-6 text-center">
                <div class="flex flex-col items-center justify-center gap-2 max-w-xs mx-auto">
                  <div
                    class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-1"
                  >
                    <FolderOpen class="w-5 h-5" />
                  </div>
                  <p class="text-sm font-semibold text-[#333333] dark:text-slate-200">
                    Tidak ada dokumen
                  </p>
                  <p class="text-xs text-[#64748B] dark:text-slate-400 font-normal">
                    Tidak ada dokumen yang cocok dengan filter atau pencarian.
                  </p>
                  <button
                    @click="clearFilters"
                    class="mt-3 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-[#333333] dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Reset Filter
                  </button>
                </div>
              </td>
            </tr>

            <!-- Rows -->
            <tr
              v-for="c in filteredCases"
              :key="c.id"
              class="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 transition-colors group"
            >
              <!-- Title & Summary -->
              <td class="py-3.5 px-5">
                <div
                  class="font-medium text-[#333333] dark:text-slate-100 text-[13px] max-w-md group-hover:text-[#333333] transition-colors leading-snug"
                >
                  {{ c.title }}
                </div>
                <div
                  class="text-xs text-[#64748B] dark:text-slate-400 line-clamp-1 mt-0.5 font-normal"
                >
                  {{ c.summary }}
                </div>
              </td>

              <!-- Category -->
              <td class="py-3.5 px-4">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium capitalize"
                  :class="getCategoryBadgeClass(c.category)"
                >
                  {{ c.category || 'General' }}
                </span>
              </td>

              <!-- Severity -->
              <td class="py-3.5 px-4">
                <span
                  class="inline-flex items-center gap-1.5 text-xs font-normal text-[#475569] dark:text-slate-300 capitalize"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    :class="{
                      'bg-rose-500': c.severity === 'high',
                      'bg-amber-500': c.severity === 'medium',
                      'bg-emerald-500': c.severity === 'low' || !c.severity,
                    }"
                  ></span>
                  <span>{{ c.severity || 'low' }}</span>
                </span>
              </td>

              <!-- Tags -->
              <td class="py-3.5 px-4">
                <div class="flex flex-wrap gap-1.5 max-w-[180px]">
                  <span
                    v-for="t in (c.tags || []).slice(0, 2)"
                    :key="t"
                    class="text-[11px] font-normal text-[#94A3B8] dark:text-slate-500"
                  >
                    #{{ t }}
                  </span>
                </div>
              </td>

              <!-- Status -->
              <td class="py-3.5 px-4">
                <span
                  class="inline-flex items-center gap-1.5 text-xs font-normal"
                  :class="
                    c.status === 'DRAFT'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  "
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="c.status === 'DRAFT' ? 'bg-amber-500' : 'bg-emerald-500'"
                  ></span>
                  <span>{{ c.status === 'DRAFT' ? 'Draft' : 'Published' }}</span>
                </span>
              </td>

              <!-- Actions -->
              <td class="py-3.5 px-5 text-right">
                <button
                  @click="toggleActionMenu(c.id, $event)"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A51B0]"
                  title="Aksi"
                  aria-label="Aksi dokumen"
                >
                  <MoreVertical class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Action Menu (Teleported to body, avoids overflow clipping) -->
    <Teleport to="body">
      <div
        v-if="actionMenu"
        :style="{ top: actionMenu.top + 'px', left: actionMenu.left + 'px' }"
        class="fixed z-50 w-40 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg shadow-lg p-1 space-y-0.5"
      >
        <button
          @click="
            ($event) => {
              editDoc(actionMenu.id)
              closeActionMenu()
            }
          "
          class="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#333333] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
        >
          <Edit3 class="w-3.5 h-3.5 text-[#64748B] dark:text-slate-400" />
          <span>Edit</span>
        </button>

        <button
          @click="
            ($event) => {
              confirmDelete(actionMenu.id)
              closeActionMenu()
            }
          "
          class="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Hapus</span>
        </button>
      </div>
    </Teleport>

    <!-- Backdrop for Action Menu -->
    <div v-if="actionMenu" @click="closeActionMenu" class="fixed inset-0 z-40 bg-transparent"></div>

    <AppModal
      :is-open="Boolean(deleteConfirmId)"
      title="Hapus dokumen?"
      icon="delete"
      @close="deleteConfirmId = null"
    >
      <p class="text-sm text-slate-500 leading-relaxed">
        Dokumen ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
      </p>
      <template #footer
        ><div class="cms-dialog-actions">
          <button type="button" @click="deleteConfirmId = null">Batal</button
          ><button type="button" class="cms-danger" @click="executeDelete">Hapus dokumen</button>
        </div></template
      >
    </AppModal>
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

<style scoped>
.cms-page {
  max-width: 1500px;
}
.cms-page > div:first-child {
  background: transparent;
  border: 0;
  padding: 4px 0 12px;
  box-shadow: none;
}
.cms-page h1 {
  font-size: 25px;
  font-weight: 650;
  letter-spacing: -0.04em;
}
.cms-page button {
  min-height: 40px;
  box-shadow: none;
}
.cms-page table th {
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  font-size: 11px;
  padding-block: 16px;
}
.cms-page table td {
  padding-block: 20px;
}
.cms-page table td:first-child {
  width: 36%;
}
.cms-page table td:first-child :is(h3, p) {
  white-space: normal;
}
.cms-cards > div {
  padding: 20px;
  gap: 16px;
}
.cms-cards h3 {
  font-size: 15px;
  line-height: 1.6;
}
.cms-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.cms-dialog-actions button {
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
}
.cms-dialog-actions .cms-danger {
  background: #dc2626;
  border-color: #dc2626;
  color: white;
}
@media (min-width: 768px) and (max-width: 1279px) {
  .cms-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .cms-cards > div {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
  }
}
@media (max-width: 639px) {
  .cms-page h1 {
    font-size: 23px;
  }
  .cms-page button {
    min-height: 44px;
  }
  .cms-dialog-actions button {
    flex: 1;
  }
}
</style>

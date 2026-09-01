<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useCases } from '@/composables/useCases'
import gsap from 'gsap'
import { isReducedMotion } from '@/composables/useGsap'
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
  AlertTriangle,
  FolderOpen,
  MoreVertical,
  LayoutGrid
} from 'lucide-vue-next'

const router = useRouter()
const { cases, deleteCase, fetchAllCases } = useCases()

const searchQuery = ref('')
const selectedCategory = ref('all')
const selectedStatus = ref('all') // 'all', 'PUBLISHED', 'DRAFT'
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
      { opacity: 1, y: 0, scale: 1, duration: 0.35, stagger: 0.05, ease: 'power2.out', clearProps: 'all' }
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
  if (cat === 'software' || cat === 'git') return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
  if (cat === 'workplace') return 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300'
  if (cat === 'environment') return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
  if (cat === 'backend') return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
  return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
}
</script>

<template>
  <div ref="mainScope" class="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-[#1E293B] dark:text-slate-100 font-sans transition-colors duration-200">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 gsap-admin-el">
        <div class="space-y-1">
          <!-- Breadcrumb -->
          <div class="flex items-center gap-1.5 text-xs font-medium text-[#64748B] dark:text-slate-400">
            <RouterLink to="/" class="hover:text-[#2563EB] transition-colors">
              Help Center
            </RouterLink>
            <ChevronRight class="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
            <span class="text-[#1E293B] dark:text-slate-200 font-semibold">Admin CMS</span>
          </div>

          <h1 class="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-white tracking-tight">
            Knowledge Base
          </h1>

          <p class="text-sm text-[#64748B] dark:text-slate-400 font-normal">
            Kelola panduan dan artikel knowledge base.
          </p>
        </div>

        <button
          @click="createNewDoc"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm transition-all cursor-pointer active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 shrink-0"
        >
          <Plus class="w-4 h-4" />
          <span>Dokumen Baru</span>
        </button>
      </div>

      <!-- Quick Nav: Kelola Kategori KB -->
      <div class="gsap-admin-el">
        <RouterLink
          to="/admin/kb-categories"
          class="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 hover:border-[#2563EB] dark:hover:border-[#2563EB] transition-colors group"
        >
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-[#ECF2FF] dark:bg-slate-800 text-[#2563EB] dark:text-indigo-300 flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
              <LayoutGrid class="w-4 h-4" />
            </div>
            <div>
              <div class="text-sm font-semibold text-[#1E293B] dark:text-white">Kategori Knowledge Base</div>
              <div class="text-xs text-[#64748B] dark:text-slate-400 font-normal">
                Kelola topic cards yang tampil di halaman Browse Topics Help Center.
              </div>
            </div>
          </div>
          <ChevronRight class="w-4 h-4 text-[#94A3B8] group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
        </RouterLink>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 gsap-admin-el">
        <!-- Total -->
        <div class="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <FileText class="w-4 h-4" />
            </div>
            <span class="text-xs font-medium text-[#64748B] dark:text-slate-400">Total Panduan</span>
          </div>
          <p class="text-2xl font-bold text-[#1E293B] dark:text-white tracking-tight tabular-nums">
            {{ stats.total }}
          </p>
        </div>

        <!-- Published -->
        <div class="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle class="w-4 h-4" />
            </div>
            <span class="text-xs font-medium text-[#64748B] dark:text-slate-400">Published</span>
          </div>
          <p class="text-2xl font-bold text-[#1E293B] dark:text-white tracking-tight tabular-nums">
            {{ stats.published }}
          </p>
        </div>

        <!-- Custom -->
        <div class="p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Sparkles class="w-4 h-4" />
            </div>
            <span class="text-xs font-medium text-[#64748B] dark:text-slate-400">Custom</span>
          </div>
          <p class="text-2xl font-bold text-[#1E293B] dark:text-white tracking-tight tabular-nums">
            {{ stats.custom }}
          </p>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 gsap-admin-el">

        <!-- Search -->
        <div class="relative flex-1 max-w-sm">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari judul, deskripsi, atau tag..."
            class="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-lg pl-9 pr-9 py-2.5 text-sm font-normal text-[#1E293B] dark:text-white placeholder-[#94A3B8] dark:placeholder-slate-500 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition-all"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Hapus pencarian"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Status Segmented Control -->
          <div class="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              v-for="st in [
                { key: 'all', label: 'Semua' },
                { key: 'PUBLISHED', label: 'Published' },
                { key: 'DRAFT', label: 'Draft' }
              ]"
              :key="st.key"
              @click="selectedStatus = st.key"
              class="px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              :class="selectedStatus === st.key
                ? 'bg-white dark:bg-slate-900 text-[#1E293B] dark:text-white shadow-sm'
                : 'text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-slate-200'"
            >
              {{ st.label }}
            </button>
          </div>

          <!-- Category Select -->
          <select
            v-model="selectedCategory"
            class="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs font-medium text-[#1E293B] dark:text-white focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 cursor-pointer transition-all"
          >
            <option value="all">Semua Kategori</option>
            <option value="hardware">Hardware</option>
            <option value="software">Software</option>
            <option value="git">Git</option>
            <option value="workplace">Workplace</option>
            <option value="environment">Environment</option>
            <option value="backend">Backend</option>
          </select>

          <!-- Clear Filters -->
          <button
            v-if="searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'"
            @click="clearFilters"
            class="px-3 py-2 rounded-lg text-xs font-medium text-[#64748B] dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden gsap-admin-el">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead class="border-b border-[#E2E8F0] dark:border-slate-800 text-[#64748B] dark:text-slate-400 font-medium text-xs">
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
                    <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-1">
                      <FolderOpen class="w-5 h-5" />
                    </div>
                    <p class="text-sm font-semibold text-[#1E293B] dark:text-slate-200">Tidak ada dokumen</p>
                    <p class="text-xs text-[#64748B] dark:text-slate-400 font-normal">
                      Tidak ada dokumen yang cocok dengan filter atau pencarian.
                    </p>
                    <button
                      @click="clearFilters"
                      class="mt-3 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-[#1E293B] dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
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
                  <div class="font-medium text-[#1E293B] dark:text-slate-100 text-[13px] max-w-md group-hover:text-[#2563EB] transition-colors leading-snug">
                    {{ c.title }}
                  </div>
                  <div class="text-xs text-[#64748B] dark:text-slate-400 line-clamp-1 mt-0.5 font-normal">
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
                  <span class="inline-flex items-center gap-1.5 text-xs font-normal text-[#475569] dark:text-slate-300 capitalize">
                    <span
                      class="w-1.5 h-1.5 rounded-full shrink-0"
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
                    :class="c.status === 'DRAFT' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'"
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
                    class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
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

    </div>

    <!-- Action Menu (Teleported to body, avoids overflow clipping) -->
    <Teleport to="body">
      <div
        v-if="actionMenu"
        :style="{ top: actionMenu.top + 'px', left: actionMenu.left + 'px' }"
        class="fixed z-50 w-40 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg shadow-lg p-1 space-y-0.5"
      >
        <button
          @click="editDoc(actionMenu.id); closeActionMenu()"
          class="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#1E293B] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
        >
          <Edit3 class="w-3.5 h-3.5 text-[#64748B] dark:text-slate-400" />
          <span>Edit</span>
        </button>

        <button
          @click="confirmDelete(actionMenu.id); closeActionMenu()"
          class="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Hapus</span>
        </button>
      </div>
    </Teleport>

    <!-- Backdrop for Action Menu -->
    <div
      v-if="actionMenu"
      @click="closeActionMenu"
      class="fixed inset-0 z-40 bg-transparent"
    ></div>

    <!-- Delete Confirmation Modal -->
    <Transition name="fade">
      <div
        v-if="deleteConfirmId"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      >
        <div class="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-6 max-w-sm w-full shadow-xl space-y-4">
          <div class="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-[#1E293B] dark:text-white">Hapus dokumen?</h3>
            <p class="text-xs text-[#64748B] dark:text-slate-400 mt-1 leading-relaxed font-normal">
              Dokumen ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              @click="deleteConfirmId = null"
              class="px-4 py-2 rounded-lg text-xs font-semibold text-[#1E293B] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              @click="executeDelete"
              class="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer active:scale-[0.98]"
            >
              Hapus
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

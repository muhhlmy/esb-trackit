<script setup>
import AppModal from '../../components/ui/AppModal.vue'
import { ref, computed, onMounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { useKbCategories } from '@/composables/useKbCategories'
import gsap from 'gsap'
import { isReducedMotion } from '@/composables/useGsap'
import {
  LayoutGrid,
  Plus,
  Edit3,
  Trash2,
  Search,
  CheckCircle,
  Star,
  X,
  ChevronRight,
  AlertTriangle,
  FolderOpen,
  MoreVertical,
  Laptop,
  AppWindow,
  ShieldCheck,
  Wifi,
  Building2,
  Server,
  HelpCircle,
  Ticket,
} from 'lucide-vue-next'

const { categories, fetchAllCategories, saveCategory, deleteCategory } = useKbCategories()

const searchQuery = ref('')
const selectedStatus = ref('all') // 'all', 'PUBLISHED', 'DRAFT'
const deleteConfirmId = ref(null)
const actionMenu = ref(null) // { id, top, left }
const mainScope = ref(null)

// Drawer form state
const isDrawerOpen = ref(false)
const drawerMode = ref('create') // 'create' | 'edit'
const editingCategory = ref(null)
const isSaving = ref(false)

const ICON_OPTIONS = [
  { name: 'Laptop', component: Laptop },
  { name: 'ShieldCheck', component: ShieldCheck },
  { name: 'HelpCircle', component: HelpCircle },
  { name: 'Wifi', component: Wifi },
  { name: 'AppWindow', component: AppWindow },
  { name: 'Building2', component: Building2 },
  { name: 'Server', component: Server },
  { name: 'Ticket', component: Ticket },
]

function iconComponent(name) {
  return ICON_OPTIONS.find((o) => o.name === name)?.component || HelpCircle
}

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
  fetchAllCategories()
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

const filteredCategories = computed(() => {
  return categories.value.filter((c) => {
    if (selectedStatus.value !== 'all' && c.status !== selectedStatus.value) return false

    if (!searchQuery.value.trim()) return true
    const q = searchQuery.value.toLowerCase().trim()
    return (
      (c.title || '').toLowerCase().includes(q) ||
      (c.key || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    )
  })
})

const stats = computed(() => {
  const total = categories.value.length
  const published = categories.value.filter((c) => c.status === 'PUBLISHED').length
  const featured = categories.value.filter((c) => c.is_featured).length
  return { total, published, featured }
})

function openCreateDrawer() {
  drawerMode.value = 'create'
  editingCategory.value = {
    key: '',
    title: '',
    description: '',
    icon: 'HelpCircle',
    is_featured: false,
    sort_order: categories.value.length + 1 || 1,
    status: 'PUBLISHED',
  }
  isDrawerOpen.value = true
}

function openEditDrawer(id) {
  const found = categories.value.find((c) => Number(c.id) === Number(id))
  if (!found) return
  drawerMode.value = 'edit'
  editingCategory.value = JSON.parse(JSON.stringify(found))
  isDrawerOpen.value = true
}

function closeDrawer() {
  isDrawerOpen.value = false
  editingCategory.value = null
}

// Auto-generate slug key dari title saat membuat kategori baru
function handleTitleInput() {
  if (drawerMode.value !== 'create' || !editingCategory.value) return
  editingCategory.value.key = (editingCategory.value.title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function handleSave() {
  if (!editingCategory.value || isSaving.value) return
  isSaving.value = true
  const ok = await saveCategory(editingCategory.value)
  isSaving.value = false
  if (ok) closeDrawer()
}

function confirmDelete(id) {
  deleteConfirmId.value = id
}

async function executeDelete() {
  if (deleteConfirmId.value) {
    await deleteCategory(deleteConfirmId.value)
    deleteConfirmId.value = null
  }
}

function clearFilters() {
  searchQuery.value = ''
  selectedStatus.value = 'all'
}
</script>

<template>
  <div
    ref="mainScope"
    class="kb-management admin-workspace w-full max-w-7xl mx-auto space-y-6 font-sans"
  >
    <!-- Header Card -->
    <div
      class="admin-page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4 bg-white dark:bg-slate-900 border border-[#E5EAEF] dark:border-slate-800 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-xs gsap-admin-el"
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
          <ChevronRight class="w-3 h-3 text-slate-400" />
          <RouterLink to="/admin/cases" class="hover:text-[#333333] transition-colors">
            <span>Admin CMS</span>
          </RouterLink>
          <ChevronRight class="w-3 h-3 text-slate-400" />
          <span class="text-[#333333] font-bold">Kategori</span>
        </div>

        <h1
          class="text-xl sm:text-3xl font-extrabold text-[#333333] dark:text-white tracking-tight flex items-center gap-2 flex-wrap"
        >
          <span>Kategori Knowledge Base</span>
          <span
            class="text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-bold bg-[#ECF2FF] dark:bg-indigo-950/80 text-[#333333] dark:text-indigo-300 border border-[#0A51B0]/20"
          >
            Admin CMS
          </span>
        </h1>

        <p
          class="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 font-medium leading-relaxed"
        >
          Kelola topic cards yang tampil di halaman Browse Topics Help Center.
        </p>
      </div>

      <button
        @click="openCreateDrawer"
        class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0A51B0] hover:bg-[#0A4391] text-white shadow-sm shadow-[#0A51B0]/25 hover:shadow-md transition-all cursor-pointer active:scale-95 touch-manipulation shrink-0"
      >
        <Plus class="w-4 h-4" />
        <span>Kategori Baru</span>
      </button>
    </div>

    <!-- Stats Row (3 Columns Balanced) -->
    <div class="grid grid-cols-3 gap-2 sm:gap-4 gsap-admin-el">
      <!-- Total -->
      <div
        class="p-3 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
      >
        <div class="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
          <div
            class="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0"
          >
            <LayoutGrid class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span
            class="text-[10px] sm:text-xs font-medium text-[#64748B] dark:text-slate-400 truncate"
            >Total</span
          >
        </div>
        <p
          class="text-lg sm:text-2xl font-extrabold text-[#333333] dark:text-white tracking-tight tabular-nums"
        >
          {{ stats.total }}
        </p>
      </div>

      <!-- Published -->
      <div
        class="p-3 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
      >
        <div class="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
          <div
            class="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
          >
            <CheckCircle class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span
            class="text-[10px] sm:text-xs font-medium text-[#64748B] dark:text-slate-400 truncate"
            >Published</span
          >
        </div>
        <p
          class="text-lg sm:text-2xl font-extrabold text-[#333333] dark:text-white tracking-tight tabular-nums"
        >
          {{ stats.published }}
        </p>
      </div>

      <!-- Featured -->
      <div
        class="p-3 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
      >
        <div class="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
          <div
            class="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0"
          >
            <Star class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span
            class="text-[10px] sm:text-xs font-medium text-[#64748B] dark:text-slate-400 truncate"
            >Featured</span
          >
        </div>
        <p
          class="text-lg sm:text-2xl font-extrabold text-[#333333] dark:text-white tracking-tight tabular-nums"
        >
          {{ stats.featured }}
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
          placeholder="Cari kategori..."
          class="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm font-normal text-[#333333] dark:text-white placeholder-[#94A3B8] dark:placeholder-slate-500 focus:outline-none focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 transition-all"
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
      <div class="flex items-center gap-2">
        <!-- Status Segmented Control -->
        <div
          class="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs flex-1 sm:flex-none"
        >
          <button
            v-for="st in [
              { key: 'all', label: 'Semua' },
              { key: 'PUBLISHED', label: 'Published' },
              { key: 'DRAFT', label: 'Draft' },
            ]"
            :key="st.key"
            @click="selectedStatus = st.key"
            class="flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A51B0] text-center active:scale-95 touch-manipulation"
            :class="
              selectedStatus === st.key
                ? 'bg-white dark:bg-slate-900 text-[#333333] dark:text-white shadow-2xs font-bold'
                : 'text-[#64748B] dark:text-slate-400 hover:text-[#333333] dark:hover:text-slate-200'
            "
          >
            {{ st.label }}
          </button>
        </div>

        <!-- Clear Filters -->
        <button
          v-if="searchQuery || selectedStatus !== 'all'"
          @click="clearFilters"
          class="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#64748B] dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer active:scale-95 touch-manipulation shrink-0"
        >
          Reset
        </button>
      </div>
    </div>

    <!-- MOBILE CARD VIEW (< md) -->
    <div
      class="xl:hidden divide-y divide-[#F1F5F9] dark:divide-slate-800/60 bg-white dark:bg-slate-900 rounded-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden gsap-admin-el"
    >
      <!-- Empty State Mobile -->
      <div v-if="filteredCategories.length === 0" class="py-12 px-4 text-center">
        <div
          class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2"
        >
          <FolderOpen class="w-5 h-5" />
        </div>
        <p class="text-sm font-semibold text-[#333333] dark:text-slate-200">Tidak ada kategori</p>
        <p class="text-xs text-[#64748B] dark:text-slate-400 font-normal mt-1">
          Tidak ada kategori yang cocok dengan filter atau pencarian.
        </p>
        <button
          @click="clearFilters"
          class="mt-3 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-[#333333] dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer active:scale-95 touch-manipulation"
        >
          Reset Filter
        </button>
      </div>

      <!-- Mobile Card Item -->
      <div
        v-for="c in filteredCategories"
        :key="c.id"
        class="p-3.5 sm:p-4 space-y-2.5 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/30 transition-colors"
      >
        <!-- Card Header: Icon + Title + Quick Actions -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <span
              class="w-8 h-8 rounded-lg bg-[#ECF2FF] dark:bg-slate-800 text-[#333333] dark:text-indigo-300 flex items-center justify-center shrink-0 shadow-2xs"
            >
              <component :is="iconComponent(c.icon)" class="w-4 h-4" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <h3
                  @click="openEditDrawer(c.id)"
                  class="font-bold text-[#333333] dark:text-slate-100 text-sm hover:text-[#333333] dark:hover:text-blue-400 transition-colors cursor-pointer leading-tight truncate"
                >
                  {{ c.title }}
                </h3>
                <Star
                  v-if="c.is_featured"
                  class="w-3.5 h-3.5 text-amber-500 shrink-0 fill-amber-500"
                />
              </div>
              <div
                class="flex items-center gap-1.5 mt-0.5 text-[11px] text-[#64748B] dark:text-slate-400"
              >
                <code
                  class="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {{ c.key }}
                </code>
                <span>•</span>
                <span>Urutan: {{ c.sort_order }}</span>
              </div>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center gap-1 shrink-0">
            <button
              @click="openEditDrawer(c.id)"
              class="flex items-center justify-center h-8 px-2.5 gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-[#0A51B0] hover:text-white text-xs font-semibold transition-all active:scale-95 touch-manipulation cursor-pointer"
              title="Edit Kategori"
            >
              <Edit3 class="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              @click="confirmDelete(c.id)"
              class="flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors active:scale-95 touch-manipulation cursor-pointer"
              title="Hapus Kategori"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Card Body: Description -->
        <p
          v-if="c.description"
          class="text-xs text-[#475569] dark:text-slate-300 line-clamp-2 leading-relaxed font-normal"
        >
          {{ c.description }}
        </p>

        <!-- Card Footer: Status Pill & Featured Badge -->
        <div
          class="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs"
        >
          <span
            class="inline-flex items-center gap-1.5 text-[11px] font-medium"
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

          <span
            v-if="c.is_featured"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50"
          >
            <Star class="w-3 h-3 fill-amber-500 text-amber-500" />
            Featured
          </span>
        </div>
      </div>
    </div>

    <!-- DESKTOP TABLE VIEW (>= md) -->
    <div
      class="hidden xl:block bg-white dark:bg-slate-900 rounded-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden gsap-admin-el"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse">
          <thead
            class="border-b border-[#E2E8F0] dark:border-slate-800 text-[#64748B] dark:text-slate-400 font-medium text-xs"
          >
            <tr>
              <th class="py-3 px-5 font-medium">Kategori</th>
              <th class="py-3 px-4 font-medium">Key</th>
              <th class="py-3 px-4 font-medium">Icon</th>
              <th class="py-3 px-4 font-medium">Urutan</th>
              <th class="py-3 px-4 font-medium">Status</th>
              <th class="py-3 px-5 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F1F5F9] dark:divide-slate-800/60">
            <!-- Empty State -->
            <tr v-if="filteredCategories.length === 0">
              <td colspan="6" class="py-16 px-6 text-center">
                <div class="flex flex-col items-center justify-center gap-2 max-w-xs mx-auto">
                  <div
                    class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-1"
                  >
                    <FolderOpen class="w-5 h-5" />
                  </div>
                  <p class="text-sm font-semibold text-[#333333] dark:text-slate-200">
                    Tidak ada kategori
                  </p>
                  <p class="text-xs text-[#64748B] dark:text-slate-400 font-normal">
                    Tidak ada kategori yang cocok dengan filter atau pencarian.
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
              v-for="c in filteredCategories"
              :key="c.id"
              class="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 transition-colors group"
            >
              <!-- Title & Description -->
              <td class="py-3.5 px-5">
                <div
                  class="flex items-center gap-2 font-medium text-[#333333] dark:text-slate-100 text-[13px] max-w-md group-hover:text-[#333333] transition-colors leading-snug"
                >
                  <span>{{ c.title }}</span>
                  <Star
                    v-if="c.is_featured"
                    class="w-3.5 h-3.5 text-amber-500 shrink-0"
                    fill="currentColor"
                  />
                </div>
                <div
                  class="text-xs text-[#64748B] dark:text-slate-400 line-clamp-1 mt-0.5 font-normal"
                >
                  {{ c.description }}
                </div>
              </td>

              <!-- Key -->
              <td class="py-3.5 px-4">
                <code
                  class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {{ c.key }}
                </code>
              </td>

              <!-- Icon -->
              <td class="py-3.5 px-4">
                <div
                  class="inline-flex items-center gap-1.5 text-xs font-normal text-[#475569] dark:text-slate-300"
                >
                  <span
                    class="w-6 h-6 rounded-md bg-[#ECF2FF] dark:bg-slate-800 text-[#333333] dark:text-indigo-300 flex items-center justify-center"
                  >
                    <component :is="iconComponent(c.icon)" class="w-3.5 h-3.5" />
                  </span>
                  <span class="text-[11px]">{{ c.icon || '—' }}</span>
                </div>
              </td>

              <!-- Sort Order -->
              <td class="py-3.5 px-4">
                <span class="text-xs font-medium text-[#475569] dark:text-slate-300 tabular-nums">
                  {{ c.sort_order }}
                </span>
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
                  aria-label="Aksi kategori"
                >
                  <MoreVertical class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Action Menu (Teleported to body) -->
    <Teleport to="body">
      <div
        v-if="actionMenu"
        :style="{ top: actionMenu.top + 'px', left: actionMenu.left + 'px' }"
        class="fixed z-50 w-40 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg shadow-lg p-1 space-y-0.5"
      >
        <button
          @click="
            ($event) => {
              openEditDrawer(actionMenu.id)
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
      :is-open="isDrawerOpen && Boolean(editingCategory)"
      :title="drawerMode === 'create' ? 'Kategori Baru' : 'Edit Kategori'"
      subtitle="Atur identitas dan tampilan kategori di Help Center."
      icon="category"
      size="lg"
      @close="closeDrawer"
    >
      <template v-if="editingCategory">
        <!-- Drawer Body Scrollable -->
        <div class="category-form">
          <!-- Title -->
          <h3 class="category-section-title">Identitas kategori</h3>
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-[#475569] dark:text-slate-300"
              >Judul Kategori</label
            >
            <input
              id="category-title"
              aria-label="Judul kategori"
              v-model="editingCategory.title"
              @input="handleTitleInput"
              type="text"
              placeholder="mis. Network & VPN"
              class="w-full bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-[#333333] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 transition-all"
            />
          </div>

          <!-- Key (slug) -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-[#475569] dark:text-slate-300"
              >Key (slug)</label
            >
            <input
              id="category-key"
              aria-label="Key kategori"
              v-model="editingCategory.key"
              type="text"
              placeholder="mis. network-vpn"
              class="w-full bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm font-mono text-[#333333] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 transition-all"
            />
            <p class="text-[11px] text-[#94A3B8] dark:text-slate-500">
              Huruf kecil, angka, dan tanda hubung. Digunakan untuk filter kategori di Help Center.
            </p>
          </div>

          <!-- Description -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-[#475569] dark:text-slate-300"
              >Deskripsi</label
            >
            <textarea
              id="category-description"
              aria-label="Deskripsi kategori"
              v-model="editingCategory.description"
              rows="3"
              placeholder="Deskripsi singkat yang tampil pada kartu topik..."
              class="w-full bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-[#333333] dark:text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 transition-all resize-none"
            ></textarea>
          </div>

          <!-- Icon Picker -->
          <h3 class="category-section-title">Tampilan kategori</h3>
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-[#475569] dark:text-slate-300">Icon</label>
            <div class="category-icon-grid grid grid-cols-4 gap-1.5 sm:gap-2">
              <button
                v-for="opt in ICON_OPTIONS"
                :key="opt.name"
                type="button"
                @click="editingCategory.icon = opt.name"
                :aria-pressed="editingCategory.icon === opt.name"
                :aria-label="'Pilih ikon ' + opt.name"
                class="flex flex-col items-center gap-1.5 p-2 sm:p-2.5 rounded-lg border transition-all cursor-pointer active:scale-95 touch-manipulation"
                :class="
                  editingCategory.icon === opt.name
                    ? 'border-[#0A51B0] bg-[#ECF2FF] dark:bg-indigo-950/50 text-[#333333] dark:text-indigo-300 font-bold'
                    : 'border-[#E2E8F0] dark:border-slate-700 text-[#64748B] dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                "
              >
                <component :is="opt.component" class="w-4 h-4" />
                <span class="text-[9px] font-medium leading-none truncate max-w-full">{{
                  opt.name
                }}</span>
              </button>
            </div>
          </div>

          <!-- Sort Order & Status -->
          <h3 class="category-section-title">Pengaturan publikasi</h3>
          <div class="grid grid-cols-2 gap-2.5 sm:gap-3">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-[#475569] dark:text-slate-300">Urutan</label>
              <input
                id="category-sort_order"
                aria-label="Urutan kategori"
                v-model.number="editingCategory.sort_order"
                type="number"
                min="0"
                class="w-full bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-[#333333] dark:text-white focus:outline-none focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 transition-all"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-[#475569] dark:text-slate-300">Status</label>
              <select
                id="category-status"
                aria-label="Status kategori"
                v-model="editingCategory.status"
                class="w-full bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-[#333333] dark:text-white focus:outline-none focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 cursor-pointer transition-all"
              >
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
          </div>

          <!-- Featured Toggle -->
          <label
            class="flex items-center justify-between p-3 rounded-lg border border-[#E2E8F0] dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div class="pr-2">
              <div class="text-xs font-semibold text-[#333333] dark:text-white">
                Kategori unggulan
              </div>
              <div class="text-[11px] text-[#94A3B8] dark:text-slate-500 mt-0.5 leading-tight">
                Tampilkan dengan highlight warna utama di halaman Help Center.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Kategori unggulan"
              :aria-checked="Boolean(editingCategory.is_featured)"
              @click.prevent="editingCategory.is_featured = !editingCategory.is_featured"
              class="relative w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer"
              :class="
                editingCategory.is_featured ? 'bg-[#0A51B0]' : 'bg-slate-300 dark:bg-slate-700'
              "
            >
              <span
                class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                :class="
                  editingCategory.is_featured
                    ? 'translate-x-[18px] left-0'
                    : 'translate-x-0.5 left-0'
                "
              ></span>
            </button>
          </label>
        </div>
      </template>
      <template #footer>
        <div class="category-footer">
          <button type="button" :disabled="isSaving" @click="closeDrawer">Batal</button>
          <button
            type="button"
            class="category-save"
            :disabled="isSaving || !editingCategory?.title || !editingCategory?.key"
            @click="handleSave"
          >
            {{ isSaving ? 'Menyimpan...' : 'Simpan kategori' }}
          </button>
        </div>
      </template>
    </AppModal>

    <!-- Delete Confirmation Modal -->
    <Transition name="fade">
      <div
        v-if="deleteConfirmId"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      >
        <div
          class="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-xl space-y-4"
        >
          <div
            class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center"
          >
            <AlertTriangle class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm sm:text-base font-bold text-[#333333] dark:text-white">
              Hapus kategori?
            </h3>
            <p class="text-xs text-[#64748B] dark:text-slate-400 mt-1 leading-relaxed font-normal">
              Kategori ini akan dihapus permanen dan tidak lagi tampil di Help Center. Tindakan ini
              tidak dapat dibatalkan.
            </p>
          </div>
          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              @click="deleteConfirmId = null"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-[#333333] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95 touch-manipulation"
            >
              Batal
            </button>
            <button
              @click="executeDelete"
              class="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer active:scale-95 touch-manipulation"
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
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>

<style scoped src="../../assets/admin-workspace.css"></style>

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
.category-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}
.category-section-title {
  grid-column: 1 / -1;
  color: #333;
  font-size: 13px;
  font-weight: 650;
  padding-bottom: 10px;
  border-bottom: 1px solid #edf1f6;
  margin-top: 6px;
}
.category-form > div:has(textarea),
.category-form > div:has(.category-icon-grid),
.category-form > .grid,
.category-form > label {
  grid-column: 1 / -1;
}
.category-form label {
  font-size: 12px;
  font-weight: 500;
}
.category-form :is(input, select, textarea) {
  min-height: 44px;
  font-size: 13px;
  border-radius: 8px;
  background: #fafbfd;
}
.category-form textarea {
  min-height: 96px;
  resize: vertical;
  line-height: 1.7;
}
.category-form p {
  line-height: 1.6;
}
.category-icon-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.category-icon-grid button {
  min-height: 62px;
  padding: 12px 6px;
}
.category-icon-grid button[aria-pressed='true'] {
  background: #edf5ff;
  border-color: #0a51b0;
  color: #0a51b0;
}
.category-icon-grid button span {
  font-size: 10px;
}
.category-form > label {
  padding: 16px;
  background: #f8fafc;
}
.category-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.category-footer button {
  min-height: 44px;
  padding: 0 20px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.category-footer .category-save {
  background: #0a51b0;
  border-color: #0a51b0;
  color: white;
}
.category-footer button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.category-form button:focus-visible,
.category-footer button:focus-visible {
  outline: 2px solid #097cde;
  outline-offset: 3px;
}
@media (max-width: 639px) {
  .category-form {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  .category-form :is(input, select, textarea) {
    font-size: 16px;
  }
  .category-footer button {
    flex: 1;
  }
}
</style>

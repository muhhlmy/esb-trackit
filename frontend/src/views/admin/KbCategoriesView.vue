<script setup>
import AppModal from '../../components/ui/AppModal.vue'
import PageHeader from '../../components/ui/PageHeader.vue'
import StatCard from '../../components/ui/StatCard.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import FilterModal from '../../components/ui/FilterModal.vue'
import CustomSelect from '../../components/ui/CustomSelect.vue'
import AppViewToggle from '../../components/ui/AppViewToggle.vue'
import { ref, computed, onMounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { useKbCategories } from '@/composables/useKbCategories'
import { useAuth } from '@/composables/useAuth'
import { useLanguage } from '@/composables/useLanguage'
import { useViewMode } from '@/composables/useViewMode.js'
import { animateIn, isReducedMotion } from '@/composables/useGsap'
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  Star,
  X,
  ChevronRight,
  AlertTriangle,
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
const { hasWritePermission } = useAuth()
const { t } = useLanguage()
const canWrite = computed(() => hasWritePermission('knowledge_base'))
const { viewMode } = useViewMode('admin-kb-categories', 'table')

const searchQuery = ref('')
const selectedStatus = ref('all') // 'all', 'PUBLISHED', 'DRAFT'
const selectedFeatured = ref('all') // 'all', 'featured', 'standard'
const showFilterModal = ref(false)

const activeFilterCount = computed(() => {
  let count = 0
  if (selectedStatus.value !== 'all') count++
  if (selectedFeatured.value !== 'all') count++
  return count
})
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

  animateIn(mainScope, (gsap) => {
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
  })
})

const filteredCategories = computed(() => {
  return categories.value.filter((c) => {
    if (selectedStatus.value !== 'all' && c.status !== selectedStatus.value) return false
    if (selectedFeatured.value === 'featured' && !c.is_featured) return false
    if (selectedFeatured.value === 'standard' && c.is_featured) return false

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
  if (!canWrite.value) return
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
  if (!canWrite.value) return
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
  if (!canWrite.value || !editingCategory.value || isSaving.value) return
  isSaving.value = true
  const ok = await saveCategory(editingCategory.value)
  isSaving.value = false
  if (ok) closeDrawer()
}

function confirmDelete(id) {
  if (!canWrite.value) return
  deleteConfirmId.value = id
}

async function executeDelete() {
  if (!canWrite.value) return
  if (deleteConfirmId.value) {
    await deleteCategory(deleteConfirmId.value)
    deleteConfirmId.value = null
  }
}

function clearFilters() {
  searchQuery.value = ''
  selectedStatus.value = 'all'
  selectedFeatured.value = 'all'
}
</script>

<template>
  <div
    ref="mainScope"
    class="kb-management admin-workspace w-full space-y-2 sm:space-y-2.5 font-sans"
    :data-testid="!loading ? 'page-ready' : undefined"
  >
    <!-- ── Page Header (komponen bersama; sama dengan halaman lain) ── -->
    <PageHeader
      class="gsap-admin-el"
      :title="t('kb_cat_admin_title')"
      :subtitle="t('kb_cat_admin_subtitle')"
      icon="category"
    >
      <template #eyebrow>
        <RouterLink
          to="/dashboard"
          class="hover:text-[#333333] dark:hover:text-white transition-colors flex items-center gap-1"
        >
          <span>Dashboard</span>
        </RouterLink>
        <ChevronRight class="w-3 h-3 text-slate-400" />
        <RouterLink to="/admin/cases" class="hover:text-[#333333] dark:hover:text-white transition-colors">
          <span>Admin CMS</span>
        </RouterLink>
        <ChevronRight class="w-3 h-3 text-slate-400" />
        <span class="text-[#333333] dark:text-white font-semibold">{{
          t('kb_cat_breadcrumb_categories')
        }}</span>
      </template>
      <template #title-suffix>
        <span
          class="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-medium bg-[#ECF2FF] dark:bg-indigo-950/80 text-[#0A51B0] dark:text-indigo-300 border border-[#0A51B0]/20"
        >
          Admin CMS
        </span>
      </template>
      <button
        v-if="canWrite"
        @click="openCreateDrawer"
        class="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[6px] text-xs font-medium bg-[#0A51B0] hover:bg-[#0A4391] text-white shadow-2xs transition-all cursor-pointer shrink-0"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>{{ t('btn_new_category') }}</span>
      </button>
    </PageHeader>

    <!-- Stats Row (3 Columns Balanced) -->
    <div class="grid grid-cols-3 gap-2 sm:gap-2.5 lg:gap-3 gsap-admin-el">
      <StatCard
        :title="t('stat_total_categories')"
        :value="stats.total"
        icon="category"
        color="primary"
        :subtitle="t('stat_total_categories_sub')"
      />
      <StatCard
        :title="t('stat_categories_published')"
        :value="stats.published"
        icon="task_alt"
        color="success"
        :subtitle="t('stat_categories_published_sub')"
      />
      <StatCard
        :title="t('stat_categories_featured')"
        :value="stats.featured"
        icon="star"
        color="warning"
        :subtitle="t('stat_categories_featured_sub')"
      />
    </div>

    <!-- Toolbar -->
    <div
      class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 gsap-admin-el"
    >
      <!-- Search -->
      <div class="relative flex-1 sm:max-w-sm">
        <Search
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687281] pointer-events-none"
        />
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('search_category_placeholder')"
          class="w-full bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-[6px] pl-9 pr-9 h-8 text-xs font-normal text-[#333333] dark:text-white placeholder-[#687281] dark:placeholder-slate-500 focus:outline-none focus:border-[#0A51B0] focus:ring-1 focus:ring-[#0A51B0]/20 transition-all"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          :title="t('clear_search')"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-2">
        <!-- Status Segmented Control -->
        <div
          class="flex items-center p-0.5 rounded-[6px] bg-slate-100 dark:bg-slate-800 text-xs flex-1 sm:flex-none"
        >
          <button
            v-for="st in [
              { key: 'all', label: t('filter_all') },
              { key: 'PUBLISHED', label: t('stat_published') },
              { key: 'DRAFT', label: t('stat_draft') },
            ]"
            :key="st.key"
            @click="selectedStatus = st.key"
            class="flex-1 sm:flex-none px-3 py-1 rounded-[6px] font-medium transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A51B0] text-center touch-manipulation"
            :class="
              selectedStatus === st.key
                ? 'bg-white dark:bg-slate-900 text-[#333333] dark:text-white shadow-2xs font-semibold'
                : 'text-[#5F7089] dark:text-slate-400 hover:text-[#333333] dark:hover:text-slate-200'
            "
          >
            {{ st.label }}
          </button>
        </div>

        <!-- Tombol Filter Lanjutan -->
        <button
          type="button"
          @click="showFilterModal = true"
          class="relative inline-flex items-center gap-1.5 h-8 px-3 rounded-[6px] border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-[#333333] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
          :title="t('kb_cat_filter_advanced')"
        >
          <span class="material-symbols-outlined text-[16px] text-[#5F7089]">tune</span>
          <span>Filter</span>
          <span
            v-if="activeFilterCount > 0"
            class="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-[#0A51B0] text-white"
          >
            {{ activeFilterCount }}
          </span>
        </button>

        <!-- Clear Filters -->
        <button
          v-if="searchQuery || activeFilterCount > 0"
          @click="clearFilters"
          class="px-2.5 py-1 rounded-[6px] text-xs font-medium text-[#5F7089] dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer touch-manipulation shrink-0"
        >
          Reset
        </button>

        <AppViewToggle v-model="viewMode" class="shrink-0" />
      </div>
    </div>

    <!-- CARD VIEW -->
    <div
      v-if="viewMode === 'card'"
      class="divide-y divide-[#F1F5F9] dark:divide-slate-800/60 bg-white dark:bg-slate-900 rounded-[6px] border border-[#E2E8F0] dark:border-slate-800 overflow-hidden gsap-admin-el"
    >
      <!-- Empty State Mobile -->
      <EmptyState
        v-if="filteredCategories.length === 0"
        icon="category"
        :title="t('kb_cat_empty_title')"
        :description="t('kb_cat_empty_desc')"
        :secondary-label="t('filter_reset')"
        @secondary-action="clearFilters"
      />

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
                  @click="canWrite && openEditDrawer(c.id)"
                  class="font-bold text-[#333333] dark:text-slate-100 text-sm transition-colors leading-tight truncate"
                  :class="
                    canWrite ? 'hover:text-[#333333] dark:hover:text-blue-400 cursor-pointer' : ''
                  "
                >
                  {{ c.title }}
                </h3>
                <Star
                  v-if="c.is_featured"
                  class="w-3.5 h-3.5 text-amber-500 shrink-0 fill-amber-500"
                />
              </div>
              <div
                class="flex items-center gap-1.5 mt-0.5 text-[11px] text-[#5F7089] dark:text-slate-400"
              >
                <code
                  class="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {{ c.key }}
                </code>
                <span>•</span>
                <span>{{ t('kb_cat_order_label') }}: {{ c.sort_order }}</span>
              </div>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div v-if="canWrite" class="flex items-center gap-1 shrink-0">
            <button
              @click="openEditDrawer(c.id)"
              class="flex items-center justify-center h-8 px-2.5 gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-[#0A51B0] hover:text-white text-xs font-semibold transition-all touch-manipulation cursor-pointer"
              :title="t('kb_cat_edit_category')"
            >
              <Edit3 class="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              @click="confirmDelete(c.id)"
              class="flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors touch-manipulation cursor-pointer"
              :title="t('kb_cat_delete_category')"
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
            <span>{{ c.status === 'DRAFT' ? t('stat_draft') : t('stat_published') }}</span>
          </span>

          <span
            v-if="c.is_featured"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50"
          >
            <Star class="w-3 h-3 fill-amber-500 text-amber-500" />
            {{ t('stat_categories_featured') }}
          </span>
        </div>
      </div>
    </div>

    <!-- TABLE VIEW -->
    <div
      v-else
      class="bg-white dark:bg-slate-900 rounded-[6px] border border-[#E2E8F0] dark:border-slate-800 overflow-hidden gsap-admin-el"
    >
      <div class="overflow-x-auto">
        <table class="w-full min-w-[700px] text-left text-sm border-collapse">
          <thead
            class="border-b border-[#E2E8F0] dark:border-slate-800 text-[#5F7089] dark:text-slate-400 font-medium text-xs"
          >
            <tr>
              <th class="py-3 px-5 font-medium">{{ t('th_category') }}</th>
              <th class="py-3 px-4 font-medium">Key</th>
              <th class="py-3 px-4 font-medium">Icon</th>
              <th class="py-3 px-4 font-medium">{{ t('kb_cat_order_label') }}</th>
              <th class="py-3 px-4 font-medium">{{ t('status') }}</th>
              <th v-if="canWrite" class="py-3 px-5 text-right font-medium">{{ t('actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F1F5F9] dark:divide-slate-800/60">
            <!-- Empty State -->
            <tr v-if="filteredCategories.length === 0">
              <td :colspan="canWrite ? 6 : 5" class="py-10 px-6 text-center">
                <EmptyState
                  icon="category"
                  :title="t('kb_cat_empty_title')"
                  :description="t('kb_cat_empty_desc')"
                  :secondary-label="t('filter_reset')"
                  @secondary-action="clearFilters"
                />
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
                  class="text-xs text-[#5F7089] dark:text-slate-400 line-clamp-1 mt-0.5 font-normal"
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
                  <span class="text-[11px]">{{ c.icon || '-' }}</span>
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
                  <span>{{ c.status === 'DRAFT' ? t('stat_draft') : t('stat_published') }}</span>
                </span>
              </td>

              <!-- Actions -->
              <td v-if="canWrite" class="py-3.5 px-5 text-right">
                <button
                  @click="toggleActionMenu(c.id, $event)"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A51B0]"
                  :title="t('actions')"
                  :aria-label="t('kb_cat_actions_aria')"
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
        v-if="canWrite && actionMenu"
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
          <Edit3 class="w-3.5 h-3.5 text-[#5F7089] dark:text-slate-400" />
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
          <span>{{ t('delete') }}</span>
        </button>
      </div>
    </Teleport>

    <!-- Backdrop for Action Menu -->
    <div
      v-if="canWrite && actionMenu"
      @click="closeActionMenu"
      class="fixed inset-0 z-40 bg-transparent"
    ></div>

    <AppModal
      :is-open="isDrawerOpen && Boolean(editingCategory)"
      :title="drawerMode === 'create' ? t('btn_new_category') : t('kb_cat_edit_category')"
      :subtitle="t('kb_cat_drawer_subtitle')"
      icon="category"
      size="lg"
      @close="closeDrawer"
    >
      <template v-if="editingCategory">
        <!-- Drawer Body Scrollable -->
        <div class="category-form">
          <!-- Title -->
          <h3 class="category-section-title">{{ t('kb_cat_section_identity') }}</h3>
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-[#475569] dark:text-slate-300"
              >{{ t('kb_cat_field_title') }}</label
            >
            <input
              id="category-title"
              :aria-label="t('kb_cat_field_title')"
              v-model="editingCategory.title"
              @input="handleTitleInput"
              type="text"
              :placeholder="t('kb_cat_title_placeholder')"
              class="w-full bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-[#333333] dark:text-white placeholder-[#687281] focus:outline-none focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 transition-all"
            />
          </div>

          <!-- Key (slug) -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-[#475569] dark:text-slate-300"
              >Key (slug)</label
            >
            <input
              id="category-key"
              :aria-label="t('kb_cat_key_aria')"
              v-model="editingCategory.key"
              type="text"
              :placeholder="t('kb_cat_key_placeholder')"
              class="w-full bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm font-mono text-[#333333] dark:text-white placeholder-[#687281] focus:outline-none focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 transition-all"
            />
            <p class="text-[11px] text-[#687281] dark:text-slate-500">
              {{ t('kb_cat_key_hint') }}
            </p>
          </div>

          <!-- Description -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-[#475569] dark:text-slate-300"
              >{{ t('kb_cat_field_description') }}</label
            >
            <textarea
              id="category-description"
              :aria-label="t('kb_cat_description_aria')"
              v-model="editingCategory.description"
              rows="3"
              :placeholder="t('kb_cat_description_placeholder')"
              class="w-full bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-[#333333] dark:text-white placeholder-[#687281] focus:outline-none focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 transition-all resize-none"
            ></textarea>
          </div>

          <!-- Icon Picker -->
          <h3 class="category-section-title">{{ t('kb_cat_section_appearance') }}</h3>
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-[#475569] dark:text-slate-300">Icon</label>
            <div class="category-icon-grid grid grid-cols-4 gap-1.5 sm:gap-2">
              <button
                v-for="opt in ICON_OPTIONS"
                :key="opt.name"
                type="button"
                @click="editingCategory.icon = opt.name"
                :aria-pressed="editingCategory.icon === opt.name"
                :aria-label="t('kb_cat_select_icon_aria') + ' ' + opt.name"
                class="flex flex-col items-center gap-1.5 p-2 sm:p-2.5 rounded-lg border transition-all cursor-pointer touch-manipulation"
                :class="
                  editingCategory.icon === opt.name
                    ? 'border-[#0A51B0] bg-[#ECF2FF] dark:bg-indigo-950/50 text-[#333333] dark:text-indigo-300 font-bold'
                    : 'border-[#E2E8F0] dark:border-slate-700 text-[#5F7089] dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                "
              >
                <component :is="opt.component" class="w-4 h-4" />
                <span class="text-[10px] font-medium leading-none truncate max-w-full">{{
                  opt.name
                }}</span>
              </button>
            </div>
          </div>

          <!-- Sort Order & Status -->
          <h3 class="category-section-title">{{ t('kb_cat_section_publishing') }}</h3>
          <div class="grid grid-cols-2 gap-2.5 sm:gap-3">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-[#475569] dark:text-slate-300">{{
                t('kb_cat_order_label')
              }}</label>
              <input
                id="category-sort_order"
                :aria-label="t('kb_cat_order_aria')"
                v-model.number="editingCategory.sort_order"
                type="number"
                min="0"
                class="w-full bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-[#333333] dark:text-white focus:outline-none focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 transition-all"
              />
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-[#475569] dark:text-slate-300">{{
                t('status')
              }}</label>
              <select
                id="category-status"
                :aria-label="t('kb_cat_status_aria')"
                v-model="editingCategory.status"
                class="w-full bg-white dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-[#333333] dark:text-white focus:outline-none focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 cursor-pointer transition-all"
              >
                <option value="PUBLISHED">{{ t('stat_published') }}</option>
                <option value="DRAFT">{{ t('stat_draft') }}</option>
              </select>
            </div>
          </div>

          <!-- Featured Toggle -->
          <label
            class="flex items-center justify-between p-3 rounded-lg border border-[#E2E8F0] dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <div class="pr-2">
              <div class="text-xs font-semibold text-[#333333] dark:text-white">
                {{ t('kb_cat_featured_toggle') }}
              </div>
              <div class="text-[11px] text-[#687281] dark:text-slate-500 mt-0.5 leading-tight">
                {{ t('kb_cat_featured_toggle_desc') }}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              :aria-label="t('kb_cat_featured_toggle')"
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
          <button type="button" :disabled="isSaving" @click="closeDrawer">{{ t('cancel') }}</button>
          <button
            type="button"
            class="category-save"
            :disabled="isSaving || !editingCategory?.title || !editingCategory?.key"
            @click="handleSave"
          >
            {{ isSaving ? t('kb_cat_saving') : t('kb_cat_save_button') }}
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
          class="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-[6px] p-4 sm:p-5 max-w-sm w-full shadow-xl space-y-3"
        >
          <div
            class="w-9 h-9 rounded-[6px] bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center"
          >
            <AlertTriangle class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-[#333333] dark:text-white">
              {{ t('kb_cat_delete_confirm_title') }}
            </h3>
            <p class="text-xs text-[#5F7089] dark:text-slate-400 mt-1 leading-relaxed font-normal">
              {{ t('kb_cat_delete_confirm_msg') }}
            </p>
          </div>
          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              @click="deleteConfirmId = null"
              class="h-8 px-3 rounded-[6px] border border-[#CBD5E1] dark:border-slate-700 text-xs font-semibold text-[#333333] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer touch-manipulation"
            >
              {{ t('cancel') }}
            </button>
            <button
              @click="executeDelete"
              class="h-8 px-3 rounded-[6px] text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer touch-manipulation"
            >
              {{ t('delete') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Advance Filter Modal -->
    <FilterModal
      :is-open="showFilterModal"
      :title="t('kb_cat_filter_modal_title')"
      @close="showFilterModal = false"
      @apply="showFilterModal = false"
      @reset="clearFilters"
    >
      <div class="space-y-3">
        <div>
          <label class="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {{ t('kb_cat_filter_status_label') }}
          </label>
          <CustomSelect
            v-model="selectedStatus"
            :options="[
              { value: 'all', label: t('kb_cat_all_statuses') },
              { value: 'PUBLISHED', label: t('stat_published') },
              { value: 'DRAFT', label: t('stat_draft') },
            ]"
            :placeholder="t('kb_cat_all_statuses')"
            :block="true"
          />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {{ t('kb_cat_filter_featured_label') }}
          </label>
          <CustomSelect
            v-model="selectedFeatured"
            :options="[
              { value: 'all', label: t('filter_all') },
              { value: 'featured', label: t('kb_cat_featured_only') },
              { value: 'standard', label: t('kb_cat_standard_non_featured') },
            ]"
            :placeholder="t('filter_all')"
            :block="true"
          />
        </div>
      </div>
    </FilterModal>
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
<style scoped src="../../assets/ws-table.css"></style>

<style scoped>
.kb-management table td:first-child {
  width: 38%;
}
.kb-management table td:first-child :is(p, h3) {
  white-space: normal;
  line-height: 1.5;
}
.kb-management table td:first-child h3 {
  font-size: 14px;
  font-weight: 650;
}
.kb-management table th {
  background: #f8fafc;
}
.kb-management .xl\:hidden > div {
  padding: 10px 12px;
  gap: 10px;
}
.kb-management .xl\:hidden h3 {
  font-size: 14px;
  line-height: 1.4;
}
.kb-management .xl\:hidden p {
  line-height: 1.5;
}
.kb-category-drawer {
  max-width: 520px;
}
.kb-category-drawer > div:first-child {
  padding: 10px 12px;
}
.kb-category-drawer > div:nth-child(2) {
  padding: 12px 14px;
}
.kb-category-drawer :is(input, textarea, select) {
  min-height: 34px;
  border-radius: 6px;
  font-size: 12px;
  border-color: #dce4ef;
}
.kb-category-drawer label {
  font-size: 12px;
  font-weight: 500;
}
.kb-category-drawer > div:last-child {
  padding: 10px 12px;
}
.kb-category-drawer button {
  min-height: 32px;
}
.kb-category-drawer > div:last-child button {
  min-height: 32px;
  border-radius: 6px;
}
@media (max-width: 639px) {
  .kb-management .xl\:hidden > div {
    padding: 10px 12px;
  }
  .kb-management button {
    min-height: 32px;
  }
  .kb-category-drawer :is(input, textarea, select) {
    font-size: 16px;
  }
  .kb-category-drawer > div:nth-child(2) {
    padding: 10px 12px;
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
  gap: 12px;
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
  min-height: 34px;
  font-size: 12px;
  border-radius: 6px;
  background: #fafbfd;
}
.category-form textarea {
  min-height: 80px;
  resize: vertical;
  line-height: 1.5;
}
.category-form p {
  line-height: 1.5;
}
.category-icon-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.category-icon-grid button {
  min-height: 48px;
  padding: 8px 4px;
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
  padding: 10px 12px;
  background: #f8fafc;
}
.category-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.category-footer button {
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
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
    gap: 12px;
  }
  .category-form :is(input, select, textarea) {
    font-size: 16px;
  }
  .category-footer button {
    flex: 1;
  }
}
</style>

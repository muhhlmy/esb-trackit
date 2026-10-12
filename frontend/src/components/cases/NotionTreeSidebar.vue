<script setup>
import { ref, computed } from 'vue'
import { useCases } from '@/composables/useCases'
import { useBookmarks } from '@/composables/useBookmarks'
import { useLanguage } from '@/composables/useLanguage.js'
import {
  Search,
  ChevronRight,
  Folder,
  FileText,
  Laptop,
  AppWindow,
  ShieldCheck,
  Wifi,
  Building2,
  Shield,
} from 'lucide-vue-next'

defineProps({
  isCollapsed: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['toggleCollapse'])

const { cases, activeCaseId, selectCase } = useCases()

const { isBookmarked } = useBookmarks()
const { t } = useLanguage()

const sidebarSearch = ref('')
const openCategories = ref({
  hardware: true,
  software: true,
  git: true,
  workplace: true,
  environment: true,
  backend: true,
  devops: true,
  policies: true,
})

// Label kategori reaktif terhadap perubahan bahasa (peta label = computed t()).
const categoryMeta = computed(() => ({
  hardware: { label: t('cases_cat_hardware'), icon: Laptop, count: 0 },
  software: { label: t('cases_cat_software'), icon: AppWindow, count: 0 },
  git: { label: t('cases_cat_git'), icon: AppWindow, count: 0 },
  workplace: { label: t('cases_cat_workplace'), icon: ShieldCheck, count: 0 },
  environment: { label: t('cases_cat_environment'), icon: Wifi, count: 0 },
  backend: { label: t('cases_cat_backend'), icon: Building2, count: 0 },
  devops: { label: t('cases_cat_devops'), icon: Shield, count: 0 },
}))

const articleCountLabel = computed(() =>
  cases.value.length === 1 ? t('cases_article_one') : t('cases_article_many'),
)

function toggleCategory(catKey) {
  openCategories.value[catKey] = !openCategories.value[catKey]
}

// Group cases by category
const groupedCases = computed(() => {
  const q = sidebarSearch.value.toLowerCase().trim()
  const groups = {}

  cases.value.forEach((c) => {
    const cat = c.category || 'hardware'
    if (!groups[cat]) groups[cat] = []

    const matchesSearch =
      !q || (c.title || '').toLowerCase().includes(q) || (c.summary || '').toLowerCase().includes(q)

    if (matchesSearch) {
      groups[cat].push(c)
    }
  })

  return groups
})

function handleSelectCase(id) {
  selectCase(id)
}
</script>

<template>
  <aside
    class="case-tree h-full flex flex-col border-r border-[#c4c5d9] dark:border-slate-800 bg-[#f9f9fb] dark:bg-slate-950/90 text-[#1a1c1d] dark:text-slate-100 select-none transition-all duration-300 relative"
    :aria-hidden="isCollapsed"
    :inert="isCollapsed"
    :class="isCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-72 sm:w-80 shrink-0'"
  >
    <!-- Top Header: Quick Search -->
    <div
      class="case-tree-header p-3.5 border-b border-[#e2e2e4] dark:border-slate-800/80 space-y-2"
    >
      <div class="flex items-center justify-between px-1">
        <span
          class="text-[10.5px] font-bold uppercase tracking-wider text-[#575d7a] dark:text-slate-400"
        >
          {{ t('cases_article_list') }}
        </span>
        <span
          class="text-[9.5px] px-1.5 py-0.5 rounded bg-[#edeef0] dark:bg-slate-800 text-[#575d7a] dark:text-slate-400 font-mono"
        >
          {{ cases.length }} {{ articleCountLabel }}
        </span>
      </div>

      <div class="case-tree-search relative">
        <Search
          class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#575d7a] dark:text-slate-400 pointer-events-none"
        />
        <input
          v-model="sidebarSearch"
          type="text"
          class="w-full bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-[11.5px] text-[#1a1c1d] dark:text-slate-100 placeholder-[#5F7089] dark:placeholder-slate-500 focus:outline-none focus:border-[#0A51B0] transition-all shadow-2xs"
          :placeholder="t('cases_search_placeholder')"
          :aria-label="t('cases_search_aria')"
        />
        <kbd
          class="absolute right-2 top-1/2 -translate-y-1/2 px-1 text-[10px] font-mono text-[#575d7a] dark:text-slate-500 bg-[#f3f3f5] dark:bg-slate-800 rounded border border-[#e2e2e4] dark:border-slate-700"
        >
          /
        </kbd>
      </div>
    </div>

    <!-- Navigation Tree -->
    <div class="case-tree-list flex-1 overflow-y-auto p-2 space-y-0.5 text-[11px]">
      <p
        v-if="!Object.values(groupedCases).some((items) => items.length)"
        class="case-tree-empty text-[#575d7a] dark:text-slate-400"
        role="status"
      >
        {{ t('cases_tree_empty') }}
      </p>
      <!-- Category Folder Group -->
      <div v-for="(items, catKey) in groupedCases" :key="catKey" class="space-y-0.5">
        <!-- Category Parent Folder Header -->
        <button
          @click="toggleCategory(catKey)"
          :aria-expanded="!!openCategories[catKey]"
          class="case-tree-category w-full flex items-center justify-between px-2 py-1 rounded-md text-[#575d7a] dark:text-slate-400 hover:text-[#1a1c1d] dark:hover:text-slate-200 hover:bg-[#edeef0] dark:hover:bg-slate-900 transition-colors group cursor-pointer"
        >
          <div class="flex items-center gap-1.5 truncate">
            <ChevronRight
              class="w-3.5 h-3.5 text-[#5F7089] transition-transform duration-200"
              :class="{ 'rotate-90': openCategories[catKey] }"
            />
            <component
              :is="categoryMeta[catKey]?.icon || Folder"
              class="w-3.5 h-3.5 text-[#0A51B0] dark:text-blue-400 shrink-0"
            />
            <span class="font-semibold text-[11.5px] truncate">
              {{ categoryMeta[catKey]?.label || catKey }}
            </span>
          </div>

          <span
            class="text-[9.5px] font-mono text-[#5F7089] px-1 rounded bg-[#e8e8ea] dark:bg-slate-800"
          >
            {{ items.length }}
          </span>
        </button>

        <!-- Nested Children Articles -->
        <div
          v-if="openCategories[catKey]"
          class="case-tree-children pl-4 space-y-0.5 border-l border-[#e2e2e4] dark:border-slate-800/80 ml-3.5 my-0.5"
        >
          <button
            v-for="item in items"
            :key="item.id"
            @click="handleSelectCase(item.id)"
            data-case-link
            :aria-current="activeCaseId === item.id ? 'page' : undefined"
            class="case-tree-article w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-all cursor-pointer group"
            :class="
              activeCaseId === item.id
                ? 'bg-[#eff6ff] dark:bg-blue-950/50 text-[#0A51B0] dark:text-blue-300 font-semibold shadow-2xs'
                : 'text-[#434656] dark:text-slate-400 hover:text-[#1a1c1d] dark:hover:text-slate-200 hover:bg-[#edeef0]/70 dark:hover:bg-slate-900/60'
            "
          >
            <div class="flex items-center gap-2 truncate mr-2">
              <FileText
                class="w-3.5 h-3.5 shrink-0"
                :class="
                  activeCaseId === item.id
                    ? 'text-[#0A51B0] dark:text-blue-400'
                    : 'text-[#5F7089] group-hover:text-[#1a1c1d]'
                "
              />
              <span class="case-tree-title text-[11px] leading-snug">{{ item.title }}</span>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <span
                v-if="isBookmarked(item.id)"
                class="w-1.5 h-1.5 rounded-full bg-[#0A51B0] dark:bg-blue-400"
                :title="t('cases_bookmarked')"
              ></span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>
<style scoped>
.case-tree {
  min-width: 0;
  font-family: inherit;
}
.case-tree-list {
  overscroll-behavior: contain;
}
.case-tree-category,
.case-tree-article {
  min-width: 0;
}
.case-tree-category:focus-visible,
.case-tree-article:focus-visible {
  position: relative;
  z-index: 1;
}
.case-tree:not([inert]) {
  width: 100%;
}
.case-tree-header {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.case-tree-header > div:first-child {
  gap: 8px;
  padding: 0;
}
.case-tree-header > div:first-child > span:first-child {
  font-size: 11px;
  text-transform: none;
  letter-spacing: 0;
}
.case-tree-header > div:first-child > span:last-child {
  font-family: inherit;
  font-size: 11px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.case-tree-search input {
  min-height: var(--control-height-md, 30px);
  padding: 5px 10px 5px 32px;
  font-size: 11.5px;
  border-radius: 6px;
}
.case-tree-search svg {
  left: 10px;
  width: 15px;
  height: 15px;
}
.case-tree-search kbd {
  display: none;
}
.case-tree-list {
  padding: 8px;
}
.case-tree-category {
  min-height: 26px;
  gap: 6px;
  padding: 5px 7px;
  text-align: left;
  font-size: 11.5px;
}
.case-tree-category > div {
  min-width: 0;
  gap: 6px;
}
.case-tree-category > span {
  flex-shrink: 0;
  min-width: 18px;
  text-align: center;
  font-family: inherit;
  font-size: 9.5px;
  font-variant-numeric: tabular-nums;
}
.case-tree-children {
  margin: 2px 0 8px;
  padding-left: 0;
  border-left: 0;
  display: grid;
  gap: 4px;
}
.case-tree-article {
  min-height: 26px;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 11px;
}
.case-tree-article > div:first-child {
  min-width: 0;
  align-items: flex-start;
  gap: 6px;
}
.case-tree-article svg {
  margin-top: 2px;
  width: 13px;
  height: 13px;
}
.case-tree-title {
  white-space: normal;
  overflow-wrap: anywhere;
  font-size: 11px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.case-tree-empty {
  padding: 10px 8px;
  font-size: 11px;
  line-height: 1.5;
}
.case-tree button:focus-visible,
.case-tree input:focus-visible {
  outline: 2px solid #0A51B0;
  outline-offset: 2px;
}
@media (min-width: 768px) {
  .case-tree:not([inert]) {
    width: 272px;
  }
}
@media (min-width: 1024px) {
  .case-tree:not([inert]) {
    width: 304px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .case-tree,
  .case-tree * {
    transition: none;
  }
}
</style>

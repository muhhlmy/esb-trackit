<script setup>
import { ref, computed } from 'vue';
import { useCases } from '@/composables/useCases';
import { useAuth } from '@/composables/useAuth';
import { useBookmarks } from '@/composables/useBookmarks';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Plus,
  Bookmark,
  Laptop,
  AppWindow,
  ShieldCheck,
  Wifi,
  Building2,
  Shield,
  Tag,
  AlertCircle
} from 'lucide-vue-next';

const props = defineProps({
  isCollapsed: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggleCollapse']);

const {
  cases,
  activeCaseId,
  selectCase,
  openCreateDrawer
} = useCases();

const { isBookmarked } = useBookmarks();
const { isCrudUnlocked } = useAuth();

const sidebarSearch = ref('');
const openCategories = ref({
  hardware: true,
  software: true,
  git: true,
  workplace: true,
  environment: true,
  backend: true,
  devops: true,
  policies: true
});

const categoryMeta = {
  hardware: { label: 'Hardware & Equipment', icon: Laptop, count: 0 },
  software: { label: 'Software & Apps', icon: AppWindow, count: 0 },
  git: { label: 'Software & Git', icon: AppWindow, count: 0 },
  workplace: { label: 'Access & Security', icon: ShieldCheck, count: 0 },
  environment: { label: 'Network & Connectivity', icon: Wifi, count: 0 },
  backend: { label: 'Backend & Database', icon: Building2, count: 0 },
  devops: { label: 'Policies & SLAs', icon: Shield, count: 0 }
};

function toggleCategory(catKey) {
  openCategories.value[catKey] = !openCategories.value[catKey];
}

// Group cases by category
const groupedCases = computed(() => {
  const q = sidebarSearch.value.toLowerCase().trim();
  const groups = {};

  cases.value.forEach((c) => {
    const cat = c.category || 'hardware';
    if (!groups[cat]) groups[cat] = [];

    const matchesSearch = !q || 
      (c.title || '').toLowerCase().includes(q) || 
      (c.summary || '').toLowerCase().includes(q);

    if (matchesSearch) {
      groups[cat].push(c);
    }
  });

  return groups;
});

function handleSelectCase(id) {
  selectCase(id);
}
</script>

<template>
  <aside
    class="h-full flex flex-col border-r border-[#c4c5d9] dark:border-slate-800 bg-[#f9f9fb] dark:bg-slate-950/90 text-[#1a1c1d] dark:text-slate-100 select-none transition-all duration-300 relative"
    :class="isCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-72 sm:w-80 shrink-0'"
  >
    <!-- Top Header: Quick Search -->
    <div class="p-3.5 border-b border-[#e2e2e4] dark:border-slate-800/80 space-y-2">
      <div class="flex items-center justify-between px-1">
        <span class="text-[11px] font-bold uppercase tracking-wider text-[#575d7a] dark:text-slate-400">
          Knowledge Base Tree
        </span>
        <span class="text-[10px] px-1.5 py-0.5 rounded bg-[#edeef0] dark:bg-slate-800 text-[#575d7a] dark:text-slate-400 font-mono">
          {{ cases.length }} docs
        </span>
      </div>

      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#575d7a] dark:text-slate-400 pointer-events-none" />
        <input
          v-model="sidebarSearch"
          type="text"
          class="w-full bg-white dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-[#1a1c1d] dark:text-slate-100 placeholder-[#64748b] dark:placeholder-slate-500 focus:outline-none focus:border-[#0040e5] transition-all shadow-2xs"
          placeholder="Filter tree..."
        />
        <kbd class="absolute right-2 top-1/2 -translate-y-1/2 px-1 text-[9px] font-mono text-[#575d7a] dark:text-slate-500 bg-[#f3f3f5] dark:bg-slate-800 rounded border border-[#e2e2e4] dark:border-slate-700">
          /
        </kbd>
      </div>
    </div>

    <!-- Navigation Tree -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
      
      <!-- Category Folder Group -->
      <div
        v-for="(items, catKey) in groupedCases"
        :key="catKey"
        class="space-y-0.5"
      >
        <!-- Category Parent Folder Header -->
        <button
          @click="toggleCategory(catKey)"
          class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[#575d7a] dark:text-slate-400 hover:text-[#1a1c1d] dark:hover:text-slate-200 hover:bg-[#edeef0] dark:hover:bg-slate-900 transition-colors group cursor-pointer"
        >
          <div class="flex items-center gap-1.5 truncate">
            <ChevronRight
              class="w-3.5 h-3.5 text-[#64748b] transition-transform duration-200"
              :class="{ 'rotate-90': openCategories[catKey] }"
            />
            <component
              :is="categoryMeta[catKey]?.icon || Folder"
              class="w-3.5 h-3.5 text-[#0040e5] dark:text-indigo-400 shrink-0"
            />
            <span class="font-semibold text-xs truncate">
              {{ categoryMeta[catKey]?.label || catKey }}
            </span>
          </div>

          <span class="text-[10px] font-mono text-[#64748b] px-1 rounded bg-[#e8e8ea] dark:bg-slate-800">
            {{ items.length }}
          </span>
        </button>

        <!-- Nested Children Articles (SOPs) -->
        <div
          v-if="openCategories[catKey]"
          class="pl-4 space-y-0.5 border-l border-[#e2e2e4] dark:border-slate-800/80 ml-3.5 my-0.5"
        >
          <button
            v-for="item in items"
            :key="item.id"
            @click="handleSelectCase(item.id)"
            class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-all cursor-pointer group"
            :class="activeCaseId === item.id
              ? 'bg-[#f2f1ff] dark:bg-indigo-950/50 text-[#0040e5] dark:text-indigo-300 font-semibold shadow-2xs'
              : 'text-[#434656] dark:text-slate-400 hover:text-[#1a1c1d] dark:hover:text-slate-200 hover:bg-[#edeef0]/70 dark:hover:bg-slate-900/60'"
          >
            <div class="flex items-center gap-2 truncate mr-2">
              <FileText
                class="w-3.5 h-3.5 shrink-0"
                :class="activeCaseId === item.id ? 'text-[#0040e5] dark:text-indigo-400' : 'text-[#64748b] group-hover:text-[#1a1c1d]'"
              />
              <span class="truncate text-xs leading-snug">{{ item.title }}</span>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <span
                v-if="isBookmarked(item.id)"
                class="w-1.5 h-1.5 rounded-full bg-[#0040e5] dark:bg-indigo-400"
                title="Bookmarked"
              ></span>
            </div>
          </button>
        </div>
      </div>

    </div>

    <!-- Pinned Bottom Action Button -->
    <div class="p-3 border-t border-[#e2e2e4] dark:border-slate-800/80 bg-white dark:bg-slate-950">
      <button
        v-if="isCrudUnlocked"
        @click="openCreateDrawer"
        class="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold bg-[#0040e5] hover:bg-[#0034bf] text-white shadow-sm shadow-[#0040e5]/20 transition-all cursor-pointer"
      >
        <Plus class="w-4 h-4" />
        <span>New Documentation / SOP</span>
      </button>

      <div v-else class="text-[11px] text-center text-[#575d7a] dark:text-slate-500 py-1">
        <span>Klik logo 5x untuk mode edit</span>
      </div>
    </div>
  </aside>
</template>

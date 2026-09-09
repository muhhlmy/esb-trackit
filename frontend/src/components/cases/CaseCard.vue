<script setup>
import { computed } from 'vue'
import { useBookmarks } from '@/composables/useBookmarks'
import { AlertCircle, Tag, Bookmark } from 'lucide-vue-next'

const props = defineProps({
  caseItem: {
    type: Object,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['select'])

const { isBookmarked, toggleBookmark } = useBookmarks()

const severityClass = computed(() => {
  switch (props.caseItem.severity?.toLowerCase()) {
    case 'high':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    case 'medium':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    default:
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  }
})
</script>

<template>
  <div
    @click="$emit('select', caseItem.id)"
    class="p-4 rounded-xl border transition-all cursor-pointer text-left relative group select-none shadow-2xs"
    :class="
      isActive
        ? 'bg-[#f2f1ff] dark:bg-indigo-950/40 border-[#0040e5] dark:border-indigo-500 ring-1 ring-[#0040e5] dark:ring-indigo-500/50'
        : 'bg-white dark:bg-slate-900/60 hover:bg-[#f9f9fb] dark:hover:bg-slate-900 border-[#e2e2e4] dark:border-slate-800'
    "
  >
    <!-- Header: Severity, Category, Bookmark -->
    <div class="flex items-center justify-between gap-2 mb-2">
      <div class="flex items-center gap-2">
        <span
          class="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border flex items-center gap-1"
          :class="severityClass"
        >
          <AlertCircle class="w-2.5 h-2.5" />
          {{ caseItem.severity }}
        </span>
        <span class="text-[11px] text-[#575d7a] dark:text-slate-400 capitalize font-medium">
          {{ caseItem.category }}
        </span>
      </div>

      <button
        @click.stop="toggleBookmark(caseItem.id)"
        class="p-1 rounded-lg hover:bg-[#f3f3f5] dark:hover:bg-slate-800 text-[#575d7a] dark:text-slate-500 transition-colors cursor-pointer"
        :class="{ 'text-[#0040e5] dark:text-indigo-400': isBookmarked(caseItem.id) }"
        title="Bookmark case"
      >
        <Bookmark class="w-3.5 h-3.5" :fill="isBookmarked(caseItem.id) ? 'currentColor' : 'none'" />
      </button>
    </div>

    <!-- Title -->
    <h3
      class="text-sm font-semibold transition-colors line-clamp-2"
      :class="
        isActive
          ? 'text-[#0040e5] dark:text-indigo-300'
          : 'text-[#1a1c1d] dark:text-slate-200 group-hover:text-[#0040e5] dark:group-hover:text-white'
      "
    >
      {{ caseItem.title }}
    </h3>

    <!-- Summary -->
    <p class="mt-1.5 text-xs text-[#575d7a] dark:text-slate-400 line-clamp-2 leading-relaxed">
      {{ caseItem.summary }}
    </p>

    <!-- Footer: Tags -->
    <div
      v-if="caseItem.tags && caseItem.tags.length"
      class="mt-3 flex flex-wrap items-center gap-1"
    >
      <span
        v-for="tag in caseItem.tags.slice(0, 3)"
        :key="tag"
        class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[#f3f3f5] dark:bg-slate-800 text-[#575d7a] dark:text-slate-400 border border-[#e2e2e4] dark:border-slate-700/50"
      >
        <Tag class="w-2 h-2" />
        {{ tag }}
      </span>
      <span v-if="caseItem.tags.length > 3" class="text-[10px] text-[#575d7a] dark:text-slate-500">
        +{{ caseItem.tags.length - 3 }}
      </span>
    </div>
  </div>
</template>

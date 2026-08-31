<script setup>
import { computed } from 'vue';
import { Tag, ChevronRight } from 'lucide-vue-next';

const props = defineProps({
  caseItem: {
    type: Object,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  }
});

defineEmits(['select']);
</script>

<template>
  <div
    @click="$emit('select', caseItem.id)"
    class="p-4 rounded-xl border transition-all cursor-pointer text-left relative group select-none shadow-2xs"
    :class="isActive
      ? 'bg-[#f2f1ff] dark:bg-indigo-950/40 border-[#0040e5] dark:border-indigo-500 ring-1 ring-[#0040e5] dark:ring-indigo-500/50'
      : 'bg-white dark:bg-slate-900/60 hover:bg-[#f9f9fb] dark:hover:bg-slate-900 border-[#e2e2e4] dark:border-slate-800'"
  >
    <!-- Header: Category -->
    <div class="flex items-center justify-between gap-2 mb-2">
      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f2f1ff] dark:bg-indigo-950/40 text-[#0040e5] dark:text-indigo-400 capitalize border border-[#c4c5d9] dark:border-indigo-500/20">
        {{ caseItem.category }}
      </span>
    </div>

    <!-- Title -->
    <h3
      class="text-sm font-semibold transition-colors line-clamp-2"
      :class="isActive ? 'text-[#0040e5] dark:text-indigo-300' : 'text-[#1a1c1d] dark:text-slate-200 group-hover:text-[#0040e5] dark:group-hover:text-white'"
    >
      {{ caseItem.title }}
    </h3>

    <!-- Summary -->
    <p class="mt-1.5 text-xs text-[#575d7a] dark:text-slate-400 line-clamp-2 leading-relaxed">
      {{ caseItem.summary }}
    </p>

    <!-- Footer: Tags -->
    <div v-if="caseItem.tags && caseItem.tags.length" class="mt-3 flex flex-wrap items-center gap-1">
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

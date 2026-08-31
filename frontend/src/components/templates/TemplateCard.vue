<script setup>
import { ref } from 'vue';
import { useToast } from '@/composables/useToast';
import { Copy, Check, FileText } from 'lucide-vue-next';

const props = defineProps({
  template: {
    type: Object,
    required: true
  }
});

const { showToast } = useToast();
const isCopied = ref(false);

function copyTemplate() {
  navigator.clipboard.writeText(props.template.content);
  isCopied.value = true;
  showToast(`Template "${props.template.title}" disalin ke clipboard!`, 'success');
  setTimeout(() => {
    isCopied.value = false;
  }, 2000);
}
</script>

<template>
  <div class="rounded-xl border border-[#c4c5d9] dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 flex flex-col justify-between gap-4 hover:border-[#0040e5] dark:hover:border-indigo-500 hover:shadow-md transition-all shadow-xs group">
    <div>
      <div class="flex items-center justify-between gap-2 mb-3">
        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f2f1ff] dark:bg-indigo-500/10 text-[#0040e5] dark:text-indigo-400 border border-[#c4c5d9] dark:border-indigo-500/20">
          {{ template.category }}
        </span>
        <FileText class="w-4 h-4 text-[#575d7a] group-hover:text-[#0040e5] dark:group-hover:text-indigo-400 transition-colors" />
      </div>

      <h3 class="text-base font-bold text-[#1a1c1d] dark:text-slate-100 group-hover:text-[#0040e5] dark:group-hover:text-indigo-300 transition-colors">
        {{ template.title }}
      </h3>

      <div class="mt-3 p-3.5 rounded-xl bg-[#f9f9fb] dark:bg-slate-950/80 border border-[#e2e2e4] dark:border-slate-800 text-xs font-mono text-[#1a1c1d] dark:text-slate-300 whitespace-pre-wrap line-clamp-6 leading-relaxed select-all">
        {{ template.content }}
      </div>
    </div>

    <button
      @click="copyTemplate"
      class="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold bg-[#f3f3f5] hover:bg-[#0040e5] dark:bg-slate-800 dark:hover:bg-indigo-600 text-[#1a1c1d] hover:text-white dark:text-slate-200 border border-[#c4c5d9] hover:border-[#0040e5] transition-all cursor-pointer shadow-2xs"
    >
      <Check v-if="isCopied" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      <Copy v-else class="w-4 h-4" />
      <span>{{ isCopied ? 'Template Tersalin!' : 'Salin Template' }}</span>
    </button>
  </div>
</template>

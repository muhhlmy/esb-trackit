<script setup>
import { computed } from 'vue';
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3';
import { X, Info, AlertTriangle, CheckCircle, XCircle, HelpCircle } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const type = computed(() => props.node.attrs.type || 'info');

function removeCallout(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (typeof props.deleteNode === 'function') {
    props.deleteNode();
  } else if (props.editor && typeof props.getPos === 'function') {
    const pos = props.getPos();
    if (typeof pos === 'number') {
      props.editor.view.dispatch(props.editor.state.tr.delete(pos, pos + props.node.nodeSize));
    }
  }
}
</script>

<template>
  <node-view-wrapper
    class="callout-node-wrapper relative group my-4 p-4 rounded-xl border transition-all text-xs"
    :class="{
      'bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700/60 text-blue-950 dark:text-blue-200': type === 'info',
      'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-200': type === 'warning',
      'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 text-emerald-950 dark:text-emerald-200': type === 'dos',
      'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700/60 text-rose-950 dark:text-rose-200': type === 'donts',
      'bg-slate-100/80 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700/60 text-slate-800 dark:text-slate-200': type === 'context'
    }"
  >
    <!-- Delete Cross Button [X] in Top Right Corner -->
    <button
      type="button"
      @mousedown.stop.prevent="removeCallout"
      @click.stop.prevent="removeCallout"
      class="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 shadow-2xs cursor-pointer select-none border border-slate-200 dark:border-slate-700"
      contenteditable="false"
      title="Hapus kotak ini"
    >
      <X class="w-3.5 h-3.5" />
    </button>

    <div class="flex items-start gap-3 pr-6">
      <!-- Icon Indicator -->
      <div
        class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 select-none font-bold"
        :class="{
          'bg-blue-200/70 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300': type === 'info',
          'bg-amber-200/70 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300': type === 'warning',
          'bg-emerald-200/70 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300': type === 'dos',
          'bg-rose-200/70 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300': type === 'donts',
          'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300': type === 'context'
        }"
        contenteditable="false"
      >
        <CheckCircle v-if="type === 'dos'" class="w-4 h-4" />
        <XCircle v-else-if="type === 'donts'" class="w-4 h-4" />
        <AlertTriangle v-else-if="type === 'warning'" class="w-4 h-4" />
        <HelpCircle v-else-if="type === 'context'" class="w-4 h-4" />
        <Info v-else class="w-4 h-4" />
      </div>

      <!-- Editable Content Area Inside Callout -->
      <div class="flex-1 leading-relaxed min-w-0">
        <node-view-content class="outline-none focus:outline-none" />
      </div>
    </div>
  </node-view-wrapper>
</template>

<style scoped>
.callout-node-wrapper :deep(p) {
  margin: 0;
  line-height: 1.6;
}
.callout-node-wrapper :deep(ul) {
  margin: 0.25rem 0;
  padding-left: 1.25rem;
  list-style-type: disc;
}
.callout-node-wrapper :deep(li) {
  margin: 0.25rem 0;
}
</style>

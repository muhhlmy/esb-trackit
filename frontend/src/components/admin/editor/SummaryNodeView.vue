<script setup>
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3';
import { X, Sparkles } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

function removeSummary(e) {
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
  <node-view-wrapper class="summary-node-wrapper relative my-4 group">
    <div class="relative bg-[#f8fafc] dark:bg-slate-900 border border-[#c4c5d9] dark:border-slate-700 rounded-xl p-4 shadow-2xs">
      
      <!-- Header Line with Title and Delete Button -->
      <div class="flex items-center justify-between mb-2" contenteditable="false">
        <span class="text-[11px] font-bold uppercase tracking-wider text-[#0040e5] dark:text-indigo-400 flex items-center gap-1.5 select-none">
          <Sparkles class="w-3.5 h-3.5 text-[#0040e5] dark:text-indigo-400" />
          <span>RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY):</span>
        </span>

        <!-- Delete Cross Button [X] in Top Right Corner -->
        <button
          type="button"
          @mousedown.stop.prevent="removeSummary"
          @click.stop.prevent="removeSummary"
          class="w-6 h-6 rounded-md flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 text-slate-400 dark:text-slate-400 bg-white/80 dark:bg-slate-800 shadow-2xs cursor-pointer select-none border border-slate-200 dark:border-slate-700"
          title="Hapus ringkasan ini"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Editable Content with Left Blue Accent Border -->
      <div class="border-l-4 border-[#0040e5] dark:border-indigo-500 pl-3.5 text-sm italic text-[#434656] dark:text-slate-300 leading-relaxed min-h-[3rem]">
        <node-view-content class="outline-none focus:outline-none" />
      </div>
    </div>
  </node-view-wrapper>
</template>

<style scoped>
.summary-node-wrapper :deep(p) {
  margin: 0;
  line-height: 1.6;
}
.summary-node-wrapper :deep(p.is-empty::before) {
  content: 'Tulis ringkasan singkat FAQ / SOP ini...';
  color: #94a3b8;
  float: left;
  height: 0;
  pointer-events: none;
}
</style>

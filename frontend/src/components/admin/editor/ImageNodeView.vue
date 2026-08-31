<script setup>
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { X, AlignLeft, AlignCenter, AlignRight } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const alignment = computed(() => props.node.attrs.alignment || 'center');

function setAlign(align, e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  props.updateAttributes({ alignment: align });
}

function removeImage(e) {
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
    class="image-node-wrapper w-full my-4 flex group select-none transition-all"
    :class="{
      'justify-start': alignment === 'left',
      'justify-center': alignment === 'center',
      'justify-end': alignment === 'right'
    }"
  >
    <div class="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm inline-block bg-slate-50 dark:bg-slate-900/50">
      
      <!-- Image Rendering -->
      <img
        :src="node.attrs.src"
        :alt="node.attrs.alt || ''"
        class="block max-w-full max-h-[500px] h-auto object-contain rounded-xl"
        draggable="false"
      />

      <!-- Floating Controls Toolbar on Hover (Alignment & Delete) -->
      <div
        class="absolute top-2.5 right-2.5 flex items-center gap-1 bg-slate-900/85 backdrop-blur-xs p-1 rounded-lg shadow-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
        contenteditable="false"
      >
        <button
          type="button"
          @mousedown.stop.prevent="setAlign('left', $event)"
          @click.stop.prevent="setAlign('left', $event)"
          class="p-1 rounded text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
          :class="{ 'bg-white/25 text-white font-bold': alignment === 'left' }"
          title="Rata Kiri"
        >
          <AlignLeft class="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          @mousedown.stop.prevent="setAlign('center', $event)"
          @click.stop.prevent="setAlign('center', $event)"
          class="p-1 rounded text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
          :class="{ 'bg-white/25 text-white font-bold': alignment === 'center' }"
          title="Rata Tengah"
        >
          <AlignCenter class="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          @mousedown.stop.prevent="setAlign('right', $event)"
          @click.stop.prevent="setAlign('right', $event)"
          class="p-1 rounded text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
          :class="{ 'bg-white/25 text-white font-bold': alignment === 'right' }"
          title="Rata Kanan"
        >
          <AlignRight class="w-3.5 h-3.5" />
        </button>

        <div class="w-px h-3.5 bg-white/20 mx-0.5"></div>

        <!-- Delete Button [X] -->
        <button
          type="button"
          @mousedown.stop.prevent="removeImage"
          @click.stop.prevent="removeImage"
          class="p-1 rounded text-rose-400 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
          title="Hapus gambar"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Bottom overlay pill on hover indicating current alignment -->
      <div class="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/70 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none capitalize">
        Gambar &bull; Rata {{ alignment }}
      </div>
    </div>
  </node-view-wrapper>
</template>

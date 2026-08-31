<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  Info,
  Eye,
  Tag as TagIcon,
  TrendingUp,
  X,
  ExternalLink,
  ChevronDown,
  ShieldCheck,
  Flame,
  Lock
} from 'lucide-vue-next';

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  },
  isOpen: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update:modelValue', 'close', 'viewPortal']);

const router = useRouter();
const activeTab = ref('meta'); // 'meta' | 'visibility' | 'tags' | 'stats'
const newTagInput = ref('');

const categories = [
  { id: 'hardware', label: 'Hardware & Equipment' },
  { id: 'software', label: 'Software & Applications' },
  { id: 'git', label: 'Software & Git' },
  { id: 'workplace', label: 'Access & Security' },
  { id: 'environment', label: 'Network & Connectivity' },
  { id: 'backend', label: 'Backend & Database' },
  { id: 'devops', label: 'Policies & SLAs' }
];

function addTag() {
  const val = newTagInput.value.trim().toLowerCase();
  if (val && !props.modelValue.tags?.includes(val)) {
    const updated = [...(props.modelValue.tags || []), val];
    emit('update:modelValue', { ...props.modelValue, tags: updated });
    newTagInput.value = '';
  }
}

function removeTag(tagToRemove) {
  const updated = (props.modelValue.tags || []).filter((t) => t !== tagToRemove);
  emit('update:modelValue', { ...props.modelValue, tags: updated });
}

function toggleSwitch(key) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: !props.modelValue[key]
  });
}
</script>

<template>
  <aside
    class="h-full flex flex-col w-80 bg-white dark:bg-slate-900 border-l border-[#c4c5d9] dark:border-slate-800 transition-all text-[#1a1c1d] dark:text-slate-100 select-none overflow-y-auto"
  >
    <!-- Inspector Header -->
    <div class="p-4 border-b border-[#e2e2e4] dark:border-slate-800 bg-[#f9f9fb] dark:bg-slate-950/60">
      <div class="flex items-center justify-between mb-1">
        <h2 class="text-sm font-bold text-[#1a1c1d] dark:text-slate-100 flex items-center gap-1.5">
          <Info class="w-4 h-4 text-[#0040e5]" />
          <span>Inspector</span>
        </h2>
        <button
          @click="$emit('close')"
          class="p-1 rounded hover:bg-[#edeef0] dark:hover:bg-slate-800 text-[#575d7a] dark:text-slate-400 transition-colors"
          title="Close panel"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
      <p class="text-[11px] text-[#575d7a] dark:text-slate-400">Article Settings &amp; Metadata</p>
    </div>

    <!-- Tab Navigation -->
    <nav class="flex border-b border-[#e2e2e4] dark:border-slate-800 px-2 bg-white dark:bg-slate-900 text-xs">
      <button
        @click="activeTab = 'meta'"
        class="flex-1 py-3 px-1 text-center font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer"
        :class="activeTab === 'meta'
          ? 'border-b-2 border-[#0040e5] text-[#0040e5] dark:text-indigo-400'
          : 'text-[#575d7a] dark:text-slate-400 hover:text-[#1a1c1d] border-b-2 border-transparent'"
      >
        <Info class="w-4 h-4" />
        <span>Meta</span>
      </button>

      <button
        @click="activeTab = 'visibility'"
        class="flex-1 py-3 px-1 text-center font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer"
        :class="activeTab === 'visibility'
          ? 'border-b-2 border-[#0040e5] text-[#0040e5] dark:text-indigo-400'
          : 'text-[#575d7a] dark:text-slate-400 hover:text-[#1a1c1d] border-b-2 border-transparent'"
      >
        <Eye class="w-4 h-4" />
        <span>Visibility</span>
      </button>

      <button
        @click="activeTab = 'tags'"
        class="flex-1 py-3 px-1 text-center font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer"
        :class="activeTab === 'tags'
          ? 'border-b-2 border-[#0040e5] text-[#0040e5] dark:text-indigo-400'
          : 'text-[#575d7a] dark:text-slate-400 hover:text-[#1a1c1d] border-b-2 border-transparent'"
      >
        <TagIcon class="w-4 h-4" />
        <span>Tags</span>
      </button>

      <button
        @click="activeTab = 'stats'"
        class="flex-1 py-3 px-1 text-center font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer"
        :class="activeTab === 'stats'
          ? 'border-b-2 border-[#0040e5] text-[#0040e5] dark:text-indigo-400'
          : 'text-[#575d7a] dark:text-slate-400 hover:text-[#1a1c1d] border-b-2 border-transparent'"
      >
        <TrendingUp class="w-4 h-4" />
        <span>Stats</span>
      </button>
    </nav>

    <!-- Tab Content -->
    <div class="flex-1 p-4 space-y-5 overflow-y-auto text-xs">
      
      <!-- TAB 1: META -->
      <div v-if="activeTab === 'meta'" class="space-y-4">
        <!-- Category -->
        <div class="space-y-1.5">
          <label class="block text-[11px] font-bold uppercase tracking-wider text-[#575d7a] dark:text-slate-400">
            Category
          </label>
          <div class="relative">
            <select
              :value="modelValue.category"
              @change="$emit('update:modelValue', { ...modelValue, category: $event.target.value })"
              class="w-full bg-[#f8fafc] dark:bg-slate-800 border border-[#c4c5d9] dark:border-slate-700 rounded-lg py-2 pl-3 pr-8 text-xs text-[#1a1c1d] dark:text-slate-100 appearance-none focus:outline-none focus:border-[#0040e5]"
            >
              <option v-for="c in categories" :key="c.id" :value="c.id">
                {{ c.label }}
              </option>
            </select>
            <ChevronDown class="w-4 h-4 text-[#575d7a] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <!-- URL Slug -->
        <div class="space-y-1.5">
          <label class="block text-[11px] font-bold uppercase tracking-wider text-[#575d7a] dark:text-slate-400">
            Document ID / URL Slug
          </label>
          <div class="flex rounded-lg shadow-2xs overflow-hidden border border-[#c4c5d9] dark:border-slate-700">
            <span class="inline-flex items-center px-2.5 bg-[#f3f3f5] dark:bg-slate-800 text-[#575d7a] dark:text-slate-400 font-mono text-[11px] border-r border-[#c4c5d9] dark:border-slate-700">
              /kb/
            </span>
            <input
              :value="modelValue.id"
              @input="$emit('update:modelValue', { ...modelValue, id: $event.target.value })"
              type="text"
              class="flex-1 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono text-[#1a1c1d] dark:text-slate-100 focus:outline-none"
              placeholder="document-slug"
            />
          </div>
        </div>
      </div>

      <!-- TAB 2: VISIBILITY & TOGGLES -->
      <div v-if="activeTab === 'visibility'" class="space-y-4">
        <!-- Feature on Homepage FAQ Toggle -->
        <div class="flex items-center justify-between p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
          <div>
            <span class="text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Flame class="w-3.5 h-3.5 text-amber-500" />
              <span>Tampil di Homepage FAQ</span>
            </span>
            <span class="text-[10px] text-amber-700 dark:text-amber-400/80 block mt-0.5">Munculkan di accordion FAQ beranda</span>
          </div>
          <button
            type="button"
            @click="toggleSwitch('isFeaturedOnHome')"
            class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
            :class="modelValue.isFeaturedOnHome ? 'bg-amber-500' : 'bg-[#c4c5d9] dark:bg-slate-700'"
          >
            <span
              class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out"
              :class="modelValue.isFeaturedOnHome ? 'translate-x-4' : 'translate-x-0'"
            ></span>
          </button>
        </div>

        <!-- Published Status Toggle -->
        <div class="flex items-center justify-between p-3 rounded-lg bg-[#f8fafc] dark:bg-slate-800/60 border border-[#e2e2e4] dark:border-slate-700">
          <div>
            <span class="text-xs font-semibold text-[#1a1c1d] dark:text-slate-100 flex items-center gap-1.5">
              <Eye class="w-3.5 h-3.5 text-[#0040e5]" />
              <span>Status Publikasi</span>
            </span>
            <span class="text-[10px] text-[#575d7a] dark:text-slate-400 block mt-0.5">Dapat diakses oleh seluruh karyawan</span>
          </div>
          <button
            type="button"
            @click="toggleSwitch('isPublished')"
            class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
            :class="modelValue.isPublished !== false ? 'bg-[#0040e5]' : 'bg-[#c4c5d9] dark:bg-slate-700'"
          >
            <span
              class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out"
              :class="modelValue.isPublished !== false ? 'translate-x-4' : 'translate-x-0'"
            ></span>
          </button>
        </div>

        <!-- Custom FAQ Indicator -->
        <div class="p-3 rounded-lg bg-[#f2f1ff] dark:bg-indigo-950/30 border border-[#c4c5d9] dark:border-indigo-500/20 text-xs">
          <span class="font-bold text-[#0040e5] dark:text-indigo-400 block mb-1">Status Artikel:</span>
          <p class="text-[11px] text-[#575d7a] dark:text-slate-300">
            {{ modelValue.isCustom ? 'Custom FAQ (Dapat diedit & dihapus bebas oleh admin).' : 'Built-in Corporate FAQ (Artikel bawaan sistem).' }}
          </p>
        </div>
      </div>

      <!-- TAB 3: TAGS -->
      <div v-if="activeTab === 'tags'" class="space-y-3">
        <label class="block text-[11px] font-bold uppercase tracking-wider text-[#575d7a] dark:text-slate-400">
          Article Tags
        </label>
        
        <!-- Tag Chips -->
        <div class="flex flex-wrap gap-1.5 min-h-12 p-2 rounded-lg bg-[#f8fafc] dark:bg-slate-800 border border-[#c4c5d9] dark:border-slate-700">
          <span
            v-for="tag in (modelValue.tags || [])"
            :key="tag"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono bg-white dark:bg-slate-700 border border-[#e2e2e4] dark:border-slate-600 text-[#1a1c1d] dark:text-slate-200 shadow-2xs"
          >
            <span>{{ tag }}</span>
            <button
              @click="removeTag(tag)"
              class="text-[#575d7a] hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
            >
              <X class="w-3 h-3" />
            </button>
          </span>
          <span v-if="!modelValue.tags || !modelValue.tags.length" class="text-[11px] text-[#64748b] italic py-0.5">
            Belum ada tag...
          </span>
        </div>

        <!-- Add Tag Input -->
        <div class="flex gap-2">
          <input
            v-model="newTagInput"
            @keydown.enter.prevent="addTag"
            type="text"
            placeholder="Tambah tag baru..."
            class="flex-1 bg-white dark:bg-slate-800 border border-[#c4c5d9] dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-[#1a1c1d] dark:text-slate-100 focus:outline-none focus:border-[#0040e5]"
          />
          <button
            @click="addTag"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0040e5] text-white hover:bg-[#0034bf] transition-colors cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>

      <!-- TAB 4: STATS -->
      <div v-if="activeTab === 'stats'" class="space-y-4">
        <div class="bg-[#f8fafc] dark:bg-slate-800 border border-[#c4c5d9] dark:border-slate-700 rounded-xl p-3.5 space-y-3">
          <h4 class="text-[11px] font-bold text-[#575d7a] dark:text-slate-400 uppercase tracking-wider">
            Performance (Last 30d)
          </h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="block text-2xl font-bold text-[#1a1c1d] dark:text-slate-100">1,420</span>
              <span class="text-[10px] text-[#575d7a] dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <Eye class="w-3 h-3 text-[#0040e5]" /> Views
              </span>
            </div>
            <div>
              <span class="block text-2xl font-bold text-emerald-600 dark:text-emerald-400">96%</span>
              <span class="text-[10px] text-[#575d7a] dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <ShieldCheck class="w-3 h-3 text-emerald-600" /> Helpful Ratio
              </span>
            </div>
          </div>
        </div>

        <div class="text-[11px] text-[#575d7a] dark:text-slate-400 space-y-1 p-2">
          <p>&bull; Terakhir diperbarui: {{ new Date().toLocaleDateString('id-ID') }}</p>
          <p>&bull; Resolusi rata-rata: &lt; 5 menit</p>
        </div>
      </div>

    </div>

    <!-- Inspector Bottom Action -->
    <div class="p-3.5 border-t border-[#e2e2e4] dark:border-slate-800 bg-[#f9f9fb] dark:bg-slate-950">
      <button
        @click="$emit('viewPortal')"
        class="w-full bg-white dark:bg-slate-800 border border-[#c4c5d9] dark:border-slate-700 hover:bg-[#f3f3f5] dark:hover:bg-slate-700 text-[#1a1c1d] dark:text-slate-200 font-semibold py-2 px-4 rounded-lg transition-colors text-xs flex justify-center items-center gap-2 cursor-pointer shadow-2xs"
      >
        <span>View in Help Portal</span>
        <ExternalLink class="w-3.5 h-3.5 text-[#0040e5] dark:text-indigo-400" />
      </button>
    </div>
  </aside>
</template>

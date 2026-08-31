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
  Lock,
  Plus
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

const severities = [
  { id: 'high', label: 'High Priority' },
  { id: 'medium', label: 'Medium Priority' },
  { id: 'low', label: 'Low Priority' }
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
    class="h-full flex flex-col w-80 bg-white dark:bg-slate-900 border-l border-[#E5EAEF] dark:border-slate-800 transition-all text-[#0F172A] dark:text-slate-100 select-none overflow-y-auto"
  >
    <!-- Inspector Header -->
    <div class="p-4 border-b border-[#E5EAEF] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950/60">
      <div class="flex items-center justify-between mb-1">
        <h2 class="text-xs sm:text-sm font-extrabold text-[#0F172A] dark:text-slate-100 flex items-center gap-1.5">
          <Info class="w-4 h-4 text-[#5D87FF]" />
          <span>Article Inspector</span>
        </h2>
        <button
          @click="$emit('close')"
          class="p-1 rounded-lg hover:bg-[#E5EAEF] dark:hover:bg-slate-800 text-[#64748B] dark:text-slate-400 transition-colors"
          title="Close panel"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
      <p class="text-[11px] font-medium text-[#64748B] dark:text-slate-400">Article Settings &amp; Metadata</p>
    </div>

    <!-- Tab Navigation -->
    <nav class="flex border-b border-[#E5EAEF] dark:border-slate-800 px-2 bg-white dark:bg-slate-900 text-xs">
      <button
        @click="activeTab = 'meta'"
        class="flex-1 py-3 px-1 text-center font-bold flex flex-col items-center gap-1 transition-all cursor-pointer"
        :class="activeTab === 'meta'
          ? 'border-b-2 border-[#5D87FF] text-[#5D87FF] dark:text-indigo-400'
          : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] border-b-2 border-transparent'"
      >
        <Info class="w-4 h-4" />
        <span>Meta</span>
      </button>

      <button
        @click="activeTab = 'visibility'"
        class="flex-1 py-3 px-1 text-center font-bold flex flex-col items-center gap-1 transition-all cursor-pointer"
        :class="activeTab === 'visibility'
          ? 'border-b-2 border-[#5D87FF] text-[#5D87FF] dark:text-indigo-400'
          : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] border-b-2 border-transparent'"
      >
        <Eye class="w-4 h-4" />
        <span>Visibility</span>
      </button>

      <button
        @click="activeTab = 'tags'"
        class="flex-1 py-3 px-1 text-center font-bold flex flex-col items-center gap-1 transition-all cursor-pointer"
        :class="activeTab === 'tags'
          ? 'border-b-2 border-[#5D87FF] text-[#5D87FF] dark:text-indigo-400'
          : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] border-b-2 border-transparent'"
      >
        <TagIcon class="w-4 h-4" />
        <span>Tags</span>
      </button>

      <button
        @click="activeTab = 'stats'"
        class="flex-1 py-3 px-1 text-center font-bold flex flex-col items-center gap-1 transition-all cursor-pointer"
        :class="activeTab === 'stats'
          ? 'border-b-2 border-[#5D87FF] text-[#5D87FF] dark:text-indigo-400'
          : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] border-b-2 border-transparent'"
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
          <label class="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
            Category
          </label>
          <div class="relative">
            <select
              :value="modelValue.category"
              @change="$emit('update:modelValue', { ...modelValue, category: $event.target.value })"
              class="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5EAEF] dark:border-slate-700 rounded-xl py-2 pl-3 pr-8 text-xs font-semibold text-[#0F172A] dark:text-slate-100 appearance-none focus:outline-none focus:border-[#5D87FF]"
            >
              <option v-for="c in categories" :key="c.id" :value="c.id">
                {{ c.label }}
              </option>
            </select>
            <ChevronDown class="w-4 h-4 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <!-- Severity -->
        <div class="space-y-1.5">
          <label class="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
            Severity / Priority
          </label>
          <div class="relative">
            <select
              :value="modelValue.severity"
              @change="$emit('update:modelValue', { ...modelValue, severity: $event.target.value })"
              class="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5EAEF] dark:border-slate-700 rounded-xl py-2 pl-3 pr-8 text-xs font-semibold text-[#0F172A] dark:text-slate-100 appearance-none focus:outline-none focus:border-[#5D87FF]"
            >
              <option v-for="s in severities" :key="s.id" :value="s.id">
                {{ s.label }}
              </option>
            </select>
            <ChevronDown class="w-4 h-4 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <!-- URL Slug -->
        <div class="space-y-1.5">
          <label class="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
            Document ID / URL Slug
          </label>
          <div class="flex rounded-xl shadow-2xs overflow-hidden border border-[#E5EAEF] dark:border-slate-700">
            <span class="inline-flex items-center px-2.5 bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] dark:text-slate-400 font-mono text-[11px] border-r border-[#E5EAEF] dark:border-slate-700 font-bold">
              /kb/
            </span>
            <input
              :value="modelValue.id"
              @input="$emit('update:modelValue', { ...modelValue, id: $event.target.value })"
              type="text"
              class="flex-1 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono font-semibold text-[#0F172A] dark:text-slate-100 focus:outline-none"
              placeholder="document-slug"
            />
          </div>
        </div>
      </div>

      <!-- TAB 2: VISIBILITY & TOGGLES -->
      <div v-if="activeTab === 'visibility'" class="space-y-4">
        <!-- Feature as Trending Toggle -->
        <div class="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E5EAEF] dark:border-slate-700">
          <div>
            <span class="text-xs font-bold text-[#0F172A] dark:text-slate-100 flex items-center gap-1.5">
              <Flame class="w-3.5 h-3.5 text-amber-500" />
              <span>Feature as Trending</span>
            </span>
            <span class="text-[10px] text-[#64748B] dark:text-slate-400 block mt-0.5 font-medium">Pin to top of category hub</span>
          </div>
          <button
            type="button"
            @click="toggleSwitch('isTrending')"
            class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
            :class="modelValue.isTrending ? 'bg-[#5D87FF]' : 'bg-[#CBD5E1] dark:bg-slate-700'"
          >
            <span
              class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out"
              :class="modelValue.isTrending ? 'translate-x-4' : 'translate-x-0'"
            ></span>
          </button>
        </div>

        <!-- SSO Required Toggle -->
        <div class="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E5EAEF] dark:border-slate-700">
          <div>
            <span class="text-xs font-bold text-[#0F172A] dark:text-slate-100 flex items-center gap-1.5">
              <Lock class="w-3.5 h-3.5 text-[#5D87FF]" />
              <span>SSO / Auth Required</span>
            </span>
            <span class="text-[10px] text-[#64748B] dark:text-slate-400 block mt-0.5 font-medium">Restrict to internal corporate only</span>
          </div>
          <button
            type="button"
            @click="toggleSwitch('isSsoRequired')"
            class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
            :class="modelValue.isSsoRequired ? 'bg-[#5D87FF]' : 'bg-[#CBD5E1] dark:bg-slate-700'"
          >
            <span
              class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out"
              :class="modelValue.isSsoRequired ? 'translate-x-4' : 'translate-x-0'"
            ></span>
          </button>
        </div>

        <!-- Custom SOP Indicator -->
        <div class="p-3.5 rounded-xl bg-[#ECF2FF] dark:bg-indigo-950/30 border border-[#5D87FF]/20 text-xs space-y-1">
          <span class="font-extrabold text-[#5D87FF] dark:text-indigo-300 block">Document Status:</span>
          <p class="text-[11px] text-[#475569] dark:text-slate-300 font-medium leading-relaxed">
            {{ modelValue.isCustom ? 'Custom Case (Editable & removable by admin).' : 'Built-in Corporate SOP (Default corporate template).' }}
          </p>
        </div>
      </div>

      <!-- TAB 3: TAGS -->
      <div v-if="activeTab === 'tags'" class="space-y-3">
        <label class="block text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
          Article Tags
        </label>
        
        <!-- Tag Chips -->
        <div class="flex flex-wrap gap-1.5 min-h-12 p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5EAEF] dark:border-slate-700">
          <span
            v-for="tag in (modelValue.tags || [])"
            :key="tag"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-white dark:bg-slate-700 border border-[#E5EAEF] dark:border-slate-600 text-[#0F172A] dark:text-slate-200 shadow-2xs"
          >
            <span>#{{ tag }}</span>
            <button
              @click="removeTag(tag)"
              class="text-[#64748B] hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </span>
          <span v-if="!modelValue.tags || !modelValue.tags.length" class="text-[11px] text-[#94A3B8] italic py-1 font-medium">
            No tags assigned...
          </span>
        </div>

        <!-- Add Tag Input -->
        <div class="flex gap-2">
          <input
            v-model="newTagInput"
            @keydown.enter.prevent="addTag"
            type="text"
            placeholder="Add new tag..."
            class="flex-1 bg-white dark:bg-slate-800 border border-[#E5EAEF] dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#0F172A] dark:text-slate-100 focus:outline-none focus:border-[#5D87FF]"
          />
          <button
            @click="addTag"
            class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#5D87FF] text-white hover:bg-[#4570EA] transition-colors cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>

      <!-- TAB 4: STATS -->
      <div v-if="activeTab === 'stats'" class="space-y-4">
        <div class="bg-[#F8FAFC] dark:bg-slate-800/80 border border-[#E5EAEF] dark:border-slate-700 rounded-xl p-4 space-y-3">
          <h4 class="text-[11px] font-extrabold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Performance (Last 30d)
          </h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="block text-2xl font-extrabold text-[#0F172A] dark:text-white">1,420</span>
              <span class="text-[10px] text-[#64748B] dark:text-slate-400 flex items-center gap-1 mt-0.5 font-bold">
                <Eye class="w-3.5 h-3.5 text-[#5D87FF]" /> Views
              </span>
            </div>
            <div>
              <span class="block text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">96%</span>
              <span class="text-[10px] text-[#64748B] dark:text-slate-400 flex items-center gap-1 mt-0.5 font-bold">
                <ShieldCheck class="w-3.5 h-3.5 text-emerald-600" /> Helpful Ratio
              </span>
            </div>
          </div>
        </div>

        <div class="text-[11px] text-[#64748B] dark:text-slate-400 space-y-1 p-2 font-medium">
          <p>&bull; Last updated: {{ new Date().toLocaleDateString('id-ID') }}</p>
          <p>&bull; Avg resolution: &lt; 5 minutes</p>
        </div>
      </div>

    </div>

    <!-- Inspector Bottom Action -->
    <div class="p-3.5 border-t border-[#E5EAEF] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950">
      <button
        @click="$emit('viewPortal')"
        class="w-full bg-white dark:bg-slate-800 border border-[#E5EAEF] dark:border-slate-700 hover:bg-[#F1F5F9] dark:hover:bg-slate-700 text-[#0F172A] dark:text-slate-200 font-extrabold py-2 px-4 rounded-xl transition-colors text-xs flex justify-center items-center gap-2 cursor-pointer shadow-2xs"
      >
        <span>Back to Admin CMS</span>
        <ExternalLink class="w-3.5 h-3.5 text-[#5D87FF] dark:text-indigo-400" />
      </button>
    </div>
  </aside>
</template>

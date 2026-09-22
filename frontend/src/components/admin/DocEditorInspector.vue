<script setup>
import { ref, computed, onMounted } from 'vue'
import { Info, Tag as TagIcon, X, ExternalLink, ChevronDown } from 'lucide-vue-next'
import { useKbCategories } from '@/composables/useKbCategories'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  isOpen: {
    type: Boolean,
    default: true,
  },
  canWrite: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'close', 'viewPortal'])

// Kategori dimuat dari sumber yang sama dengan halaman KB Categories
// (GET /api/kb-categories), agar pilihan kategori di Meta selalu sinkron.
const { categories: kbCategories, fetchAllCategories } = useKbCategories()
onMounted(() => {
  fetchAllCategories().catch(() => {
    /* fallback ke daftar statis di bawah */
  })
})

const activeTab = ref('meta') // 'meta' | 'tags'
const newTagInput = ref('')

const DEFAULT_CATEGORIES = [
  { id: 'hardware', label: 'Hardware & Equipment' },
  { id: 'software', label: 'Software & Applications' },
  { id: 'git', label: 'Software & Git' },
  { id: 'workplace', label: 'Access & Security' },
  { id: 'environment', label: 'Network & Connectivity' },
  { id: 'backend', label: 'Backend & Database' },
  { id: 'devops', label: 'Policies & SLAs' },
]

const categories = computed(() => {
  const fromDb = kbCategories.value.map((c) => ({ id: c.key, label: c.title }))
  const seen = new Set(fromDb.map((c) => c.id))
  // Pertahankan opsi default agar case lama yang kategorinya belum terdaftar
  // di kb_categories tetap ter-render dengan label yang benar.
  const merged = [...fromDb, ...DEFAULT_CATEGORIES.filter((c) => !seen.has(c.id))]
  // Kategori dokumen saat ini harus selalu ada sebagai opsi; jika tidak,
  // <select> tampil kosong padahal doc.category masih berisi nilai lama.
  const current = props.modelValue?.category
  if (current && !merged.some((c) => c.id === current)) {
    merged.push({ id: current, label: current })
  }
  return merged
})

const severities = [
  { id: 'high', label: 'High Priority' },
  { id: 'medium', label: 'Medium Priority' },
  { id: 'low', label: 'Low Priority' },
]

function addTag() {
  if (!props.canWrite) return
  const val = newTagInput.value.trim().toLowerCase()
  if (val && !props.modelValue.tags?.includes(val)) {
    const updated = [...(props.modelValue.tags || []), val]
    emit('update:modelValue', { ...props.modelValue, tags: updated })
    newTagInput.value = ''
  }
}

function removeTag(tagToRemove) {
  if (!props.canWrite) return
  const updated = (props.modelValue.tags || []).filter((t) => t !== tagToRemove)
  emit('update:modelValue', { ...props.modelValue, tags: updated })
}
</script>

<template>
  <aside
    class="h-full flex flex-col w-80 bg-white dark:bg-slate-900 border-l border-[#E2E8F0] dark:border-slate-800 transition-all text-[#333333] dark:text-slate-100 select-none overflow-y-auto"
  >
    <!-- Inspector Header -->
    <div
      class="p-4 border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950/60"
    >
      <div class="flex items-center justify-between mb-1">
        <h2
          class="text-xs sm:text-sm font-semibold text-[#333333] dark:text-slate-100 flex items-center gap-1.5"
        >
          <Info class="w-4 h-4 text-[#333333]" />
          <span>Inspector</span>
        </h2>
        <button
          @click="$emit('close')"
          class="p-1 rounded-lg hover:bg-[#E2E8F0] dark:hover:bg-slate-800 text-[#5F7089] dark:text-slate-400 transition-colors cursor-pointer"
          title="Tutup panel"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
      <p class="text-[11px] font-medium text-[#5F7089] dark:text-slate-400">
        Metadata &amp; tag artikel
      </p>
    </div>

    <!-- Tab Navigation -->
    <nav
      class="flex border-b border-[#E2E8F0] dark:border-slate-800 px-2 bg-white dark:bg-slate-900 text-xs"
    >
      <button
        @click="activeTab = 'meta'"
        class="flex-1 py-3 px-1 text-center font-medium flex flex-col items-center gap-1 transition-all cursor-pointer"
        :class="
          activeTab === 'meta'
            ? 'border-b-2 border-[#0A51B0] text-[#333333] dark:text-blue-400'
            : 'text-[#5F7089] dark:text-slate-400 hover:text-[#333333] border-b-2 border-transparent'
        "
      >
        <Info class="w-4 h-4" />
        <span>Meta</span>
      </button>

      <button
        @click="activeTab = 'tags'"
        class="flex-1 py-3 px-1 text-center font-medium flex flex-col items-center gap-1 transition-all cursor-pointer"
        :class="
          activeTab === 'tags'
            ? 'border-b-2 border-[#0A51B0] text-[#333333] dark:text-blue-400'
            : 'text-[#5F7089] dark:text-slate-400 hover:text-[#333333] border-b-2 border-transparent'
        "
      >
        <TagIcon class="w-4 h-4" />
        <span>Tag</span>
      </button>
    </nav>

    <!-- Tab Content -->
    <div class="flex-1 p-4 space-y-5 overflow-y-auto text-xs">
      <!-- TAB 1: META -->
      <div v-if="activeTab === 'meta'" class="space-y-4">
        <!-- Category -->
        <div class="space-y-1.5">
          <label
            class="block text-[11px] font-medium uppercase tracking-wide text-[#5F7089] dark:text-slate-400"
          >
            Kategori
          </label>
          <div class="relative">
            <select
              :value="modelValue.category"
              :disabled="!canWrite"
              @change="$emit('update:modelValue', { ...modelValue, category: $event.target.value })"
              class="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-[#333333] dark:text-slate-100 appearance-none focus:outline-none focus:border-[#0A51B0] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              <option v-for="c in categories" :key="c.id" :value="c.id">
                {{ c.label }}
              </option>
            </select>
            <ChevronDown
              class="w-4 h-4 text-[#5F7089] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
          </div>
        </div>

        <!-- Severity -->
        <div class="space-y-1.5">
          <label
            class="block text-[11px] font-medium uppercase tracking-wide text-[#5F7089] dark:text-slate-400"
          >
            Severity / Priority
          </label>
          <div class="relative">
            <select
              :value="modelValue.severity"
              :disabled="!canWrite"
              @change="$emit('update:modelValue', { ...modelValue, severity: $event.target.value })"
              class="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-[#333333] dark:text-slate-100 appearance-none focus:outline-none focus:border-[#0A51B0] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              <option v-for="s in severities" :key="s.id" :value="s.id">
                {{ s.label }}
              </option>
            </select>
            <ChevronDown
              class="w-4 h-4 text-[#5F7089] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
          </div>
        </div>

        <!-- Document Status Indicator -->
        <div
          class="p-3 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E2E8F0] dark:border-slate-700/60 text-xs space-y-1"
        >
          <span class="font-semibold text-[#333333] dark:text-slate-200 block"
            >Status Artikel:</span
          >
          <p class="text-[11px] text-[#5F7089] dark:text-slate-400 leading-relaxed">
            {{
              modelValue.isCustom
                ? 'Custom — dapat diedit & dihapus admin.'
                : 'Built-in — template bawaan korporat.'
            }}
          </p>
        </div>
      </div>

      <!-- TAB 2: TAGS -->
      <div v-if="activeTab === 'tags'" class="space-y-3">
        <label
          class="block text-[11px] font-medium uppercase tracking-wide text-[#5F7089] dark:text-slate-400"
        >
          Tag Artikel
        </label>

        <!-- Tag Chips -->
        <div
          class="flex flex-wrap gap-1.5 min-h-12 p-2.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700"
        >
          <span
            v-for="tag in modelValue.tags || []"
            :key="tag"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-white dark:bg-slate-700 border border-[#E2E8F0] dark:border-slate-600 text-[#333333] dark:text-slate-200"
          >
            <span>#{{ tag }}</span>
            <button
              v-if="canWrite"
              @click="removeTag(tag)"
              class="text-[#5F7089] hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </span>
          <span
            v-if="!modelValue.tags || !modelValue.tags.length"
            class="text-[11px] text-[#687281] italic py-1"
          >
            Belum ada tag...
          </span>
        </div>

        <!-- Add Tag Input -->
        <div v-if="canWrite" class="flex gap-2">
          <input
            v-model="newTagInput"
            @keydown.enter.prevent="addTag"
            type="text"
            placeholder="Tambah tag baru…"
            class="flex-1 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-[#333333] dark:text-slate-100 focus:outline-none focus:border-[#0A51B0]"
          />
          <button
            @click="addTag"
            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0A51B0] text-white hover:bg-[#0A4391] transition-colors cursor-pointer"
          >
            Tambah
          </button>
        </div>
      </div>
    </div>

    <!-- Inspector Bottom Action -->
    <div
      class="p-3.5 border-t border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950"
    >
      <button
        @click="$emit('viewPortal')"
        class="w-full bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 hover:bg-[#F1F5F9] dark:hover:bg-slate-700 text-[#333333] dark:text-slate-200 font-semibold py-2 px-4 rounded-lg transition-colors text-xs flex justify-center items-center gap-2 cursor-pointer"
      >
        <span>Kembali ke Admin CMS</span>
        <ExternalLink class="w-3.5 h-3.5 text-[#333333] dark:text-blue-400" />
      </button>
    </div>
  </aside>
</template>

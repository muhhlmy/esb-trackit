<script setup>
import { ref, watch } from 'vue'
import AppModal from './AppModal.vue'

const props = defineProps({
  isOpen: Boolean,
  title: { type: String, default: 'Filter Data' },
  subtitle: { type: String, default: 'Sesuaikan filter untuk mempersempit hasil.' },
  fields: { type: Array, default: () => [] },
  modelValue: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['close', 'apply', 'reset'])
const draft = ref({ ...props.modelValue })
watch(
  () => props.modelValue,
  (value) => {
    draft.value = { ...value }
  },
  { deep: true },
)

function apply() {
  emit('apply', { ...draft.value })
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    :title="title"
    :subtitle="subtitle"
    icon="filter_alt"
    size="sm"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <div class="space-y-3">
        <div v-for="field in fields" :key="field.key" class="space-y-1.5">
          <label class="text-xs font-bold text-slate-600">{{ field.label }}</label>
          <input
            v-if="field.type === 'search' || field.type === 'date'"
            v-model="draft[field.key]"
            :type="field.type === 'search' ? 'text' : 'date'"
            :placeholder="field.placeholder"
            class="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs focus:border-[#0A51B0] focus:outline-none"
          />
          <select
            v-else
            v-model="draft[field.key]"
            class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs focus:border-[#0A51B0] focus:outline-none"
          >
            <option value="">{{ field.placeholder || `Semua ${field.label}` }}</option>
            <option
              v-for="option in field.options || []"
              :key="String(option.value)"
              :value="option.value"
            >
              {{ option.label ?? option.value }}
            </option>
          </select>
        </div>
        <slot />
      </div>
      <div
        class="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end"
      >
        <button
          type="button"
          @click="emit('reset')"
          class="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          Reset
        </button>
        <button
          type="button"
          @click="apply"
          class="min-h-10 rounded-xl bg-[#0A51B0] px-5 text-xs font-bold text-white hover:bg-[#08458f]"
        >
          Terapkan Filter
        </button>
      </div>
    </div>
  </AppModal>
</template>

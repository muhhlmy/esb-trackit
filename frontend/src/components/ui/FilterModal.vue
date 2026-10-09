<script setup>
import { ref, watch } from 'vue'
import AppModal from './AppModal.vue'

const props = defineProps({
  isOpen: Boolean,
  panelClass: { type: String, default: '' },
  title: { type: String, default: 'Filter Data' },
  subtitle: { type: String, default: 'Sesuaikan filter untuk mempersempit hasil.' },
  fields: { type: Array, default: () => [] },
  modelValue: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['close', 'apply', 'reset'])
const draft = ref({ ...props.modelValue })
const fieldIds = new Map()
let fieldCounter = 0
watch(
  () => props.modelValue,
  (value) => {
    draft.value = { ...value }
  },
  { deep: true },
)

function fieldId(key) {
  if (!fieldIds.has(key)) fieldIds.set(key, `filter-field-${++fieldCounter}`)
  return fieldIds.get(key)
}

function apply() {
  emit('apply', { ...draft.value })
}
</script>

<template>
  <AppModal
    :panel-class="panelClass"
    :is-open="isOpen"
    :title="title"
    :subtitle="subtitle"
    icon="filter_alt"
    size="sm"
    @close="emit('close')"
  >
    <div class="space-y-2.5">
      <div class="space-y-2.5">
        <div v-for="field in fields" :key="field.key" class="space-y-1">
          <label :for="fieldId(field.key)" class="text-[10px] font-bold text-slate-600">{{
            field.label
          }}</label>
          <input
            v-if="field.type === 'search' || field.type === 'date'"
            :id="fieldId(field.key)"
            v-model="draft[field.key]"
            :type="field.type === 'search' ? 'text' : 'date'"
            :placeholder="field.placeholder"
            class="h-7 w-full rounded-[5px] border border-slate-200 px-2.5 text-[10.5px] focus:border-[#0A51B0] focus:outline-none"
          />
          <select
            v-else
            :id="fieldId(field.key)"
            v-model="draft[field.key]"
            class="h-7 w-full rounded-[5px] border border-slate-200 bg-white px-2.5 text-[10.5px] focus:border-[#0A51B0] focus:outline-none"
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
        class="flex flex-col-reverse gap-1.5 border-t border-slate-200 pt-2.5 sm:flex-row sm:justify-end"
      >
        <button
          type="button"
          @click="emit('reset')"
          class="min-h-7 rounded-[5px] border border-slate-200 px-3 text-[10px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          Reset
        </button>
        <button
          type="button"
          @click="apply"
          class="min-h-7 rounded-[5px] bg-[#0A51B0] px-3 text-[10px] font-bold text-white hover:bg-[#08458f] cursor-pointer"
        >
          Terapkan Filter
        </button>
      </div>
    </div>
  </AppModal>
</template>

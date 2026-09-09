<script setup>
// CustomSelect.vue — Dropdown custom dengan gaya konsisten (mirip status selector
// di Detail Ticket). Khusus dipakai untuk dropdown FILTERING di seluruh project.
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  options: { type: Array, required: true },
  placeholder: { type: String, default: 'Pilih opsi' },
  disabled: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '' },
  clearable: { type: Boolean, default: false },
  valueKey: { type: String, default: 'value' },
  labelKey: { type: String, default: 'label' },
  dotKey: { type: String, default: 'dot' },
  widthClass: { type: String, default: 'w-full' },
  heightClass: { type: String, default: 'h-9' },
  align: { type: String, default: 'left' },
  block: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change'])

const listboxId = useId()
const isOpen = ref(false)
const containerRef = ref(null)

// Normalisasi opsi ke { value, label, dot }
const normalizedOptions = computed(() =>
  props.options.map((opt) => {
    if (opt && typeof opt === 'object' && !Array.isArray(opt)) {
      return {
        value: opt[props.valueKey],
        label: opt[props.labelKey] ?? String(opt[props.valueKey] ?? ''),
        dot: opt[props.dotKey] ?? null,
      }
    }
    return { value: opt, label: String(opt), dot: null }
  }),
)

const selectedOption = computed(
  () => normalizedOptions.value.find((opt) => opt.value === props.modelValue) || null,
)

function toggle() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

function select(option) {
  emit('update:modelValue', option.value)
  emit('change', option.value)
  isOpen.value = false
}

function clear() {
  emit('update:modelValue', null)
  emit('change', null)
  isOpen.value = false
}

function handleClickOutside(event) {
  if (containerRef.value && !containerRef.value.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div
    ref="containerRef"
    class="relative text-left"
    :class="block ? 'block w-full' : 'inline-block'"
  >
    <button
      type="button"
      :disabled="disabled"
      :aria-label="ariaLabel || placeholder"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      @click="toggle"
      class="inline-flex w-full items-center gap-2 rounded-xl border border-[#E5EAEF] bg-white px-3.5 text-xs font-bold text-[#2A3547] shadow-2xs hover:bg-[#F8FAFC] hover:border-[#5D87FF] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      :class="heightClass"
    >
      <span
        v-if="selectedOption && selectedOption.dot"
        class="h-2 w-2 rounded-full shrink-0"
        :class="selectedOption.dot"
      ></span>
      <span class="min-w-0 flex-1 truncate">{{
        selectedOption ? selectedOption.label : placeholder
      }}</span>
      <span class="material-symbols-outlined text-[16px] text-[#7C8BAC] shrink-0">expand_more</span>
    </button>

    <button
      v-if="clearable && selectedOption"
      type="button"
      aria-label="Hapus pilihan"
      class="absolute right-7 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-[#475569] transition-colors hover:bg-red-50 hover:text-[#DC2626]"
      @click.stop="clear"
    >
      <span aria-hidden="true" class="material-symbols-outlined text-[14px]">close</span>
    </button>

    <Transition name="fade">
      <div
        v-if="isOpen"
        :id="listboxId"
        role="listbox"
        class="absolute top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-[#E5EAEF] bg-white p-1.5 shadow-lg"
        :class="[widthClass, align === 'right' ? 'right-0' : 'left-0']"
      >
        <button
          v-for="opt in normalizedOptions"
          :key="String(opt.value)"
          type="button"
          role="option"
          :aria-selected="opt.value === modelValue"
          class="flex h-8 w-full items-center justify-between rounded-lg px-2.5 text-xs font-medium text-[#2A3547] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          :class="opt.value === modelValue ? 'bg-[#ECF2FF] font-bold text-[#5D87FF]' : ''"
          @click="select(opt)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span v-if="opt.dot" class="h-2 w-2 rounded-full shrink-0" :class="opt.dot"></span>
            <span class="truncate">{{ opt.label }}</span>
          </div>
          <span
            v-if="opt.value === modelValue"
            class="material-symbols-outlined text-[15px] text-[#5D87FF] shrink-0"
            >check</span
          >
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>

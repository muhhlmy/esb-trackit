<script setup>
// ============================================================
// AppViewToggle.vue — Segmented control Tabel / Kartu.
// Dipakai bersama semua list modul agar pola tampilan konsisten.
// ============================================================
defineProps({
  modelValue: { type: String, required: true },
  disabled: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])

const options = [
  { value: 'table', label: 'Tabel', icon: 'table_rows' },
  { value: 'card', label: 'Kartu', icon: 'grid_view' },
]
</script>

<template>
  <div
    class="app-view-toggle inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5"
    role="group"
    aria-label="Mode tampilan daftar"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      :disabled="disabled"
      :aria-pressed="modelValue === opt.value ? 'true' : 'false'"
      :title="`Tampilan ${opt.label}`"
      class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      :class="
        modelValue === opt.value
          ? 'bg-white text-[#0A51B0] shadow-2xs border border-[#D7E3F2]'
          : 'text-[#5F7089] hover:text-[#333333] border border-transparent'
      "
      @click="$emit('update:modelValue', opt.value)"
    >
      <span aria-hidden="true" class="material-symbols-outlined text-[15px]">{{ opt.icon }}</span>
      <span class="hidden sm:inline">{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.app-view-toggle button:focus-visible {
  outline: 2px solid #097cde;
  outline-offset: 2px;
}
</style>

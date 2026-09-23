<script setup>
/**
 * EmptyState.vue — primitive empty-state konsisten untuk semua list/table.
 *
 * Membedakan eksplisit: no-data vs no-search-results (dengan aksi reset
 * filter) vs no-permission — sesuai kebijakan UX (jangan satu pesan untuk
 * semua kondisi).
 *
 * Props:
 *   icon         – Material Symbols icon name (default 'inbox')
 *   title        – Judul singkat kondisi
 *   description  – Penjelasan 1 kalimat (opsional)
 *   actionLabel  – Label CTA primer (opsional)
 *   secondaryLabel – Label aksi sekunder, mis. reset filter (opsional)
 * Emits:
 *   action, secondary-action
 */
defineProps({
  icon: { type: String, default: 'inbox' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
  secondaryLabel: { type: String, default: '' },
})

defineEmits(['action', 'secondary-action'])
</script>

<template>
  <div class="flex flex-col items-center justify-center px-6 py-12 text-center">
    <div
      class="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E5EAEF] bg-[#F8FAFC] text-[#94A3B8] mb-4"
    >
      <span aria-hidden="true" class="material-symbols-outlined text-[28px]">{{ icon }}</span>
    </div>

    <h3 class="text-base font-bold text-[#333333]">{{ title }}</h3>

    <p v-if="description" class="mt-1.5 max-w-xs text-xs leading-relaxed text-[#5F7089]">
      {{ description }}
    </p>

    <div v-if="actionLabel || secondaryLabel" class="mt-5 flex flex-wrap items-center justify-center gap-2">
      <button
        v-if="actionLabel"
        type="button"
        class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0A51B0] px-4 text-xs font-bold text-white shadow-2xs transition-all duration-150 hover:bg-[#0A4391] active:scale-[0.98] cursor-pointer"
        @click="$emit('action')"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[16px]">add</span>
        {{ actionLabel }}
      </button>

      <button
        v-if="secondaryLabel"
        type="button"
        class="inline-flex h-9 items-center rounded-xl border border-[#E2E8F0] bg-white px-4 text-xs font-bold text-[#475569] transition-colors duration-150 hover:bg-[#F8FAFC] cursor-pointer"
        @click="$emit('secondary-action')"
      >
        {{ secondaryLabel }}
      </button>
    </div>
  </div>
</template>

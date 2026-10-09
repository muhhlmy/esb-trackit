<script setup>
/**
 * EmptyState.vue - primitive empty-state konsisten untuk semua list/table.
 *
 * Membedakan eksplisit: no-data vs no-search-results (dengan aksi reset
 * filter) vs no-permission - sesuai kebijakan UX (jangan satu pesan untuk
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
  <div class="flex flex-col items-center justify-center px-4 py-8 sm:py-10 text-center">
    <div
      class="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-[#E5EAEF] bg-[#F8FAFC] text-[#94A3B8] mb-2.5"
    >
      <span aria-hidden="true" class="material-symbols-outlined text-[20px] sm:text-[22px]">{{ icon }}</span>
    </div>

    <h3 class="text-[12px] sm:text-[13px] font-bold text-[#333333]">{{ title }}</h3>

    <p v-if="description" class="mt-1 max-w-xs text-[10px] sm:text-[10.5px] leading-relaxed text-[#5F7089]">
      {{ description }}
    </p>

    <div v-if="actionLabel || secondaryLabel" class="mt-4 flex flex-wrap items-center justify-center gap-1.5">
      <button
        v-if="actionLabel"
        type="button"
        class="inline-flex h-7 items-center gap-1 rounded-[5px] bg-[#0A51B0] px-3 text-[10px] font-bold text-white shadow-2xs transition-all duration-150 hover:bg-[#0A4391] active:scale-[0.98] cursor-pointer"
        @click="$emit('action')"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[13.5px]">add</span>
        {{ actionLabel }}
      </button>

      <button
        v-if="secondaryLabel"
        type="button"
        class="inline-flex h-7 items-center rounded-[5px] border border-[#E2E8F0] bg-white px-3 text-[10px] font-bold text-[#475569] transition-colors duration-150 hover:bg-[#F8FAFC] cursor-pointer"
        @click="$emit('secondary-action')"
      >
        {{ secondaryLabel }}
      </button>
    </div>
  </div>
</template>

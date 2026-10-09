<script setup>
/**
 * ErrorState.vue - primitive error state halaman/kartu dengan retry.
 *
 * Menggantikan 3 markup inline berbeda (Users/Tickets/Submissions) dengan
 * satu pola: icon + pesan + tombol retry, role="alert" agar dibacakan
 * screen reader. Toast tetap sebagai pelengkap, bukan satu-satunya sinyal.
 *
 * Props:
 *   message      – Pesan error (required)
 *   retryLabel   – Label tombol coba lagi (default 'Coba lagi')
 * Emits:
 *   retry
 */
defineProps({
  message: { type: String, required: true },
  retryLabel: { type: String, default: 'Coba lagi' },
})

defineEmits(['retry'])
</script>

<template>
  <div
    role="alert"
    class="flex flex-wrap items-center gap-2 rounded-[5px] border border-[#FECACA] bg-[#FEF2F2] p-2.5 text-[10.5px] text-[#B91C1C] shadow-2xs"
  >
    <span aria-hidden="true" class="material-symbols-outlined text-[16px] shrink-0 text-[#DC2626]">
      error
    </span>

    <span class="flex-1 min-w-40 font-semibold">{{ message }}</span>

    <button
      type="button"
      class="inline-flex h-6.5 items-center rounded-[5px] bg-[#DC2626] px-2.5 text-[10px] font-bold text-white transition-colors duration-150 hover:bg-[#B91C1C] active:scale-[0.98] cursor-pointer"
      @click="$emit('retry')"
    >
      {{ retryLabel }}
    </button>
  </div>
</template>

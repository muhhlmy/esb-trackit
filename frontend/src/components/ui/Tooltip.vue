<script setup>
/**
 * Tooltip.vue — CSS-only tooltip (zero JS, zero deps).
 *
 * Alternatif lokal untuk Tooltip shadcn/Radix: muncul pada hover dan
 * focus-within (keyboard), posisi atas/bawah, transition 150ms dengan
 * delay 250ms agar tidak "berkedip" saat pointer melintas, dan otomatis
 * dinonaktifkan oleh prefers-reduced-motion (rule global main.css).
 *
 * Props:
 *   text     – Isi tooltip
 *   position – 'top' | 'bottom'
 */
defineProps({
  text: { type: String, required: true },
  position: {
    type: String,
    default: 'top',
    validator: (v) => ['top', 'bottom'].includes(v),
  },
})
</script>

<template>
  <span class="tt group/tt relative inline-flex">
    <slot />
    <span
      role="tooltip"
      class="tt-bubble pointer-events-none absolute left-1/2 z-40 w-max max-w-60 rounded-lg bg-[#1E293B] px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-lg"
      :class="position === 'top' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]'"
    >
      {{ text }}
      <span
        aria-hidden="true"
        class="absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-[#1E293B]"
        :class="position === 'top' ? '-bottom-0.5' : '-top-0.5'"
      />
    </span>
  </span>
</template>

<style scoped>
.tt-bubble {
  transform: translate(-50%, 4px);
  transition:
    opacity 150ms cubic-bezier(0.4, 0, 0.2, 1) 250ms,
    transform 150ms cubic-bezier(0.4, 0, 0.2, 1) 250ms;
}

.tt:hover .tt-bubble,
.tt:focus-within .tt-bubble {
  opacity: 1;
  transform: translate(-50%, 0);
}
</style>

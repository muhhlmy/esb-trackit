<script setup>
// AppBadge.vue - Pill badge Modernize style.
// Tone didelegasikan ke sistem semantik sentral (config/design-system.js)
// agar semua badge di aplikasi memakai palet yang sama.
import { STATE_TONES } from '../../config/design-system.js'

defineProps({
  // 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'cyan' | 'purple'
  type: { type: String, default: 'neutral' },
  text: { type: String, required: true },
})

// Alias 'default' dipertahankan agar konsumen lama tetap bekerja.
const classes = {
  success: STATE_TONES.success.chip + ' font-bold',
  warning: STATE_TONES.warning.chip + ' font-bold',
  danger: STATE_TONES.danger.chip + ' font-bold',
  info: STATE_TONES.info.chip + ' font-bold',
  neutral: STATE_TONES.neutral.chip + ' font-bold',
  cyan: STATE_TONES.cyan.chip + ' font-bold',
  purple: STATE_TONES.purple.chip + ' font-bold',
  default: STATE_TONES.neutral.chip + ' font-bold',
}

const dotColors = {
  success: STATE_TONES.success.dot,
  warning: STATE_TONES.warning.dot,
  danger: STATE_TONES.danger.dot,
  info: STATE_TONES.info.dot,
  neutral: STATE_TONES.neutral.dot,
  cyan: STATE_TONES.cyan.dot,
  purple: STATE_TONES.purple.dot,
  default: STATE_TONES.neutral.dot,
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.2 sm:px-2 sm:py-0.5 text-[8.5px] sm:text-[9.5px] tracking-[0.01em] transition-all"
    :class="classes[type] || classes.default"
  >
    <span
      aria-hidden="true"
      class="h-1 w-1 sm:h-1.2 sm:w-1.2 rounded-full"
      :class="dotColors[type] || dotColors.default"
    ></span>
    {{ text }}
  </span>
</template>

<script setup>
/**
 * StatusBadge.vue — sistem status semantik terpusat.
 *
 * Satu pemetaan untuk semua entitas (tiket, aset, pengajuan, pengiriman).
 * Sumber kebenaran tone & mapping ada di config/design-system.js agar
 * juga bisa dipakai komponen non-badge (dot, alert, chart).
 *
 * Props:
 *   text   – Label yang tampil (required)
 *   status – Nilai status mentah dari API (opsional; dipetakan otomatis,
 *            case-insensitive, menerima snake/kebab/title case)
 *   tone   – Override semantik: success|warning|danger|info|neutral|cyan|purple
 *   dot    – Tampilkan titik status (default true)
 *   size   – 'sm' | 'md'
 *
 * Kontras semua pasangan fg/bg ≥ 4.5:1 (WCAG AA) — diverifikasi oleh
 * frontend/tests/defect0708Accessibility.test.js.
 */
import { computed } from 'vue'
import { STATE_TONES, resolveStatusTone } from '../../config/design-system.js'

const props = defineProps({
  text: { type: String, required: true },
  status: { type: String, default: '' },
  tone: {
    type: String,
    default: '',
    validator: (v) => ['', 'success', 'warning', 'danger', 'info', 'neutral', 'cyan', 'purple'].includes(v),
  },
  dot: { type: Boolean, default: true },
  size: {
    type: String,
    default: 'sm',
    validator: (v) => ['sm', 'md'].includes(v),
  },
})

const resolvedTone = computed(() => (props.tone ? props.tone : resolveStatusTone(props.status)))
const toneClasses = computed(() => STATE_TONES[resolvedTone.value].chip)
const dotColor = computed(() => STATE_TONES[resolvedTone.value].dot)
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border font-bold whitespace-nowrap"
    :class="[
      toneClasses,
      size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-xs',
    ]"
  >
    <span v-if="dot" aria-hidden="true" class="h-1.5 w-1.5 rounded-full" :class="dotColor" />
    <span class="truncate">{{ text }}</span>
  </span>
</template>

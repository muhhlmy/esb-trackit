<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
  label: { type: String, default: '' },
  value: { type: [Number, String], required: true },
  icon: { type: String, default: 'monitoring' },
  color: {
    type: String,
    default: 'primary',
  },
  tone: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  helpText: { type: String, default: '' },
  valueClass: { type: String, default: '' },
  isTotal: { type: Boolean, default: null },
})

const displayTitle = computed(() => props.title || props.label || '')
const displaySubtitle = computed(() => props.subtitle || props.helpText || '')
const displayColor = computed(() => props.color || props.tone || 'primary')

const isTotalCard = computed(() => {
  if (props.isTotal !== null && props.isTotal !== undefined) {
    return Boolean(props.isTotal)
  }
  const t = displayTitle.value.trim().toLowerCase()
  return (
    t.startsWith('total') ||
    t === 'aset digunakan' ||
    t === 'karyawan dengan aset'
  )
})
</script>

<template>
  <div
    class="kpi-focusable transition-colors flex flex-col justify-between rounded-[var(--kpi-radius)] p-[var(--kpi-padding)] sm:p-[var(--kpi-padding-sm)] lg:p-[var(--kpi-padding-lg)] min-h-[var(--kpi-height)] sm:min-h-[var(--kpi-height-sm)] lg:min-h-[var(--kpi-height-lg)]"
    :class="{
      'stat-card-total': isTotalCard,
      'bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xs hover:border-[#CBD5E1] dark:hover:border-slate-700':
        !isTotalCard,
    }"
    tabindex="0"
  >
    <div class="flex items-center justify-between gap-[var(--kpi-gap)]">
      <span
        class="text-[length:var(--kpi-title-font-size)] sm:text-[length:var(--kpi-title-font-size-sm)] lg:text-[length:var(--kpi-title-font-size-lg)] font-medium truncate"
        :class="isTotalCard ? 'text-white/90' : 'text-[#5F7089] dark:text-slate-400'"
      >{{ displayTitle }}</span>
      <div
        class="flex h-[var(--kpi-icon-container-size)] w-[var(--kpi-icon-container-size)] sm:h-[var(--kpi-icon-container-size-sm)] sm:w-[var(--kpi-icon-container-size-sm)] lg:h-[var(--kpi-icon-container-size-lg)] lg:w-[var(--kpi-icon-container-size-lg)] shrink-0 items-center justify-center rounded-[6px]"
        :class="{
          'bg-white/20 text-white': isTotalCard,
          'bg-[#EFF6FF] text-[#0A51B0] dark:bg-blue-950/60 dark:text-blue-400':
            !isTotalCard && (displayColor === 'primary' || displayColor === 'cyan' || displayColor === 'info'),
          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300':
            !isTotalCard && (displayColor === 'neutral' || displayColor === 'purple'),
          'bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/60 dark:text-emerald-400':
            !isTotalCard && displayColor === 'success',
          'bg-[#FFFBEB] text-[#B45309] dark:bg-amber-950/60 dark:text-amber-400':
            !isTotalCard && displayColor === 'warning',
          'bg-[#FEF2F2] text-[#DC2626] dark:bg-rose-950/60 dark:text-rose-400':
            !isTotalCard && displayColor === 'danger',
        }"
      >
        <slot name="icon">
          <span
            aria-hidden="true"
            class="material-symbols-outlined text-[length:var(--kpi-icon-size)] sm:text-[length:var(--kpi-icon-size-sm)] lg:text-[length:var(--kpi-icon-size-lg)]"
            :class="{ 'text-white': isTotalCard }"
          >{{ icon }}</span>
        </slot>
      </div>
    </div>

    <div class="mt-0.5">
      <span
        class="font-num block text-[length:var(--kpi-value-font-size)] sm:text-[length:var(--kpi-value-font-size-sm)] lg:text-[length:var(--kpi-value-font-size-lg)] font-semibold leading-none tracking-tight tabular-nums"
        :class="[valueClass, isTotalCard ? 'text-white' : 'text-[#333333] dark:text-white']"
      >{{ value }}</span>
      <span
        v-if="displaySubtitle"
        class="mt-0.5 block truncate text-[length:var(--kpi-caption-font-size)] sm:text-[length:var(--kpi-caption-font-size-sm)] lg:text-[length:var(--kpi-caption-font-size-lg)] font-normal"
        :class="isTotalCard ? 'text-white/85' : 'text-[#64748B] dark:text-slate-400'"
      >{{ displaySubtitle }}</span>
    </div>
  </div>
</template>

<style scoped>
.stat-card-total {
  background: linear-gradient(135deg, #0a51b0 0%, #0a4391 100%) !important;
  border: 1px solid #0a51b0 !important;
  color: #ffffff !important;
  box-shadow: 0 1px 3px rgba(10, 81, 176, 0.25);
}
.stat-card-total:hover {
  background: linear-gradient(135deg, #094799 0%, #083b7f 100%) !important;
  border-color: #094799 !important;
}
.stat-card-total:focus-visible {
  outline: 2px solid #ffffff !important;
  outline-offset: 2px;
}
</style>

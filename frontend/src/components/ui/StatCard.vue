<script setup>
defineProps({
  title: { type: String, required: true },
  value: { type: [Number, String], required: true },
  icon: { type: String, default: 'monitoring' },
  color: {
    type: String,
    default: 'primary',
    validator: (value) =>
      ['primary', 'neutral', 'success', 'warning', 'danger', 'cyan', 'purple', 'info'].includes(value),
  },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <div
    class="kpi-focusable flex flex-col justify-between transition-colors rounded-[var(--kpi-radius)] p-[var(--kpi-padding)] sm:p-[var(--kpi-padding-sm)] lg:p-[var(--kpi-padding-lg)] min-h-[var(--kpi-height)] sm:min-h-[var(--kpi-height-sm)] lg:min-h-[var(--kpi-height-lg)]" :style="{ '--kpi-bg': 'var(--kpi-bg)', '--kpi-bg-dark': 'var(--kpi-bg-dark)', '--kpi-border': 'var(--kpi-border)', '--kpi-border-dark': 'var(--kpi-border-dark)', '--kpi-shadow': 'var(--kpi-shadow)', '--kpi-hover-border': 'var(--kpi-hover-border)', '--kpi-hover-border-dark': 'var(--kpi-hover-border-dark)' }"
    tabindex="0"
  >
    <div class="flex items-center justify-between gap-[var(--kpi-gap)]">
      <span class="text-[length:var(--kpi-title-font-size)] sm:text-[length:var(--kpi-title-font-size-sm)] lg:text-[length:var(--kpi-title-font-size-lg)] font-medium text-[#5F7089] dark:text-slate-400 truncate">{{
        title
      }}</span>
      <div
        class="flex h-[var(--kpi-icon-container-size)] w-[var(--kpi-icon-container-size)] sm:h-[var(--kpi-icon-container-size-sm)] sm:w-[var(--kpi-icon-container-size-sm)] lg:h-[var(--kpi-icon-container-size-lg)] lg:w-[var(--kpi-icon-container-size-lg)] shrink-0 items-center justify-center rounded-[6px]"
        :class="{
          'bg-[#EFF6FF] text-[#0A51B0] dark:bg-blue-950/60 dark:text-blue-400': color === 'primary' || color === 'cyan' || color === 'info',
          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300': color === 'neutral' || color === 'purple',
          'bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/60 dark:text-emerald-400': color === 'success',
          'bg-[#FFFBEB] text-[#B45309] dark:bg-amber-950/60 dark:text-amber-400': color === 'warning',
          'bg-[#FEF2F2] text-[#DC2626] dark:bg-rose-950/60 dark:text-rose-400': color === 'danger',
        }"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[length:var(--kpi-icon-size)] sm:text-[length:var(--kpi-icon-size-sm)] lg:text-[length:var(--kpi-icon-size-lg)]">{{ icon }}</span>
      </div>
    </div>

    <div class="mt-0.5">
      <span
        class="font-num block text-[length:var(--kpi-value-font-size)] sm:text-[length:var(--kpi-value-font-size-sm)] lg:text-[length:var(--kpi-value-font-size-lg)] font-semibold leading-none tracking-tight text-[#333333] dark:text-white tabular-nums"
        >{{ value }}</span
      >
      <span v-if="subtitle" class="mt-0.5 block truncate text-[length:var(--kpi-caption-font-size)] sm:text-[length:var(--kpi-caption-font-size-sm)] lg:text-[length:var(--kpi-caption-font-size-lg)] font-normal text-[#64748B] dark:text-slate-400">{{
        subtitle
      }}</span>
    </div>
  </div>
</template>

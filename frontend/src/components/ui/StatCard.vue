<script setup>
defineProps({
  title: { type: String, required: true },
  value: { type: [Number, String], required: true },
  icon: { type: String, default: 'monitoring' },
  color: {
    type: String,
    default: 'primary',
    validator: (value) =>
      ['primary', 'success', 'warning', 'danger', 'cyan', 'purple'].includes(value),
  },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <div
    class="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg p-2 sm:p-2.5 shadow-2xs hover:border-[#CBD5E1] dark:hover:border-slate-700 transition-colors flex flex-col justify-between min-h-[56px] sm:min-h-[60px]"
  >
    <div class="flex items-center justify-between gap-1.5">
      <span class="text-[11px] sm:text-[11.5px] font-medium text-[#5F7089] dark:text-slate-400 truncate">{{
        title
      }}</span>
      <div
        class="flex h-5 w-5 sm:h-5.5 sm:w-5.5 shrink-0 items-center justify-center rounded-md"
        :class="{
          'bg-[#EFF6FF] text-[#0A51B0] dark:bg-blue-950/60 dark:text-blue-400': color === 'primary',
          'bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/60 dark:text-emerald-400': color === 'success',
          'bg-[#FFFBEB] text-[#B45309] dark:bg-amber-950/60 dark:text-amber-400': color === 'warning',
          'bg-[#FEF2F2] text-[#DC2626] dark:bg-rose-950/60 dark:text-rose-400': color === 'danger',
          'bg-[#F0F9FF] text-[#0284C7] dark:bg-sky-950/60 dark:text-sky-400': color === 'cyan',
          'bg-[#F8FAFC] text-[#475569] dark:bg-slate-800 dark:text-slate-300': color === 'purple',
        }"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[13px] sm:text-[14px]">{{ icon }}</span>
      </div>
    </div>

    <div class="mt-1">
      <span
        class="font-num block text-base sm:text-[18px] font-bold leading-none tracking-tight text-[#333333] dark:text-white tabular-nums"
        >{{ value }}</span
      >
      <span v-if="subtitle" class="mt-0.5 block truncate text-[10.5px] sm:text-[11px] font-normal text-[#64748B] dark:text-slate-400">{{
        subtitle
      }}</span>
    </div>
  </div>
</template>

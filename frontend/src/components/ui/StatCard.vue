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
    class="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-2.5 sm:p-3 lg:p-3.5 shadow-2xs hover:border-[#CBD5E1] dark:hover:border-slate-700 transition-colors flex flex-col justify-between min-h-[76px] sm:min-h-[84px] lg:min-h-[92px]"
  >
    <div class="flex items-center justify-between gap-1.5">
      <span class="text-[10.5px] sm:text-[11px] lg:text-[11.5px] font-medium text-[#5F7089] dark:text-slate-400 truncate">{{
        title
      }}</span>
      <div
        class="flex h-5.5 w-5.5 sm:h-6 sm:w-6 lg:h-6.5 lg:w-6.5 shrink-0 items-center justify-center rounded-lg"
        :class="{
          'bg-[#EFF6FF] text-[#0A51B0] dark:bg-blue-950/60 dark:text-blue-400': color === 'primary' || color === 'cyan' || color === 'info',
          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300': color === 'neutral' || color === 'purple',
          'bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/60 dark:text-emerald-400': color === 'success',
          'bg-[#FFFBEB] text-[#B45309] dark:bg-amber-950/60 dark:text-amber-400': color === 'warning',
          'bg-[#FEF2F2] text-[#DC2626] dark:bg-rose-950/60 dark:text-rose-400': color === 'danger',
        }"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[14px] sm:text-[15px] lg:text-[16px]">{{ icon }}</span>
      </div>
    </div>

    <div class="mt-1">
      <span
        class="font-num block text-[17px] sm:text-[20px] lg:text-[22px] font-bold leading-none tracking-tight text-[#333333] dark:text-white tabular-nums"
        >{{ value }}</span
      >
      <span v-if="subtitle" class="mt-1 block truncate text-[10px] sm:text-[10.5px] lg:text-[11px] font-normal text-[#64748B] dark:text-slate-400">{{
        subtitle
      }}</span>
    </div>
  </div>
</template>

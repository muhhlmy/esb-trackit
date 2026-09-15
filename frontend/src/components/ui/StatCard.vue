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
    class="bg-white border border-[#E2E8F0] rounded-xl p-3.5 sm:p-4 shadow-2xs hover:border-[#CBD5E1] transition-all flex flex-col justify-between"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="text-[11px] font-semibold text-[#5F7089] uppercase tracking-wider truncate">{{
        title
      }}</span>
      <div
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        :class="{
          'bg-[#EFF6FF] text-[#333333]': color === 'primary',
          'bg-[#ECFDF5] text-[#059669]': color === 'success',
          'bg-[#FFFBEB] text-[#D97706]': color === 'warning',
          'bg-[#FEF2F2] text-[#DC2626]': color === 'danger',
          'bg-[#F0F9FF] text-[#0284C7]': color === 'cyan',
          'bg-[#F8FAFC] text-[#475569]': color === 'purple',
        }"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[17px]">{{ icon }}</span>
      </div>
    </div>

    <div class="mt-2.5">
      <span
        class="font-num block text-[24px] sm:text-[26px] font-bold leading-none tracking-tight text-[#333333]"
        >{{ value }}</span
      >
      <span v-if="subtitle" class="mt-1 block truncate text-[10px] font-medium text-[#687281]">{{
        subtitle
      }}</span>
    </div>
  </div>
</template>

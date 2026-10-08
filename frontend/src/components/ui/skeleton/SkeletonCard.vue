<script setup>
import BaseSkeleton from './BaseSkeleton.vue'
import SkeletonAvatar from './SkeletonAvatar.vue'

defineProps({
  variant: {
    type: String,
    default: 'stat',
    validator: (v) => ['stat', 'simple', 'summary'].includes(v),
  },
})
</script>

<template>
  <!-- Stat Card Variant (Matches StatCard.vue layout) -->
  <div
    v-if="variant === 'stat'"
    class="flex flex-col justify-between min-h-[76px] sm:min-h-[84px] lg:min-h-[92px] rounded-[6px] border border-[#E5EAEF] dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3 lg:p-3 shadow-2xs"
  >
    <div class="flex items-center justify-between gap-1.5">
      <BaseSkeleton width="50%" height="11px" radius="sm" />
      <SkeletonAvatar size="22px" shape="rounded" />
    </div>
    <div class="mt-1 space-y-1">
      <BaseSkeleton width="40%" height="18px" radius="md" />
      <BaseSkeleton width="60%" height="10px" radius="sm" />
    </div>
  </div>

  <!-- Summary Card Variant (Matches Dashboard / Filter top cards) -->
  <div
    v-else-if="variant === 'summary'"
    class="flex flex-col justify-between rounded-[6px] border border-[#E5EAEF] dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3 lg:p-3 shadow-2xs min-h-[76px] sm:min-h-[84px] lg:min-h-[92px]"
  >
    <div class="flex items-center justify-between gap-1.5">
      <BaseSkeleton width="45%" height="11px" radius="sm" />
      <SkeletonAvatar size="22px" shape="rounded" />
    </div>
    <div class="mt-1 space-y-1">
      <BaseSkeleton width="35%" height="18px" radius="md" />
      <div class="flex items-center gap-1.5 pt-0.5">
        <BaseSkeleton width="100%" height="3px" radius="full" />
        <BaseSkeleton width="22px" height="9px" radius="sm" />
      </div>
    </div>
  </div>

  <!-- Simple Card Variant -->
  <div v-else class="rounded-[6px] border border-[#E5EAEF] bg-white p-4 shadow-card space-y-3">
    <div class="flex items-center justify-between">
      <BaseSkeleton width="40%" height="14px" radius="md" />
      <BaseSkeleton width="20%" height="12px" radius="sm" />
    </div>
    <BaseSkeleton width="100%" height="40px" radius="md" />
    <div class="flex justify-end">
      <BaseSkeleton width="25%" height="12px" radius="sm" />
    </div>
  </div>
</template>

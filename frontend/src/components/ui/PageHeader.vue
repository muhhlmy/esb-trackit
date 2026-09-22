<script setup>
/**
 * PageHeader.vue — Single source of truth for page-level headings.
 *
 * Props:
 *   title      – Page title text (required)
 *   subtitle   – Optional description below the title
 *   icon       – Material Symbols Outlined icon name (optional)
 *   iconBg     – Background color class for the icon container (default: bg-[#EDF5FF])
 *   iconColor  – Text color class for the icon (default: text-[#0A51B0])
 */
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
  iconBg: { type: String, default: 'bg-[#EDF5FF]' },
  iconColor: { type: String, default: 'text-[#0A51B0]' },
})
</script>

<template>
  <div class="page-header flex items-center justify-between gap-3">
    <div class="flex items-center gap-3 min-w-0">
      <div
        v-if="icon"
        class="page-header-icon flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border border-[#B8D4F5]/40"
        :class="[iconBg, iconColor]"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[22px] sm:text-[24px]">{{
          icon
        }}</span>
      </div>
      <div class="min-w-0">
        <h1
          class="page-header-title text-lg sm:text-xl font-bold text-[#333333] tracking-tight truncate"
        >
          {{ title }}
        </h1>
        <p
          v-if="subtitle"
          class="page-header-subtitle text-xs font-normal text-[#5F7089] mt-0.5 truncate"
        >
          {{ subtitle }}
        </p>
      </div>
    </div>
    <div class="page-header-actions shrink-0 flex items-center gap-2">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.page-header {
  padding: 16px 20px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: var(--ui-radius-card, 0.875rem);
  box-shadow: var(--ui-shadow-card, 0 2px 8px rgba(15, 23, 42, 0.04));
}

.page-header-icon {
  background: #edf5ff;
}
</style>

<script setup>
/**
 * PageHeader.vue - Single source of truth for page-level headings.
 *
 * Props:
 *   title      – Page title text (required)
 *   subtitle   – Optional description below the title
 *   icon       – Material Symbols Outlined icon name (optional)
 *   iconBg     – Background color class for the icon container (default: bg-[#EDF5FF])
 *   iconColor  – Text color class for the icon (default: text-[#0A51B0])
 *
 * Slots:
 *   default      – Page-level actions, right-aligned (buttons, action groups)
 *   eyebrow       – Optional breadcrumb / section label above the title
 *   title-suffix  – Optional inline badge rendered beside the title
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
  <div class="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
    <div class="flex items-center gap-2 min-w-0 w-full sm:w-auto">
      <div
        v-if="icon"
        class="page-header-icon flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-[5px] border border-[#B8D4F5]/40"
        :class="[iconBg, iconColor]"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[13px] sm:text-[15px]">{{
          icon
        }}</span>
      </div>
      <div class="min-w-0 flex-1">
        <div
          v-if="$slots.eyebrow"
          class="page-header-eyebrow flex items-center gap-1.5 text-[9px] sm:text-[9.5px] font-medium text-[#5F7089] dark:text-slate-400 mb-0.5"
        >
          <slot name="eyebrow" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <h1
            class="page-header-title text-[13px] sm:text-[14.5px] font-semibold text-[#333333] dark:text-slate-100 tracking-tight truncate"
          >
            {{ title }}
          </h1>
          <span v-if="$slots['title-suffix']" class="page-header-title-suffix shrink-0">
            <slot name="title-suffix" />
          </span>
        </div>
        <p
          v-if="subtitle"
          class="page-header-subtitle text-[9px] sm:text-[10px] font-normal text-[#5F7089] dark:text-slate-400 mt-0.5 line-clamp-2 sm:line-clamp-1"
        >
          {{ subtitle }}
        </p>
      </div>
    </div>
    <div
      v-if="$slots.default"
      class="page-header-actions shrink-0 flex flex-wrap sm:flex-nowrap items-center gap-1.5 w-full sm:w-auto justify-start sm:justify-end"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.page-header {
  padding: 6px 8px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: var(--ui-radius-card, 6px);
  box-shadow: var(--ui-shadow-card, 0 1.5px 6px rgba(15, 23, 42, 0.03));
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

:global(.dark) .page-header {
  background: #0f172a;
  border-color: #1e293b;
  box-shadow: 0 1.5px 6px rgba(0, 0, 0, 0.2);
}

@media (min-width: 640px) {
  .page-header {
    padding: 8px 10px;
  }
}

.page-header-icon {
  background: #edf5ff;
}

:global(.dark) .page-header-icon {
  background: #1e293b;
  border-color: #334155;
}
</style>

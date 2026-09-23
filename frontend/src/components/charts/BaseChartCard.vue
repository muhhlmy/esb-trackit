<script setup>
import SkeletonChart from '../ui/skeleton/SkeletonChart.vue'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  empty: { type: Boolean, default: false },
  error: { type: String, default: '' },
  // Tinggi canvas chart dalam pixel. WAJIB nilai tetap — Chart.js dengan
  // `maintainAspectRatio: false` membutuhkan parent berukuran pasti,
  // kalau tidak ResizeObserver-nya loop dan canvas terus membesar.
  height: { type: Number, default: 260 },
  // Ketika true: tanpa chrome kartu (border/shadow/padding) & heading sendiri,
  // dipakai saat kartu induk (mis. dashboard panel) sudah menyediakan judul.
  embedded: { type: Boolean, default: false },
})
</script>

<template>
  <div
    class="chart-card flex flex-col transition-all"
    :class="embedded ? 'w-full' : 'shadow-card rounded-xl border border-[#E2E8F0] bg-white p-4'"
  >
    <!-- Header kartu (hanya mode standalone) -->
    <div
      v-if="!embedded"
      class="mb-3.5 flex items-center justify-between border-b border-[#F1F5F9] pb-3"
    >
      <div class="min-w-0">
        <h3 class="text-sm font-bold text-[#1E293B] leading-tight">{{ title }}</h3>
        <p v-if="subtitle" class="mt-0.5 text-[11px] font-medium text-[#5B6B84]">{{ subtitle }}</p>
      </div>
      <slot name="header-action" />
    </div>

    <!-- Tinggi wrapper = tinggi chart. Slot chart mengisi penuh di dalamnya. -->
    <div class="relative flex items-center justify-center" :style="{ height: height + 'px' }">
      <!-- Loading Skeleton -->
      <div v-if="loading" class="h-full w-full" aria-busy="true">
        <SkeletonChart type="bar" :height="height + 'px'" />
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="flex flex-col items-center gap-2 p-4 text-center text-[#DC2626]"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[32px]">error</span>
        <p class="text-[12px] font-semibold">{{ error }}</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="empty"
        class="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-[#5B6B84]"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[36px]">bar_chart_off</span>
        <p class="text-[12px] font-semibold">Belum ada data untuk ditampilkan.</p>
      </div>

      <!-- Chart Canvas Slot -->
      <div v-else class="h-full w-full min-w-0">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-card {
  min-width: 0;
}
.chart-card > div:first-child:has(h3) {
  margin-bottom: 24px;
  padding-bottom: 18px;
  gap: 16px;
}
.chart-card h3 {
  font-size: 16px;
  font-weight: 650;
  line-height: 1.5;
  letter-spacing: -0.02em;
}
.chart-card h3 + p {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
}
</style>

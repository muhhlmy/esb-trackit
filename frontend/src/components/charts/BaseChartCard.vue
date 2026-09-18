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
    class="flex flex-col transition-all"
    :class="embedded ? 'w-full' : 'shadow-card rounded-2xl border border-[#E5EAEF] bg-white p-5'"
  >
    <!-- Header kartu (hanya mode standalone) -->
    <div
      v-if="!embedded"
      class="flex items-center justify-between pb-3 border-b border-[#F1F5F9] mb-4"
    >
      <div>
        <h3 class="text-[15px] font-extrabold text-[#2A3547] leading-tight">{{ title }}</h3>
        <p v-if="subtitle" class="text-[11px] font-medium text-[#66728d] mt-0.5">{{ subtitle }}</p>
      </div>
      <slot name="header-action" />
    </div>

    <!-- Tinggi wrapper = tinggi chart. Slot chart mengisi penuh di dalamnya. -->
    <div class="relative flex items-center justify-center" :style="{ height: height + 'px' }">
      <!-- Loading Skeleton -->
      <div v-if="loading" class="w-full h-full" aria-busy="true">
        <SkeletonChart type="bar" :height="height + 'px'" />
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="flex flex-col items-center gap-2 text-[#FA896B] p-4 text-center"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[32px]">error</span>
        <p class="text-[12px] font-semibold">{{ error }}</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="empty"
        class="flex flex-col items-center justify-center h-full w-full gap-2 text-[#687281] p-4 text-center"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[36px]">bar_chart_off</span>
        <p class="text-[12px] font-semibold">Belum ada data visualisasi.</p>
      </div>

      <!-- Chart Canvas Slot -->
      <div v-else class="h-full w-full min-w-0">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * FluidOrb.vue — adaptasi lokal "Fluid Orb" (Rare UI) untuk Vue.
 *
 * Alasan adaptasi: komponen asli rare-ui/fluid-orb ditulis untuk React
 * (JSX + framer-motion). Mengadaptasi polanya sebagai CSS murni menghindari
 * dependensi React/framer-motion di aplikasi Vue, tanpa biaya JS runtime.
 *
 * Penggunaan: login page & auth context SAJA — bukan halaman operasional
 * (tables/dashboard) sesuai kebijakan motion (tidak ada motion kontinu
 * di area kerja padat). Hormati prefers-reduced-motion: global rule di
 * main.css mematikan animasi; gradient statis tetap tampil.
 *
 * Props:
 *   size   – diameter px (default 420)
 */
defineProps({
  size: { type: Number, default: 420 },
})
</script>

<template>
  <div
    aria-hidden="true"
    class="fluid-orb pointer-events-none absolute select-none"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <div class="orb orb-a" />
    <div class="orb orb-b" />
    <div class="orb orb-c" />
  </div>
</template>

<style scoped>
.fluid-orb {
  filter: blur(2px);
  opacity: 0.55;
  will-change: transform;
}

.orb {
  position: absolute;
  border-radius: 9999px;
  mix-blend-mode: normal;
}

.orb-a {
  inset: 0;
  background: radial-gradient(circle at 30% 30%, #edf5ff 0%, #dbeafe 45%, transparent 70%);
  animation: orb-drift-a 18s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
}

.orb-b {
  inset: 12%;
  background: radial-gradient(circle at 60% 40%, #fff2e7 0%, #fed7aa 50%, transparent 75%);
  animation: orb-drift-b 14s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
}

.orb-c {
  inset: 28%;
  background: radial-gradient(circle at 50% 50%, #e0f2fe 0%, #bae6fd 55%, transparent 80%);
  animation: orb-drift-a 22s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate-reverse;
}

@keyframes orb-drift-a {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(6%, -8%, 0) scale(1.08);
  }
  100% {
    transform: translate3d(-5%, 6%, 0) scale(0.95);
  }
}

@keyframes orb-drift-b {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(-7%, 7%, 0) scale(1.05);
  }
  100% {
    transform: translate3d(5%, -5%, 0) scale(0.94);
  }
}
</style>

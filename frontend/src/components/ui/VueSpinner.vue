<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'pulse', // 'pulse' | 'clip' | 'beat' | 'sync' | 'ring' | 'scale'
  },
  loading: {
    type: Boolean,
    default: true,
  },
  color: {
    type: String,
    default: '#0A51B0',
  },
  size: {
    type: [String, Number],
    default: '12px',
  },
  margin: {
    type: String,
    default: '3px',
  },
})

const sizeStr = computed(() => {
  return typeof props.size === 'number' ? `${props.size}px` : props.size
})

const spinnerStyle = computed(() => ({
  '--v-spinner-color': props.color,
  '--v-spinner-size': sizeStr.value,
  '--v-spinner-margin': props.margin,
}))
</script>

<template>
  <div
    v-if="loading"
    class="v-spinner-container"
    :style="spinnerStyle"
    role="status"
    aria-live="polite"
    aria-label="Memuat data..."
  >
    <!-- 1. PulseLoader: 3 pulsing dots -->
    <div v-if="type === 'pulse'" class="v-pulse-loader">
      <div class="v-pulse-dot" />
      <div class="v-pulse-dot" />
      <div class="v-pulse-dot" />
    </div>

    <!-- 2. ClipLoader: Smooth spinning ring -->
    <div v-else-if="type === 'clip'" class="v-clip-loader" />

    <!-- 3. BeatLoader: Bouncing dots -->
    <div v-else-if="type === 'beat'" class="v-beat-loader">
      <div class="v-beat-dot" />
      <div class="v-beat-dot" />
      <div class="v-beat-dot" />
    </div>

    <!-- 4. SyncLoader: Synchronized wave dots -->
    <div v-else-if="type === 'sync'" class="v-sync-loader">
      <div class="v-sync-dot" />
      <div class="v-sync-dot" />
      <div class="v-sync-dot" />
    </div>

    <!-- 5. RingLoader: Concentric spinning rings -->
    <div v-else-if="type === 'ring'" class="v-ring-loader">
      <div class="v-ring-inner v-ring-1" />
      <div class="v-ring-inner v-ring-2" />
    </div>

    <!-- 6. ScaleLoader: Vertical equalizer bars -->
    <div v-else-if="type === 'scale'" class="v-scale-loader">
      <div class="v-scale-bar" />
      <div class="v-scale-bar" />
      <div class="v-scale-bar" />
      <div class="v-scale-bar" />
      <div class="v-scale-bar" />
    </div>
  </div>
</template>

<style scoped>
.v-spinner-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
}

/* ==========================================================
   1. PulseLoader (vue-spinner / greyby/vue-spinner)
   ========================================================== */
.v-pulse-loader {
  display: inline-flex;
  align-items: center;
}

.v-pulse-dot {
  width: var(--v-spinner-size, 12px);
  height: var(--v-spinner-size, 12px);
  margin: var(--v-spinner-margin, 3px);
  background-color: var(--v-spinner-color, #0A51B0);
  border-radius: 100%;
  display: inline-block;
  animation: v-pulseStretch 0.75s infinite cubic-bezier(0.2, 0.68, 0.18, 1.08);
  animation-fill-mode: both;
}

.v-pulse-dot:nth-child(1) {
  animation-delay: -0.36s;
}

.v-pulse-dot:nth-child(2) {
  animation-delay: -0.24s;
}

.v-pulse-dot:nth-child(3) {
  animation-delay: -0.12s;
}

@keyframes v-pulseStretch {
  0%, 80% {
    transform: scale(1);
    opacity: 1;
  }
  45% {
    transform: scale(0.25);
    opacity: 0.5;
  }
}

/* ==========================================================
   2. ClipLoader (vue-spinner)
   ========================================================== */
.v-clip-loader {
  width: var(--v-spinner-size, 24px);
  height: var(--v-spinner-size, 24px);
  border-radius: 100%;
  border: 2.5px solid var(--v-spinner-color, #0A51B0);
  border-bottom-color: transparent;
  display: inline-block;
  animation: v-clipRotate 0.75s 0s infinite linear;
  animation-fill-mode: both;
}

@keyframes v-clipRotate {
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(180deg) scale(0.85);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
}

/* ==========================================================
   3. BeatLoader (vue-spinner)
   ========================================================== */
.v-beat-loader {
  display: inline-flex;
  align-items: center;
}

.v-beat-dot {
  width: var(--v-spinner-size, 10px);
  height: var(--v-spinner-size, 10px);
  margin: var(--v-spinner-margin, 3px);
  background-color: var(--v-spinner-color, #0A51B0);
  border-radius: 100%;
  display: inline-block;
  animation: v-beatDelay 0.7s infinite linear;
  animation-fill-mode: both;
}

.v-beat-dot:nth-child(1) {
  animation-delay: -0.35s;
}

.v-beat-dot:nth-child(2) {
  animation-delay: 0s;
}

.v-beat-dot:nth-child(3) {
  animation-delay: 0.35s;
}

@keyframes v-beatDelay {
  50% {
    transform: scale(0.75);
    opacity: 0.25;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* ==========================================================
   4. SyncLoader (vue-spinner)
   ========================================================== */
.v-sync-loader {
  display: inline-flex;
  align-items: center;
}

.v-sync-dot {
  width: var(--v-spinner-size, 10px);
  height: var(--v-spinner-size, 10px);
  margin: var(--v-spinner-margin, 3px);
  background-color: var(--v-spinner-color, #0A51B0);
  border-radius: 100%;
  display: inline-block;
  animation: v-syncBounce 0.6s infinite ease-in-out;
  animation-fill-mode: both;
}

.v-sync-dot:nth-child(1) {
  animation-delay: -0.21s;
}

.v-sync-dot:nth-child(2) {
  animation-delay: -0.14s;
}

.v-sync-dot:nth-child(3) {
  animation-delay: -0.07s;
}

@keyframes v-syncBounce {
  33% {
    transform: translateY(6px);
  }
  66% {
    transform: translateY(-6px);
  }
  100% {
    transform: translateY(0);
  }
}

/* ==========================================================
   5. RingLoader (vue-spinner)
   ========================================================== */
.v-ring-loader {
  position: relative;
  width: var(--v-spinner-size, 32px);
  height: var(--v-spinner-size, 32px);
}

.v-ring-inner {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 3px solid var(--v-spinner-color, #0A51B0);
  border-radius: 100%;
  opacity: 0.8;
}

.v-ring-1 {
  animation: v-ringRightRotate 2s 0s infinite linear;
}

.v-ring-2 {
  animation: v-ringLeftRotate 2s 0s infinite linear;
}

@keyframes v-ringRightRotate {
  0% {
    transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
  }
  100% {
    transform: rotateX(180deg) rotateY(360deg) rotateZ(360deg);
  }
}

@keyframes v-ringLeftRotate {
  0% {
    transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
  }
  100% {
    transform: rotateX(360deg) rotateY(180deg) rotateZ(360deg);
  }
}

/* ==========================================================
   6. ScaleLoader (vue-spinner)
   ========================================================== */
.v-scale-loader {
  display: inline-flex;
  align-items: center;
  height: var(--v-spinner-size, 24px);
}

.v-scale-bar {
  background-color: var(--v-spinner-color, #0A51B0);
  width: 3px;
  height: 100%;
  margin: var(--v-spinner-margin, 2px);
  border-radius: 2px;
  display: inline-block;
  animation: v-scaleStretch 1s infinite ease-in-out;
  animation-fill-mode: both;
}

.v-scale-bar:nth-child(1) { animation-delay: -0.4s; }
.v-scale-bar:nth-child(2) { animation-delay: -0.3s; }
.v-scale-bar:nth-child(3) { animation-delay: -0.2s; }
.v-scale-bar:nth-child(4) { animation-delay: -0.1s; }
.v-scale-bar:nth-child(5) { animation-delay: 0s; }

@keyframes v-scaleStretch {
  0%, 40%, 100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
  }
}

/* Accessibility: Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .v-pulse-dot,
  .v-clip-loader,
  .v-beat-dot,
  .v-sync-dot,
  .v-ring-inner,
  .v-scale-bar {
    animation: none !important;
    opacity: 0.9 !important;
  }
}
</style>

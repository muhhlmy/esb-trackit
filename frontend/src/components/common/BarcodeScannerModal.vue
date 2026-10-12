<script setup>
import { ref, watch, onUnmounted } from 'vue'
import AppModal from '../ui/AppModal.vue'
import { useLanguage } from '../../composables/useLanguage.js'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'scan'])

const { t } = useLanguage()

const videoRef = ref(null)
const manualInput = ref('')
const isCameraActive = ref(false)
const cameraError = ref(null)
const isDetecting = ref(false)
let mediaStream = null
let animationFrameId = null
let barcodeDetector = null

function stopCamera() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop())
    mediaStream = null
  }
  isCameraActive.value = false
}

async function startCamera() {
  cameraError.value = null
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = t('scanner_camera_not_supported', 'Perangkat atau browser tidak mendukung akses kamera.')
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    })
    mediaStream = stream
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      await videoRef.value.play().catch(() => {})
      isCameraActive.value = true
      startDetectionLoop()
    }
  } catch (err) {
    console.warn('[BarcodeScannerModal] Camera access error:', err)
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      cameraError.value = t('scanner_permission_denied', 'Izin kamera ditolak. Berikan izin di browser untuk memindai barcode.')
    } else {
      cameraError.value = t('scanner_camera_unavailable', 'Kamera tidak dapat diakses atau sedang digunakan oleh aplikasi lain.')
    }
    isCameraActive.value = false
  }
}

async function startDetectionLoop() {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      barcodeDetector = new window.BarcodeDetector({
        formats: ['code_128', 'qr_code', 'ean_13', 'code_39', 'data_matrix'],
      })
    } catch {
      barcodeDetector = null
    }
  }

  async function checkFrame() {
    if (!props.isOpen || !isCameraActive.value || !videoRef.value) return

    if (barcodeDetector && videoRef.value.readyState >= 2 && !isDetecting.value) {
      isDetecting.value = true
      try {
        const barcodes = await barcodeDetector.detect(videoRef.value)
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          const raw = barcodes[0].rawValue.trim()
          if (raw) {
            handleScanSuccess(raw)
            return
          }
        }
      } catch {
        // Frame decoding skipped
      } finally {
        isDetecting.value = false
      }
    }

    animationFrameId = requestAnimationFrame(checkFrame)
  }

  animationFrameId = requestAnimationFrame(checkFrame)
}

function handleScanSuccess(val) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate([40, 30, 80])
    } catch {}
  }
  emit('scan', val)
  handleClose()
}

function handleManualSubmit() {
  const val = manualInput.value.trim()
  if (val) {
    handleScanSuccess(val)
  }
}

function handleClose() {
  stopCamera()
  manualInput.value = ''
  cameraError.value = null
  emit('close')
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      setTimeout(() => {
        startCamera()
      }, 150)
    } else {
      stopCamera()
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  stopCamera()
})
</script>

<template>
  <AppModal
    :is-open="isOpen"
    :title="t('scanner_modal_title', 'Pindai Barcode / QR Code Aset')"
    max-width="max-w-md"
    @close="handleClose"
  >
    <div class="space-y-4">
      <!-- Camera Viewport / Fallback -->
      <div
        class="relative w-full aspect-4/3 bg-slate-950 rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center"
      >
        <video
          ref="videoRef"
          playsinline
          muted
          class="w-full h-full object-cover"
          :class="{ hidden: !isCameraActive }"
        ></video>

        <!-- Viewfinder Overlay (When Camera Active) -->
        <div
          v-if="isCameraActive"
          class="absolute inset-0 pointer-events-none flex items-center justify-center"
        >
          <div class="relative w-3/4 h-3/4 border-2 border-white/60 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
            <!-- Corner Brackets -->
            <div class="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-[#0A51B0]"></div>
            <div class="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-[#0A51B0]"></div>
            <div class="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-[#0A51B0]"></div>
            <div class="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-[#0A51B0]"></div>

            <!-- Laser Scan Line Animation -->
            <div class="absolute inset-x-2 top-0 h-0.5 bg-red-500/80 shadow-[0_0_8px_red] animate-pulse"></div>
          </div>
        </div>

        <!-- Camera Error / Permission Notice -->
        <div
          v-if="cameraError"
          class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white space-y-3"
        >
          <span class="material-symbols-outlined text-4xl text-amber-400">videocam_off</span>
          <p class="text-xs text-slate-300 leading-relaxed">{{ cameraError }}</p>
          <button
            type="button"
            @click="startCamera"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          >
            {{ t('scanner_try_again', 'Coba Lagi') }}
          </button>
        </div>

        <!-- Camera Initializing -->
        <div
          v-else-if="!isCameraActive"
          class="flex flex-col items-center justify-center text-slate-400 space-y-2"
        >
          <span class="inline-block w-6 h-6 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span>
          <span class="text-xs">{{ t('scanner_starting_camera', 'Menghubungkan kamera...') }}</span>
        </div>
      </div>

      <!-- Quick Guidance -->
      <p class="text-[11px] text-center text-slate-500 dark:text-slate-400">
        {{ t('scanner_guidance', 'Arahkan kamera ke stiker barcode Code 128 atau QR code pada perangkat.') }}
      </p>

      <!-- Manual Input Fallback -->
      <div class="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <label for="manual-barcode-input" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
          {{ t('scanner_manual_label', 'Atau Masukkan Hostname / S/N Manual') }}
        </label>
        <div class="flex gap-2">
          <input
            id="manual-barcode-input"
            v-model="manualInput"
            type="text"
            :placeholder="t('scanner_manual_placeholder', 'Contoh: LAP-JKT-0042')"
            @keydown.enter.prevent="handleManualSubmit"
            class="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#0A51B0]"
          />
          <button
            type="button"
            @click="handleManualSubmit"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0A51B0] hover:bg-[#0A4391] text-white transition shrink-0"
          >
            {{ t('scanner_apply_button', 'Terapkan') }}
          </button>
        </div>
      </div>
    </div>
  </AppModal>
</template>

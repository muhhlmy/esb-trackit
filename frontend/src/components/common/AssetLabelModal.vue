<script setup>
import { computed, ref, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import {
  LOGO_MONO_SVG,
  generateBarcodeSvg,
  printAssetLabel,
} from '../../utils/assetLabelPrinter.js'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  asset: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])

const customHostname = ref('')
const isPrinting = ref(false)

function extractHostname(a) {
  if (!a) return ''
  return a.hostname || a.label_aset || a.kode_aset || ''
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      customHostname.value = extractHostname(props.asset)
    }
  },
  { immediate: true },
)

watch(
  () => props.asset,
  (newAsset) => {
    if (props.isOpen) {
      customHostname.value = extractHostname(newAsset)
    }
  },
)

const activeHostname = computed(() => {
  return String(customHostname.value || '').trim()
})

const barcodeSvg = computed(() => {
  if (!activeHostname.value) return ''
  return generateBarcodeSvg(activeHostname.value)
})

const assetDisplayName = computed(() => {
  if (!props.asset) return '-'
  return (
    props.asset.nama_asset ||
    props.asset.nama_barang ||
    props.asset.nama_aset ||
    props.asset.model ||
    props.asset.serial_number ||
    '-'
  )
})

const assetSubInfo = computed(() => {
  if (!props.asset) return ''
  const parts = []
  const cat = props.asset.kategori || props.asset.tipe_barang || props.asset.jenis
  const loc = props.asset.lokasi || props.asset.store_name || props.asset.cabang
  if (cat) parts.push(cat)
  if (loc) parts.push(loc)
  return parts.join(' • ')
})

function handlePrint() {
  if (!activeHostname.value) {
    return
  }
  isPrinting.value = true
  try {
    const res = printAssetLabel(activeHostname.value)
    if (res && res.success) {
      emit('close')
    }
  } finally {
    isPrinting.value = false
  }
}
</script>

<template>
  <AppModal
    panel-class="inventory-dialog"
    :is-open="isOpen"
    title="Cetak Label Aset"
    subtitle="Cetak stiker barcode aset (2.17 x 0.98 inch / 55 x 25 mm - Rectangle)"
    icon="print"
    size="md"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <!-- Asset Summary Info -->
      <div class="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 flex items-start gap-3">
        <div
          class="h-9 w-9 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-lg">qr_code_2</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-xs font-semibold text-slate-900 truncate">
            {{ assetDisplayName }}
          </div>
          <div v-if="assetSubInfo" class="text-[11px] text-slate-500 truncate mt-0.5">
            {{ assetSubInfo }}
          </div>
        </div>
      </div>

      <!-- Hostname Input & Note -->
      <div>
        <label
          for="asset-label-hostname-input"
          class="block text-xs font-medium text-slate-700 mb-1"
        >
          Hostname / Nilai Barcode Label
        </label>
        <div class="relative">
          <input
            id="asset-label-hostname-input"
            v-model="customHostname"
            type="text"
            placeholder="Masukkan hostname aset (cth: IT-UPS-052026-01)"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
          />
        </div>
        <p class="mt-1 text-[11px] text-slate-500">
          Nilai ini yang di-encode ke barcode Code 128 dan dicetak di badan label.
        </p>
      </div>

      <!-- Sticker Preview Box -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs font-medium text-slate-700"
            >Preview Label Stiker (2.17" × 0.98" Rectangle)</span
          >
          <span
            class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60"
          >
            2.17" × 0.98" Rectangle
          </span>
        </div>

        <!-- Physical Label Canvas Preview -->
        <div
          class="w-full rounded-xl border border-slate-300 bg-slate-100/90 p-3 sm:p-4 flex items-center justify-center shadow-inner"
        >
          <div
            class="relative w-full max-w-[360px] aspect-[217/98] rounded-xl bg-white border border-slate-400 p-2 sm:p-2.5 flex flex-col justify-between shadow-md select-none overflow-hidden text-black font-sans"
          >
            <!-- Header -->
            <div
              class="text-center font-extrabold text-[10px] sm:text-[9.5px] leading-tight tracking-[0.1px] text-black"
            >
              <div>ASET INI MERUPAKAN PROPERTI MILIK</div>
              <div>PT ESENSI SOLUSI BUANA.</div>
            </div>

            <!-- Middle: Logo + Barcode -->
            <div class="flex items-center justify-between gap-2.5 my-0.5 px-0.5">
              <!-- Left: Logo & Tagline -->
              <div class="w-[30%] shrink-0 flex flex-col items-center justify-center text-center">
                <div
                  class="w-full max-w-[80px] flex items-center justify-center"
                  v-html="LOGO_MONO_SVG"
                ></div>
                <div
                  class="text-[5.5px] sm:text-[6.5px] font-bold text-black tracking-tight mt-0.5 whitespace-nowrap"
                >
                  Ahlinya Bisnis Kuliner
                </div>
              </div>

              <!-- Right: Barcode SVG + Hostname -->
              <div class="flex-1 min-w-0 flex flex-col items-center justify-center">
                <div
                  v-if="barcodeSvg"
                  class="w-full flex items-center justify-center h-[34px] sm:h-[40px] overflow-hidden"
                  v-html="barcodeSvg"
                ></div>
                <div
                  v-else
                  class="h-9 w-full flex items-center justify-center text-[10px] text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded"
                >
                  (Barcode Kosong)
                </div>
                <div
                  class="mt-0.5 text-[10px] sm:text-[12px] font-extrabold tracking-wide text-black text-center truncate max-w-full"
                >
                  {{ activeHostname || 'KODE-LABEL-0' }}
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div
              class="text-center text-[6px] sm:text-[7px] font-extrabold tracking-wider text-black uppercase"
            >
              WARRANTY INVALID IF SEALIS TAMPERED
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
        <button
          type="button"
          @click="emit('close')"
          class="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none transition-colors cursor-pointer"
        >
          Batal
        </button>
        <button
          type="button"
          :disabled="!activeHostname || isPrinting"
          @click="handlePrint"
          class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[16px]">print</span>
          <span>{{ isPrinting ? 'Membuka Cetak...' : 'Cetak Label' }}</span>
        </button>
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
:deep(.logo-svg) {
  width: 100%;
  height: auto;
  max-height: 24px;
  display: block;
}
:deep(svg) {
  max-width: 100%;
}
</style>

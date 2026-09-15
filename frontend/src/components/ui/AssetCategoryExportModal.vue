<script setup>
import { computed } from 'vue'
import AppModal from './AppModal.vue'
import { exportToExcel } from '../../utils/exportEngine.js'

const props = defineProps({
  isOpen: Boolean,
  assetType: { type: String, required: true },
  assets: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'exported'])
const label = computed(() => props.assetType.toUpperCase())
const exportColumns = computed(() =>
  props.assetType === 'ga'
    ? [
        { name: 'hostname', label: 'Hostname' },
        { name: 'quantity', label: 'Quantity' },
        { name: 'tipe_fasilitas', label: 'Tipe Fasilitas' },
        { name: 'nama_asset', label: 'Nama Asset' },
        { name: 'ukuran', label: 'Ukuran' },
        { name: 'detail', label: 'Detail' },
        { name: 'lokasi', label: 'Lokasi' },
        { name: 'lokasi_detail', label: 'Lokasi Detail' },
        { name: 'kondisi', label: 'Kondisi' },
      ]
    : [
        { name: 'hostname', label: 'Hostname' },
        { name: 'nama_asset', label: 'Nama Asset' },
        { name: 'kategori', label: 'Kategori' },
        { name: 'lokasi', label: 'Lokasi' },
        { name: 'pic', label: 'PIC' },
        { name: 'tanggal_beli', label: 'Tanggal Beli' },
        { name: 'total_asset_amount', label: 'Total Asset Amount' },
        { name: 'kondisi', label: 'Kondisi' },
        { name: 'status', label: 'Status' },
      ],
)

function exportData() {
  if (!props.assets.length) return
  exportToExcel(
    props.assets,
    exportColumns.value,
    `Data Aset ${label.value}`,
    `Aset_${props.assetType.toUpperCase()}`,
  )
  emit('exported')
}
</script>

<template>
  <AppModal
    :is-open="isOpen"
    :title="`Export Aset ${label}`"
    :subtitle="`Unduh ${assets.length} data yang sedang tampil`"
    icon="download"
    size="sm"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <div class="flex items-start gap-3 rounded-2xl border border-[#CFE0F8] bg-[#F4F8FF] p-4">
        <span aria-hidden="true" class="material-symbols-outlined text-[24px] text-[#0A51B0]">table_view</span>
        <div>
          <p class="text-sm font-bold text-slate-800">Data siap diunduh</p>
          <p class="mt-1 text-xs leading-relaxed text-slate-500">Export berisi data Aset {{ label }} yang sedang tampil setelah filter diterapkan.</p>
        </div>
      </div>
      <div class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
        <span class="text-xs font-semibold text-slate-500">Jumlah data</span>
        <span class="text-sm font-bold text-[#0A51B0]">{{ assets.length }} aset</span>
      </div>
      <p v-if="!assets.length" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-700">Tidak ada data untuk diexport.</p>
      <div class="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <button type="button" @click="emit('close')" class="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button>
        <button type="button" :disabled="!assets.length" @click="exportData" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0A51B0] px-5 text-xs font-bold text-white hover:bg-[#08458f] disabled:cursor-not-allowed disabled:opacity-50">
          <span aria-hidden="true" class="material-symbols-outlined text-[17px]">download</span>Unduh XLSX
        </button>
      </div>
    </div>
  </AppModal>
</template>

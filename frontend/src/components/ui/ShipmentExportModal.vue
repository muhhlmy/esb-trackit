<script setup>
import AppModal from './AppModal.vue'

const props = defineProps({ isOpen: Boolean, shipments: { type: Array, default: () => [] } })
const emit = defineEmits(['close', 'exported'])
const headers = ['Tanggal Request', 'Nama Penerima', 'Deskripsi Barang', 'Tujuan', 'Nomor Resi', 'Status', 'Link Bukti Pengiriman']

function cell(value) {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function exportData() {
  if (!props.shipments.length) return
  const rows = props.shipments.map((item) => [item.request_date, item.recipient_name, item.item_description, item.destination, item.tracking_number, item.status, item.delivery_proof_url])
  const csv = [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `Export_Pengiriman_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  emit('exported')
  emit('close')
}
</script>

<template>
  <AppModal :is-open="isOpen" title="Export Pengiriman" :subtitle="`Unduh ${shipments.length} data yang sedang tampil`" icon="download" size="sm" @close="emit('close')">
    <div class="space-y-4">
      <div class="flex items-start gap-3 rounded-2xl border border-[#CFE0F8] bg-[#F4F8FF] p-4">
        <span class="material-symbols-outlined text-[24px] text-[#0A51B0]">table_view</span>
        <div><p class="text-sm font-bold text-slate-800">Data siap diunduh</p><p class="mt-1 text-xs leading-relaxed text-slate-500">Export berisi data Pengiriman yang sedang tampil setelah filter diterapkan.</p></div>
      </div>
      <div class="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5"><span class="text-xs font-semibold text-slate-500">Jumlah data</span><span class="text-sm font-bold text-[#0A51B0]">{{ shipments.length }} pengiriman</span></div>
      <p v-if="!shipments.length" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-700">Tidak ada data untuk diexport.</p>
      <div class="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end"><button type="button" @click="emit('close')" class="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button><button type="button" :disabled="!shipments.length" @click="exportData" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0A51B0] px-5 text-xs font-bold text-white hover:bg-[#08458f] disabled:cursor-not-allowed disabled:opacity-50"><span class="material-symbols-outlined text-[17px]">download</span>Unduh CSV</button></div>
    </div>
  </AppModal>
</template>

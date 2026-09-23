<script setup>
import { computed, ref, watch } from 'vue'
import * as XLSX from 'xlsx'
import AppModal from './AppModal.vue'
import { useApi } from '@/composables/useApi.js'

const { post } = useApi()
const props = defineProps({ isOpen: Boolean })
const emit = defineEmits(['close', 'imported'])
const fileInput = ref(null)
const file = ref(null)
const rows = ref([])
const error = ref('')
const success = ref('')
const isParsing = ref(false)
const submitting = ref(false)
const isDragging = ref(false)
const importMode = ref('append')
const replaceConfirmation = ref('')
const previewColumns = computed(() => Object.keys(rows.value[0] || {}).slice(0, 6))

function downloadTemplate() {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.json_to_sheet([
    {
      'Tanggal Request': '2026-01-15',
      'Nama Penerima': 'Budi Santoso',
      'Deskripsi Barang': 'Laptop Lenovo ThinkPad',
      Tujuan: 'Jakarta',
      'Nomor Resi': 'JNE123456',
      Status: 'belum_dikirim',
      'Link Bukti Pengiriman': '',
    },
  ])
  XLSX.utils.book_append_sheet(workbook, sheet, 'Data Pengiriman')
  XLSX.writeFile(workbook, 'Template_Import_Pengiriman.xlsx')
}

function value(row, names) {
  const key = Object.keys(row || {}).find((item) => names.includes(item.trim().toLowerCase()))
  return key ? row[key] : ''
}

function parseFile(selectedFile) {
  file.value = selectedFile || null
  rows.value = []
  error.value = ''
  success.value = ''
  if (!selectedFile) return
  if (!/\.(xlsx|xls|csv)$/i.test(selectedFile.name)) {
    error.value = 'Format tidak didukung. Pilih file .xlsx, .xls, atau .csv.'
    return
  }
  isParsing.value = true
  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const workbook = XLSX.read(new Uint8Array(event.target.result), {
        type: 'array',
        cellDates: false,
      })
      const sheetName = workbook.SheetNames.find(
        (name) => name.trim().toLowerCase() === 'data pengiriman',
      )
      if (!sheetName) throw new Error('Template tidak sesuai. Gunakan sheet Data Pengiriman.')
      const parsed = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
      if (!parsed.length) throw new Error('File tidak berisi data pengiriman.')
      const required = ['tanggal request', 'nama penerima', 'deskripsi barang', 'tujuan']
      if (
        required.some(
          (name) => !Object.keys(parsed[0]).some((key) => key.trim().toLowerCase() === name),
        )
      ) {
        throw new Error('Kolom wajib tidak lengkap. Unduh template resmi Pengiriman.')
      }
      rows.value = parsed
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'File tidak dapat dibaca.'
    } finally {
      isParsing.value = false
    }
  }
  reader.onerror = () => {
    error.value = 'Gagal membaca file.'
    isParsing.value = false
  }
  reader.readAsArrayBuffer(selectedFile)
}

function handleDrop(event) {
  isDragging.value = false
  parseFile(event.dataTransfer?.files?.[0])
}

async function submit() {
  if (!rows.value.length || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    const data = rows.value.map((row) => ({
      request_date: value(row, ['tanggal request', 'request_date']),
      recipient_name: value(row, ['nama penerima', 'recipient_name']),
      item_description: value(row, ['deskripsi barang', 'item_description']),
      destination: value(row, ['tujuan', 'destination']),
      tracking_number: value(row, ['nomor resi', 'tracking_number']) || null,
      status: value(row, ['status']) || 'belum_dikirim',
      delivery_proof_url: value(row, ['link bukti pengiriman', 'delivery_proof_url']) || null,
    }))
    const result = await post('/api/shipments/import', {
      rows: data,
      mode: importMode.value,
      replaceConfirmation: replaceConfirmation.value,
    })
    success.value = result.message || 'Import pengiriman berhasil.'
    setTimeout(() => emit('imported'), 700)
  } catch (err) {
    error.value = err.message || 'Gagal memproses import pengiriman.'
  } finally {
    submitting.value = false
  }
}

function removeFile() {
  file.value = null
  rows.value = []
  error.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function close() {
  if (submitting.value) return
  file.value = null
  rows.value = []
  error.value = ''
  success.value = ''
  isDragging.value = false
  importMode.value = 'append'
  replaceConfirmation.value = ''
  emit('close')
}

watch(
  () => props.isOpen,
  (open) => {
    if (!open) close()
  },
)
</script>

<template>
  <AppModal
    panel-class="shipment-dialog"
    :is-open="isOpen"
    title="Import Pengiriman"
    subtitle="Tambah banyak data pengiriman lewat template Excel"
    icon="upload_file"
    size="lg"
    @close="close"
  >
    <div class="space-y-4">
      <div class="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
        <div class="rounded-lg bg-white px-3 py-2 shadow-xs">
          <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Langkah 1</p>
          <p class="mt-0.5 text-xs font-bold text-slate-700">Unduh template</p>
        </div>
        <div class="rounded-lg px-3 py-2">
          <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Langkah 2</p>
          <p class="mt-0.5 text-xs font-bold text-slate-700">Isi data pengiriman</p>
        </div>
        <div class="rounded-lg px-3 py-2">
          <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Langkah 3</p>
          <p class="mt-0.5 text-xs font-bold text-slate-700">Unggah & simpan</p>
        </div>
      </div>
      <div
        class="flex flex-col gap-3 rounded-2xl border border-[#CFE0F8] bg-[#F4F8FF] p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span aria-hidden="true" class="material-symbols-outlined text-[20px] text-[#0A51B0]"
              >table_view</span
            >
            <h3 class="text-sm font-bold text-slate-800">Template Pengiriman</h3>
          </div>
          <p class="mt-1 text-[11px] leading-relaxed text-slate-500">
            Sheet
            <code class="rounded bg-white px-1 py-0.5 font-semibold text-slate-700"
              >Data Pengiriman</code
            >
            · Kolom wajib: Tanggal Request, Nama Penerima, Deskripsi Barang, Tujuan.
          </p>
        </div>
        <button
          type="button"
          @click="downloadTemplate"
          class="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0A51B0] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#08458f]"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[17px]">download</span
          >Unduh Template
        </button>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx,.xls,.csv"
        class="hidden"
        @change="parseFile($event.target.files?.[0])"
      />
      <button
        v-if="!file"
        type="button"
        class="flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-colors"
        :class="
          isDragging
            ? 'border-[#0A51B0] bg-[#EEF5FF]'
            : 'border-slate-300 bg-slate-50 hover:border-[#86AEE0] hover:bg-[#F4F8FF]'
        "
        @click="fileInput?.click()"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[34px] text-[#0A51B0]"
          >cloud_upload</span
        ><span class="mt-2 text-sm font-bold text-slate-700">Tarik file ke sini</span
        ><span class="mt-1 text-[11px] text-slate-500"
          >atau klik untuk memilih · .xlsx, .xls, .csv</span
        >
      </button>
      <div v-else class="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <div class="flex items-center gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
            ><span aria-hidden="true" class="material-symbols-outlined">description</span></span
          >
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-bold text-slate-800">{{ file.name }}</p>
            <p class="mt-0.5 text-[11px] text-slate-500">
              {{ isParsing ? 'Membaca file...' : `${rows.length} baris terbaca` }}
            </p>
          </div>
          <button
            type="button"
            :disabled="isParsing || submitting"
            class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
            aria-label="Hapus file"
            @click="removeFile"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>
      <div v-if="rows.length" class="overflow-hidden rounded-2xl border border-slate-200">
        <div
          class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2"
        >
          <p class="text-xs font-bold text-slate-700">Pratinjau data</p>
          <span class="text-[11px] text-slate-500"
            >{{ rows.length }} baris{{ rows.length > 5 ? ', tampil 5 pertama' : '' }}</span
          >
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-[11px]">
            <thead class="bg-white">
              <tr>
                <th class="px-3 py-2 font-bold text-slate-400">#</th>
                <th
                  v-for="column in previewColumns"
                  :key="column"
                  class="whitespace-nowrap px-3 py-2 font-bold text-slate-400"
                >
                  {{ column }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(row, index) in rows.slice(0, 5)" :key="index">
                <td class="px-3 py-2 text-slate-400">{{ index + 1 }}</td>
                <td
                  v-for="column in previewColumns"
                  :key="column"
                  class="max-w-40 truncate whitespace-nowrap px-3 py-2 text-slate-700"
                >
                  {{ row[column] || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <fieldset class="rounded-2xl border border-slate-200 p-3">
        <legend class="px-1 text-xs font-bold text-slate-700">Mode import</legend>
        <label class="flex gap-2 text-xs text-slate-700"
          ><input v-model="importMode" type="radio" value="append" />Tambah Data</label
        ><label class="mt-2 flex gap-2 text-xs text-rose-700"
          ><input v-model="importMode" type="radio" value="replace" />Replace All</label
        ><label
          v-if="importMode === 'replace'"
          class="mt-2 block text-[11px] font-semibold text-rose-800"
          >Ketik <b>GANTI</b> untuk konfirmasi<input
            v-model="replaceConfirmation"
            class="mt-1 h-9 w-full rounded-lg border border-rose-200 px-2 text-xs"
        /></label>
      </fieldset>
      <p
        v-if="error"
        role="alert"
        class="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[17px]">error</span
        >{{ error }}
      </p>
      <p
        v-if="success"
        class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[17px]">check_circle</span
        >{{ success }}
      </p>
      <div
        class="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end"
      >
        <button
          type="button"
          :disabled="submitting"
          @click="close"
          class="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Batal</button
        ><button
          type="button"
          :disabled="
            submitting ||
            isParsing ||
            !rows.length ||
            (importMode === 'replace' && replaceConfirmation !== 'GANTI')
          "
          @click="submit"
          class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0A51B0] px-5 text-xs font-bold text-white hover:bg-[#08458f] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span
            v-if="submitting"
            class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
          ></span
          ><span aria-hidden="true" v-else class="material-symbols-outlined text-[17px]"
            >file_upload</span
          >{{ submitting ? 'Menyimpan...' : `Import ${rows.length} Baris` }}
        </button>
      </div>
    </div>
  </AppModal>
</template>

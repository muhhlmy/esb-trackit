<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import * as XLSX from 'xlsx'
import AppModal from './AppModal.vue'
import { useApi } from '@/composables/useApi'

const props = defineProps({
  isOpen: Boolean,
  assetType: { type: String, required: true },
})
const emit = defineEmits(['close', 'imported'])
const { post } = useApi()

const fileInput = ref(null)
const file = ref(null)
const rows = ref([])
const employeeRows = ref([])
const assetRows = ref([])
const error = ref('')
const success = ref('')
const submitting = ref(false)
const isDragging = ref(false)
const isParsing = ref(false)

const fields = {
  it: [{ Hostname: 'ESB-LAP-001', 'Serial Number': 'PF3X90B', Spesifikasi: 'Laptop 16GB RAM', 'NIK Pemegang': '2026001', 'Lokasi Aset': 'JKT', 'Tipe Perangkat': 'Laptop', 'Brand/Merek': 'Lenovo', Model: 'ThinkPad T14', Status: 'In Use', Kondisi: 'Normal' }],
  ga: [
    {
      Hostname: 'GA-001', Quantity: 1, 'Tipe Fasilitas': 'Meja', 'Nama Asset': 'Meja Kerja',
      Ukuran: '120x60 cm', Detail: 'Meja staff', Lokasi: 'Pluit', 'Lokasi Detail': 'Lantai 2', Kondisi: 'Baik',
    },
  ],
  ops: [
    {
      Hostname: 'OPS-001', 'Nama Asset': 'POS Outlet', Kategori: 'Point of Sales (POS)', Lokasi: 'Solo',
      PIC: '', 'Tanggal Beli': '2026-01-15', 'Total Asset Amount': 15000000, Kondisi: 'Baik', Status: 'Aktif',
    },
  ],
}

const typeLabel = computed(() => props.assetType.toUpperCase())
const sheetLabel = computed(() => `Data Aset ${typeLabel.value}`)
const previewColumns = computed(() => Object.keys(rows.value[0] || {}).slice(0, 6))
const previewRows = computed(() => rows.value.slice(0, 5))
const requiredFields = computed(() => {
  if (props.assetType === 'it') return 'Sheet Karyawan: NIK, Nama Karyawan · Sheet Asset: Hostname, Serial Number'
  return props.assetType === 'ga'
    ? 'Hostname, Tipe Fasilitas, Nama Asset, Lokasi'
    : 'Hostname, Nama Asset, Kategori, Lokasi'
})

function downloadTemplate() {
  const wb = XLSX.utils.book_new()
  if (props.assetType === 'it') {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ NIK: '2026001', 'Nama Karyawan': 'Budi Santoso', Status: 'Active', Title: 'Software Engineer', Departemen: 'Technology', 'Email Kantor': 'budi@esb.co.id', 'Lokasi Kerja': 'JKT' }]), 'Table Karyawan')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fields.it), 'Table Asset')
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fields[props.assetType]), sheetLabel.value)
  }
  XLSX.writeFile(wb, `Template_Import_Aset_${typeLabel.value}.xlsx`)
}

function openFilePicker() {
  fileInput.value?.click()
}

function handleFile(event) {
  parseFile(event.target.files?.[0])
}

function handleDrop(event) {
  isDragging.value = false
  parseFile(event.dataTransfer.files?.[0])
}

function hasColumn(row, names) {
  const keys = Object.keys(row || {}).map((key) => key.trim().toLowerCase())
  return names.some((name) => keys.includes(name.toLowerCase()))
}

function validateWorkbook(workbook) {
  const names = workbook.SheetNames.map((name) => name.trim().toLowerCase())
  const expected = props.assetType === 'it'
    ? ['table karyawan', 'table asset']
    : [`data aset ${props.assetType}`]
  const missing = expected.filter((name) => !names.includes(name))
  if (missing.length) {
    throw new Error(`Template tidak sesuai. Gunakan Template Aset ${typeLabel.value} dengan sheet: ${expected.join(' dan ')}.`)
  }

  if (props.assetType === 'it') {
    const employeeSheet = workbook.Sheets[workbook.SheetNames[names.indexOf('table karyawan')]]
    const assetSheet = workbook.Sheets[workbook.SheetNames[names.indexOf('table asset')]]
    const employeeData = XLSX.utils.sheet_to_json(employeeSheet)
    const assetData = XLSX.utils.sheet_to_json(assetSheet)
    if (!hasColumn(employeeData[0], ['nik']) || !hasColumn(employeeData[0], ['nama karyawan', 'nama'])) {
      throw new Error('Sheet Table Karyawan tidak sesuai template Aset IT.')
    }
    if (!hasColumn(assetData[0], ['hostname']) || !hasColumn(assetData[0], ['serial number', 'serial_number'])) {
      throw new Error('Sheet Table Asset tidak sesuai template Aset IT.')
    }
  } else {
    const sheet = workbook.Sheets[workbook.SheetNames[names.indexOf(expected[0])]]
    const data = XLSX.utils.sheet_to_json(sheet)
    const required = props.assetType === 'ga'
      ? [['hostname'], ['tipe fasilitas', 'tipe_fasilitas'], ['nama asset', 'nama_asset']]
      : [['hostname'], ['nama asset', 'nama_asset'], ['kategori']]
    if (required.some((names) => !hasColumn(data[0], names))) {
      throw new Error(`Sheet ${expected[0]} tidak sesuai template Aset ${typeLabel.value}.`)
    }
  }
}

function parseFile(selectedFile) {
  error.value = ''
  success.value = ''
  rows.value = []
  employeeRows.value = []
  assetRows.value = []
  if (!selectedFile) return
  if (!/\.(xlsx|xls|csv)$/i.test(selectedFile.name)) {
    error.value = 'Format tidak didukung. Pilih file .xlsx, .xls, atau .csv.'
    return
  }

  file.value = selectedFile
  isParsing.value = true
  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const workbook = XLSX.read(new Uint8Array(event.target.result), { type: 'array', cellDates: true })
      validateWorkbook(workbook)
      if (props.assetType === 'it') {
        employeeRows.value = workbook.SheetNames.filter((name) => name.toLowerCase().includes('karyawan')).flatMap((name) => XLSX.utils.sheet_to_json(workbook.Sheets[name]))
        assetRows.value = workbook.SheetNames.filter((name) => name.toLowerCase().includes('asset') || name.toLowerCase().includes('aset')).flatMap((name) => XLSX.utils.sheet_to_json(workbook.Sheets[name]))
        rows.value = assetRows.value
      } else {
        const sheetName = workbook.SheetNames.find((name) => name.trim().toLowerCase() === `data aset ${props.assetType}`)
        rows.value = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
      }
      if (!rows.value.length) error.value = 'File terbaca, tetapi tidak berisi baris data.'
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'File tidak dapat dibaca. Unduh template resmi lalu coba lagi.'
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

function removeFile() {
  file.value = null
  rows.value = []
  employeeRows.value = []
  assetRows.value = []
  error.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

async function submit() {
  if (!rows.value.length || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    const payload = props.assetType === 'it'
      ? { karyawanRows: employeeRows.value, assetRows: assetRows.value }
      : { assetType: props.assetType, rows: rows.value }
    const result = await post(props.assetType === 'it' ? '/api/import/excel' : '/api/import/excel-assets', payload)
    success.value = result.message || 'Import aset berhasil.'
    await nextTick()
    window.setTimeout(() => emit('imported'), 700)
  } catch (err) {
    error.value = err.message || 'Gagal memproses import aset.'
  } finally {
    submitting.value = false
  }
}

function close() {
  if (submitting.value) return
  file.value = null
  rows.value = []
  employeeRows.value = []
  assetRows.value = []
  error.value = ''
  success.value = ''
  isDragging.value = false
  if (fileInput.value) fileInput.value.value = ''
  emit('close')
}

watch(() => props.isOpen, (open) => {
  if (!open) close()
})
</script>

<template>
  <AppModal
    :is-open="isOpen"
    :title="`Import Aset ${typeLabel}`"
    :subtitle="`Tambah banyak data aset ${typeLabel} lewat template Excel`"
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
          <p class="mt-0.5 text-xs font-bold text-slate-700">Isi data aset</p>
        </div>
        <div class="rounded-lg px-3 py-2">
          <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Langkah 3</p>
          <p class="mt-0.5 text-xs font-bold text-slate-700">Unggah & simpan</p>
        </div>
      </div>

      <div class="flex flex-col gap-3 rounded-2xl border border-[#CFE0F8] bg-[#F4F8FF] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-[#0A51B0]">table_view</span>
            <h3 class="text-sm font-bold text-slate-800">Template Aset {{ typeLabel }}</h3>
          </div>
          <p class="mt-1 text-[11px] leading-relaxed text-slate-500">
            <template v-if="assetType === 'it'">Sheet <code class="rounded bg-white px-1 py-0.5 font-semibold text-slate-700">Table Karyawan</code> &amp; <code class="rounded bg-white px-1 py-0.5 font-semibold text-slate-700">Table Asset</code></template>
            <template v-else>Sheet <code class="rounded bg-white px-1 py-0.5 font-semibold text-slate-700">{{ sheetLabel }}</code> · Tanpa data Karyawan</template>
          </p>
        </div>
        <button type="button" @click="downloadTemplate" class="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0A51B0] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#08458f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A51B0]">
          <span class="material-symbols-outlined text-[17px]">download</span>
          Unduh Template
        </button>
      </div>

      <div class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800">
        <span class="material-symbols-outlined mt-0.5 text-[17px]">info</span>
        <p><b>Kolom wajib:</b> {{ requiredFields }}. Jangan ubah nama header template.</p>
      </div>

      <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="handleFile" />
      <button
        v-if="!file"
        type="button"
        class="flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A51B0]"
        :class="isDragging ? 'border-[#0A51B0] bg-[#EEF5FF]' : 'border-slate-300 bg-slate-50 hover:border-[#86AEE0] hover:bg-[#F4F8FF]'"
        @click="openFilePicker"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <span class="material-symbols-outlined text-[34px] text-[#0A51B0]">cloud_upload</span>
        <span class="mt-2 text-sm font-bold text-slate-700">Tarik file ke sini</span>
        <span class="mt-1 text-[11px] text-slate-500">atau klik untuk memilih · .xlsx, .xls, .csv</span>
      </button>

      <div v-else class="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><span class="material-symbols-outlined">description</span></span>
          <div class="min-w-0 flex-1"><p class="truncate text-xs font-bold text-slate-800">{{ file.name }}</p><p class="mt-0.5 text-[11px] text-slate-500">{{ (file.size / 1024).toFixed(1) }} KB · {{ isParsing ? 'Membaca file...' : `${rows.length} baris terbaca` }}</p></div>
          <button type="button" aria-label="Hapus file" :disabled="isParsing || submitting" class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40" @click="removeFile"><span class="material-symbols-outlined text-[18px]">delete</span></button>
        </div>
      </div>

      <div v-if="previewRows.length" class="overflow-hidden rounded-2xl border border-slate-200">
        <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2"><p class="text-xs font-bold text-slate-700">Pratinjau data</p><span class="text-[11px] text-slate-500">{{ rows.length }} baris{{ rows.length > 5 ? ', tampil 5 pertama' : '' }}</span></div>
        <div class="overflow-x-auto"><table class="min-w-full text-left text-[11px]"><thead class="bg-white"><tr><th class="whitespace-nowrap px-3 py-2 font-bold text-slate-400">#</th><th v-for="column in previewColumns" :key="column" class="whitespace-nowrap px-3 py-2 font-bold text-slate-400">{{ column }}</th></tr></thead><tbody class="divide-y divide-slate-100"><tr v-for="(row, index) in previewRows" :key="index" class="hover:bg-slate-50"><td class="px-3 py-2 text-slate-400">{{ index + 1 }}</td><td v-for="column in previewColumns" :key="column" class="max-w-40 truncate whitespace-nowrap px-3 py-2 text-slate-700">{{ row[column] || '—' }}</td></tr></tbody></table></div>
      </div>

      <p v-if="error" class="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"><span class="material-symbols-outlined text-[17px]">error</span>{{ error }}</p>
      <p v-if="success" class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700"><span class="material-symbols-outlined text-[17px]">check_circle</span>{{ success }}</p>

      <div class="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <button type="button" :disabled="submitting" @click="close" class="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Batal</button>
        <button type="button" :disabled="submitting || isParsing || !rows.length" @click="submit" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0A51B0] px-5 text-xs font-bold text-white shadow-sm hover:bg-[#08458f] disabled:cursor-not-allowed disabled:opacity-50"><span v-if="submitting" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span><span v-else class="material-symbols-outlined text-[17px]">file_upload</span>{{ submitting ? 'Menyimpan...' : `Import ${rows.length} Baris` }}</button>
      </div>
    </div>
  </AppModal>
</template>

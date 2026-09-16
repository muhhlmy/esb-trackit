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
const importMode = ref('append')
const replaceScope = ref('assets')
const replaceConfirmation = ref('')
const includeEmployees = ref(false)

const sampleEmployeesForIT = [
  {
    NIK: '2026001',
    'Nama Karyawan': 'Budi Santoso',
    Status: 'Active',
    Title: 'Software Engineer',
    'Job Level': 'L3',
    Departemen: 'Technology',
    Directorate: 'Technology',
    'Tanggal Mulai Bekerja': '2024-01-15',
    'Employeement Status': 'Permanent',
    'NIK Atasan Langsung': '',
    'Email Kantor': 'budi.santoso@esb.co.id',
    'Lokasi Kerja': 'JKT',
  },
  {
    NIK: '2026002',
    'Nama Karyawan': 'Siti Rahma',
    Status: 'Active',
    Title: 'Account Management Analyst',
    'Job Level': 'L2',
    Departemen: 'Account Management',
    Directorate: 'Operations',
    'Tanggal Mulai Bekerja': '2024-03-01',
    'Employeement Status': 'Contract',
    'NIK Atasan Langsung': '2026001',
    'Email Kantor': 'siti.rahma@esb.co.id',
    'Lokasi Kerja': 'BDG',
  },
  {
    NIK: '2026003',
    'Nama Karyawan': 'Ahmad Fauzi',
    Status: 'Active',
    Title: 'Finance & Tax Officer',
    'Job Level': 'L2',
    Departemen: 'Finance',
    Directorate: 'Finance & Administration',
    'Tanggal Mulai Bekerja': '2023-08-10',
    'Employeement Status': 'Permanent',
    'NIK Atasan Langsung': '',
    'Email Kantor': 'ahmad.fauzi@esb.co.id',
    'Lokasi Kerja': 'PL',
  },
  {
    NIK: '2026004',
    'Nama Karyawan': 'Dewi Lestari',
    Status: 'Active',
    Title: 'Digital Marketing Specialist',
    'Job Level': 'L2',
    Departemen: 'Marketing',
    Directorate: 'Commercial',
    'Tanggal Mulai Bekerja': '2024-05-20',
    'Employeement Status': 'Permanent',
    'NIK Atasan Langsung': '',
    'Email Kantor': 'dewi.lestari@esb.co.id',
    'Lokasi Kerja': 'GS',
  },
  {
    NIK: '2026005',
    'Nama Karyawan': 'Rian Hidayat',
    Status: 'Active',
    Title: 'Product Designer',
    'Job Level': 'L3',
    Departemen: 'Product',
    Directorate: 'Technology',
    'Tanggal Mulai Bekerja': '2023-11-01',
    'Employeement Status': 'Permanent',
    'NIK Atasan Langsung': '2026001',
    'Email Kantor': 'rian.hidayat@esb.co.id',
    'Lokasi Kerja': 'JKT',
  },
]

const fields = {
  it: [
    {
      Hostname: 'ESB-LAP-001',
      'Serial Number': 'PF3X90B',
      Spesifikasi: 'Laptop Core i5 16GB RAM / 512GB SSD',
      'NIK Pemegang': '2026001',
      'Nama Karyawan Pemegang': 'Budi Santoso',
      'Departemen Pemegang': 'Technology',
      'Lokasi Aset': 'JKT',
      'Tipe Perangkat': 'Laptop',
      'Brand/Merek': 'Lenovo',
      Model: 'ThinkPad T14',
      Status: 'In Use',
      Kondisi: 'Normal',
      'Note Asset': 'Laptop utama pengembang',
    },
    {
      Hostname: 'ESB-LAP-002',
      'Serial Number': 'PF3X91C',
      Spesifikasi: 'Laptop Core i7 16GB RAM / 512GB SSD',
      'NIK Pemegang': '2026002',
      'Nama Karyawan Pemegang': 'Siti Rahma',
      'Departemen Pemegang': 'Operations',
      'Lokasi Aset': 'BDG',
      'Tipe Perangkat': 'Laptop',
      'Brand/Merek': 'Dell',
      Model: 'Latitude 5420',
      Status: 'In Use',
      Kondisi: 'Normal',
      'Note Asset': 'Laptop account analyst',
    },
    {
      Hostname: 'ESB-PC-001',
      'Serial Number': '8CC2340XYZ',
      Spesifikasi: 'PC Desktop Core i7 32GB RAM / 1TB SSD',
      'NIK Pemegang': '2026003',
      'Nama Karyawan Pemegang': 'Ahmad Fauzi',
      'Departemen Pemegang': 'Finance',
      'Lokasi Aset': 'Pluit',
      'Tipe Perangkat': 'PC Desktop',
      'Brand/Merek': 'HP',
      Model: 'ProDesk 400 G7',
      Status: 'In Use',
      Kondisi: 'Normal',
      'Note Asset': 'PC finance kasir pusat',
    },
    {
      Hostname: 'ESB-LAP-003',
      'Serial Number': 'PF4A10D',
      Spesifikasi: 'Laptop Ryzen 5 8GB RAM / 256GB SSD',
      'NIK Pemegang': '2026004',
      'Nama Karyawan Pemegang': 'Dewi Lestari',
      'Departemen Pemegang': 'Marketing',
      'Lokasi Aset': 'GS',
      'Tipe Perangkat': 'Laptop',
      'Brand/Merek': 'Asus',
      Model: 'ExpertBook B1',
      Status: 'Available',
      Kondisi: 'Normal',
      'Note Asset': 'Laptop pool marketing',
    },
    {
      Hostname: 'ESB-MAC-001',
      'Serial Number': 'C02G40ABMD6R',
      Spesifikasi: 'MacBook Pro M2 16GB RAM / 512GB SSD',
      'NIK Pemegang': '2026005',
      'Nama Karyawan Pemegang': 'Rian Hidayat',
      'Departemen Pemegang': 'Product',
      'Lokasi Aset': 'JKT',
      'Tipe Perangkat': 'Laptop',
      'Brand/Merek': 'Apple',
      Model: 'MacBook Pro 14"',
      Status: 'In Use',
      Kondisi: 'Normal',
      'Note Asset': 'Laptop utama product designer',
    },
  ],
  ga: [
    {
      Hostname: 'GA-001',
      Quantity: 1,
      'Tipe Fasilitas': 'Meja',
      'Nama Asset': 'Meja Kerja Staff',
      Ukuran: '120x60 cm',
      Detail: 'Meja partisi staff engineering',
      Lokasi: 'Pluit',
      'Lokasi Detail': 'Lantai 2 - Ruang IT',
      Kondisi: 'Baik',
    },
    {
      Hostname: 'GA-002',
      Quantity: 1,
      'Tipe Fasilitas': 'Kursi',
      'Nama Asset': 'Kursi Ergonomis',
      Ukuran: 'Standard',
      Detail: 'Kursi kerja jaring hidrolik',
      Lokasi: 'Pluit',
      'Lokasi Detail': 'Lantai 2 - Ruang IT',
      Kondisi: 'Baik',
    },
    {
      Hostname: 'GA-003',
      Quantity: 1,
      'Tipe Fasilitas': 'AC',
      'Nama Asset': 'AC Split 2 PK',
      Ukuran: '2 PK',
      Detail: 'Pendingin ruangan inverter',
      Lokasi: 'Gading Serpong',
      'Lokasi Detail': 'Lantai 1 - Ruang Meeting',
      Kondisi: 'Baik',
    },
    {
      Hostname: 'GA-004',
      Quantity: 1,
      'Tipe Fasilitas': 'Lemari',
      'Nama Asset': 'Lemari Arsip Filing Cabinet',
      Ukuran: '4 Laci (132x46 cm)',
      Detail: 'Besi plat kunci sentral arsip',
      Lokasi: 'JKT',
      'Lokasi Detail': 'Lantai 3 - Ruang HRD',
      Kondisi: 'Baik',
    },
    {
      Hostname: 'GA-005',
      Quantity: 1,
      'Tipe Fasilitas': 'Dispenser',
      'Nama Asset': 'Dispenser Air Galon Bawah',
      Ukuran: 'Standard',
      Detail: 'Dispenser air panas & dingin pantry',
      Lokasi: 'Solo',
      'Lokasi Detail': 'Pantry Kantor Cabang',
      Kondisi: 'Baik',
    },
  ],
  ops: [
    {
      Hostname: 'OPS-001',
      'Nama Asset': 'POS Terminal Touchscreen',
      Kategori: 'Point of Sales (POS)',
      Lokasi: 'Solo',
      PIC: 'Bambang Irawan',
      'Tanggal Beli': '2026-01-15',
      'Total Asset Amount': 15000000,
      Kondisi: 'Baik',
      Status: 'Aktif',
    },
    {
      Hostname: 'OPS-002',
      'Nama Asset': 'Self Order Kiosk 21 Inch',
      Kategori: 'Self Service (KIOSK)',
      Lokasi: 'Pluit',
      PIC: 'Siti Rahma',
      'Tanggal Beli': '2026-02-01',
      'Total Asset Amount': 22500000,
      Kondisi: 'Baik',
      Status: 'Aktif',
    },
    {
      Hostname: 'OPS-003',
      'Nama Asset': 'Mobile EDC Payment Android',
      Kategori: 'Payment Terminal (EDC)',
      Lokasi: 'Gading Serpong',
      PIC: 'Hendri Kurniawan',
      'Tanggal Beli': '2026-02-10',
      'Total Asset Amount': 4500000,
      Kondisi: 'Baik',
      Status: 'Aktif',
    },
    {
      Hostname: 'OPS-004',
      'Nama Asset': 'Thermal Receipt Printer 80mm',
      Kategori: 'Point of Sales (POS)',
      Lokasi: 'Bandung',
      PIC: 'Dian Permana',
      'Tanggal Beli': '2026-02-20',
      'Total Asset Amount': 1850000,
      Kondisi: 'Baik',
      Status: 'Aktif',
    },
    {
      Hostname: 'OPS-005',
      'Nama Asset': 'Barcode Scanner 2D Omnidirectional',
      Kategori: 'Barcode Scanner',
      Lokasi: 'Surabaya',
      PIC: 'Agus Setiawan',
      'Tanggal Beli': '2026-03-01',
      'Total Asset Amount': 1200000,
      Kondisi: 'Baik',
      Status: 'Aktif',
    },
  ],
}

const typeLabel = computed(() => props.assetType.toUpperCase())
const sheetLabel = computed(() => `Data Aset ${typeLabel.value}`)
const previewColumns = computed(() => Object.keys(rows.value[0] || {}).slice(0, 6))
const previewRows = computed(() => rows.value.slice(0, 5))
const requiredFields = computed(() => {
  if (props.assetType === 'it')
    return includeEmployees.value
      ? 'Sheet Karyawan: NIK, Nama Karyawan · Sheet Asset: Hostname, Serial Number'
      : 'Sheet Table Asset: Hostname, Serial Number'
  return props.assetType === 'ga'
    ? 'Hostname, Tipe Fasilitas, Nama Asset, Lokasi'
    : 'Hostname, Nama Asset, Kategori, Lokasi'
})

function downloadTemplate() {
  const wb = XLSX.utils.book_new()
  if (props.assetType === 'it') {
    if (includeEmployees.value)
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(sampleEmployeesForIT),
        'Table Karyawan',
      )
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fields.it), 'Table Asset')
  } else {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(fields[props.assetType]),
      sheetLabel.value,
    )
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
  const expected =
    props.assetType === 'it'
      ? includeEmployees.value
        ? ['table karyawan', 'table asset']
        : ['table asset']
      : [`data aset ${props.assetType}`]
  const missing = expected.filter((name) => !names.includes(name))
  if (missing.length) {
    throw new Error(
      `Template tidak sesuai. Gunakan Template Aset ${typeLabel.value} dengan sheet: ${expected.join(' dan ')}.`,
    )
  }

  if (props.assetType === 'it') {
    const assetSheet = workbook.Sheets[workbook.SheetNames[names.indexOf('table asset')]]
    const assetData = XLSX.utils.sheet_to_json(assetSheet)
    if (includeEmployees.value) {
      const employeeSheet = workbook.Sheets[workbook.SheetNames[names.indexOf('table karyawan')]]
      const employeeData = XLSX.utils.sheet_to_json(employeeSheet)
      if (
        !hasColumn(employeeData[0], ['nik']) ||
        !hasColumn(employeeData[0], ['nama karyawan', 'nama'])
      ) {
        throw new Error('Sheet Table Karyawan tidak sesuai template Aset IT.')
      }
    }
    if (
      !hasColumn(assetData[0], ['hostname']) ||
      !hasColumn(assetData[0], ['serial number', 'serial_number'])
    ) {
      throw new Error('Sheet Table Asset tidak sesuai template Aset IT.')
    }
  } else {
    const sheet = workbook.Sheets[workbook.SheetNames[names.indexOf(expected[0])]]
    const data = XLSX.utils.sheet_to_json(sheet)
    const required =
      props.assetType === 'ga'
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
      const workbook = XLSX.read(new Uint8Array(event.target.result), {
        type: 'array',
        cellDates: true,
      })
      validateWorkbook(workbook)
      if (props.assetType === 'it') {
        employeeRows.value = includeEmployees.value
          ? XLSX.utils.sheet_to_json(
              workbook.Sheets[
                workbook.SheetNames.find((name) => name.trim().toLowerCase() === 'table karyawan')
              ],
            )
          : []
        assetRows.value = XLSX.utils.sheet_to_json(
          workbook.Sheets[
            workbook.SheetNames.find((name) => name.trim().toLowerCase() === 'table asset')
          ],
        )
        rows.value = assetRows.value
      } else {
        const sheetName = workbook.SheetNames.find(
          (name) => name.trim().toLowerCase() === `data aset ${props.assetType}`,
        )
        rows.value = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
      }
      if (!rows.value.length) error.value = 'File terbaca, tetapi tidak berisi baris data.'
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : 'File tidak dapat dibaca. Unduh template resmi lalu coba lagi.'
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
    const payload =
      props.assetType === 'it'
        ? {
            karyawanRows: employeeRows.value,
            assetRows: assetRows.value,
            mode: importMode.value,
            replaceScope: replaceScope.value,
            replaceConfirmation: replaceConfirmation.value,
          }
        : {
            assetType: props.assetType,
            rows: rows.value,
            mode: importMode.value,
            replaceConfirmation: replaceConfirmation.value,
          }
    const result = await post(
      props.assetType === 'it' ? '/api/import/excel' : '/api/import/excel-assets',
      payload,
    )
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
  importMode.value = 'append'
  replaceScope.value = 'assets'
  replaceConfirmation.value = ''
  includeEmployees.value = false
  if (fileInput.value) fileInput.value.value = ''
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

      <div
        class="flex flex-col gap-3 rounded-2xl border border-[#CFE0F8] bg-[#F4F8FF] p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span aria-hidden="true" class="material-symbols-outlined text-[20px] text-[#0A51B0]"
              >table_view</span
            >
            <h3 class="text-sm font-bold text-slate-800">Template Aset {{ typeLabel }}</h3>
          </div>
          <p class="mt-1 text-[11px] leading-relaxed text-slate-500">
            <template v-if="assetType === 'it'"
              >Sheet
              <code class="rounded bg-white px-1 py-0.5 font-semibold text-slate-700"
                >Table Karyawan</code
              >
              &amp;
              <code class="rounded bg-white px-1 py-0.5 font-semibold text-slate-700"
                >Table Asset</code
              ></template
            >
            <template v-else
              >Sheet
              <code class="rounded bg-white px-1 py-0.5 font-semibold text-slate-700">{{
                sheetLabel
              }}</code>
              · Tanpa data Karyawan</template
            >
          </p>
        </div>
        <button
          type="button"
          @click="downloadTemplate"
          class="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0A51B0] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#08458f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A51B0]"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[17px]">download</span>
          Unduh Template
        </button>
      </div>

      <div
        v-if="assetType === 'it'"
        class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800"
      >
        <b>Untuk link pemegang aset:</b> import Karyawan dahulu dari halaman Karyawan. Isi
        <b>NIK Pemegang</b> dengan NIK yang sudah terdaftar. Pilih opsi lengkap hanya untuk import
        awal Karyawan dan Aset IT bersamaan.
        <label class="mt-2 flex cursor-pointer items-center gap-2 font-semibold text-slate-700"
          ><input v-model="includeEmployees" type="checkbox" @change="removeFile" /> Import lengkap:
          Karyawan + Aset IT</label
        >
      </div>

      <div
        class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800"
      >
        <span aria-hidden="true" class="material-symbols-outlined mt-0.5 text-[17px]">info</span>
        <p><b>Kolom wajib:</b> {{ requiredFields }}. Jangan ubah nama header template.</p>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept=".xlsx,.xls,.csv"
        class="hidden"
        @change="handleFile"
      />
      <button
        v-if="!file"
        type="button"
        class="flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A51B0]"
        :class="
          isDragging
            ? 'border-[#0A51B0] bg-[#EEF5FF]'
            : 'border-slate-300 bg-slate-50 hover:border-[#86AEE0] hover:bg-[#F4F8FF]'
        "
        @click="openFilePicker"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[34px] text-[#0A51B0]"
          >cloud_upload</span
        >
        <span class="mt-2 text-sm font-bold text-slate-700">Tarik file ke sini</span>
        <span class="mt-1 text-[11px] text-slate-500"
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
              {{ (file.size / 1024).toFixed(1) }} KB ·
              {{ isParsing ? 'Membaca file...' : `${rows.length} baris terbaca` }}
            </p>
          </div>
          <button
            type="button"
            aria-label="Hapus file"
            :disabled="isParsing || submitting"
            class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
            @click="removeFile"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>

      <div v-if="previewRows.length" class="overflow-hidden rounded-2xl border border-slate-200">
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
                <th class="whitespace-nowrap px-3 py-2 font-bold text-slate-400">#</th>
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
              <tr v-for="(row, index) in previewRows" :key="index" class="hover:bg-slate-50">
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
        <label class="flex cursor-pointer items-start gap-2 text-xs text-slate-700"
          ><input v-model="importMode" type="radio" value="append" class="mt-0.5" /><span
            ><b>Tambah Data</b><br /><span class="text-[11px] text-slate-500"
              >Data lama tidak dihapus.</span
            ></span
          ></label
        >
        <label class="mt-3 flex cursor-pointer items-start gap-2 text-xs text-rose-700"
          ><input v-model="importMode" type="radio" value="replace" class="mt-0.5" /><span
            ><b>Replace All</b><br /><span class="text-[11px] text-rose-600"
              >Hapus data lama kategori ini, lalu masukkan file.</span
            ></span
          ></label
        >
        <div
          v-if="importMode === 'replace'"
          class="mt-3 space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3"
        >
          <template v-if="assetType === 'it'">
            <label class="flex items-center gap-2 text-xs text-slate-700"
              ><input v-model="replaceScope" type="radio" value="assets" /> Aset IT saja</label
            >
            <label class="flex items-center gap-2 text-xs text-slate-700"
              ><input v-model="replaceScope" type="radio" value="assets_and_employees" /> Aset IT
              dan Karyawan</label
            >
          </template>
          <label class="block text-[11px] font-semibold text-rose-800"
            >Ketik <b>GANTI</b> untuk konfirmasi<input
              v-model="replaceConfirmation"
              class="mt-1 h-9 w-full rounded-lg border border-rose-200 bg-white px-2 text-xs"
          /></label>
        </div>
      </fieldset>

      <p
        v-if="error"
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
          Batal
        </button>
        <button
          type="button"
          :disabled="
            submitting ||
            isParsing ||
            !rows.length ||
            (importMode === 'replace' && replaceConfirmation !== 'GANTI')
          "
          @click="submit"
          class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#0A51B0] px-5 text-xs font-bold text-white shadow-sm hover:bg-[#08458f] disabled:cursor-not-allowed disabled:opacity-50"
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

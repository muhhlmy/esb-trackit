<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { useApi } from '../composables/useApi.js'
import SearchableSelect from '../components/ui/SearchableSelect.vue'
import BaseSkeleton from '../components/ui/skeleton/BaseSkeleton.vue'
import { animateStagger } from '../composables/useGsap.js'
import { escapeHtml, printHtmlDocument } from '../utils/printDocument.js'
import { normalizeLocation } from '../utils/locationNormalizer.js'

const { get } = useApi()

// ── State ────────────────────────────────────────────────────
const employees = ref([])
const assets = ref([])
const isLoading = ref(true)
const pageError = ref('')
const validationError = ref('')

// Form State
const form = ref({
  pemberiNik: '',
  pemberiNama: '',
  pemberiDirektorat: '',
  penerimaNik: '',
  penerimaNama: '',
  penerimaDirektorat: '',
  isPenerimaLainnya: false,
  mengetahuiNik: '',
  mengetahuiNama: '',
  mengetahuiJabatan: 'People Business Partner atau Asset Management',
  isMengetahuiKustom: false,
  tujuan: 'baru', // 'baru' | 'peminjaman' | 'perbaikan' | 'disposal' | 'lainnya'
  tujuanLainnya: '',
  tanggal: new Date().toISOString().substring(0, 10), // yyyy-mm-dd
})

// Dynamic list of assets (Up to 3 by default, matching template)
const asetBaruList = ref([{ id_aset: '', tipe: '', qty: 1, spesifikasi: '' }])
const asetLamaList = ref([{ id_aset: '', tipe: '', qty: 1, spesifikasi: '' }])

// ── Fetch Data ───────────────────────────────────────────────
async function fetchData() {
  isLoading.value = true
  pageError.value = ''
  try {
    const [employeeData, assetData] = await Promise.all([
      get('/api/karyawan?all=true'),
      get('/api/assets?all=true'),
    ])
    employees.value = Array.isArray(employeeData) ? employeeData : []
    assets.value = (Array.isArray(assetData) ? assetData : []).map((a) => {
      const hostname = a.hostname || a.label_aset || ''
      const serial_number = a.serial_number || a.nomor_seri || ''
      const brand = a.brand_merek || a.merek || ''
      const nik = a.nik_pemegang_asset || a.nik || ''
      const nama = a.nama_karyawan_pemegang_asset || a.nama_karyawan || ''
      const dept = a.departemen_pemegang_asset || a.departemen || ''
      const rawLokasi = a.lokasi_asset || a.lokasi_aset || a.lokasi_kerja || a.lokasi || ''
      const lokasi = normalizeLocation(rawLokasi)
      const status = a.status || a.status_aset || 'In Use'
      const kondisi = a.kondisi || a.kondisi_aset || 'Normal'
      const note = a.note_asset || a.catatan_aset || ''

      return {
        ...a,
        id_aset: a.id_aset || a.id,
        id: a.id || a.id_aset,
        hostname,
        label_aset: hostname,
        serial_number,
        nomor_seri: serial_number,
        brand_merek: brand,
        merek: brand,
        nik_pemegang_asset: nik,
        nik,
        nama_karyawan_pemegang_asset: nama,
        nama_karyawan: nama,
        departemen_pemegang_asset: dept,
        departemen: dept,
        lokasi_asset: lokasi,
        lokasi_aset: lokasi,
        lokasi_kerja: lokasi,
        lokasi,
        status,
        status_aset: status,
        kondisi,
        kondisi_aset: kondisi,
        note_asset: note,
        catatan_aset: note,
      }
    })
  } catch (error) {
    pageError.value = error.message || 'Gagal memuat data referensi.'
  } finally {
    isLoading.value = false
    await nextTick()
    animateStagger('.submission-section')
  }
}

// ── Watchers for Autofill ────────────────────────────────────
// Autofill Pihak Pemberi when selected
watch(
  () => form.value.pemberiNik,
  (nik) => {
    const emp = employees.value.find((e) => e.nik === nik)
    if (emp) {
      form.value.pemberiNama = emp.nama_karyawan || ''
      form.value.pemberiDirektorat = emp.departemen || ''
    } else {
      form.value.pemberiNama = ''
      form.value.pemberiDirektorat = ''
    }
  },
)

// Autofill Pihak Penerima when selected
watch(
  () => form.value.penerimaNik,
  (nik) => {
    const emp = employees.value.find((e) => e.nik === nik)
    if (emp) {
      form.value.penerimaNama = emp.nama_karyawan || ''
      form.value.penerimaDirektorat = emp.departemen || ''
    } else {
      form.value.penerimaNama = ''
      form.value.penerimaDirektorat = ''
    }
  },
)

// Watch isPenerimaLainnya to reset fields
watch(
  () => form.value.isPenerimaLainnya,
  () => {
    form.value.penerimaNik = ''
    form.value.penerimaNama = ''
    form.value.penerimaDirektorat = ''
  },
)

// Autofill Pihak Mengetahui when selected
watch(
  () => form.value.mengetahuiNik,
  (nik) => {
    const emp = employees.value.find((e) => e.nik === nik)
    if (emp) {
      form.value.mengetahuiNama = emp.nama_karyawan || ''
      form.value.mengetahuiJabatan =
        emp.title || emp.jabatan || emp.departemen || 'People Business Partner atau Asset Management'
    } else if (!form.value.isMengetahuiKustom) {
      form.value.mengetahuiNama = ''
      form.value.mengetahuiJabatan = 'People Business Partner atau Asset Management'
    }
  },
)

// Watch isMengetahuiKustom to reset fields
watch(
  () => form.value.isMengetahuiKustom,
  (isKustom) => {
    if (isKustom) {
      form.value.mengetahuiNik = ''
    } else {
      form.value.mengetahuiNama = ''
      form.value.mengetahuiJabatan = 'People Business Partner atau Asset Management'
    }
  },
)

// Helper to format full asset identity summary: Merek / Model / Spesifikasi / S/N / Hostname
function formatAssetSpecificationSummary(asset) {
  if (!asset) return ''
  const parts = [
    asset.merek || asset.brand_merek,
    asset.model,
    asset.spesifikasi,
    asset.nomor_seri || asset.serial_number,
    asset.hostname || asset.label_aset,
  ]
    .map((item) => (item && typeof item === 'string' ? item.trim() : item))
    .filter(Boolean)

  return parts.join(' / ')
}

// Autofill Asset Baru row details when selected
function onAssetBaruSelect(index, id_aset) {
  const asset = assets.value.find((a) => a.id_aset === id_aset)
  if (asset) {
    asetBaruList.value[index].tipe = asset.tipe_perangkat || ''
    asetBaruList.value[index].spesifikasi = formatAssetSpecificationSummary(asset)
  } else {
    asetBaruList.value[index].tipe = ''
    asetBaruList.value[index].spesifikasi = ''
  }
}

// Autofill Asset Lama row details when selected
function onAssetLamaSelect(index, id_aset) {
  const asset = assets.value.find((a) => a.id_aset === id_aset)
  if (asset) {
    asetLamaList.value[index].tipe = asset.tipe_perangkat || ''
    asetLamaList.value[index].spesifikasi = formatAssetSpecificationSummary(asset)
  } else {
    asetLamaList.value[index].tipe = ''
    asetLamaList.value[index].spesifikasi = ''
  }
}

// ── Action Handlers ──────────────────────────────────────────
function addAssetBaruRow() {
  asetBaruList.value.push({ id_aset: '', tipe: '', qty: 1, spesifikasi: '' })
}

function removeAssetBaruRow(index) {
  asetBaruList.value.splice(index, 1)
  if (asetBaruList.value.length === 0) {
    addAssetBaruRow()
  }
}

function addAssetLamaRow() {
  asetLamaList.value.push({ id_aset: '', tipe: '', qty: 1, spesifikasi: '' })
}

function removeAssetLamaRow(index) {
  asetLamaList.value.splice(index, 1)
  if (asetLamaList.value.length === 0) {
    addAssetLamaRow()
  }
}

function generatePdf() {
  validationError.value = ''

  if (!form.value.pemberiNama?.trim()) {
    validationError.value = 'Pihak Pemberi wajib dipilih atau diisi sebelum mencetak formulir.'
    return
  }

  if (!form.value.penerimaNama?.trim()) {
    validationError.value = 'Pihak Penerima wajib dipilih atau diisi sebelum mencetak formulir.'
    return
  }

  if (!form.value.tanggal) {
    validationError.value = 'Tanggal serah terima wajib diisi.'
    return
  }

  if (form.value.tujuan === 'lainnya' && !form.value.tujuanLainnya?.trim()) {
    validationError.value = 'Keterangan tujuan lainnya wajib diisi.'
    return
  }

  const hasAsetBaru = asetBaruList.value.some((a) => a.id_aset)
  const hasAsetLama = asetLamaList.value.some((a) => a.id_aset)
  if (!hasAsetBaru && !hasAsetLama) {
    validationError.value =
      'Minimal pilih salah satu Aset (Aset Baru / Aset Lama) untuk serah terima.'
    return
  }

  // Format Date to Indonsian Date (e.g. 21 Juli 2026)
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ]
  const d = new Date(form.value.tanggal)
  const formattedDate = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`

  // Check Tujuan marks
  const isTujuanBaru = form.value.tujuan === 'baru' ? '✓' : ''
  const isTujuanPeminjaman =
    form.value.tujuan === 'peminjaman' || form.value.tujuan === 'pengembalian' ? '✓' : ''
  const isTujuanPerbaikan =
    form.value.tujuan === 'perbaikan' || form.value.tujuan === 'penggantian' ? '✓' : ''
  const isTujuanDisposal = form.value.tujuan === 'disposal' ? '✓' : ''
  const isTujuanLainnya = form.value.tujuan === 'lainnya' ? '✓' : ''
  const tujuanLainnyaText =
    form.value.tujuan === 'lainnya' ? escapeHtml(form.value.tujuanLainnya) : ''

  // Strikethrough logic for Peminjaman/Pengembalian
  let labelPeminjamanHtml = 'Peminjaman/Pengembalian'
  if (form.value.tujuan === 'peminjaman') {
    labelPeminjamanHtml = 'Peminjaman/<s>Pengembalian</s>'
  } else if (form.value.tujuan === 'pengembalian') {
    labelPeminjamanHtml = '<s>Peminjaman</s>/Pengembalian'
  }

  // Strikethrough logic for Perbaikan/Penggantian
  let labelPerbaikanHtml = 'Perbaikan/Penggantian'
  if (form.value.tujuan === 'perbaikan') {
    labelPerbaikanHtml = 'Perbaikan/<s>Penggantian</s>'
  } else if (form.value.tujuan === 'penggantian') {
    labelPerbaikanHtml = '<s>Perbaikan</s>/Penggantian'
  }

  // Section 3: Daftar Data Serah Terima Aset
  let section3Html = ''
  if (hasAsetBaru || hasAsetLama) {
    section3Html += '<h3 class="section-title">III. Daftar Data Serah Terima Aset</h3>'

    if (hasAsetBaru) {
      const maxRows = 3
      let rowsBaruHtml = ''
      const validAssetsBaru = asetBaruList.value.filter((a) => a.id_aset)
      for (let i = 0; i < maxRows; i++) {
        const asset = validAssetsBaru[i] || {}
        rowsBaruHtml += `
          <tr>
            <td style="text-align: center;">${i + 1}</td>
            <td>${escapeHtml(asset.tipe)}</td>
            <td style="text-align: center;">${asset.id_aset ? escapeHtml(asset.qty || 1) : ''}</td>
            <td>${escapeHtml(asset.spesifikasi)}</td>
          </tr>
        `
      }

      section3Html += `
        <div style="font-size: 8.5px; font-weight: bold; margin-bottom: 4px;">
          A. &nbsp; Pihak Pemberi telah memastikan bahwa seluruh aset yang diserahkan sudah melalui proses pengecekan saat diserahkan.
        </div>
        <table class="border-table">
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">No</th>
              <th style="width: 25%;">Deskripsi/Jenis Aset</th>
              <th style="width: 8%; text-align: center;">Qty</th>
              <th style="width: 62%;">Spesifikasi Merk/Tipe/Model & Nomor Serial (S/N)/Hostname</th>
            </tr>
          </thead>
          <tbody>
            ${rowsBaruHtml}
          </tbody>
        </table>
      `
    }

    if (hasAsetLama) {
      const maxRows = 3
      let rowsLamaHtml = ''
      const validAssetsLama = asetLamaList.value.filter((a) => a.id_aset)
      for (let i = 0; i < maxRows; i++) {
        const asset = validAssetsLama[i] || {}
        rowsLamaHtml += `
          <tr>
            <td style="text-align: center;">${i + 1}</td>
            <td>${escapeHtml(asset.tipe)}</td>
            <td style="text-align: center;">${asset.id_aset ? escapeHtml(asset.qty || 1) : ''}</td>
            <td>${escapeHtml(asset.spesifikasi)}</td>
          </tr>
        `
      }

      section3Html += `
        <div style="font-size: 8.5px; font-weight: bold; margin-top: 6px; margin-bottom: 4px;">
          B. &nbsp; Tabel di bawah ini diisi dengan data aset lama, apabila aktivitas serah terima disertai dengan penggantian aset.
        </div>
        <table class="border-table">
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">No</th>
              <th style="width: 25%;">Deskripsi/Jenis Aset</th>
              <th style="width: 8%; text-align: center;">Qty</th>
              <th style="width: 62%;">Spesifikasi Merk/Tipe/Model & Nomor Serial (S/N)/Hostname</th>
            </tr>
          </thead>
          <tbody>
            ${rowsLamaHtml}
          </tbody>
        </table>
      `
    }
  }

  const safeForm = Object.fromEntries(
    Object.entries(form.value).map(([key, value]) => [key, escapeHtml(value)]),
  )

  const html = ((form) => `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Formulir Serah Terima Aset Perusahaan</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 15mm;
        }
        body {
          font-family: Arial, sans-serif;
          color: #000000;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 10px;
          line-height: 1.4;
        }
        .header {
          display: flex;
          align-items: center;
          position: relative;
          margin-bottom: 12px;
          padding-bottom: 8px;
        }
        .header img {
          height: 42px;
          object-fit: contain;
        }
        .header-title {
          flex: 1;
          text-align: center;
        }
        .header-title h1 {
          margin: 0;
          font-size: 16px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .header-title h2 {
          margin: 4px 0 0 0;
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .intro-text {
          font-size: 9px;
          margin-bottom: 10px;
        }
        h3.section-title {
          font-size: 10px;
          font-weight: bold;
          margin: 10px 0 4px 0;
          text-transform: uppercase;
        }
        table.border-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        table.border-table th, table.border-table td {
          border: 1px solid #000000;
          padding: 5px 8px;
          text-align: left;
          font-size: 9px;
        }
        table.border-table th {
          background: #ffffff;
          font-weight: bold;
        }
        .tujuan-grid {
          display: flex;
          border: 1px solid #000000;
          padding: 6px;
          margin-bottom: 10px;
          font-size: 9px;
          justify-content: space-between;
        }
        .tujuan-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .tujuan-box {
          display: inline-block;
          width: 11px;
          height: 11px;
          border: 1px solid #000000;
          text-align: center;
          line-height: 11px;
          font-size: 9px;
          font-weight: bold;
        }
        .ketentuan-list {
          margin: 0 0 10px 0;
          padding-left: 14px;
          font-size: 8.5px;
          text-align: justify;
        }
        .ketentuan-list li {
          margin-bottom: 5px;
        }
        .pernyataan-box {
          font-size: 8.5px;
          margin-bottom: 15px;
          text-align: justify;
        }
        .sign-date {
          font-size: 9px;
          margin-bottom: 8px;
          font-weight: bold;
        }
        table.signature-table {
          width: 100%;
          border-collapse: collapse;
        }
        table.signature-table td {
          border: 1px solid #000000;
          width: 33.33%;
          height: 80px;
          vertical-align: top;
          padding: 6px;
          font-size: 9px;
        }
        .sig-title {
          font-weight: bold;
          text-transform: uppercase;
          text-align: center;
          margin-bottom: 40px;
        }
        .sig-name {
          text-align: center;
          border-bottom: 1px solid #000000;
          margin: 0 auto;
          width: 80%;
          padding-bottom: 2px;
          font-weight: bold;
        }
        .sig-sub {
          text-align: center;
          font-size: 8px;
          color: #000000;
          margin-top: 2px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="/ESB Logo.svg" alt="ESB Logo" />
        <div class="header-title">
          <h1>Formulir Serah Terima</h1>
          <h2>Aset Perusahaan</h2>
        </div>
        <div style="width: 120px;"></div> <!-- Spacer matching logo width for centering title -->
      </div>

      <div class="intro-text">
        Telah dilakukan serah terima aset milik PT Esensi Solusi Buana kepada karyawan atau pihak yang bersangkutan dengan detail sebagai berikut:
      </div>

      <h3 class="section-title">I. Profil Pihak Terkait</h3>
      <table class="border-table">
        <thead>
          <tr>
            <th style="width: 25%;">Detail</th>
            <th style="width: 37.5%;">Pihak Pemberi</th>
            <th style="width: 37.5%;">Pihak Penerima</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="font-bold">Nama Lengkap</td>
            <td>${form.value.pemberiNama}</td>
            <td>${form.value.penerimaNama || '—'}</td>
          </tr>
          <tr>
            <td class="font-bold">Direktorat</td>
            <td>${form.value.pemberiDirektorat}</td>
            <td>${form.value.penerimaDirektorat || '—'}</td>
          </tr>
        </tbody>
      </table>

      <h3 class="section-title">II. Tujuan Serah Terima Aset</h3>
      <div style="font-size: 8px; margin-bottom: 3px; font-style: italic; color: #000000;">Beri tanda centang [✓] pada kolom dan coret yang tidak sesuai.</div>
      <div class="tujuan-grid">
        <div class="tujuan-item">
          <span class="tujuan-box">${isTujuanBaru}</span>
          <span>Serah Terima Baru</span>
        </div>
        <div class="tujuan-item">
          <span class="tujuan-box">${isTujuanPeminjaman}</span>
          <span>${labelPeminjamanHtml}</span>
        </div>
        <div class="tujuan-item">
          <span class="tujuan-box">${isTujuanPerbaikan}</span>
          <span>${labelPerbaikanHtml}</span>
        </div>
        <div class="tujuan-item">
          <span class="tujuan-box">${isTujuanDisposal}</span>
          <span>Disposal</span>
        </div>
        <div class="tujuan-item">
          <span class="tujuan-box">${isTujuanLainnya}</span>
          <span>Lainnya: ${tujuanLainnyaText || '___________'}</span>
        </div>
      </div>

      ${section3Html}

      <h3 class="section-title">IV. Ketentuan Penggunaan Aset</h3>
      <div style="font-size: 8px; margin-bottom: 3px; color: #000000;">Dengan menandatangani dokumen ini, Pihak Penerima menyatakan tunduk pada kebijakan dari penggunaan aset perusahaan sebagai berikut:</div>
      <ol class="ketentuan-list">
        <li><strong>Tanggung Jawab & Pemeliharaan:</strong> Pihak Penerima bertanggung jawab penuh atas keamanan dan pemeliharaan aset, termasuk menjaga kebersihan serta kelayakan fungsinya. Segala kerusakan akibat tumpahan cairan, benturan, jatuh, kehilangan, atau kelalaian penyimpanan menjadi tanggung jawab Pihak Penerima sepenuhnya.</li>
        <li><strong>Batasan Penggunaan:</strong> Aset hanya digunakan untuk kepentingan operasional <strong>PT Esensi Solusi Buana</strong>. Pihak Penerima dilarang melakukan modifikasi terhadap perangkat fisik (hardware) maupun perangkat lunak (software) tanpa izin dari <strong>People Business Partner</strong>. Penggunaan untuk kepentingan pribadi atau pihak ketiga tanpa persetujuan merupakan pelanggaran kode etik perusahaan.</li>
        <li><strong>Pelaporan Kerusakan & Kehilangan:</strong> Jika terjadi kerusakan akibat kelalaian atau pelanggaran, maupun kehilangan, Pihak Penerima wajib melaporkan kepada Perusahaan paling lambat dalam waktu <strong>1x24 jam</strong> melalui <strong>People Business Partner</strong> terkait.. Atas kejadian tersebut, Pihak Penerima dapat dikenakan sanksi berupa biaya perbaikan, penggantian unit baru, atau penggantian senilai harga pasar aset sesuai ketentuan yang berlaku.</li>
        <li><strong>Audit & Verifikasi:</strong> Perusahaan berhak melakukan verifikasi fisik (audit) terhadap aset sewaktu-waktu untuk memastikan kondisi dan status aset tetap terjaga. Pihak Penerima dengan ini memberikan persetujuan penuh kepada Perusahaan untuk melakukan verifikasi aset sebagai bagian dari kewajiban audit.</li>
        <li><strong>Pengembalian Aset:</strong> Seluruh aset wajib dikembalikan dalam kondisi utuh dan berfungsi baik, kecuali apabila pengembalian dilakukan karena kerusakan yang mengharuskan penggantian unit. Dalam hal terjadi kerusakan, aset tetap wajib dikembalikan untuk proses verifikasi dan penggantian sesuai ketentuan. Semua aset yang masih dimiliki Pihak Penerima wajib diserahkan selambat-lambatnya pada saat berakhirnya hubungan kerja.</li>
        <li><strong>Dukungan & Hak Tarik:</strong> Pihak Pemberi memberikan dukungan teknis atas kerusakan fungsional atau alami (bukan akibat kelalaian). Selain itu, Pihak Pemberi berhak menarik kembali aset sewaktu-waktu apabila ditemukan penyalahgunaan atau terdapat kebutuhan operasional mendesak.</li>
      </ol>

      <h3 class="section-title">V. Pernyataan Dan Persetujuan</h3>
      <div class="pernyataan-box">
        Dengan menandatangani dokumen ini, Pihak Pemberi dan Pihak Penerima menyatakan bahwa seluruh informasi yang tercantum dalam formulir ini adalah benar, lengkap, serta dibuat secara sadar tanpa paksaan dari pihak manapun, dan bahwa keduanya telah membaca, memahami, menyetujui, serta bersedia mematuhi seluruh ketentuan penggunaan aset perusahaan sebagaimana tercantum pada Bagian IV.
      </div>

      <div class="sign-date">Jakarta, ${escapeHtml(formattedDate)}</div>

      <table class="signature-table">
        <tbody>
          <tr>
            <td>
              <div class="sig-title">Diserahkan Oleh</div>
              <div style="height: 50px;"></div>
              <div class="sig-name">${escapeHtml(form.value.pemberiNama)}</div>
              <div class="sig-sub">${escapeHtml(form.value.pemberiDirektorat)}</div>
            </td>
            <td>
              <div class="sig-title">Diterima Oleh</div>
              <div style="height: 50px;"></div>
              <div class="sig-name">${form.value.penerimaNama || '__________________'}</div>
              <div class="sig-sub">${form.value.penerimaDirektorat || '__________________'}</div>
            </td>
            <td>
              <div class="sig-title">Diketahui Oleh</div>
              <div style="height: 50px;"></div>
              <div class="sig-name">${form.value.mengetahuiNama || '&nbsp;'}</div>
              <div class="sig-sub">${form.value.mengetahuiJabatan || 'People Business Partner atau Asset Management'}</div>
            </td>
          </tr>
        </tbody>
      </table>

    </body>
    </html>
  `)({ value: safeForm })

  return printHtmlDocument(html, 'Pop-up terblokir. Harap izinkan pop-up untuk mencetak PDF.')
}

onMounted(fetchData)
</script>

<template>
  <div
    class="submissions-page flex min-w-0 flex-col gap-5"
    :data-testid="!isLoading ? 'page-ready' : undefined"
  >
    <!-- ── Page Header ─────────────────────────────────────────── -->
    <div
      class="submission-page-header flex items-center gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E2E8F0]/80 shadow-2xs"
    >
      <div
        class="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF5FF] text-[#0A5DBD] border border-[#B8D4F5]/40"
      >
        <span class="material-symbols-outlined text-[20px] sm:text-[22px]">assignment</span>
      </div>
      <div class="min-w-0">
        <h1 class="text-base sm:text-lg font-bold text-[#333333] tracking-tight truncate">
          Formulir Serah Terima Aset
        </h1>
        <p class="text-xs font-normal text-[#64748B] mt-0.5 truncate">
          Dokumentasi &amp; Berita Acara Serah Terima (BAST) perangkat IT &amp; inventaris
        </p>
      </div>
    </div>

    <ol class="submission-steps" aria-label="Tahapan pengisian">
      <li><span>1</span>Pihak terkait</li>
      <li><span>2</span>Tujuan</li>
      <li><span>3</span>Daftar aset</li>
      <li><span>4</span>Pengesahan & Cetak</li>
    </ol>
    <!-- Loading Form Skeleton -->
    <div v-if="isLoading" role="status" aria-busy="true" class="flex flex-col gap-5 select-none">
      <!-- Section 1 Skeleton: Profil Pihak Terkait -->
      <div
        class="rounded-2xl border border-[#E2E8F0]/80 bg-white p-4 sm:p-6 shadow-2xs flex flex-col gap-4"
      >
        <div class="flex items-center gap-2.5 border-b border-[#F1F5F9] pb-3.5">
          <BaseSkeleton width="24px" height="24px" radius="md" />
          <div class="flex flex-col gap-1">
            <BaseSkeleton width="180px" height="16px" radius="md" />
            <BaseSkeleton width="120px" height="12px" radius="sm" />
          </div>
        </div>
        <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div
            v-for="i in 2"
            :key="'pihak-skel-' + i"
            class="flex flex-col gap-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4"
          >
            <BaseSkeleton width="150px" height="14px" radius="md" />
            <BaseSkeleton width="100%" height="40px" radius="xl" />
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <BaseSkeleton width="100%" height="40px" radius="xl" />
              <BaseSkeleton width="100%" height="40px" radius="xl" />
            </div>
          </div>
        </div>
      </div>

      <!-- Section 2 Skeleton: Tujuan Serah Terima Aset -->
      <div
        class="rounded-2xl border border-[#E2E8F0]/80 bg-white p-4 sm:p-6 shadow-2xs flex flex-col gap-4"
      >
        <div class="flex items-center gap-2.5 border-b border-[#F1F5F9] pb-3.5">
          <BaseSkeleton width="24px" height="24px" radius="md" />
          <div class="flex flex-col gap-1">
            <BaseSkeleton width="210px" height="16px" radius="md" />
            <BaseSkeleton width="140px" height="12px" radius="sm" />
          </div>
        </div>
        <div class="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div
            v-for="i in 7"
            :key="'tujuan-skel-' + i"
            class="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3"
          >
            <BaseSkeleton width="24px" height="24px" radius="md" />
            <BaseSkeleton width="90px" height="14px" radius="sm" />
          </div>
        </div>
      </div>

      <!-- Section 3 Skeleton: Data Unit -->
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div
          class="rounded-2xl border border-[#E2E8F0]/80 bg-white p-4 sm:p-6 shadow-2xs flex flex-col gap-4"
        >
          <div class="flex items-center gap-2.5 border-b border-[#F1F5F9] pb-3.5">
            <BaseSkeleton width="24px" height="24px" radius="md" />
            <BaseSkeleton width="190px" height="16px" radius="md" />
          </div>
          <BaseSkeleton width="100%" height="120px" radius="xl" />
        </div>
        <div
          class="rounded-2xl border border-[#E2E8F0]/80 bg-white p-4 sm:p-6 shadow-2xs flex flex-col gap-4"
        >
          <div class="flex items-center gap-2.5 border-b border-[#F1F5F9] pb-3.5">
            <BaseSkeleton width="24px" height="24px" radius="md" />
            <BaseSkeleton width="190px" height="16px" radius="md" />
          </div>
          <BaseSkeleton width="100%" height="120px" radius="xl" />
        </div>
      </div>

      <!-- Section 4 Skeleton: Diketahui Oleh -->
      <div
        class="rounded-2xl border border-[#E2E8F0]/80 bg-white p-4 sm:p-6 shadow-2xs flex flex-col gap-4"
      >
        <div class="flex items-center gap-2.5 border-b border-[#F1F5F9] pb-3.5">
          <BaseSkeleton width="24px" height="24px" radius="md" />
          <div class="flex flex-col gap-1">
            <BaseSkeleton width="230px" height="16px" radius="md" />
            <BaseSkeleton width="320px" height="12px" radius="sm" />
          </div>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <BaseSkeleton width="100%" height="40px" radius="xl" />
          <BaseSkeleton width="100%" height="40px" radius="xl" />
          <BaseSkeleton width="100%" height="40px" radius="xl" />
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="pageError"
      role="alert"
      class="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-[13px] text-rose-700 shadow-2xs"
    >
      <span class="material-symbols-outlined text-[20px] shrink-0 text-rose-600">error</span>
      <span class="flex-1 font-medium">{{ pageError }}</span>
      <button
        type="button"
        class="h-8.5 rounded-xl bg-rose-600 px-3.5 text-xs font-bold text-white hover:bg-rose-700 transition-all cursor-pointer"
        @click="fetchData"
      >
        Coba Lagi
      </button>
    </div>

    <!-- Main Submission Form -->
    <form v-else class="flex flex-col gap-5" @submit.prevent="generatePdf">
      <!-- Validation Error Banner -->
      <div
        v-if="validationError"
        role="alert"
        aria-live="assertive"
        class="flex items-start sm:items-center gap-3 p-4 rounded-2xl border border-rose-300 bg-rose-50 text-rose-800 text-[12px] font-semibold shadow-2xs"
      >
        <span class="material-symbols-outlined shrink-0 text-[20px] text-rose-600">error</span>
        <span class="flex-1 leading-relaxed">{{ validationError }}</span>
        <button
          type="button"
          class="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
          @click="validationError = ''"
          title="Tutup pesan error"
        >
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <!-- Section 1: Profil Pihak Terkait -->
      <div
        class="submission-section bg-white rounded-2xl border border-[#E2E8F0]/80 p-4 sm:p-6 shadow-2xs flex flex-col gap-4"
      >
        <div class="flex items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3.5">
          <div class="flex items-center gap-2.5">
            <span
              class="flex h-6 w-6 items-center justify-center rounded-lg bg-[#EDF5FF] text-[#333333] text-[11px] font-bold"
            >
              01
            </span>
            <div>
              <h2 class="text-[14px] sm:text-[15px] font-bold text-[#333333]">
                Profil Pihak Terkait
              </h2>
              <p class="text-[11.5px] text-[#64748B]">
                Tentukan identitas pihak pemberi dan penerima aset
              </p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
          <!-- Pihak Pemberi (Karyawan) -->
          <div
            class="flex flex-col gap-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4"
          >
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px] text-[#333333]"
                >person_outline</span
              >
              <h3 class="text-xs font-bold uppercase tracking-wider text-[#333333]">
                Pihak Pemberi (Karyawan)
              </h3>
            </div>

            <label class="flex flex-col gap-1.5">
              <span class="text-[10.5px] font-bold uppercase text-[#475569]">Pilih Karyawan *</span>
              <SearchableSelect
                v-model="form.pemberiNik"
                :options="employees"
                value-key="nik"
                label-key="nama_karyawan"
                secondary-label-key="nik"
                placeholder="Pilih karyawan pemberi"
                search-placeholder="Cari nama atau NIK..."
                height-class="h-10"
              />
            </label>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="flex flex-col gap-1.5">
                <span class="text-[10px] font-bold uppercase text-[#64748B]"
                  >Nama Lengkap (Auto)</span
                >
                <input
                  v-model="form.pemberiNama"
                  required
                  type="text"
                  aria-label="Nama Lengkap Pemberi (Auto)"
                  class="h-10 w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 text-xs font-medium text-slate-600 outline-none cursor-default"
                  readonly
                  placeholder="Terisi otomatis"
                />
              </label>

              <label class="flex flex-col gap-1.5">
                <span class="text-[10px] font-bold uppercase text-[#64748B]"
                  >Direktorat (Auto)</span
                >
                <input
                  v-model="form.pemberiDirektorat"
                  required
                  type="text"
                  aria-label="Direktorat Pemberi (Auto)"
                  class="h-10 w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 text-xs font-medium text-slate-600 outline-none cursor-default"
                  readonly
                  placeholder="Terisi otomatis"
                />
              </label>
            </div>
          </div>

          <!-- Pihak Penerima -->
          <div
            class="flex flex-col gap-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-amber-600">person_add</span>
                <h3 class="text-xs font-bold uppercase tracking-wider text-amber-600">
                  Pihak Penerima
                </h3>
              </div>

              <label class="flex items-center gap-1.5 cursor-pointer select-none py-0.5">
                <input
                  v-model="form.isPenerimaLainnya"
                  type="checkbox"
                  aria-label="Penerima Non-Karyawan (Vendor/Lainnya)"
                  class="rounded border-slate-300 accent-[#0A51B0] h-4 w-4 cursor-pointer"
                />
                <span class="text-[11px] font-bold text-[#475569]"
                  >Non-Karyawan (Vendor/Lainnya)</span
                >
              </label>
            </div>

            <label v-if="!form.isPenerimaLainnya" class="flex flex-col gap-1.5">
              <span class="text-[10.5px] font-bold uppercase text-[#475569]">Pilih Karyawan *</span>
              <SearchableSelect
                v-model="form.penerimaNik"
                :options="employees"
                value-key="nik"
                label-key="nama_karyawan"
                secondary-label-key="nik"
                placeholder="Pilih karyawan penerima"
                search-placeholder="Cari nama atau NIK..."
                height-class="h-10"
              />
            </label>

            <div v-else class="flex flex-col gap-1.5">
              <span class="text-[10.5px] font-bold uppercase text-[#475569]"
                >Nama Lengkap / Vendor *</span
              >
              <input
                v-model="form.penerimaNama"
                required
                type="text"
                aria-label="Nama Lengkap / Vendor Penerima"
                class="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#333333] placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all"
                placeholder="Tulis nama lengkap penerima atau vendor..."
              />
            </div>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label v-if="!form.isPenerimaLainnya" class="flex flex-col gap-1.5">
                <span class="text-[10px] font-bold uppercase text-[#64748B]"
                  >Nama Lengkap (Auto)</span
                >
                <input
                  v-model="form.penerimaNama"
                  required
                  type="text"
                  aria-label="Nama Lengkap Penerima (Auto)"
                  class="h-10 w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 text-xs font-medium text-slate-600 outline-none cursor-default"
                  readonly
                  placeholder="Terisi otomatis"
                />
              </label>

              <label
                class="flex flex-col gap-1.5"
                :class="form.isPenerimaLainnya ? 'sm:col-span-2' : ''"
              >
                <span class="text-[10px] font-bold uppercase text-[#64748B]">
                  {{ form.isPenerimaLainnya ? 'Direktorat / Perusahaan *' : 'Direktorat (Auto)' }}
                </span>
                <input
                  v-model="form.penerimaDirektorat"
                  required
                  type="text"
                  :aria-label="
                    form.isPenerimaLainnya
                      ? 'Direktorat / Perusahaan Penerima'
                      : 'Direktorat Penerima (Auto)'
                  "
                  class="h-10 w-full rounded-xl border px-3 text-xs font-medium outline-none transition-all"
                  :class="
                    !form.isPenerimaLainnya
                      ? 'border-slate-200 bg-slate-100/70 text-slate-600 cursor-default'
                      : 'border-[#E2E8F0] bg-white text-[#333333] placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10'
                  "
                  :readonly="!form.isPenerimaLainnya"
                  :placeholder="
                    form.isPenerimaLainnya
                      ? 'Tulis nama direktorat, departemen, atau perusahaan...'
                      : 'Terisi otomatis'
                  "
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 2: Tujuan Serah Terima -->
      <div
        class="submission-section bg-white rounded-2xl border border-[#E2E8F0]/80 p-4 sm:p-6 shadow-2xs flex flex-col gap-4"
      >
        <div class="flex items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3.5">
          <div class="flex items-center gap-2.5">
            <span
              class="flex h-6 w-6 items-center justify-center rounded-lg bg-[#EDF5FF] text-[#333333] text-[11px] font-bold"
            >
              02
            </span>
            <div>
              <h2 class="text-[14px] sm:text-[15px] font-bold text-[#333333]">
                Tujuan Serah Terima Aset
              </h2>
              <p class="text-[11.5px] text-[#64748B]">
                Pilih salah satu keperluan serah terima perangkat
              </p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <label
            v-for="t in [
              {
                key: 'baru',
                label: 'Serah Terima Baru',
                icon: 'fiber_new',
                color: 'text-[#333333] bg-[#EDF5FF]',
              },
              {
                key: 'peminjaman',
                label: 'Peminjaman',
                icon: 'handshake',
                color: 'text-amber-600 bg-amber-50',
              },
              {
                key: 'pengembalian',
                label: 'Pengembalian',
                icon: 'keyboard_return',
                color: 'text-indigo-600 bg-indigo-50',
              },
              {
                key: 'perbaikan',
                label: 'Perbaikan',
                icon: 'build',
                color: 'text-rose-600 bg-rose-50',
              },
              {
                key: 'penggantian',
                label: 'Penggantian',
                icon: 'swap_horiz',
                color: 'text-purple-600 bg-purple-50',
              },
              {
                key: 'disposal',
                label: 'Disposal Aset',
                icon: 'delete_sweep',
                color: 'text-slate-600 bg-slate-100',
              },
              {
                key: 'lainnya',
                label: 'Lainnya',
                icon: 'more_horiz',
                color: 'text-teal-600 bg-teal-50',
              },
            ]"
            :key="t.key"
            class="flex cursor-pointer items-center justify-between min-h-[48px] rounded-xl border p-3 transition-all active:scale-[0.99] select-none"
            :class="
              form.tujuan === t.key
                ? 'border-[#0A51B0] bg-[#EDF5FF]/60 ring-2 ring-[#0A51B0]/15 shadow-2xs'
                : 'border-[#E2E8F0] bg-white hover:bg-slate-50 hover:border-slate-300'
            "
          >
            <div class="flex items-center gap-2.5 min-w-0 pr-2">
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[16px]"
                :class="form.tujuan === t.key ? 'bg-white text-[#333333] shadow-2xs' : t.color"
              >
                <span class="material-symbols-outlined text-[16px]">{{ t.icon }}</span>
              </span>
              <span
                class="text-xs font-bold truncate"
                :class="form.tujuan === t.key ? 'text-[#333333]' : 'text-[#334155]'"
              >
                {{ t.label }}
              </span>
            </div>
            <input
              v-model="form.tujuan"
              type="radio"
              name="tujuan"
              :value="t.key"
              :aria-label="t.label"
              class="accent-[#0A51B0] cursor-pointer shrink-0 h-4 w-4"
            />
          </label>
        </div>

        <div v-if="form.tujuan === 'lainnya'" class="mt-1 flex flex-col gap-1.5">
          <span class="text-[10px] font-bold uppercase text-[#475569]"
            >Keterangan Tujuan Lainnya *</span
          >
          <input
            v-model="form.tujuanLainnya"
            required
            type="text"
            aria-label="Keterangan Tujuan Serah Terima Lainnya"
            class="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#333333] placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all"
            placeholder="Tuliskan tujuan serah terima aset lainnya..."
          />
        </div>
      </div>

      <!-- Section 3 & 4: Data Serah Terima Aset (Baru & Lama) -->
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <!-- Aset Baru (Diserahkan) -->
        <div
          class="submission-section bg-white rounded-2xl border border-[#E2E8F0]/80 p-4 sm:p-6 shadow-2xs flex flex-col gap-4"
        >
          <div class="flex items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3.5">
            <div class="flex items-center gap-2.5 min-w-0">
              <span
                class="flex h-6 w-6 items-center justify-center rounded-lg bg-[#EDF5FF] text-[#333333] text-[11px] font-bold shrink-0"
              >
                03
              </span>
              <div class="min-w-0">
                <h2 class="text-[14px] sm:text-[15px] font-bold text-[#333333] truncate">
                  Aset Baru (Diserahkan)
                </h2>
                <p class="text-[11.5px] text-[#64748B] truncate">
                  Perangkat yang diserahkan ke penerima
                </p>
              </div>
            </div>

            <button
              type="button"
              @click="addAssetBaruRow"
              class="h-8.5 shrink-0 whitespace-nowrap rounded-xl bg-[#0A51B0] px-3 text-xs font-bold text-white shadow-2xs hover:bg-[#0A4391] active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <span class="material-symbols-outlined text-[15px]">add</span>
              <span>Tambah Unit</span>
            </button>
          </div>

          <div class="flex flex-col gap-3.5">
            <div
              v-for="(row, index) in asetBaruList"
              :key="index"
              class="submission-unit flex flex-col gap-3 rounded-xl sm:rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 sm:p-4 transition-all"
            >
              <!-- Card Unit Header -->
              <div
                class="flex items-center justify-between border-b border-slate-200/60 pb-2 mb-0.5"
              >
                <span
                  class="inline-flex items-center gap-1.5 rounded-lg bg-[#EDF5FF] px-2.5 py-0.5 text-[11px] font-bold text-[#333333] border border-[#B8D4F5]/40"
                >
                  <span class="material-symbols-outlined text-[14px]">devices</span>
                  Unit Baru #{{ index + 1 }}
                </span>

                <button
                  v-if="asetBaruList.length > 1"
                  type="button"
                  @click="removeAssetBaruRow(index)"
                  class="flex h-7 items-center gap-1 rounded-lg bg-rose-50 px-2 text-[10.5px] font-bold text-rose-600 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer border border-rose-200/60"
                  title="Hapus baris unit ini"
                >
                  <span class="material-symbols-outlined text-[14px]">delete</span>
                  <span>Hapus</span>
                </button>
              </div>

              <label class="flex flex-col gap-1.5">
                <span class="text-[10px] font-bold uppercase text-[#475569]">Pilih Aset IT *</span>
                <SearchableSelect
                  v-model="row.id_aset"
                  :options="assets"
                  value-key="id_aset"
                  label-key="label_aset"
                  secondary-label-key="nomor_seri"
                  placeholder="Pilih Aset IT"
                  search-placeholder="Cari label, hostname, atau nomor seri..."
                  height-class="h-10"
                  @update:model-value="onAssetBaruSelect(index, $event)"
                />
              </label>

              <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5 sm:gap-2">
                <label class="flex flex-col gap-1.5 sm:col-span-3">
                  <span class="text-[9.5px] font-bold uppercase text-[#64748B]"
                    >Deskripsi / Tipe (Auto)</span
                  >
                  <input
                    v-model="row.tipe"
                    type="text"
                    :aria-label="`Deskripsi Aset Baru Baris ${index + 1}`"
                    class="h-9.5 w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 text-[11.5px] font-medium text-slate-600 outline-none cursor-default"
                    readonly
                    placeholder="Tipe perangkat"
                  />
                </label>

                <label class="flex flex-col gap-1.5 sm:col-span-1">
                  <span class="text-[9.5px] font-bold uppercase text-[#64748B]">Qty</span>
                  <input
                    v-model="row.qty"
                    required
                    type="number"
                    min="1"
                    :aria-label="`Jumlah (Qty) Aset Baru Baris ${index + 1}`"
                    class="h-9.5 w-full rounded-xl border border-[#E2E8F0] bg-white px-2.5 text-[11.5px] font-bold text-center text-[#333333] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all"
                  />
                </label>
              </div>

              <label class="flex flex-col gap-1.5">
                <span class="text-[9.5px] font-bold uppercase text-[#64748B]"
                  >Spesifikasi Lengkap (Auto)</span
                >
                <input
                  v-model="row.spesifikasi"
                  type="text"
                  :aria-label="`Spesifikasi Aset Baru Baris ${index + 1}`"
                  class="h-9.5 w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 text-[11.5px] font-medium text-slate-600 outline-none cursor-default"
                  readonly
                  placeholder="Merek / Model / Serial Number"
                />
              </label>
            </div>
          </div>
        </div>

        <!-- Aset Lama (Dikembalikan) -->
        <div
          class="submission-section bg-white rounded-2xl border border-[#E2E8F0]/80 p-4 sm:p-6 shadow-2xs flex flex-col gap-4"
        >
          <div class="flex items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3.5">
            <div class="flex items-center gap-2.5 min-w-0">
              <span
                class="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60 text-[11px] font-bold shrink-0"
              >
                03
              </span>
              <div class="min-w-0">
                <h2 class="text-[14px] sm:text-[15px] font-bold text-[#333333] truncate">
                  Aset Lama (Dikembalikan)
                </h2>
                <p class="text-[11.5px] text-[#64748B] truncate">
                  Perangkat lama jika ada penggantian
                </p>
              </div>
            </div>

            <button
              type="button"
              @click="addAssetLamaRow"
              class="h-8.5 shrink-0 whitespace-nowrap rounded-xl bg-slate-800 px-3 text-xs font-bold text-white shadow-2xs hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <span class="material-symbols-outlined text-[15px]">add</span>
              <span>Tambah Unit</span>
            </button>
          </div>

          <div class="flex flex-col gap-3.5">
            <div
              v-for="(row, index) in asetLamaList"
              :key="index"
              class="submission-unit flex flex-col gap-3 rounded-xl sm:rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 sm:p-4 transition-all"
            >
              <!-- Card Unit Header -->
              <div
                class="flex items-center justify-between border-b border-slate-200/60 pb-2 mb-0.5"
              >
                <span
                  class="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200/60"
                >
                  <span class="material-symbols-outlined text-[14px]"
                    >history_toggle_drop_down</span
                  >
                  Unit Lama #{{ index + 1 }}
                </span>

                <button
                  v-if="asetLamaList.length > 1"
                  type="button"
                  @click="removeAssetLamaRow(index)"
                  class="flex h-7 items-center gap-1 rounded-lg bg-rose-50 px-2 text-[10.5px] font-bold text-rose-600 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer border border-rose-200/60"
                  title="Hapus baris unit lama ini"
                >
                  <span class="material-symbols-outlined text-[14px]">delete</span>
                  <span>Hapus</span>
                </button>
              </div>

              <label class="flex flex-col gap-1.5">
                <span class="text-[10px] font-bold uppercase text-[#475569]"
                  >Aset IT Lama (Opsional)</span
                >
                <SearchableSelect
                  v-model="row.id_aset"
                  :options="assets"
                  value-key="id_aset"
                  label-key="label_aset"
                  secondary-label-key="nomor_seri"
                  placeholder="Pilih Aset IT Lama"
                  search-placeholder="Cari label, hostname, atau nomor seri..."
                  height-class="h-10"
                  @update:model-value="onAssetLamaSelect(index, $event)"
                />
              </label>

              <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5 sm:gap-2">
                <label class="flex flex-col gap-1.5 sm:col-span-3">
                  <span class="text-[9.5px] font-bold uppercase text-[#64748B]"
                    >Deskripsi / Tipe (Auto)</span
                  >
                  <input
                    v-model="row.tipe"
                    type="text"
                    :aria-label="`Deskripsi Aset Lama Baris ${index + 1}`"
                    class="h-9.5 w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 text-[11.5px] font-medium text-slate-600 outline-none cursor-default"
                    readonly
                    placeholder="Tipe perangkat"
                  />
                </label>

                <label class="flex flex-col gap-1.5 sm:col-span-1">
                  <span class="text-[9.5px] font-bold uppercase text-[#64748B]">Qty</span>
                  <input
                    v-model="row.qty"
                    required
                    type="number"
                    min="1"
                    :aria-label="`Jumlah (Qty) Aset Lama Baris ${index + 1}`"
                    class="h-9.5 w-full rounded-xl border border-[#E2E8F0] bg-white px-2.5 text-[11.5px] font-bold text-center text-[#333333] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all"
                  />
                </label>
              </div>

              <label class="flex flex-col gap-1.5">
                <span class="text-[9.5px] font-bold uppercase text-[#64748B]"
                  >Spesifikasi Lengkap (Auto)</span
                >
                <input
                  v-model="row.spesifikasi"
                  type="text"
                  :aria-label="`Spesifikasi Aset Lama Baris ${index + 1}`"
                  class="h-9.5 w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 text-[11.5px] font-medium text-slate-600 outline-none cursor-default"
                  readonly
                  placeholder="Merek / Model / Serial Number"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 4: Lembar Tanda Tangan: Diketahui Oleh -->
      <div
        class="submission-section bg-white rounded-2xl border border-[#E2E8F0]/80 p-4 sm:p-6 shadow-2xs flex flex-col gap-4"
      >
        <div class="flex items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3.5">
          <div class="flex items-center gap-2.5">
            <span
              class="flex h-6 w-6 items-center justify-center rounded-lg bg-[#EDF5FF] text-[#333333] text-[11px] font-bold"
            >
              04
            </span>
            <div>
              <h2 class="text-[14px] sm:text-[15px] font-bold text-[#333333]">Diketahui Oleh
              </h2>
              <p class="text-[11.5px] text-[#64748B]">
                Pilih atau tulis identitas pihak yang mengetahui untuk dicantumkan pada lembar tanda tangan formulir
              </p>
            </div>
          </div>

          <label class="flex items-center gap-1.5 cursor-pointer select-none py-0.5">
            <input
              v-model="form.isMengetahuiKustom"
              type="checkbox"
              aria-label="Input Manual Pihak Mengetahui"
              class="rounded border-slate-300 accent-[#0A51B0] h-4 w-4 cursor-pointer"
            />
            <span class="text-[11px] font-bold text-[#475569]">Input Manual</span>
          </label>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <!-- Pilih Karyawan / PBP -->
          <div v-if="!form.isMengetahuiKustom" class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[10.5px] font-bold uppercase text-[#475569]">Pilih Karyawan / PBP</span>
              <span class="text-[10px] text-slate-400 font-medium">(Opsional)</span>
            </div>
            <SearchableSelect
              v-model="form.mengetahuiNik"
              :options="employees"
              value-key="nik"
              label-key="nama_karyawan"
              secondary-label-key="nik"
              placeholder="Pilih nama yang mengetahui..."
              search-placeholder="Cari nama atau NIK..."
              height-class="h-10"
              :clearable="true"
            />
          </div>

          <div v-else class="flex flex-col gap-1.5">
            <span class="text-[10.5px] font-bold uppercase text-[#475569]">Nama Lengkap</span>
            <input
              v-model="form.mengetahuiNama"
              type="text"
              aria-label="Nama Lengkap yang Mengetahui"
              class="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#333333] placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all"
              placeholder="Tulis nama lengkap yang mengetahui..."
            />
          </div>

          <!-- Nama Terpilih (Auto) -->
          <div v-if="!form.isMengetahuiKustom" class="flex flex-col gap-1.5">
            <span class="text-[10px] font-bold uppercase text-[#64748B]">Nama Lengkap Terpilih</span>
            <input
              v-model="form.mengetahuiNama"
              type="text"
              aria-label="Nama Lengkap Mengetahui (Auto)"
              class="h-10 w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 text-xs font-medium text-slate-600 outline-none cursor-default"
              readonly
              placeholder="Kosong (tanda tangan manual)"
            />
          </div>

          <!-- Jabatan / Keterangan Tanda Tangan -->
          <div
            class="flex flex-col gap-1.5"
            :class="form.isMengetahuiKustom ? 'sm:col-span-1 lg:col-span-2' : ''"
          >
            <span class="text-[10px] font-bold uppercase text-[#64748B]">
              Jabatan / Unit Pada Dokumen
            </span>
            <input
              v-model="form.mengetahuiJabatan"
              type="text"
              aria-label="Jabatan atau Unit yang Mengetahui"
              class="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#333333] placeholder-[#94A3B8] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all"
              placeholder="People Business Partner atau Asset Management"
            />
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div
        class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0]/80 bg-white p-4 sm:p-5 shadow-2xs"
      >
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <span
            class="text-xs font-bold text-[#333333] whitespace-nowrap flex items-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[18px] text-slate-400">calendar_today</span>
            Tanggal Serah Terima:
          </span>
          <input
            v-model="form.tanggal"
            required
            type="date"
            aria-label="Tanggal Formulir Serah Terima"
            class="h-10 w-full sm:w-48 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-medium text-[#333333] focus:border-[#0A51B0] focus:bg-white focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all cursor-pointer"
          />
        </div>

        <button
          type="submit"
          class="h-11 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A51B0] px-6 text-xs font-bold text-white shadow-2xs hover:bg-[#0A4391] active:scale-95 transition-all cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">picture_as_pdf</span>
          <span>Cetak Formulir Serah Terima (PDF)</span>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.submissions-page {
  width: 100%;
  max-width: 1440px;
  margin-inline: auto;
}
.submission-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: center;
  gap: 12px;
  margin: 0;
  padding: 16px 20px;
  list-style: none;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}
.submission-steps li {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
  font-weight: 500;
}
.submission-steps li > span {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 8px;
  color: #0A5DBD;
  background: #EDF5FF;
  font-size: 11px;
  font-weight: 650;
}
.submission-page-header h1,
.submission-page-header p {
  white-space: normal;
  overflow: visible;
}
@media (max-width: 639px) {
  .submission-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 10px;
    padding: 14px;
  }
  .submission-steps li {
    font-size: 11px;
    gap: 8px;
  }
}
</style>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi.js'
import { useAuth } from '../composables/useAuth.js'
import SearchableSelect from '../components/ui/SearchableSelect.vue'
import BaseSkeleton from '../components/ui/skeleton/BaseSkeleton.vue'
import AppPagination from '../components/ui/AppPagination.vue'
import AppViewToggle from '../components/ui/AppViewToggle.vue'
import AppRowActions from '../components/ui/AppRowActions.vue'
import { animateStagger } from '../composables/useGsap.js'
import { escapeHtml, printHtmlDocument } from '../utils/printDocument.js'
import { normalizeLocation } from '../utils/locationNormalizer.js'

const { get, getAllPages, post, put, del } = useApi()
const route = useRoute()
const router = useRouter()
const { hasWritePermission } = useAuth()
const canWriteSubmissions = computed(() => hasWritePermission('submissions'))

// ── State ────────────────────────────────────────────────────
const employees = ref([])
const assets = ref([])
const isLoading = ref(true)
const pageError = ref('')
const validationError = ref('')
const saveMessage = ref('')
const savedSubmissions = ref([])
const selectedSubmissionId = ref(null)
const isSaving = ref(false)
const isHydratingSubmission = ref(false)
const isDetailLoading = ref(false)
const isFormOpen = computed(() => ['submission-new', 'submission-detail'].includes(route.name))
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = 10
const viewMode = ref('table')

const filteredSubmissions = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('id-ID')
  return savedSubmissions.value.filter((submission) => {
    const payload = submission.payload || {}
    const searchable = [submission.submission_number, payload.pemberiNama, payload.penerimaNama]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('id-ID')
    return !query || searchable.includes(query)
  })
})
const paginatedSubmissions = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredSubmissions.value.slice(start, start + itemsPerPage)
})
watch(searchQuery, () => {
  currentPage.value = 1
})
watch(
  () => route.fullPath,
  () => {
    if (!isLoading.value) loadRouteForm()
  },
)
function resetSubmissionFilters() {
  searchQuery.value = ''
  currentPage.value = 1
}
function formatSubmissionDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value))
}
function getSubmissionActions(submission) {
  const actions = [
    { label: 'Cetak BAST', icon: 'print', onClick: () => printSubmission(submission) },
  ]
  if (canWriteSubmissions.value) {
    actions.push({ label: 'Edit BAST', icon: 'edit', onClick: () => editSubmission(submission) })
    actions.push({
      label: 'Hapus BAST',
      icon: 'delete',
      danger: true,
      onClick: () => deleteSubmission(submission),
    })
  }
  return actions
}

// Form State
const emptyForm = () => ({
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
const form = ref(emptyForm())

// Dynamic list of assets (Up to 3 by default, matching template)
const asetBaruList = ref([{ id_aset: '', tipe: '', qty: 1, spesifikasi: '' }])
const asetLamaList = ref([{ id_aset: '', tipe: '', qty: 1, spesifikasi: '' }])

// ── Fetch Data ───────────────────────────────────────────────
async function fetchData() {
  isLoading.value = true
  pageError.value = ''
  try {
    const [employeeData, assetData, submissionData] = await Promise.all([
      get('/api/karyawan?all=true').catch((error) => {
        if (canWriteSubmissions.value) throw error
        return []
      }),
      get('/api/assets?all=true').catch((error) => {
        if (canWriteSubmissions.value) throw error
        return []
      }),
      getAllPages('/api/submissions'),
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
    savedSubmissions.value = submissionData
    await loadRouteForm()
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
    if (isHydratingSubmission.value) return
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
    if (isHydratingSubmission.value) return
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
    if (isHydratingSubmission.value) return
    form.value.penerimaNik = ''
    form.value.penerimaNama = ''
    form.value.penerimaDirektorat = ''
  },
)

// Autofill Pihak Mengetahui when selected
watch(
  () => form.value.mengetahuiNik,
  (nik) => {
    if (isHydratingSubmission.value) return
    const emp = employees.value.find((e) => e.nik === nik)
    if (emp) {
      form.value.mengetahuiNama = emp.nama_karyawan || ''
      form.value.mengetahuiJabatan =
        emp.title ||
        emp.jabatan ||
        emp.departemen ||
        'People Business Partner atau Asset Management'
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
    if (isHydratingSubmission.value) return
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

// aset_ti links holders by NIK; imported name-only holders are not free stock.
function eligibleSubmissionAssets(list, parties, kind) {
  const text = (value) => String(value ?? '').trim()
  const niks = [parties.pemberiNik, !parties.isPenerimaLainnya && parties.penerimaNik]
    .filter(Boolean)
    .map(text)
    .filter(Boolean)
  return list.filter((asset) => {
    const nik = text(asset.nik_pemegang_asset)
    const name = text(asset.nama_karyawan_pemegang_asset)
    return kind === 'baru' ? !nik && (!name || name === '-') : !!nik && niks.includes(nik)
  })
}

const assetBaruOptions = computed(() => eligibleSubmissionAssets(assets.value, form.value, 'baru'))
const assetLamaOptions = computed(() => eligibleSubmissionAssets(assets.value, form.value, 'lama'))
const historicAssetRows = new WeakSet()
function rememberAssetHistory() {
  for (const row of [...asetBaruList.value, ...asetLamaList.value]) historicAssetRows.add(row)
}
function assetSelectionError() {
  for (const [rows, options, label] of [
    [asetBaruList.value, assetBaruOptions.value, 'Baru'],
    [asetLamaList.value, assetLamaOptions.value, 'Lama'],
  ]) {
    if (
      rows.some(
        (row) =>
          row.id_aset &&
          !historicAssetRows.has(row) &&
          !options.some((asset) => asset.id_aset === row.id_aset),
      )
    ) {
      return `Pilihan Unit ${label} tidak sesuai pemegang saat ini. Pilih ulang atau kosongkan aset.`
    }
  }
  return ''
}

// Autofill Asset Baru row details when selected
function onAssetBaruSelect(index, id_aset) {
  const asset = assetBaruOptions.value.find((a) => a.id_aset === id_aset)
  if (id_aset && !asset) return
  historicAssetRows.delete(asetBaruList.value[index])
  asetBaruList.value[index].id_aset = id_aset
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
  const asset = assetLamaOptions.value.find((a) => a.id_aset === id_aset)
  if (id_aset && !asset) return
  historicAssetRows.delete(asetLamaList.value[index])
  asetLamaList.value[index].id_aset = id_aset
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

function buildSubmissionPayload() {
  return {
    ...form.value,
    asetBaruList: asetBaruList.value.map((item) => ({ ...item })),
    asetLamaList: asetLamaList.value.map((item) => ({ ...item })),
  }
}

function resetSubmissionForm() {
  selectedSubmissionId.value = null
  form.value = emptyForm()
  asetBaruList.value = [{ id_aset: '', tipe: '', qty: 1, spesifikasi: '' }]
  asetLamaList.value = [{ id_aset: '', tipe: '', qty: 1, spesifikasi: '' }]
  validationError.value = ''
  saveMessage.value = ''
}

function editSubmission(submission) {
  return router.push({ name: 'submission-detail', params: { id: submission.id } })
}

async function loadRouteForm() {
  pageError.value = ''
  if (route.name === 'submission-new') {
    if (!canWriteSubmissions.value) return router.replace('/submissions')
    resetSubmissionForm()
  } else if (route.name === 'submission-detail') {
    const id = String(route.params.id)
    isDetailLoading.value = true
    try {
      const submission = await get(`/api/submissions/${encodeURIComponent(id)}`)
      if (route.name === 'submission-detail' && String(route.params.id) === id)
        await hydrateSubmission(submission)
    } catch (error) {
      if (String(route.params.id) === id) pageError.value = error.message || 'BAST tidak ditemukan.'
    } finally {
      isDetailLoading.value = false
    }
  }
}

async function hydrateSubmission(submission) {
  const payload = submission?.payload || {}
  isHydratingSubmission.value = true
  selectedSubmissionId.value = submission.id
  form.value = { ...emptyForm(), ...payload }
  asetBaruList.value =
    Array.isArray(payload.asetBaruList) && payload.asetBaruList.length
      ? payload.asetBaruList.map((item) => ({ ...item }))
      : [{ id_aset: '', tipe: '', qty: 1, spesifikasi: '' }]
  asetLamaList.value =
    Array.isArray(payload.asetLamaList) && payload.asetLamaList.length
      ? payload.asetLamaList.map((item) => ({ ...item }))
      : [{ id_aset: '', tipe: '', qty: 1, spesifikasi: '' }]
  rememberAssetHistory()
  await nextTick()
  isHydratingSubmission.value = false
  validationError.value = ''
  saveMessage.value = submission.submission_number
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function printSubmission(submission) {
  return generatePdf({ persist: false, payload: submission.payload })
}

async function persistSubmission(status = 'draft') {
  if (!canWriteSubmissions.value || isSaving.value) return false
  isSaving.value = true
  validationError.value = ''
  saveMessage.value = ''
  try {
    const selectionError = assetSelectionError()
    if (selectionError) throw new Error(selectionError)
    const body = { payload: buildSubmissionPayload(), status }
    const saved = selectedSubmissionId.value
      ? await put(`/api/submissions/${selectedSubmissionId.value}`, body)
      : await post('/api/submissions', body)
    selectedSubmissionId.value = saved.id
    rememberAssetHistory()
    saveMessage.value = `${saved.submission_number} berhasil disimpan.`
    savedSubmissions.value = [
      saved,
      ...savedSubmissions.value.filter((item) => item.id !== saved.id),
    ]
    try {
      savedSubmissions.value = await getAllPages('/api/submissions')
    } catch {
      saveMessage.value += ' Daftar belum dapat dimuat ulang; dokumen sudah tersimpan.'
    }
    return true
  } catch (error) {
    validationError.value = error.message || 'Gagal menyimpan pengajuan.'
    return false
  } finally {
    isSaving.value = false
  }
}

async function saveAndReturn() {
  if (await persistSubmission()) await router.push('/submissions')
}

async function deleteSubmission(submission) {
  if (!canWriteSubmissions.value) return
  const confirmed = window.confirm(`Hapus pengajuan ${submission.submission_number}?`)
  if (!confirmed) return
  try {
    await del(`/api/submissions/${submission.id}`)
    if (selectedSubmissionId.value === submission.id) resetSubmissionForm()
    savedSubmissions.value = savedSubmissions.value.filter((item) => item.id !== submission.id)
    saveMessage.value = 'Pengajuan berhasil dihapus.'
  } catch (error) {
    validationError.value = error.message || 'Gagal menghapus pengajuan.'
  }
}

async function generatePdf({
  persist = canWriteSubmissions.value,
  payload = buildSubmissionPayload(),
} = {}) {
  if (isSaving.value) return
  const form = { value: payload }
  const asetBaruList = { value: payload.asetBaruList || [] }
  const asetLamaList = { value: payload.asetLamaList || [] }
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

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    validationError.value = 'Pop-up terblokir. Harap izinkan pop-up untuk mencetak PDF.'
    return
  }
  if (persist && !(await persistSubmission('submitted'))) {
    printWindow.close()
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
      let rowsBaruHtml = ''
      const validAssetsBaru = asetBaruList.value.filter((a) => a.id_aset)
      const maxRows = Math.max(3, validAssetsBaru.length)
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
              <th scope="col" style="width: 5%; text-align: center;">No</th>
              <th scope="col" style="width: 25%;">Deskripsi/Jenis Aset</th>
              <th scope="col" style="width: 8%; text-align: center;">Qty</th>
              <th scope="col" style="width: 62%;">Spesifikasi Merk/Tipe/Model & Nomor Serial (S/N)/Hostname</th>
            </tr>
          </thead>
          <tbody>
            ${rowsBaruHtml}
          </tbody>
        </table>
      `
    }

    if (hasAsetLama) {
      let rowsLamaHtml = ''
      const validAssetsLama = asetLamaList.value.filter((a) => a.id_aset)
      const maxRows = Math.max(3, validAssetsLama.length)
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
              <th scope="col" style="width: 5%; text-align: center;">No</th>
              <th scope="col" style="width: 25%;">Deskripsi/Jenis Aset</th>
              <th scope="col" style="width: 8%; text-align: center;">Qty</th>
              <th scope="col" style="width: 62%;">Spesifikasi Merk/Tipe/Model & Nomor Serial (S/N)/Hostname</th>
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
        <img src="/esb-logo.svg" alt="ESB Logo" />
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
            <th scope="col" style="width: 25%;">Detail</th>
            <th scope="col" style="width: 37.5%;">Pihak Pemberi</th>
            <th scope="col" style="width: 37.5%;">Pihak Penerima</th>
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

  return printHtmlDocument(
    html,
    'Pop-up terblokir. Harap izinkan pop-up untuk mencetak PDF.',
    printWindow,
  )
}

onMounted(fetchData)
</script>

<template>
  <div
    class="submissions-page asset-inventory flex min-w-0 flex-col gap-5"
    :data-testid="!isLoading ? 'page-ready' : undefined"
  >
    <!-- ── Page Header ─────────────────────────────────────────── -->
    <div
      v-if="isFormOpen"
      class="submission-page-header flex items-center gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E2E8F0]/80 shadow-2xs"
    >
      <div
        class="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF5FF] text-[#0A5DBD] border border-[#B8D4F5]/40"
      >
        <span aria-hidden="true" class="material-symbols-outlined text-[20px] sm:text-[22px]"
          >assignment</span
        >
      </div>
      <div class="min-w-0">
        <h1 class="text-base sm:text-lg font-bold text-[#333333] tracking-tight truncate">
          Formulir Serah Terima Aset
        </h1>
        <p class="text-xs font-normal text-[#5F7089] mt-0.5 truncate">
          Dokumentasi &amp; Berita Acara Serah Terima (BAST) perangkat IT &amp; inventaris
        </p>
      </div>
    </div>

    <ol v-if="isFormOpen" class="submission-steps" aria-label="Tahapan pengisian">
      <li><span>1</span>Pihak terkait</li>
      <li><span>2</span>Tujuan</li>
      <li><span>3</span>Daftar aset</li>
      <li><span>4</span>Pengesahan & Cetak</li>
    </ol>

    <div
      v-if="saveMessage"
      role="status"
      aria-live="polite"
      class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"
    >
      {{ saveMessage }}
    </div>

    <section
      v-if="!isLoading && !isFormOpen"
      class="submission-history"
      aria-labelledby="submission-history-title"
    >
      <div
        class="asset-toolbar flex flex-col gap-3 rounded-2xl border border-[#E2E8F0]/80 bg-white p-3.5 shadow-2xs"
      >
        <div class="flex items-center justify-between gap-2.5">
          <div>
            <h2
              id="submission-history-title"
              class="text-base font-bold tracking-tight text-[#333333]"
            >
              Riwayat BAST / Pengajuan
            </h2>
            <p class="mt-0.5 text-xs text-[#5F7089]">
              Kelola dokumen serah terima seperti daftar Aset IT.
            </p>
          </div>
          <button
            v-if="canWriteSubmissions"
            type="button"
            class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#0A51B0] px-3 text-xs font-semibold text-white hover:bg-[#0A4391]"
            @click="router.push('/submissions/new')"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[16px]">add</span>BAST
            Baru
          </button>
        </div>
        <div class="grid grid-cols-1 items-center gap-2 border-t border-[#F1F5F9] pt-2.5">
          <input
            v-model="searchQuery"
            type="search"
            aria-label="Cari nomor BAST atau nama pihak"
            placeholder="Cari nomor BAST atau nama pihak…"
            class="h-9 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-xs text-[#333333] focus:border-[#0A51B0] focus:outline-none"
          />
        </div>
      </div>
      <div class="it-list-heading-sticky">
        <div class="it-list-heading" aria-live="polite">
          <div>
            <h3>
              Daftar Dokumen <span>{{ filteredSubmissions.length }}</span>
            </h3>
            <p>
              {{
                searchQuery
                  ? 'Hasil sesuai pencarian dan filter Anda'
                  : 'Riwayat BAST dan pengajuan aset'
              }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-3">
            <AppViewToggle v-model="viewMode" />
            <span v-if="filteredSubmissions.length" class="it-result-range"
              >{{ (currentPage - 1) * itemsPerPage + 1 }}–{{
                Math.min(currentPage * itemsPerPage, filteredSubmissions.length)
              }}
              dari {{ filteredSubmissions.length }} dokumen</span
            >
          </div>
        </div>
      </div>
      <div
        v-if="!filteredSubmissions.length"
        class="mt-3 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-12 text-center text-xs text-[#5F7089]"
      >
        Belum ada BAST yang sesuai.<button
          type="button"
          class="ml-1 font-bold text-[#0A51B0]"
          @click="resetSubmissionFilters"
        >
          Reset filter
        </button>
      </div>
      <div v-else-if="viewMode === 'table'" class="ws-data-table-wrap submission-table-wrap">
        <table class="ws-data-table">
          <caption class="sr-only">
            Daftar riwayat BAST
          </caption>
          <colgroup>
            <col class="w-[28%]" />
            <col class="w-[24%]" />
            <col class="w-[24%]" />
            <col class="w-[16%]" />
            <col class="w-[80px]" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Dokumen</th>
              <th scope="col">Pemberi</th>
              <th scope="col">Penerima</th>
              <th scope="col">Tanggal</th>
              <th scope="col"><span class="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="submission in paginatedSubmissions"
              :key="submission.id"
              @click="editSubmission(submission)"
            >
              <td>
                <RouterLink
                  class="ws-cell-main submission-detail-link"
                  :to="`/submissions/${submission.id}`"
                  @click.stop
                  >{{ submission.submission_number }}</RouterLink
                ><span class="ws-cell-sub">BAST / Pengajuan Aset</span>
              </td>
              <td>
                <span class="ws-cell-main" :title="submission.payload?.pemberiNama">{{
                  submission.payload?.pemberiNama || '—'
                }}</span
                ><span class="ws-cell-sub">{{ submission.payload?.pemberiDirektorat || '—' }}</span>
              </td>
              <td>
                <span class="ws-cell-main" :title="submission.payload?.penerimaNama">{{
                  submission.payload?.penerimaNama || '—'
                }}</span
                ><span class="ws-cell-sub">{{
                  submission.payload?.penerimaDirektorat || '—'
                }}</span>
              </td>
              <td>
                <span class="ws-cell-main">{{
                  submission.payload?.tanggal || formatSubmissionDate(submission.updated_at)
                }}</span>
              </td>
              <td @click.stop>
                <AppRowActions
                  :actions="getSubmissionActions(submission)"
                  :label="`Aksi BAST ${submission.submission_number}`"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="submission-card-list asset-card-list laptop-list">
        <div
          v-for="submission in paginatedSubmissions"
          :key="submission.id"
          class="laptop-row submission-laptop-row"
          @click="editSubmission(submission)"
        >
          <div class="laptop-identity">
            <div class="laptop-icon submission-card-icon" aria-hidden="true">
              <span class="material-symbols-outlined">description</span>
            </div>
            <div class="laptop-identity-text">
              <h4>
                <RouterLink :to="`/submissions/${submission.id}`" @click.stop>{{
                  submission.submission_number
                }}</RouterLink>
              </h4>
              <p :title="submission.payload?.tujuanLainnya || 'BAST / Pengajuan Aset'">
                BAST / Pengajuan Aset
              </p>
              <span class="laptop-serial">ID: {{ submission.id }}</span>
            </div>
          </div>
          <div class="laptop-holder laptop-field">
            <span class="laptop-label">Pemberi</span>
            <strong :title="submission.payload?.pemberiNama">{{
              submission.payload?.pemberiNama || '—'
            }}</strong>
            <span class="laptop-secondary">{{ submission.payload?.pemberiDirektorat || '—' }}</span>
          </div>
          <div class="laptop-location laptop-field">
            <span class="laptop-label">Penerima</span>
            <strong :title="submission.payload?.penerimaNama">{{
              submission.payload?.penerimaNama || '—'
            }}</strong>
            <span class="laptop-secondary">{{
              submission.payload?.penerimaDirektorat || '—'
            }}</span>
          </div>
          <div class="laptop-state">
            <span class="laptop-label">Tanggal</span>
            <span class="laptop-condition">{{
              submission.payload?.tanggal || formatSubmissionDate(submission.updated_at)
            }}</span>
          </div>
          <div class="laptop-actions" @click.stop>
            <AppRowActions
              :actions="getSubmissionActions(submission)"
              :label="`Aksi BAST ${submission.submission_number}`"
            />
          </div>
        </div>
      </div>
      <AppPagination
        v-if="filteredSubmissions.length"
        v-model:current-page="currentPage"
        :total-items="filteredSubmissions.length"
        :items-per-page="itemsPerPage"
        :asset-style="true"
        mobile-compact
      />
    </section>
    <!-- Loading Form Skeleton -->
    <div
      v-if="isLoading || isDetailLoading"
      role="status"
      aria-busy="true"
      class="flex flex-col gap-5 select-none"
    >
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
      <span aria-hidden="true" class="material-symbols-outlined text-[20px] shrink-0 text-rose-600"
        >error</span
      >
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
    <form
      v-else-if="isFormOpen"
      class="asset-crud-form asset-entry-form submission-form flex flex-col gap-5"
      @submit.prevent="generatePdf"
    >
      <div
        class="submission-form-heading flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-2xs"
      >
        <div>
          <h2 class="text-sm font-bold text-[#333333]">
            {{ selectedSubmissionId ? 'Detail BAST / Pengajuan' : 'BAST Baru' }}
          </h2>
          <p class="text-[11px] text-[#5F7089]">
            Lengkapi data untuk menyimpan atau mencetak dokumen.
          </p>
        </div>
        <button
          type="button"
          class="h-8 rounded-lg border border-[#CBD5E1] px-3 text-xs font-bold text-[#334155] hover:bg-[#F8FAFC]"
          :disabled="isSaving"
          @click="router.push('/submissions')"
        >
          Tutup
        </button>
      </div>
      <!-- Validation Error Banner -->
      <div
        v-if="validationError"
        role="alert"
        aria-live="assertive"
        class="flex items-start sm:items-center gap-3 p-4 rounded-2xl border border-rose-300 bg-rose-50 text-rose-800 text-[12px] font-semibold shadow-2xs"
      >
        <span
          aria-hidden="true"
          class="material-symbols-outlined shrink-0 text-[20px] text-rose-600"
          >error</span
        >
        <span class="flex-1 leading-relaxed">{{ validationError }}</span>
        <button
          type="button"
          class="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
          @click="validationError = ''"
          title="Tutup pesan error"
        >
          <span aria-hidden="true" class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <fieldset
        class="submission-fields"
        :disabled="!canWriteSubmissions || isSaving"
        :inert="!canWriteSubmissions || isSaving"
      >
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
                <p class="text-[12px] text-[#5F7089]">
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
                <span
                  aria-hidden="true"
                  class="material-symbols-outlined text-[18px] text-[#333333]"
                  >person_outline</span
                >
                <h3 class="text-xs font-bold uppercase tracking-wider text-[#333333]">
                  Pihak Pemberi (Karyawan)
                </h3>
              </div>

              <label class="flex flex-col gap-1.5">
                <span class="text-[11px] font-bold uppercase text-[#475569]">Pilih Karyawan *</span>
                <SearchableSelect
                  v-model="form.pemberiNik"
                  :options="employees"
                  value-key="nik"
                  label-key="nama_karyawan"
                  secondary-label-key="nik"
                  placeholder="Pilih karyawan pemberi"
                  search-placeholder="Cari nama atau NIK…"
                  height-class="h-10"
                />
              </label>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label class="flex flex-col gap-1.5">
                  <span class="text-[10px] font-bold uppercase text-[#5F7089]"
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
                  <span class="text-[10px] font-bold uppercase text-[#5F7089]"
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
                  <span
                    aria-hidden="true"
                    class="material-symbols-outlined text-[18px] text-amber-600"
                    >person_add</span
                  >
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
                <span class="text-[11px] font-bold uppercase text-[#475569]">Pilih Karyawan *</span>
                <SearchableSelect
                  v-model="form.penerimaNik"
                  :options="employees"
                  value-key="nik"
                  label-key="nama_karyawan"
                  secondary-label-key="nik"
                  placeholder="Pilih karyawan penerima"
                  search-placeholder="Cari nama atau NIK…"
                  height-class="h-10"
                />
              </label>

              <div v-else class="flex flex-col gap-1.5">
                <span class="text-[11px] font-bold uppercase text-[#475569]"
                  >Nama Lengkap / Vendor *</span
                >
                <input
                  v-model="form.penerimaNama"
                  required
                  type="text"
                  aria-label="Nama Lengkap / Vendor Penerima"
                  class="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#333333] placeholder-[#687281] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all"
                  placeholder="Tulis nama lengkap penerima atau vendor…"
                />
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label v-if="!form.isPenerimaLainnya" class="flex flex-col gap-1.5">
                  <span class="text-[10px] font-bold uppercase text-[#5F7089]"
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
                  <span class="text-[10px] font-bold uppercase text-[#5F7089]">
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
                        : 'border-[#E2E8F0] bg-white text-[#333333] placeholder-[#687281] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10'
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
                <p class="text-[12px] text-[#5F7089]">
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
                  <span aria-hidden="true" class="material-symbols-outlined text-[16px]">{{
                    t.icon
                  }}</span>
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
              class="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#333333] placeholder-[#687281] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all"
              placeholder="Tuliskan tujuan serah terima aset lainnya…"
            />
          </div>
        </div>

        <!-- Section 3 & 4: Data Serah Terima Aset (Baru & Lama) -->
        <div class="submission-assets-grid grid grid-cols-1 gap-5 xl:grid-cols-2">
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
                  <p class="text-[12px] text-[#5F7089] truncate">
                    Perangkat yang diserahkan ke penerima
                  </p>
                </div>
              </div>

              <button
                type="button"
                @click="addAssetBaruRow"
                class="h-8.5 shrink-0 whitespace-nowrap rounded-xl bg-[#0A51B0] px-3 text-xs font-bold text-white shadow-2xs hover:bg-[#0A4391] active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span aria-hidden="true" class="material-symbols-outlined text-[15px]">add</span>
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
                    <span aria-hidden="true" class="material-symbols-outlined text-[14px]"
                      >devices</span
                    >
                    Unit Baru #{{ index + 1 }}
                  </span>

                  <button
                    v-if="asetBaruList.length > 1"
                    type="button"
                    @click="removeAssetBaruRow(index)"
                    class="flex h-7 items-center gap-1 rounded-lg bg-rose-50 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer border border-rose-200/60"
                    title="Hapus baris unit ini"
                  >
                    <span aria-hidden="true" class="material-symbols-outlined text-[14px]"
                      >delete</span
                    >
                    <span>Hapus</span>
                  </button>
                </div>

                <label class="flex flex-col gap-1.5">
                  <span class="text-[10px] font-bold uppercase text-[#475569]"
                    >Pilih Aset IT *</span
                  >
                  <SearchableSelect
                    :model-value="row.id_aset"
                    :options="assetBaruOptions"
                    :clearable="true"
                    value-key="id_aset"
                    label-key="label_aset"
                    secondary-label-key="nomor_seri"
                    placeholder="Pilih Aset IT"
                    search-placeholder="Cari label, hostname, atau nomor seri…"
                    height-class="h-10"
                    @update:model-value="onAssetBaruSelect(index, $event)"
                  />
                  <span
                    v-if="row.id_aset && !assetBaruOptions.some((a) => a.id_aset === row.id_aset)"
                    class="submission-asset-snapshot text-xs text-amber-700"
                  >
                    Aset #{{ row.id_aset }}: {{ row.spesifikasi || row.tipe }}.
                    {{
                      historicAssetRows.has(row)
                        ? 'Snapshot tersimpan dipertahankan; pilih ulang untuk mengganti.'
                        : 'Pilihan tidak sesuai pihak saat ini; pilih ulang atau kosongkan.'
                    }}
                    <button type="button" class="underline" @click="onAssetBaruSelect(index, '')">
                      Kosongkan aset
                    </button>
                  </span>
                </label>

                <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5 sm:gap-2">
                  <label class="flex flex-col gap-1.5 sm:col-span-3">
                    <span class="text-[9.5px] font-bold uppercase text-[#5F7089]"
                      >Deskripsi / Tipe (Auto)</span
                    >
                    <input
                      v-model="row.tipe"
                      type="text"
                      :aria-label="`Deskripsi Aset Baru Baris ${index + 1}`"
                      class="h-9.5 w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 text-[12px] font-medium text-slate-600 outline-none cursor-default"
                      readonly
                      placeholder="Tipe perangkat"
                    />
                  </label>

                  <label class="flex flex-col gap-1.5 sm:col-span-1">
                    <span class="text-[9.5px] font-bold uppercase text-[#5F7089]">Qty</span>
                    <input
                      v-model="row.qty"
                      required
                      type="number"
                      min="1"
                      :aria-label="`Jumlah (Qty) Aset Baru Baris ${index + 1}`"
                      class="h-9.5 w-full rounded-xl border border-[#E2E8F0] bg-white px-2.5 text-[12px] font-bold text-center text-[#333333] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all"
                    />
                  </label>
                </div>

                <label class="flex flex-col gap-1.5">
                  <span class="text-[9.5px] font-bold uppercase text-[#5F7089]"
                    >Spesifikasi Lengkap (Auto)</span
                  >
                  <input
                    v-model="row.spesifikasi"
                    type="text"
                    :aria-label="`Spesifikasi Aset Baru Baris ${index + 1}`"
                    class="h-9.5 w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 text-[12px] font-medium text-slate-600 outline-none cursor-default"
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
                  <p class="text-[12px] text-[#5F7089] truncate">
                    Perangkat lama jika ada penggantian
                  </p>
                </div>
              </div>

              <button
                type="button"
                @click="addAssetLamaRow"
                class="h-8.5 shrink-0 whitespace-nowrap rounded-xl bg-slate-800 px-3 text-xs font-bold text-white shadow-2xs hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span aria-hidden="true" class="material-symbols-outlined text-[15px]">add</span>
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
                    <span aria-hidden="true" class="material-symbols-outlined text-[14px]"
                      >history_toggle_drop_down</span
                    >
                    Unit Lama #{{ index + 1 }}
                  </span>

                  <button
                    v-if="asetLamaList.length > 1"
                    type="button"
                    @click="removeAssetLamaRow(index)"
                    class="flex h-7 items-center gap-1 rounded-lg bg-rose-50 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer border border-rose-200/60"
                    title="Hapus baris unit lama ini"
                  >
                    <span aria-hidden="true" class="material-symbols-outlined text-[14px]"
                      >delete</span
                    >
                    <span>Hapus</span>
                  </button>
                </div>

                <label class="flex flex-col gap-1.5">
                  <span class="text-[10px] font-bold uppercase text-[#475569]"
                    >Aset IT Lama (Opsional)</span
                  >
                  <SearchableSelect
                    :model-value="row.id_aset"
                    :options="assetLamaOptions"
                    :clearable="true"
                    value-key="id_aset"
                    label-key="label_aset"
                    secondary-label-key="nomor_seri"
                    placeholder="Pilih Aset IT Lama"
                    search-placeholder="Cari label, hostname, atau nomor seri…"
                    height-class="h-10"
                    @update:model-value="onAssetLamaSelect(index, $event)"
                  />
                  <span
                    v-if="row.id_aset && !assetLamaOptions.some((a) => a.id_aset === row.id_aset)"
                    class="submission-asset-snapshot text-xs text-amber-700"
                  >
                    Aset #{{ row.id_aset }}: {{ row.spesifikasi || row.tipe }}.
                    {{
                      historicAssetRows.has(row)
                        ? 'Snapshot tersimpan dipertahankan; pilih ulang untuk mengganti.'
                        : 'Pilihan tidak sesuai pihak saat ini; pilih ulang atau kosongkan.'
                    }}
                    <button type="button" class="underline" @click="onAssetLamaSelect(index, '')">
                      Kosongkan aset
                    </button>
                  </span>
                </label>

                <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5 sm:gap-2">
                  <label class="flex flex-col gap-1.5 sm:col-span-3">
                    <span class="text-[9.5px] font-bold uppercase text-[#5F7089]"
                      >Deskripsi / Tipe (Auto)</span
                    >
                    <input
                      v-model="row.tipe"
                      type="text"
                      :aria-label="`Deskripsi Aset Lama Baris ${index + 1}`"
                      class="h-9.5 w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 text-[12px] font-medium text-slate-600 outline-none cursor-default"
                      readonly
                      placeholder="Tipe perangkat"
                    />
                  </label>

                  <label class="flex flex-col gap-1.5 sm:col-span-1">
                    <span class="text-[9.5px] font-bold uppercase text-[#5F7089]">Qty</span>
                    <input
                      v-model="row.qty"
                      required
                      type="number"
                      min="1"
                      :aria-label="`Jumlah (Qty) Aset Lama Baris ${index + 1}`"
                      class="h-9.5 w-full rounded-xl border border-[#E2E8F0] bg-white px-2.5 text-[12px] font-bold text-center text-[#333333] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all"
                    />
                  </label>
                </div>

                <label class="flex flex-col gap-1.5">
                  <span class="text-[9.5px] font-bold uppercase text-[#5F7089]"
                    >Spesifikasi Lengkap (Auto)</span
                  >
                  <input
                    v-model="row.spesifikasi"
                    type="text"
                    :aria-label="`Spesifikasi Aset Lama Baris ${index + 1}`"
                    class="h-9.5 w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 text-[12px] font-medium text-slate-600 outline-none cursor-default"
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
                <h2 class="text-[14px] sm:text-[15px] font-bold text-[#333333]">Diketahui Oleh</h2>
                <p class="text-[12px] text-[#5F7089]">
                  Pilih atau tulis identitas pihak yang mengetahui untuk dicantumkan pada lembar
                  tanda tangan formulir
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
                <span class="text-[11px] font-bold uppercase text-[#475569]"
                  >Pilih Karyawan / PBP</span
                >
                <span class="text-[10px] text-slate-400 font-medium">(Opsional)</span>
              </div>
              <SearchableSelect
                v-model="form.mengetahuiNik"
                :options="employees"
                value-key="nik"
                label-key="nama_karyawan"
                secondary-label-key="nik"
                placeholder="Pilih nama yang mengetahui…"
                search-placeholder="Cari nama atau NIK…"
                height-class="h-10"
                :clearable="true"
              />
            </div>

            <div v-else class="flex flex-col gap-1.5">
              <span class="text-[11px] font-bold uppercase text-[#475569]">Nama Lengkap</span>
              <input
                v-model="form.mengetahuiNama"
                type="text"
                aria-label="Nama Lengkap yang Mengetahui"
                class="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#333333] placeholder-[#687281] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all"
                placeholder="Tulis nama lengkap yang mengetahui…"
              />
            </div>

            <!-- Nama Terpilih (Auto) -->
            <div v-if="!form.isMengetahuiKustom" class="flex flex-col gap-1.5">
              <span class="text-[10px] font-bold uppercase text-[#5F7089]"
                >Nama Lengkap Terpilih</span
              >
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
              <span class="text-[10px] font-bold uppercase text-[#5F7089]">
                Jabatan / Unit Pada Dokumen
              </span>
              <input
                v-model="form.mengetahuiJabatan"
                type="text"
                aria-label="Jabatan atau Unit yang Mengetahui"
                class="h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#333333] placeholder-[#687281] focus:border-[#0A51B0] focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all"
                placeholder="People Business Partner atau Asset Management"
              />
            </div>
          </div>
        </div>
      </fieldset>
      <!-- Action Footer -->
      <div
        class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-2xl border border-[#E2E8F0]/80 bg-white p-4 sm:p-5 shadow-2xs"
      >
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <span
            class="text-xs font-bold text-[#333333] whitespace-nowrap flex items-center gap-1.5"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[18px] text-slate-400"
              >calendar_today</span
            >
            Tanggal Serah Terima:
          </span>
          <input
            v-model="form.tanggal"
            required
            type="date"
            aria-label="Tanggal Formulir Serah Terima"
            :disabled="!canWriteSubmissions || isSaving"
            class="h-10 w-full sm:w-48 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs font-medium text-[#333333] focus:border-[#0A51B0] focus:bg-white focus:ring-2 focus:ring-[#0A51B0]/10 focus:outline-none transition-all cursor-pointer"
          />
        </div>

        <div class="submission-actions flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            :disabled="isSaving"
            class="h-11 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-5 text-xs font-bold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-60"
            @click="router.push('/submissions')"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[18px]">close</span>
            <span>Cancel</span>
          </button>
          <button
            type="button"
            :disabled="isSaving"
            class="h-11 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#0A51B0] bg-white px-5 text-xs font-bold text-[#0A51B0] hover:bg-[#EDF5FF] disabled:opacity-60"
            v-if="canWriteSubmissions"
            @click="saveAndReturn"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[18px]">save</span>
            <span>{{ isSaving ? 'Menyimpan…' : 'Simpan' }}</span>
          </button>
          <button
            type="submit"
            :disabled="isSaving"
            class="h-11 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A51B0] px-6 text-xs font-bold text-white shadow-2xs hover:bg-[#0A4391] active:scale-95 transition-all cursor-pointer disabled:opacity-60"
          >
            <span aria-hidden="true" class="material-symbols-outlined text-[18px]"
              >picture_as_pdf</span
            >
            <span>{{ isSaving ? 'Menyimpan…' : 'Cetak' }}</span>
          </button>
        </div>
        <p v-if="!canWriteSubmissions" class="text-xs font-semibold text-[#5F7089]">
          Mode hanya baca — Anda tidak memiliki izin mengubah pengajuan.
        </p>
      </div>
    </form>
  </div>
</template>

<style scoped src="../assets/asset-workspace.css"></style>
<style scoped src="../assets/ws-table.css"></style>
<style scoped>
.submissions-page {
  width: 100%;
  max-width: 1440px;
  margin-inline: auto;
  gap: 24px;
}

.submission-history {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.submission-table-wrap {
  overflow-x: auto;
}
.submission-history .ws-data-table :is(th, td) {
  padding: 14px 16px;
}
.submission-history tbody tr,
.submission-laptop-row {
  cursor: pointer;
}
.submission-detail-link:focus-visible {
  outline: 2px solid #0a51b0;
  outline-offset: 3px;
}
.submission-form .submission-fields {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.submission-history .asset-toolbar {
  padding: 0;
  gap: 24px;
  box-shadow: none;
}
.submission-history .it-list-heading {
  margin: 0;
  padding: 16px;
  flex-wrap: wrap;
}
.submission-history .ws-cell-sub {
  margin-top: 5px;
}
.submission-history .ws-cell-main {
  font-size: 13px;
  line-height: 1.6;
}
.submission-history .asset-toolbar input {
  height: 44px;
  font-size: 14px;
}
.submission-card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 0;
}

@media (width < 80rem) {
  .submission-history table {
    min-width: 760px;
  }
}
.submission-form label:not(:has(input[type='checkbox'], input[type='radio'])) {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  margin-bottom: 0;
}
.submission-form label:has(input[type='radio'], input[type='checkbox']) {
  display: flex;
  align-items: center;
  margin-bottom: 0;
}
.submission-form label:has(input[type='radio']) {
  min-height: 56px;
}
.submission-assets-grid {
  align-items: start;
  gap: 24px;
}
.submission-form .submission-section {
  gap: 20px;
  padding: 24px;
  border: 1px solid #e7ecf3;
  border-radius: 12px;
  background: #fafbfd;
  box-shadow: none;
}
.submission-form .submission-unit {
  gap: 16px;
  padding: 16px;
}
.submission-form > :last-child {
  gap: 20px;
  padding: 20px;
  flex-wrap: wrap;
}
.submission-form input:not([type='checkbox']):not([type='radio']) {
  padding-inline: 12px;
}
@media (max-width: 639px) {
  .submission-form .submission-section,
  .submission-form > :last-child {
    padding: 16px;
  }
}
.submission-form input[readonly] {
  background: #f1f5f9;
  color: #64748b;
}
.submission-form .submission-section h2 {
  font-size: 16px;
  line-height: 1.5;
  font-weight: 650;
  letter-spacing: -0.015em;
  text-transform: none;
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
  color: #5f7089;
  font-weight: 500;
}
.submission-steps li > span {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 8px;
  color: #0a5dbd;
  background: #edf5ff;
  font-size: 11px;
  font-weight: 650;
}
.submission-page-header h1,
.submission-page-header p {
  white-space: normal;
  overflow: visible;
}
.submission-page-header {
  padding: 24px;
  align-items: flex-start;
}
.submission-page-header h1 {
  font-size: clamp(20px, 2vw, 26px);
  line-height: 1.3;
}
.submission-page-header p {
  margin-top: 8px;
  line-height: 1.7;
}
.submission-form {
  padding: 0;
  gap: 24px;
}
.submission-form-heading {
  gap: 16px;
  padding: 20px 24px;
}
.submission-form-heading p {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
}
.submission-section > div:first-child {
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
  padding-bottom: 16px;
}
.submission-section > div:first-child > div {
  flex: 1 1 220px;
  min-width: 0;
  align-items: flex-start;
}
.submission-section > div:first-child :is(h2, p) {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}
.submission-section > div:first-child p {
  margin-top: 4px;
  line-height: 1.6;
}
.submission-form .submission-section h3 {
  text-transform: none;
  letter-spacing: 0;
  font-size: 13px;
}
.submission-section label > span:first-child,
.submission-section div:has(> input) > span:first-child {
  font-size: 12px;
  font-weight: 500;
  text-transform: none;
  line-height: 1.5;
}
.submission-form input:not([type='checkbox']):not([type='radio']),
.submission-form :deep(button[aria-haspopup='listbox']) {
  min-width: 0;
  min-height: 44px;
  border-radius: 8px;
}
.submission-section label:has(input[type='checkbox']) {
  min-height: 44px;
  gap: 8px;
  flex-shrink: 0;
}
.submission-history .asset-toolbar > div:first-child > button,
.submission-form-heading > button,
.submission-section > div:first-child > button,
.submission-unit > div:first-child > button,
.submission-actions > button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: 8px;
  min-width: 112px;
  height: 44px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}
.submission-actions {
  gap: 12px;
  flex-wrap: wrap;
}
.submission-actions > button {
  flex: 1 0 auto;
}
.submission-form [role='alert'] > button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  flex-shrink: 0;
}
.submission-unit label > span > button {
  min-height: 44px;
  padding-inline: 8px;
}
.submission-asset-snapshot {
  min-width: 0;
  overflow-wrap: anywhere;
}
.submission-history :deep(button[aria-pressed]) {
  min-height: 44px;
  min-width: 44px;
}
.submission-actions > button .material-symbols-outlined,
.submission-section > div:first-child > button .material-symbols-outlined {
  font-size: 18px;
}
.submissions-page button:focus-visible {
  outline: 2px solid #0a51b0;
  outline-offset: 3px;
}
.submission-history :deep(button[aria-haspopup='menu']) {
  min-width: 44px;
  min-height: 44px;
}
.submissions-page .submission-card-list > .submission-laptop-row {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 44px;
}
@media (min-width: 1280px) {
  .submissions-page .submission-card-list > .submission-laptop-row {
    grid-template-columns: minmax(0, 1.4fr) repeat(2, minmax(0, 1fr)) minmax(0, 0.8fr) 44px;
    grid-template-areas: 'identity holder location state actions';
  }
}
@media (max-width: 639px) {
  .submissions-page,
  .submission-form,
  .submission-form .submission-fields {
    gap: 20px;
  }
  .submission-page-header,
  .submission-form-heading {
    padding: 16px;
  }
  .submission-form-heading {
    flex-wrap: wrap;
  }
  .submission-form-heading > button {
    width: 100%;
  }
  .submission-section > div:first-child > button,
  .submission-actions {
    width: 100%;
  }
  .submission-form :deep(button[aria-haspopup='listbox']),
  .submission-history .asset-toolbar input {
    font-size: 16px;
  }
  .submission-history .it-result-range {
    display: none;
  }
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

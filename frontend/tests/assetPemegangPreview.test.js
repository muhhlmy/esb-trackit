import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test, { describe } from 'node:test'

const modalUrl = new URL('../src/components/ui/AssetCategoryImportModal.vue', import.meta.url)

// Ekstrak fungsi murni dari SFC untuk diuji langsung tanpa mounting Vue.
async function extractFunctions() {
  const src = await readFile(modalUrl, 'utf8')
  const script = src.split('<script setup>')[1].split('</script>')[0]
  const getRowValueSrc = script.match(/function getRowValue[\s\S]*?\n}\n/)?.[0]
  const isPemegangMatchedSrc = script.match(
    /function isPemegegangMatched[\s\S]*?\n}\n|function isPemegangMatched[\s\S]*?\n}\n/,
  )?.[0]
  assert.ok(getRowValueSrc, 'getRowValue ditemukan')
  assert.ok(isPemegangMatchedSrc, 'isPemegangMatched ditemukan')
  return { getRowValueSrc, isPemegangMatchedSrc, src }
}

describe('Aset IT import: NIK/Nama Pemegang mismatch handling', () => {
  test('previewRows meletakkan baris pemegang tidak cocok di atas dan menandai matched', async () => {
    const { src } = await extractFunctions()

    assert.match(
      src,
      /\.\.\.rows\.value\.filter\(\(row\) => !isPemegangMatched\(row\)\),[\s\S]*?\.\.\.rows\.value\.filter\(\(row\) => isPemegangMatched\(row\)\)/,
      'unmatched rows harus ditaruh sebelum matched rows',
    )
    assert.match(src, /matched: isPemegangMatched\(row\)/)
    assert.match(
      src,
      /if \(props\.assetType !== 'it' \|\| !props\.employees\.length\) \{[\s\S]*?return rows\.value\.slice\(0, 5\)\.map\(\(row\) => \(\{ row, matched: true \}\)\)/,
      'non-IT / tanpa data karyawan: semua baris dianggap matched (no-op)',
    )
  })

  test('cell NIK & Nama Pemegang dikosongkan hanya untuk baris mismatch', async () => {
    const { src } = await extractFunctions()
    const tbody = src.split('<tbody class="divide-y divide-slate-100">')[1]?.split('</tbody>')[0]
    assert.ok(tbody, 'tbody pratinjau ditemukan')
    assert.ok(
      !tbody.includes('{{ row[column]'),
      'tbody harus pakai item.row[column], bukan row[column]',
    )
    assert.ok(tbody.includes('item.matched'), 'tbody membaca flag matched')
    assert.ok(
      tbody.includes('PEMEGANG_HEADERS.includes(column.trim().toLowerCase())'),
      'cell pemegang dikosongkan berdasarkan PEMEGANG_HEADERS',
    )
  })

  test('AssetsView meneruskan data karyawan ke modal import IT', async () => {
    const viewSrc = await readFile(new URL('../src/views/AssetsView.vue', import.meta.url), 'utf8')
    assert.match(
      viewSrc,
      /<AssetCategoryImportModal[\s\S]*?:employees="employees"/,
      'AssetsView meneruskan prop :employees',
    )
  })

  test('deteksi pemegang: NIK & Nama dicek terhadap Data Karyawan', async () => {
    const { getRowValueSrc, isPemegangMatchedSrc } = await extractFunctions()

    // isPemegangMatched membaca props + validNikSet; inject via params.
    const run = (props, row, validNikSet, employees) =>
      new Function(
        'props',
        'validNikSet',
        'employees',
        'row',
        `${getRowValueSrc}\n${isPemegangMatchedSrc.replace(/validNikSet\.value/g, 'validNikSet').replace(/props\.employees/g, 'employees')}\nreturn isPemegangMatched(row);`,
      )(props, validNikSet, employees, row)

    const employees = [
      { nik: '2026001', nama_karyawan: 'Budi Santoso' },
      { nik: '2026002', nama_karyawan: 'Siti Rahma' },
    ]
    const validNikSet = new Set(employees.map((e) => e.nik))
    const propsIT = { assetType: 'it' }
    const ok = (row) => run(propsIT, row, validNikSet, employees)

    // 1. NIK tidak terdaftar → mismatch
    assert.equal(ok({ 'NIK Pemegang': '9999999', 'Nama Karyawan Pemegang': 'X' }), false)
    // 2. NIK terdaftar + nama cocok → match
    assert.equal(ok({ 'NIK Pemegang': '2026001', 'Nama Karyawan Pemegang': 'Budi Santoso' }), true)
    // 3. NIK terdaftar + nama beda → mismatch
    assert.equal(ok({ 'NIK Pemegang': '2026001', 'Nama Karyawan Pemegang': 'Orang Lain' }), false)
    // 4. Kosong (Stock) → match, bukan mismatch
    assert.equal(ok({ 'NIK Pemegang': '', 'Nama Karyawan Pemegang': '' }), true)
    // 5. NIK saja, terdaftar → match
    assert.equal(ok({ 'NIK Pemegang': '2026002' }), true)
    // 6. Non-IT → selalu match (tidak ada pengecekan)
    assert.equal(run({ assetType: 'ga' }, { 'NIK Pemegang': '9999999' }, validNikSet, []), true)
  })
})

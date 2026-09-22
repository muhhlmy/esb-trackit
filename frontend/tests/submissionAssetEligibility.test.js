import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/views/SubmissionsView.vue', import.meta.url), 'utf8')
test('new units require no holder; old units use giver/receiver NIK union only', () => {
  assert.match(source, /function eligibleSubmissionAssets\(/)
  const code = source.slice(
    source.indexOf('function eligibleSubmissionAssets('),
    source.indexOf('const assetBaruOptions'),
  )
  const eligible = new Function(code + '; return eligibleSubmissionAssets')()
  const assets = [
    { id_aset: 1, nik_pemegang_asset: null, nama_karyawan_pemegang_asset: null },
    { id_aset: 2, nik_pemegang_asset: '001', nama_karyawan_pemegang_asset: 'Same' },
    { id_aset: 3, nik_pemegang_asset: '002', nama_karyawan_pemegang_asset: 'Same' },
    { id_aset: 4, nik_pemegang_asset: '003', nama_karyawan_pemegang_asset: 'Same' },
    { id_aset: 5, nik_pemegang_asset: '', nama_karyawan_pemegang_asset: 'Imported holder' },
    { id_aset: 6, nik_pemegang_asset: ' ', nama_karyawan_pemegang_asset: '-' },
  ]
  const ids = (kind, form = {}) => eligible(assets, form, kind).map((a) => a.id_aset)
  assert.deepEqual(ids('baru'), [1, 6])
  assert.deepEqual(ids('lama'), [])
  assert.deepEqual(ids('lama', { pemberiNik: '001', penerimaNik: '002' }), [2, 3])
  assert.deepEqual(ids('lama', { pemberiNik: '001', penerimaNik: '001' }), [2])
  assert.deepEqual(
    ids('lama', { pemberiNik: '001', penerimaNik: '002', isPenerimaLainnya: true }),
    [2],
  )
  assert.deepEqual(ids('lama', { pemberiNik: '1', penerimaNama: 'Same' }), [])
})

test('stale choices block save without erasing rows; saved history survives ownership changes', () => {
  const baru = { value: [{ id_aset: 99, tipe: 'Historic', spesifikasi: 'Snapshot' }] }
  const lama = { value: [{ id_aset: 2, tipe: 'Laptop' }] }
  const options = { value: [] }
  const code = source.slice(
    source.indexOf('const historicAssetRows'),
    source.indexOf('// ── Action Handlers'),
  )
  const api = new Function(
    'asetBaruList',
    'asetLamaList',
    'assetBaruOptions',
    'assetLamaOptions',
    'formatAssetSpecificationSummary',
    code + '; return {rememberAssetHistory, assetSelectionError, onAssetLamaSelect}',
  )(baru, lama, options, options, (a) => a.hostname)
  const before = JSON.stringify([baru.value, lama.value])
  assert.match(api.assetSelectionError(), /Unit Baru/)
  assert.equal(JSON.stringify([baru.value, lama.value]), before)
  api.rememberAssetHistory()
  assert.equal(api.assetSelectionError(), '')
  api.onAssetLamaSelect(0, 123)
  assert.equal(JSON.stringify([baru.value, lama.value]), before)
  options.value = [{ id_aset: 3, hostname: 'Replacement' }]
  api.onAssetLamaSelect(0, 3)
  options.value = []
  assert.match(api.assetSelectionError(), /Unit Lama/)
  api.onAssetLamaSelect(0, '')
  assert.equal(api.assetSelectionError(), '')
  assert.equal(baru.value[0].spesifikasi, 'Snapshot')
})

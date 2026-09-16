import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { formatCurrency, parseCurrency } from '../src/utils/currencyFormatter.js'
import { normalizeLocation } from '../src/utils/locationNormalizer.js'

const assetsOpsViewUrl = new URL('../src/views/AssetsOpsView.vue', import.meta.url)
const usersViewUrl = new URL('../src/views/UsersView.vue', import.meta.url)

describe('AssetsOpsView Frontend & Currency Formatter Tests', () => {
  test('harus memformat angka menjadi string mata uang Rupiah', () => {
    assert.equal(formatCurrency(15000000), 'Rp 15.000.000')
    assert.equal(formatCurrency(8500000), 'Rp 8.500.000')
    assert.equal(formatCurrency(0), 'Rp 0')
  })

  test('harus memparsing string mata uang Rupiah kembali ke numerik', () => {
    assert.equal(parseCurrency('Rp 15.000.000'), 15000000)
    assert.equal(parseCurrency('15.000.000'), 15000000)
    assert.equal(parseCurrency('Rp 8.500.000'), 8500000)
    assert.equal(parseCurrency(''), 0)
  })

  test('harus memformat lokasi Aset OPS dengan benar', () => {
    assert.equal(normalizeLocation('GS'), 'Gading Serpong')
    assert.equal(normalizeLocation('pl/gs'), 'Pluit - Gading Serpong')
  })

  test('AssetsOpsView enforces assets_ops write permission strictly on CRUD buttons and mutations', async () => {
    const source = await readFile(assetsOpsViewUrl, 'utf8')

    // Must evaluate hasWritePermission('assets_ops') strictly
    assert.match(source, /canWriteAssets\s*=\s*computed\(\s*\(\)\s*=>\s*hasWritePermission\('assets_ops'\)\s*\)/)
    assert.doesNotMatch(source, /hasWritePermission\('assets_ops'\)\s*\|\|\s*hasWritePermission\('assets'\)/)

    // Mutation handlers must guard with canWriteAssets
    assert.match(source, /function openAdd\(\)\s*\{[\s\S]*?if \(!canWriteAssets\.value\) return/)
    assert.match(source, /function openEdit\(asset\)\s*\{[\s\S]*?if \(!canWriteAssets\.value\) return/)
    assert.match(source, /function openDelete\(asset\)\s*\{[\s\S]*?if \(!canWriteAssets\.value\) return/)
    assert.match(source, /async function submitForm\(\)\s*\{[\s\S]*?if \(!canWriteAssets\.value\) return/)
    assert.match(source, /async function confirmDelete\(\)\s*\{[\s\S]*?if \(!canWriteAssets\.value/)

    // Template elements must bind canWriteAssets
    assert.match(source, /v-if="canWriteAssets"[\s\S]*?Tambah Aset OPS/)
    assert.match(source, /v-if="canWriteAssets"[\s\S]*?Import/)
    assert.match(source, /:disabled="isSubmitting \|\| !canWriteAssets"/)
  })

  test('UsersView defines assets_ops feature and permission defaults', async () => {
    const source = await readFile(usersViewUrl, 'utf8')

    assert.match(source, /key:\s*'assets_ops'/)
    assert.match(source, /label:\s*'Manajemen Aset Ops'/)
    assert.match(source, /assets_ops:\s*'none'/)
    assert.match(source, /assets_ops:\s*'full'/)
  })
})


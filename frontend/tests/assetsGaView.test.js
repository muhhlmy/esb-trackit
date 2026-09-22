import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { normalizeLocation } from '../src/utils/locationNormalizer.js'

const assetsGaViewUrl = new URL('../src/views/AssetsGaView.vue', import.meta.url)
const usersViewUrl = new URL('../src/views/UsersView.vue', import.meta.url)

describe('AssetsGaView Frontend Logic & Permission Tests', () => {
  test('harus memformat lokasi Aset GA dengan benar', () => {
    assert.equal(normalizeLocation('PL'), 'Pluit')
    assert.equal(normalizeLocation('GS / PL'), 'Gading Serpong - Pluit')
  })

  test('AssetsGaView enforces assets_ga write permission strictly on CRUD buttons and mutations', async () => {
    const source = await readFile(assetsGaViewUrl, 'utf8')

    // Must evaluate hasWritePermission('assets_ga') strictly
    assert.match(
      source,
      /canWriteAssets\s*=\s*computed\(\s*\(\)\s*=>\s*hasWritePermission\('assets_ga'\)\s*\)/,
    )
    assert.doesNotMatch(
      source,
      /hasWritePermission\('assets_ga'\)\s*\|\|\s*hasWritePermission\('assets'\)/,
    )

    // Mutation handlers must guard with canWriteAssets
    assert.match(source, /function openAdd\(\)\s*\{[\s\S]*?if \(!canWriteAssets\.value\) return/)
    assert.match(
      source,
      /function openEdit\(asset\)\s*\{[\s\S]*?if \(!canWriteAssets\.value\) return/,
    )
    assert.match(
      source,
      /function openDelete\(asset\)\s*\{[\s\S]*?if \(!canWriteAssets\.value\) return/,
    )
    assert.match(
      source,
      /async function submitForm\(\)\s*\{[\s\S]*?if \(!canWriteAssets\.value\) return/,
    )
    assert.match(source, /async function confirmDelete\(\)\s*\{[\s\S]*?if \(!canWriteAssets\.value/)

    // Template elements must bind canWriteAssets
    assert.match(source, /v-if="canWriteAssets"[\s\S]*?Tambah Aset GA/)
    assert.match(source, /v-if="canWriteAssets"[\s\S]*?Import/)
    assert.match(source, /:disabled="isSubmitting \|\| !canWriteAssets"/)
  })

  test('UsersView defines assets_ga feature and permission defaults', async () => {
    const source = await readFile(usersViewUrl, 'utf8')

    assert.match(source, /key:\s*'assets_ga'/)
    assert.match(source, /label:\s*'Manajemen Aset GA'/)
    assert.match(source, /assets_ga:\s*'none'/)
    assert.match(source, /assets_ga:\s*'full'/)
  })
})

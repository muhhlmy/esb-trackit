import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLocation } from '../src/utils/locationNormalizer.js'

describe('AssetsGaView Frontend Logic Tests', () => {
  test('harus memformat lokasi Aset GA dengan benar', () => {
    assert.equal(normalizeLocation('PL'), 'Pluit')
    assert.equal(normalizeLocation('GS / PL'), 'Gading Serpong - Pluit')
  })

  test('harus memiliki 9 field input modal Aset GA sesuai urutan spesifikasi tanpa field Foto', async () => {
    const fs = await import('node:fs')
    const vuePath = new URL('../src/views/AssetsGaView.vue', import.meta.url)
    const vueContent = fs.readFileSync(vuePath, 'utf-8')

    // Cari posisi masing-masing indikator field dalam template form modal
    const templateStart = vueContent.indexOf('<form @submit.prevent="submitForm"')
    const formTemplate = vueContent.slice(templateStart)

    const posLokasi = formTemplate.indexOf('Lokasi <span class="text-rose-500">*</span>')
    const posLokasiDetail = formTemplate.indexOf('for="ga-lokasi-detail"')
    const posNomorTagging = formTemplate.indexOf('for="ga-nomor-tagging"')
    const posQuantity = formTemplate.indexOf('for="ga-quantity"')
    const posTipe = formTemplate.indexOf('Tipe <span class="text-rose-500">*</span>')
    const posBrand = formTemplate.indexOf('for="ga-brand"')
    const posUkuran = formTemplate.indexOf('for="ga-ukuran"')
    const posDetailAset = formTemplate.indexOf('for="ga-detail"')
    const posKondisi = formTemplate.indexOf('for="ga-kondisi"')

    assert.ok(posLokasi > 0, 'Field Lokasi harus ada')
    assert.ok(posLokasiDetail > posLokasi, 'Field 2: Lokasi Detail harus setelah Lokasi')
    assert.ok(posNomorTagging > posLokasiDetail, 'Field 3: Nomor Tagging harus setelah Lokasi Detail')
    assert.ok(posQuantity > posNomorTagging, 'Field 4: Quantity harus setelah Nomor Tagging')
    assert.ok(posTipe > posQuantity, 'Field 5: Tipe harus setelah Quantity')
    assert.ok(posBrand > posTipe, 'Field 6: Brand harus setelah Tipe')
    assert.ok(posUkuran > posBrand, 'Field 7: Ukuran harus setelah Brand')
    assert.ok(posDetailAset > posUkuran, 'Field 8: Detail Aset harus setelah Ukuran')
    assert.ok(posKondisi > posDetailAset, 'Field 9: Kondisi Aset harus setelah Detail Aset')

    // Verifikasi bahwa Foto tidak ada di template modal form
    assert.equal(formTemplate.includes('handlePhotoChange'), false, 'Foto uploader tidak boleh ada di form modal')
    assert.equal(vueContent.includes('foto:'), false, 'Field foto tidak boleh ada di form state')
  })
})

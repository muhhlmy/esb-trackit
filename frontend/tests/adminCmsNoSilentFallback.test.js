import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const useCasesUrl = new URL('../src/composables/useCases.js', import.meta.url)

describe('Admin CMS Error Handling & No Silent Fallback Suite', () => {
  test('useCases fetchAllCases does NOT contain silent fallback to getPublicCases', async () => {
    const source = await readFile(useCasesUrl, 'utf8')

    // fetchAllCases diekstrak ke createCaseLoaders; cari definisinya di sana.
    const startIdx = source.indexOf('fetchAllCases: () =>')
    assert.ok(startIdx !== -1, 'fetchAllCases function should exist')
    const endIdx = source.indexOf("errorMessage: 'Gagal memuat data artikel Admin CMS.'", startIdx)
    assert.ok(endIdx !== -1, 'errorMessage should follow fetchAllCases')
    const body = source.slice(startIdx, endIdx)

    // Must NOT call getPublicCases inside fetchAllCases
    assert.doesNotMatch(
      body,
      /getPublicCases/,
      'fetchAllCases must not contain silent fallback to getPublicCases()',
    )

    // Must handle error explicitly with toast error notification.
    // Error handling dijalankan oleh loadCases (shared), yang menerima showToast
    // dari pemanggil; pastikan rantai penerusan dan handler-nya ada.
    assert.match(
      source,
      /const \{ fetchCases, fetchAllCases \} = createCaseLoaders\(showToast\)/,
      'fetchAllCases harus menerima showToast dari useCases',
    )
    assert.match(
      source,
      /function createCaseLoaders\(showToast\)[\s\S]*?catch \(err\)\s*\{[\s\S]*?showToast\(/,
      'fetchAllCases must display an error notification when admin cases fail to load',
    )
  })
})

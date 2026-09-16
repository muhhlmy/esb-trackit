import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const useCasesUrl = new URL('../src/composables/useCases.js', import.meta.url)

describe('Admin CMS Error Handling & No Silent Fallback Suite', () => {
  test('useCases fetchAllCases does NOT contain silent fallback to getPublicCases', async () => {
    const source = await readFile(useCasesUrl, 'utf8')

    // Find fetchAllCases function definition
    const startIdx = source.indexOf('async function fetchAllCases()')
    assert.ok(startIdx !== -1, 'fetchAllCases function should exist')
    const endIdx = source.indexOf('const filteredCases =', startIdx)
    assert.ok(endIdx !== -1, 'filteredCases should follow fetchAllCases')
    const body = source.slice(startIdx, endIdx)

    // Must NOT call getPublicCases inside fetchAllCases
    assert.doesNotMatch(
      body,
      /getPublicCases/,
      'fetchAllCases must not contain silent fallback to getPublicCases()',
    )

    // Must handle error explicitly with toast error notification
    assert.match(
      body,
      /catch\s*\(\w+\)\s*\{[\s\S]*?showToast\(/,
      'fetchAllCases must display an error notification when admin cases fail to load',
    )
  })
})

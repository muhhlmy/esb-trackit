import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { printHtmlDocument } from '../src/utils/printDocument.js'
const source = readFileSync(new URL('../src/views/SubmissionsView.vue', import.meta.url), 'utf8')
test('BAST detail route drives form; status UI removed; footer saves and returns', () => {
  assert.match(source, /const isFormOpen = computed/)
  assert.match(source, /name: 'submission-detail'/)
  assert.doesNotMatch(source, /filterStatus|submissionStatusLabel|submission-card-status/)
  assert.match(source, /@click="saveAndReturn"/)
  assert.match(source, /fieldset[\s\S]*?:disabled="!canWriteSubmissions \|\| isSaving"/)
})
test('successful create stays successful when refresh fails; retry updates same ID', async () => {
  const code = source.slice(
    source.indexOf('async function persistSubmission('),
    source.indexOf('async function saveAndReturn('),
  )
  let creates = 0,
    updates = 0
  const state = { value: null },
    rows = { value: [] },
    message = { value: '' }
  const run = new Function(
    'canWriteSubmissions',
    'isSaving',
    'validationError',
    'saveMessage',
    'selectedSubmissionId',
    'savedSubmissions',
    'buildSubmissionPayload',
    'put',
    'post',
    'getAllPages',
    'assetSelectionError',
    'rememberAssetHistory',
    code + '; return persistSubmission',
  )
  const persist = run(
    { value: true },
    { value: false },
    { value: '' },
    message,
    state,
    rows,
    () => ({}),
    async () => {
      updates++
      return { id: 7 }
    },
    async () => {
      creates++
      return { id: 7 }
    },
    async () => {
      throw Error('offline')
    },
    () => '',
    () => {},
  )
  assert.equal(await persist(), true)
  assert.equal(state.value, 7)
  assert.equal(await persist(), true)
  assert.equal(creates, 1)
  assert.equal(updates, 1)
  assert.equal(rows.value.length, 1)
})
test('history print never hydrates edit state or persists', () => {
  const code = source.slice(
    source.indexOf('async function printSubmission'),
    source.indexOf('async function persistSubmission'),
  )
  assert.match(code, /persist: false, payload: submission.payload/)
  assert.doesNotMatch(code, /editSubmission|hydrateSubmission/)
})
test('printing reuses window opened before async save', () => {
  const previous = globalThis.window
  let html = ''
  globalThis.window = {
    open() {
      throw Error('must reuse prepared window')
    },
  }
  try {
    assert.equal(
      printHtmlDocument('<p>BAST</p>', '', {
        document: {
          write(value) {
            html = value
          },
          close() {},
        },
        addEventListener() {},
      }),
      true,
    )
    assert.equal(html, '<p>BAST</p>')
  } finally {
    globalThis.window = previous
  }
})

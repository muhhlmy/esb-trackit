import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'composables', 'useApi.js')
const src = readFileSync(file, 'utf8')

// Build URL seperti getAllPages lakukan: pakai & bila endpoint sudah punya query string.
function buildUrl(endpoint, page, limit) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
  const joiner = endpoint.includes('?') ? '&' : '?'
  return `${endpoint}${joiner}${qs}`
}

assert.ok(
  src.includes("endpoint.includes('?') ? '&' : '?'"),
  'getAllPages harus menyambung dengan & bila endpoint sudah ada query',
)

assert.equal(
  buildUrl('/api/tickets?tab=unassigned', 1, 100),
  '/api/tickets?tab=unassigned&page=1&limit=100',
  'Tab unassigned harus tetap param terpisah',
)
assert.equal(
  buildUrl('/api/tickets?tab=closed&queue_id=3', 2, 100),
  '/api/tickets?tab=closed&queue_id=3&page=2&limit=100',
)
assert.equal(
  buildUrl('/api/users', 1, 500),
  '/api/users?page=1&limit=500',
  'Endpoint tanpa query tetap pakai ?',
)

// Validasi param result harus parseable dan nilai tab murni.
const parsed = new URLSearchParams(buildUrl('/api/tickets?tab=assigned', 1, 100).split('?')[1])
assert.equal(parsed.get('tab'), 'assigned')
assert.equal(parsed.get('page'), '1')
assert.equal(parsed.get('limit'), '100')

console.log('useApi getAllPages query join OK')

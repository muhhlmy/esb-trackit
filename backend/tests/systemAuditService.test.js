import test from 'node:test'
import assert from 'node:assert/strict'
import { pool } from '../src/config/database.js'
import { recordSystemAudit } from '../src/services/systemAuditService.js'

test('system audit stores actor and redacts secrets', async () => {
  const marker = `audit-test-${Date.now()}`
  try {
    await recordSystemAudit(
      {
        // Actor ini sengaja tidak ada di DB. Reset database membutuhkan
        // snapshot aktor tanpa FK setelah akun pelaku ikut dihapus.
        user: { id: 999999999, nama: 'Audit Tester', email: 'audit@example.test' },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'node-test' },
      },
      {
        module: 'users',
        action: 'UPDATE',
        entityType: 'user',
        entityId: marker,
        entityLabel: marker,
        summary: 'Audit system test',
        actorUserId: null,
        before: { password: 'rahasia', nama: 'Sebelum' },
        after: { password_hash: 'hash-rahasia', nama: 'Sesudah' },
      },
    )

    const result = await pool.query(
      'SELECT before_data, after_data, actor_name FROM system_audit_logs WHERE entity_id = $1',
      [marker],
    )
    assert.equal(result.rowCount, 1)
    assert.equal(result.rows[0].actor_name, 'Audit Tester')
    assert.equal(result.rows[0].before_data.password, '[disamarkan]')
    assert.equal(result.rows[0].after_data.password_hash, '[disamarkan]')
  } finally {
    await pool.query('DELETE FROM system_audit_logs WHERE entity_id = $1', [marker])
    await pool.end()
  }
})

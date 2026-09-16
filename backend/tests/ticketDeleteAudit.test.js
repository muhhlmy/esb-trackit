import assert from 'node:assert/strict'
import http from 'node:http'
import jwt from 'jsonwebtoken'
import test from 'node:test'
import { app } from '../src/app.js'
import { pool } from '../src/config/database.js'
import { env } from '../src/config/env.js'
import { createSession, ensureUserSessionsTable } from '../src/services/sessionService.js'

function request(server, path, { method = 'GET', token } = {}) {
  return new Promise((resolve, reject) => {
    const address = server.address()
    const req = http.request({
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method,
      headers: { Connection: 'close', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null }))
    })
    req.on('error', reject)
    req.end()
  })
}

test('deleting a ticket creates a readable system audit entry', async (t) => {
  await ensureUserSessionsTable(pool)
  const marker = `ticket-audit-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const email = `${marker}@example.test`
  let userId
  let ticketId
  let sessionId
  let server

  t.after(async () => {
    if (server) {
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
    }
    if (ticketId) {
      await pool.query('DELETE FROM system_audit_logs WHERE entity_id = $1', [String(ticketId)])
    }
    if (sessionId) await pool.query('DELETE FROM user_sessions WHERE session_id = $1', [sessionId])
    if (userId) {
      await pool.query(
        `UPDATE users
            SET is_active = false,
                deleted_at = CURRENT_TIMESTAMP,
                email = $2,
                deletion_reason = 'ticket-delete-audit-test-cleanup'
          WHERE id = $1`,
        [userId, `deleted-${marker}@example.test`],
      )
    }
    await pool.end()
  })

  const user = await pool.query(
    `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
     VALUES ('Penghapus Tiket Test', $1, 'not-used', 'superadmin', '{}'::jsonb, true)
     RETURNING id`,
    [email],
  )
  userId = Number(user.rows[0].id)
  const queue = await pool.query('SELECT id FROM ticket_queues WHERE is_active = true ORDER BY id LIMIT 1')
  assert.equal(queue.rowCount, 1, 'an active ticket queue is required for this test')
  const ticket = await pool.query(
    `INSERT INTO tickets (nomor_tiket, judul, kategori, prioritas, status_tiket, queue_id, pelapor_user_id)
     VALUES ($1, 'Tiket audit hapus', 'Test', 'Medium', 'Open', $2, $3)
     RETURNING id`,
    [`TST-${Date.now().toString().slice(-10)}`, queue.rows[0].id, userId],
  )
  ticketId = Number(ticket.rows[0].id)
  const session = await createSession(userId)
  sessionId = session.sessionId
  const token = jwt.sign({ sub: String(userId), id: userId, sid: sessionId }, env.jwt.secret, { expiresIn: '1h' })
  server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
  })

  const response = await request(server, `/api/tickets/${ticketId}`, { method: 'DELETE', token })
  assert.equal(response.status, 200)
  assert.match(response.body.message, /berhasil dihapus/i)

  const audit = await pool.query(
    `SELECT action, actor_name, summary
       FROM system_audit_logs
      WHERE module = 'tickets' AND entity_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [String(ticketId)],
  )
  assert.equal(audit.rowCount, 1)
  assert.equal(audit.rows[0].action, 'DELETE')
  assert.equal(audit.rows[0].actor_name, 'Penghapus Tiket Test')
  assert.match(audit.rows[0].summary, /Tiket dihapus:/)
})

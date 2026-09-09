import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import jwt from 'jsonwebtoken'
import { issueSessionCookie } from '../src/security/sessionToken.js'
import { createEnrollmentCredential, hashPassword, verifyPassword } from '../src/security/passwordService.js'
import { drainHttpServer } from '../src/services/shutdownService.js'
import { addSseClient, closeAllSseClients } from '../src/services/realtimeService.js'

test('issued token expiry matches JWT exp and precedes a 12-hour server session', () => {
  const expiresAt = new Date(Date.now() + 12 * 3600_000)
  const { token, expMs } = issueSessionCookie({ setHeader() {} }, {
    userId: 1, sessionId: 'test-session', expiresAt,
  })
  assert.equal(expMs, jwt.decode(token).exp * 1000)
  assert.ok(expMs > Date.now())
  assert.ok(expMs < expiresAt.getTime())
})

test('token cannot outlive a server session near expiry', () => {
  const expiresAt = new Date(Date.now() + 30_000)
  const { expMs } = issueSessionCookie({ setHeader() {} }, { userId: 1, sessionId: 'test', expiresAt })
  assert.equal(expMs, Math.floor(expiresAt.getTime() / 1000) * 1000)
})

test('new enrollment credentials are unique and cannot authenticate before reset', async () => {
  const first = createEnrollmentCredential()
  assert.notEqual(first, createEnrollmentCredential())
  assert.equal(await verifyPassword(first, first), false)
  assert.equal(await verifyPassword('TemporaryUserPass123!', first), false)
  const enrolledHash = await hashPassword('EnrolledPassword123!')
  assert.equal(await verifyPassword('EnrolledPassword123!', enrolledHash), true)
})

test('shutdown drains an active HTTP SSE connection without waiting for the timeout', { timeout: 3000 }, async (t) => {
  const server = http.createServer((_req, res) => {
    addSseClient(res, { id: 1, role: 'superadmin', is_active: true })
    res.writeHead(200, { 'Content-Type': 'text/event-stream' })
    res.write('data: connected\n\n')
  })
  t.after(() => { server.closeAllConnections(); server.close() })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const response = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${server.address().port}`, resolve).on('error', reject)
  })
  response.resume()
  const ended = new Promise((resolve) => response.on('end', resolve))
  await drainHttpServer(server, closeAllSseClients)
  await ended
  assert.equal(server.listening, false)
})

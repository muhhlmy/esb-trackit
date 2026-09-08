import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import jwt from 'jsonwebtoken'
import { app } from '../src/app.js'
import { pool } from '../src/config/database.js'
import { env } from '../src/config/env.js'
import {
  createSession,
  verifySession,
  revokeSession,
  ensureUserSessionsTable,
} from '../src/services/sessionService.js'
import { SESSION_COOKIE_NAME } from '../src/security/sessionToken.js'

function makeRequest(server, path, headers = {}, bodyObj = null) {
  return new Promise((resolve, reject) => {
    const address = server.address()
    if (!address || typeof address !== 'object') {
      return reject(new Error('Server address is not available.'))
    }

    const payloadStr = bodyObj ? JSON.stringify(bodyObj) : headers.body || ''
    const reqHeaders = {
      Host: `127.0.0.1:${address.port}`,
      ...headers,
    }

    if (bodyObj && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json'
    }

    if (payloadStr) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payloadStr)
    }

    const options = {
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method: headers.method || (bodyObj ? 'POST' : 'GET'),
      headers: reqHeaders,
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }))
    })

    req.on('error', reject)
    if (payloadStr) {
      req.write(payloadStr)
    }
    req.end()
  })
}

test('P0-1 — Sliding Authentication Token & Session Verification Suite', async (t) => {
  await ensureUserSessionsTable(pool)

  let server
  let testUserId = null
  let disabledUserId = null
  const testEmail = `sliding.test.${Date.now()}@company.com`
  const disabledEmail = `disabled.test.${Date.now()}@company.com`
  const testPasswordHash = '$2b$10$KUuuaQWHvErN2WNcqrJOXeRC1Ym6GRyxcIzwpmRboOSkDpOPxE/Cu'

  await t.test('Setup Test Users & HTTP Server', async () => {
    server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

    // 1. Active test user
    const resActive = await pool.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
       VALUES ('Sliding Active User', $1, $2, 'admin', '{"assets":"full"}'::jsonb, true)
       RETURNING id`,
      [testEmail, testPasswordHash],
    )
    testUserId = resActive.rows[0].id

    // 2. Disabled test user
    const resDisabled = await pool.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
       VALUES ('Sliding Disabled User', $1, $2, 'admin', '{"assets":"full"}'::jsonb, false)
       RETURNING id`,
      [disabledEmail, testPasswordHash],
    )
    disabledUserId = resDisabled.rows[0].id
  })

  await t.test('TEST A — Normal authentication with valid token and session succeeds', async () => {
    const session = await createSession(testUserId, { ttlHours: 12 })
    const nowSec = Math.floor(Date.now() / 1000)
    // Fresh token (15 mins TTL, 14 mins remaining > 50%)
    const token = jwt.sign(
      { sub: String(testUserId), sid: session.sessionId, iat: nowSec, exp: nowSec + 900 },
      env.jwt.secret,
      { algorithm: 'HS256' },
    )

    const res = await makeRequest(server, '/api/assets', {
      Cookie: `${SESSION_COOKIE_NAME}=${token}`,
    })

    assert.equal(res.status, 200)
    // Fresh token should NOT trigger refresh Set-Cookie
    assert.equal(res.headers['set-cookie'], undefined)
  })

  await t.test('TEST B — Near-expiry JWT (<50% TTL) refreshes auth cookie on protected request', async () => {
    const session = await createSession(testUserId, { ttlHours: 12 })
    const nowSec = Math.floor(Date.now() / 1000)
    // Near-expiry token: exp is 120 seconds in future (< 450s / 50% of 900s TTL)
    const nearExpiryToken = jwt.sign(
      { sub: String(testUserId), sid: session.sessionId, iat: nowSec - 780, exp: nowSec + 120 },
      env.jwt.secret,
      { algorithm: 'HS256' },
    )

    const res = await makeRequest(server, '/api/assets', {
      Cookie: `${SESSION_COOKIE_NAME}=${nearExpiryToken}`,
    })

    assert.equal(res.status, 200, 'Protected endpoint must succeed')
    const setCookie = res.headers['set-cookie']
    assert.ok(setCookie, 'Refreshed auth cookie must be emitted via Set-Cookie')

    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie
    assert.ok(cookieStr.includes(`${SESSION_COOKIE_NAME}=`))
    assert.ok(cookieStr.includes('HttpOnly'))
    assert.ok(cookieStr.includes('SameSite=Lax'))

    // Verify refreshed token in cookie is valid and has fresh expiration
    const match = new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`).exec(cookieStr)
    assert.ok(match)
    const refreshedToken = decodeURIComponent(match[1])
    const decoded = jwt.verify(refreshedToken, env.jwt.secret, { algorithms: ['HS256'] })
    assert.equal(decoded.sub, String(testUserId))
    assert.equal(decoded.sid, session.sessionId)
    assert.ok(decoded.exp > nowSec + 300, 'Refreshed token must have full TTL')
  })

  await t.test('TEST C — Expired/revoked server session rejects request even with valid JWT signature', async () => {
    const session = await createSession(testUserId, { ttlHours: 12 })
    const nowSec = Math.floor(Date.now() / 1000)
    const token = jwt.sign(
      { sub: String(testUserId), sid: session.sessionId, iat: nowSec, exp: nowSec + 900 },
      env.jwt.secret,
      { algorithm: 'HS256' },
    )

    // Explicitly revoke session in PostgreSQL
    await revokeSession(session.sessionId)

    const res = await makeRequest(server, '/api/assets', {
      Cookie: `${SESSION_COOKIE_NAME}=${token}`,
    })

    assert.equal(res.status, 401, 'Revoked server session must be rejected with 401')
  })

  await t.test('TEST D — Disabled user is rejected with 401 even with valid session and token', async () => {
    const session = await createSession(disabledUserId, { ttlHours: 12 })
    const nowSec = Math.floor(Date.now() / 1000)
    const token = jwt.sign(
      { sub: String(disabledUserId), sid: session.sessionId, iat: nowSec, exp: nowSec + 900 },
      env.jwt.secret,
      { algorithm: 'HS256' },
    )

    const res = await makeRequest(server, '/api/assets', {
      Cookie: `${SESSION_COOKIE_NAME}=${token}`,
    })

    assert.equal(res.status, 401, 'Inactive/disabled user must be rejected')
  })

  await t.test('TEST E — Sliding refresh does not silently extend DB session expires_at', async () => {
    const session = await createSession(testUserId, { ttlHours: 12 })
    const initialDbRes = await pool.query(
      'SELECT expires_at FROM user_sessions WHERE session_id = $1',
      [session.sessionId],
    )
    const originalExpiresAt = new Date(initialDbRes.rows[0].expires_at).getTime()

    const nowSec = Math.floor(Date.now() / 1000)
    const nearExpiryToken = jwt.sign(
      { sub: String(testUserId), sid: session.sessionId, iat: nowSec - 800, exp: nowSec + 100 },
      env.jwt.secret,
      { algorithm: 'HS256' },
    )

    const res = await makeRequest(server, '/api/assets', {
      Cookie: `${SESSION_COOKIE_NAME}=${nearExpiryToken}`,
    })

    assert.equal(res.status, 200)

    const postDbRes = await pool.query(
      'SELECT expires_at FROM user_sessions WHERE session_id = $1',
      [session.sessionId],
    )
    const postExpiresAt = new Date(postDbRes.rows[0].expires_at).getTime()

    assert.equal(
      postExpiresAt,
      originalExpiresAt,
      'Database session expires_at must remain strictly unchanged across JWT sliding refreshes',
    )
  })

  await t.test('Teardown Test Users and Server', async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
    await pool.query('DELETE FROM user_sessions WHERE user_id IN ($1, $2)', [
      testUserId,
      disabledUserId,
    ])
    await pool.query('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id IN ($1, $2)', [
      testUserId,
      disabledUserId,
    ])
  })
})

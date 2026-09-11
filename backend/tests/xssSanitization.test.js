import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import jwt from 'jsonwebtoken'
import { app } from '../src/app.js'
import { pool } from '../src/config/database.js'
import { env } from '../src/config/env.js'
import { createSession, ensureUserSessionsTable } from '../src/services/sessionService.js'

function makeRequest(server, path, headers = {}, bodyObj = null) {
  return new Promise((resolve, reject) => {
    const address = server.address()
    if (!address || typeof address !== 'object') {
      return reject(new Error('Server address is not available.'))
    }

    const payloadStr = bodyObj !== null ? JSON.stringify(bodyObj) : headers.body || ''
    const reqHeaders = {
      Host: `127.0.0.1:${address.port}`,
      ...headers,
    }

    if (bodyObj !== null && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json'
    }

    if (payloadStr) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payloadStr)
    }

    const options = {
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method: headers.method || (bodyObj !== null ? 'POST' : 'GET'),
      headers: reqHeaders,
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        let json = null
        try {
          json = JSON.parse(data)
        } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: data, json })
      })
    })

    req.on('error', reject)
    if (payloadStr) {
      req.write(payloadStr)
    }
    req.end()
  })
}

test('H-1, M-1, M-2 — XSS Sanitization & Security Fixes Suite', async (t) => {
  let server
  let superadminId, tokenSuperadmin
  let regularUserId, tokenRegularUser
  const createdCaseIds = []
  const createdFaqIds = []

  t.before(async () => {
    await ensureUserSessionsTable(pool)

    const ts = Date.now()

    // 1. Create Superadmin User
    const resSuper = await pool.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
       VALUES ('Super Test', $1, '$2b$10$KUuuaQWHvErN2WNcqrJOXeRC1Ym6GRyxcIzwpmRboOSkDpOPxE/Cu', 'superadmin', '{"assets":"full","logs":"full"}'::jsonb, true)
       RETURNING id`,
      [`super.xss.${ts}@company.com`],
    )
    superadminId = resSuper.rows[0].id
    const sessionSuper = await createSession(superadminId)
    tokenSuperadmin = jwt.sign(
      { sub: String(superadminId), id: superadminId, sid: sessionSuper.sessionId, role: 'superadmin', permissions: { assets: 'full', logs: 'full' } },
      env.jwt.secret,
      { expiresIn: '8h' },
    )

    // 2. Create Regular User (without logs permission)
    const resUser = await pool.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
       VALUES ('Regular User', $1, '$2b$10$KUuuaQWHvErN2WNcqrJOXeRC1Ym6GRyxcIzwpmRboOSkDpOPxE/Cu', 'user', '{"assets":"read_only","logs":"none"}'::jsonb, true)
       RETURNING id`,
      [`user.xss.${ts}@company.com`],
    )
    regularUserId = resUser.rows[0].id
    const sessionUser = await createSession(regularUserId)
    tokenRegularUser = jwt.sign(
      { sub: String(regularUserId), id: regularUserId, sid: sessionUser.sessionId, role: 'user', permissions: { assets: 'read_only', logs: 'none' } },
      env.jwt.secret,
      { expiresIn: '8h' },
    )

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve)
    })
  })

  t.after(async () => {
    for (const id of createdCaseIds) {
      await pool.query('DELETE FROM cases WHERE id = $1', [id]).catch(() => {})
    }
    for (const id of createdFaqIds) {
      await pool.query('DELETE FROM faq WHERE id = $1', [id]).catch(() => {})
    }
    if (superadminId) {
      await pool.query('DELETE FROM users WHERE id = $1', [superadminId]).catch(() => {})
    }
    if (regularUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [regularUserId]).catch(() => {})
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
  })

  // ── H-1: Stored-XSS hardening in Cases ──
  await t.test('H-1 TEST 1 — POST /api/cases rejects active script markup in title with 400', async () => {
    const res = await makeRequest(
      server,
      '/api/cases',
      { Authorization: `Bearer ${tokenSuperadmin}` },
      {
        title: '<script>alert(1)</script> Test Title',
        category: 'Hardware',
        severity: 'low',
        summary: 'Safe summary',
        status: 'DRAFT',
      },
    )
    assert.equal(res.status, 400)
    assert.match(res.json?.message || '', /tag HTML atau skrip aktif/i)
  })

  await t.test('H-1 TEST 2 — POST /api/cases rejects onerror event handler markup in summary with 400', async () => {
    const res = await makeRequest(
      server,
      '/api/cases',
      { Authorization: `Bearer ${tokenSuperadmin}` },
      {
        title: 'Normal Title',
        category: 'Hardware',
        severity: 'low',
        summary: '<img src=x onerror=alert(1)>',
        status: 'DRAFT',
      },
    )
    assert.equal(res.status, 400)
    assert.match(res.json?.message || '', /tag HTML atau skrip aktif/i)
  })

  await t.test('H-1 TEST 3 — POST /api/cases accepts clean text and creates case with 201', async () => {
    const res = await makeRequest(
      server,
      '/api/cases',
      { Authorization: `Bearer ${tokenSuperadmin}` },
      {
        title: 'Pembersihan Kipas Pendingin Laptop Dell',
        category: 'Hardware',
        severity: 'low',
        summary: 'Prosedur standar pembersihan debu laptop',
        status: 'DRAFT',
      },
    )
    assert.equal(res.status, 201)
    if (res.json?.id) createdCaseIds.push(res.json.id)
  })

  // ── H-1: Stored-XSS hardening in FAQs ──
  await t.test('H-1 TEST 4 — POST /api/faqs rejects active script in question with 400', async () => {
    const res = await makeRequest(
      server,
      '/api/faqs',
      { Authorization: `Bearer ${tokenSuperadmin}` },
      {
        question: '<script>alert(1)</script> Pertanyaan?',
        answer: 'Jawaban aman.',
        category: 'Umum',
        status: 'DRAFT',
      },
    )
    assert.equal(res.status, 400)
    assert.match(res.json?.message || '', /tag HTML atau skrip aktif/i)
  })

  await t.test('H-1 TEST 5 — POST /api/faqs rejects javascript: URI in action_link with 400', async () => {
    const res = await makeRequest(
      server,
      '/api/faqs',
      { Authorization: `Bearer ${tokenSuperadmin}` },
      {
        question: 'Bagaimana cara reset password?',
        answer: 'Buka tautan berikut.',
        category: 'Umum',
        action_link: 'javascript:alert(document.cookie)',
        status: 'DRAFT',
      },
    )
    assert.equal(res.status, 400)
    assert.match(res.json?.message || '', /javascript/i)
  })

  // ── H-1: Stored-XSS hardening in KB Categories ──
  await t.test('H-1 TEST 6 — POST /api/kb-categories rejects script in title with 400', async () => {
    const res = await makeRequest(
      server,
      '/api/kb-categories',
      { Authorization: `Bearer ${tokenSuperadmin}` },
      {
        key: 'xss-test-category',
        title: '<script>alert(1)</script>',
        description: 'Test category',
        status: 'DRAFT',
      },
    )
    assert.equal(res.status, 400)
    assert.match(res.json?.message || '', /tag HTML atau skrip aktif/i)
  })

  // ── M-1: Bodiless Logout ──
  await t.test('M-1 TEST 7 — POST /api/auth/logout succeeds with 200 without Content-Type header', async () => {
    const sessionToLogout = await createSession(superadminId)
    const tokenToLogout = jwt.sign(
      { sub: String(superadminId), id: superadminId, sid: sessionToLogout.sessionId, role: 'superadmin' },
      env.jwt.secret,
      { expiresIn: '1h' },
    )

    const res = await makeRequest(
      server,
      '/api/auth/logout',
      {
        method: 'POST',
        Authorization: `Bearer ${tokenToLogout}`,
        // Note: No Content-Type header sent
      },
      null,
    )
    assert.equal(res.status, 200)
    assert.match(res.json?.message || '', /Logout berhasil/i)
  })

  // ── M-2: GET /api/logs/assets/:id Authorization Check ──
  await t.test('M-2 TEST 8 — GET /api/logs/assets/:id rejects unauthorized regular user with 403', async () => {
    const res = await makeRequest(
      server,
      '/api/logs/assets/1',
      {
        method: 'GET',
        Authorization: `Bearer ${tokenRegularUser}`,
      },
    )
    assert.equal(res.status, 403)
  })

  await t.test('M-2 TEST 9 — GET /api/logs/assets/:id allows superadmin with 200', async () => {
    const res = await makeRequest(
      server,
      '/api/logs/assets/1',
      {
        method: 'GET',
        Authorization: `Bearer ${tokenSuperadmin}`,
      },
    )
    assert.equal(res.status, 200)
  })
})

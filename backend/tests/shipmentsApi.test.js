import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import jwt from 'jsonwebtoken'
import { app } from '../src/app.js'
import { pool } from '../src/config/database.js'
import { env } from '../src/config/env.js'
import { createSession, ensureUserSessionsTable } from '../src/services/sessionService.js'

function makeRequest(server, path, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const address = server.address()
    const payloadStr = body ? JSON.stringify(body) : null
    const reqHeaders = {
      Host: `127.0.0.1:${address.port}`,
      ...headers,
    }

    if (payloadStr && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json'
    }
    if (payloadStr) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payloadStr)
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: address.port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let resData = ''
        res.on('data', (chunk) => {
          resData += chunk
        })
        res.on('end', () => {
          let json = null
          try {
            json = JSON.parse(resData)
          } catch {}
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: resData,
            json,
          })
        })
      },
    )

    req.on('error', reject)
    if (payloadStr) req.write(payloadStr)
    req.end()
  })
}

test('Modul Tracker Pengiriman — Shipments API Test Suite', async (t) => {
  let server
  const createdUserIds = []
  const createdShipmentIds = []

  let tokenNoPerm
  let tokenReadOnly
  let tokenFull
  let tokenSuperadmin
  let userFullId

  t.before(async () => {
    await ensureUserSessionsTable(pool).catch(() => {})

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve)
    })

    const ts = Date.now().toString().slice(-8)
    const dummyHash = '$2b$10$e8w8X9nZgLp5oN4n44444eR8oOSkDpOPxE/Cu0000000000000000'

    async function createUser(nama, emailPrefix, role, permissions) {
      const email = `${emailPrefix}_${ts}@company.com`
      const res = await pool.query(
        `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
         VALUES ($1, $2, $3, $4, $5::jsonb, true)
         RETURNING id`,
        [nama, email, dummyHash, role, JSON.stringify(permissions)],
      )
      const userId = res.rows[0].id
      createdUserIds.push(userId)

      const session = await createSession(userId)
      const token = jwt.sign(
        {
          sub: String(userId),
          id: userId,
          sid: session.sessionId,
          email,
          role,
          permissions,
        },
        env.jwt.secret,
        { expiresIn: '1h' },
      )
      return { id: userId, token }
    }

    const noPerm = await createUser('User No Perm', 'ship_noperm', 'user', { shipments: 'none' })
    tokenNoPerm = noPerm.token

    const readOnly = await createUser('User Read Only', 'ship_readonly', 'user', { shipments: 'read_only' })
    tokenReadOnly = readOnly.token

    const full = await createUser('User Full', 'ship_full', 'user', { shipments: 'full' })
    tokenFull = full.token
    userFullId = full.id

    const superAdmin = await createUser('Superadmin Shipments', 'ship_sa', 'superadmin', {})
    tokenSuperadmin = superAdmin.token
  })

  t.after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve))
    }
    if (createdShipmentIds.length > 0) {
      await pool.query('DELETE FROM asset_shipments WHERE id = ANY($1::int[])', [createdShipmentIds]).catch(() => {})
    }
    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM user_sessions WHERE user_id = ANY($1::int[])', [createdUserIds]).catch(() => {})
      await pool.query('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ANY($1::int[])', [createdUserIds]).catch(() => {})
    }
  })

  // ── 1. Authentication & RBAC Enforcement ──

  await t.test('1.1 Unauthenticated requests return 401', async () => {
    const res = await makeRequest(server, '/api/shipments')
    assert.equal(res.status, 401)
  })

  await t.test('1.2 User with shipments=none returns 403 on GET', async () => {
    const res = await makeRequest(server, '/api/shipments', {
      headers: { Authorization: `Bearer ${tokenNoPerm}` },
    })
    assert.equal(res.status, 403)
  })

  await t.test('1.3 User with shipments=none returns 403 on POST', async () => {
    const res = await makeRequest(server, '/api/shipments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenNoPerm}` },
      body: {
        request_date: '2026-09-08',
        recipient_name: 'Budi Santoso',
        item_description: 'Laptop ThinkPad X1',
        destination: 'Kantor Cabang Surabaya',
      },
    })
    assert.equal(res.status, 403)
  })

  await t.test('1.4 User with shipments=read_only can GET list (200)', async () => {
    const res = await makeRequest(server, '/api/shipments', {
      headers: { Authorization: `Bearer ${tokenReadOnly}` },
    })
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.json?.data))
    assert.ok(res.json?.summary)
  })

  await t.test('1.5 User with shipments=read_only is DENIED from creating (POST -> 403)', async () => {
    const res = await makeRequest(server, '/api/shipments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenReadOnly}` },
      body: {
        request_date: '2026-09-08',
        recipient_name: 'Budi Santoso',
        item_description: 'Laptop ThinkPad X1',
        destination: 'Kantor Cabang Surabaya',
      },
    })
    assert.equal(res.status, 403)
  })

  let testShipmentId

  await t.test('1.6 User with shipments=full can CREATE shipment (POST -> 201)', async () => {
    const res = await makeRequest(server, '/api/shipments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFull}` },
      body: {
        request_date: '2026-09-08',
        recipient_name: 'Ahmad Dahlan',
        item_description: 'Monitor Dell 27 Inch 4K',
        destination: 'Jl. Sudirman Kav 25, Jakarta Selatan',
        tracking_number: 'JNE-12345678',
        status: 'belum_dikirim',
        delivery_proof_url: 'https://cdn.example.com/proof/receipt-01.jpg',
      },
    })
    assert.equal(res.status, 201)
    assert.ok(res.json?.id)
    assert.equal(res.json?.recipient_name, 'Ahmad Dahlan')
    assert.equal(res.json?.item_description, 'Monitor Dell 27 Inch 4K')
    assert.equal(res.json?.destination, 'Jl. Sudirman Kav 25, Jakarta Selatan')
    assert.equal(res.json?.tracking_number, 'JNE-12345678')
    assert.equal(res.json?.status, 'belum_dikirim')
    assert.equal(res.json?.delivery_proof_url, 'https://cdn.example.com/proof/receipt-01.jpg')
    assert.equal(res.json?.created_by, userFullId)
    assert.equal(res.json?.created_by_name, 'User Full')

    testShipmentId = res.json.id
    createdShipmentIds.push(testShipmentId)
  })

  await t.test('1.7 User with shipments=read_only is DENIED from editing (PUT -> 403)', async () => {
    const res = await makeRequest(server, `/api/shipments/${testShipmentId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenReadOnly}` },
      body: { status: 'sedang_dikirim' },
    })
    assert.equal(res.status, 403)
  })

  await t.test('1.8 User with shipments=read_only is DENIED from deleting (DELETE -> 403)', async () => {
    const res = await makeRequest(server, `/api/shipments/${testShipmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenReadOnly}` },
    })
    assert.equal(res.status, 403)
  })

  await t.test('1.9 User with shipments=full can UPDATE shipment (PUT -> 200)', async () => {
    const res = await makeRequest(server, `/api/shipments/${testShipmentId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenFull}` },
      body: {
        status: 'sedang_dikirim',
        tracking_number: 'JNE-87654321',
      },
    })
    assert.equal(res.status, 200)
    assert.equal(res.json?.status, 'sedang_dikirim')
    assert.equal(res.json?.tracking_number, 'JNE-87654321')
  })

  await t.test('1.10 Superadmin has automatic full access to shipments', async () => {
    const listRes = await makeRequest(server, '/api/shipments', {
      headers: { Authorization: `Bearer ${tokenSuperadmin}` },
    })
    assert.equal(listRes.status, 200)

    const createRes = await makeRequest(server, '/api/shipments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSuperadmin}` },
      body: {
        request_date: '2026-09-08',
        recipient_name: 'Siti Rahma',
        item_description: 'Keyboard & Mouse Wireless',
        destination: 'Gedung Cyber 2 Lt. 10',
      },
    })
    assert.equal(createRes.status, 201)
    const saShipmentId = createRes.json.id
    createdShipmentIds.push(saShipmentId)

    const delRes = await makeRequest(server, `/api/shipments/${saShipmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenSuperadmin}` },
    })
    assert.equal(delRes.status, 200)
  })

  // ── 2. Payload Validation & Constraint Testing ──

  await t.test('2.1 Invalid status value is rejected with 400', async () => {
    const res = await makeRequest(server, '/api/shipments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFull}` },
      body: {
        request_date: '2026-09-08',
        recipient_name: 'Testing User',
        item_description: 'Barang Tes',
        destination: 'Jakarta',
        status: 'arbitrary_status_yang_salah',
      },
    })
    assert.equal(res.status, 400)
  })

  await t.test('2.2 Invalid request date format/calendar is rejected with 400', async () => {
    const res1 = await makeRequest(server, '/api/shipments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFull}` },
      body: {
        request_date: 'invalid-date',
        recipient_name: 'Testing User',
        item_description: 'Barang Tes',
        destination: 'Jakarta',
      },
    })
    assert.equal(res1.status, 400)

    // Non-existent calendar date (February 31)
    const res2 = await makeRequest(server, '/api/shipments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFull}` },
      body: {
        request_date: '2026-02-31',
        recipient_name: 'Testing User',
        item_description: 'Barang Tes',
        destination: 'Jakarta',
      },
    })
    assert.equal(res2.status, 400)
  })

  await t.test('2.3 Missing required fields are rejected with 400', async () => {
    // Missing recipient
    const res1 = await makeRequest(server, '/api/shipments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFull}` },
      body: {
        request_date: '2026-09-08',
        item_description: 'Barang',
        destination: 'Jakarta',
      },
    })
    assert.equal(res1.status, 400)

    // Missing item description
    const res2 = await makeRequest(server, '/api/shipments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFull}` },
      body: {
        request_date: '2026-09-08',
        recipient_name: 'Budi',
        destination: 'Jakarta',
      },
    })
    assert.equal(res2.status, 400)

    // Missing destination
    const res3 = await makeRequest(server, '/api/shipments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFull}` },
      body: {
        request_date: '2026-09-08',
        recipient_name: 'Budi',
        item_description: 'Barang',
      },
    })
    assert.equal(res3.status, 400)
  })

  await t.test('2.4 Dangerous protocol in delivery_proof_url is rejected (javascript:, data:)', async () => {
    const resJs = await makeRequest(server, '/api/shipments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFull}` },
      body: {
        request_date: '2026-09-08',
        recipient_name: 'Budi',
        item_description: 'Barang',
        destination: 'Jakarta',
        delivery_proof_url: 'javascript:alert(1)',
      },
    })
    assert.equal(resJs.status, 400)

    const resData = await makeRequest(server, '/api/shipments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFull}` },
      body: {
        request_date: '2026-09-08',
        recipient_name: 'Budi',
        item_description: 'Barang',
        destination: 'Jakarta',
        delivery_proof_url: 'data:text/html,<script>alert(1)</script>',
      },
    })
    assert.equal(resData.status, 400)
  })

  await t.test('2.5 Overlong tracking number is rejected with 400', async () => {
    const res = await makeRequest(server, '/api/shipments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFull}` },
      body: {
        request_date: '2026-09-08',
        recipient_name: 'Budi',
        item_description: 'Barang',
        destination: 'Jakarta',
        tracking_number: 'A'.repeat(101),
      },
    })
    assert.equal(res.status, 400)
  })

  await t.test('2.6 Unknown fields in payload are rejected with 400', async () => {
    const res = await makeRequest(server, '/api/shipments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFull}` },
      body: {
        request_date: '2026-09-08',
        recipient_name: 'Budi',
        item_description: 'Barang',
        destination: 'Jakarta',
        malicious_extra_field: 'hacked',
      },
    })
    assert.equal(res.status, 400)
  })

  // ── 3. Security: Audit Identity & SQL Injection Resilience ──

  await t.test('3.1 Client cannot spoof created_by in create payload', async () => {
    const res = await makeRequest(server, '/api/shipments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFull}` },
      body: {
        request_date: '2026-09-08',
        recipient_name: 'Spoof Test',
        item_description: 'Barang Tes Spoof',
        destination: 'Jakarta',
        created_by: 99999, // Attempt spoofing
      },
    })
    // Rejected because created_by is not an allowed field in SHIPMENT_CREATE_FIELDS
    assert.equal(res.status, 400)
  })

  await t.test('3.2 SQL injection search pattern does not alter query or return error', async () => {
    const sqliSearch = "' OR '1'='1' --"
    const res = await makeRequest(
      server,
      `/api/shipments?search=${encodeURIComponent(sqliSearch)}`,
      { headers: { Authorization: `Bearer ${tokenReadOnly}` } },
    )
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.json?.data))
  })

  // ── 4. List, Filtering, Sorting & Pagination ──

  await t.test('4.1 Server-side pagination parameters work with pagination headers', async () => {
    const res = await makeRequest(server, '/api/shipments?page=1&pageSize=2', {
      headers: { Authorization: `Bearer ${tokenReadOnly}` },
    })
    assert.equal(res.status, 200)
    assert.equal(res.json?.page, 1)
    assert.equal(res.json?.pageSize, 2)
    assert.ok(res.headers['x-total-count'] !== undefined)
    assert.ok(res.headers['x-page'] !== undefined)
  })

  await t.test('4.2 Status filter filters accurately', async () => {
    const res = await makeRequest(server, '/api/shipments?status=sedang_dikirim', {
      headers: { Authorization: `Bearer ${tokenReadOnly}` },
    })
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.json?.data))
    for (const item of res.json.data) {
      assert.equal(item.status, 'sedang_dikirim')
    }
  })

  await t.test('4.3 Date range filter works accurately', async () => {
    const res = await makeRequest(server, '/api/shipments?dateFrom=2026-09-01&dateTo=2026-09-30', {
      headers: { Authorization: `Bearer ${tokenReadOnly}` },
    })
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.json?.data))
  })

  await t.test('4.4 Backward-compatible alias /api/pengiriman returns identical data', async () => {
    const canonicalRes = await makeRequest(server, '/api/shipments', {
      headers: { Authorization: `Bearer ${tokenReadOnly}` },
    })
    const aliasRes = await makeRequest(server, '/api/pengiriman', {
      headers: { Authorization: `Bearer ${tokenReadOnly}` },
    })
    assert.equal(canonicalRes.status, 200)
    assert.equal(aliasRes.status, 200)
    assert.equal(canonicalRes.json?.total, aliasRes.json?.total)
    assert.equal(canonicalRes.json?.data?.length, aliasRes.json?.data?.length)
  })

  await t.test('4.5 User with shipments=full can DELETE shipment (DELETE -> 200)', async () => {
    const res = await makeRequest(server, `/api/shipments/${testShipmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenFull}` },
    })
    assert.equal(res.status, 200)
    assert.equal(res.json?.message, 'Data pengiriman berhasil dihapus.')

    // Verify it is gone
    const getRes = await makeRequest(server, `/api/shipments/${testShipmentId}`, {
      headers: { Authorization: `Bearer ${tokenFull}` },
    })
    assert.equal(getRes.status, 404)
  })
})

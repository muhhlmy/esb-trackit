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

    const payloadStr = bodyObj ? JSON.stringify(bodyObj) : headers.body || ''
    const reqHeaders = {
      Host: `127.0.0.1:${address.port}`,
      Connection: 'close',
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

test('Employee RBAC CRUD Permissions Suite', async (t) => {
  let server
  let superadminId, tokenSuperadmin
  let fullEmpAdminId, tokenFullEmpAdmin
  let limitedAdminId, tokenLimitedAdmin
  let createdEmpId
  let testEmpNik = `ET-${Date.now()}`

  t.before(async () => {
    await ensureUserSessionsTable(pool)
    const ts = Date.now()

    // 1. Superadmin
    const resSuper = await pool.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
       VALUES ('Super Admin', $1, '$2b$10$KUuuaQWHvErN2WNcqrJOXeRC1Ym6GRyxcIzwpmRboOSkDpOPxE/Cu', 'superadmin', '{"karyawan":"full"}'::jsonb, true)
       RETURNING id`,
      [`super.emp.${ts}@company.com`],
    )
    superadminId = resSuper.rows[0].id
    const sessionSuper = await createSession(superadminId)
    tokenSuperadmin = jwt.sign(
      { sub: String(superadminId), id: superadminId, sid: sessionSuper.sessionId, role: 'superadmin' },
      env.jwt.secret,
      { expiresIn: '8h' },
    )

    // 2. Admin with karyawan: 'full'
    const resFull = await pool.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
       VALUES ('Admin Full Karyawan', $1, '$2b$10$KUuuaQWHvErN2WNcqrJOXeRC1Ym6GRyxcIzwpmRboOSkDpOPxE/Cu', 'admin', '{"karyawan":"full","assets":"none","users":"none"}'::jsonb, true)
       RETURNING id`,
      [`admin.fullemp.${ts}@company.com`],
    )
    fullEmpAdminId = resFull.rows[0].id
    const sessionFull = await createSession(fullEmpAdminId)
    tokenFullEmpAdmin = jwt.sign(
      { sub: String(fullEmpAdminId), id: fullEmpAdminId, sid: sessionFull.sessionId, role: 'admin', permissions: { karyawan: 'full', assets: 'none', users: 'none' } },
      env.jwt.secret,
      { expiresIn: '8h' },
    )

    // 3. Admin with assets: 'full', users: 'full', but karyawan: 'read_only' (cross-module test)
    const resLimited = await pool.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
       VALUES ('Admin Cross Module', $1, '$2b$10$KUuuaQWHvErN2WNcqrJOXeRC1Ym6GRyxcIzwpmRboOSkDpOPxE/Cu', 'admin', '{"assets":"full","users":"full","karyawan":"read_only"}'::jsonb, true)
       RETURNING id`,
      [`admin.limitedemp.${ts}@company.com`],
    )
    limitedAdminId = resLimited.rows[0].id
    const sessionLimited = await createSession(limitedAdminId)
    tokenLimitedAdmin = jwt.sign(
      { sub: String(limitedAdminId), id: limitedAdminId, sid: sessionLimited.sessionId, role: 'admin', permissions: { assets: 'full', users: 'full', karyawan: 'read_only' } },
      env.jwt.secret,
      { expiresIn: '8h' },
    )

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve)
    })
  })

  t.after(async () => {
    const ids = [superadminId, fullEmpAdminId, limitedAdminId].filter(Boolean)
    if (ids.length > 0) {
      await pool.query('DELETE FROM user_sessions WHERE user_id = ANY($1::int[])', [ids]).catch(() => {})
      await pool.query('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ANY($1::int[])', [ids]).catch(() => {})
    }
    if (testEmpNik) {
      await pool.query('DELETE FROM karyawan WHERE nik = $1', [testEmpNik]).catch(() => {})
    }
    if (createdEmpId) {
      await pool.query('DELETE FROM karyawan WHERE id = $1', [createdEmpId]).catch(() => {})
    }
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections()
      }
      await new Promise((resolve) => server.close(resolve))
    }
    await pool.end().catch(() => {})
  })

  await t.test('TEST 1 — Admin with only assets/users permissions CANNOT create employee (403 Forbidden)', async () => {
    const res = await makeRequest(
      server,
      '/api/employees',
      { Authorization: `Bearer ${tokenLimitedAdmin}` },
      {
        nik: `LEAK-${Date.now()}`,
        nama_karyawan: 'Illegal Employee',
        email_kantor: `illegal.${Date.now()}@esb.co.id`,
        departemen: 'IT',
        directorate: 'Tech',
        tanggal_mulai_bekerja: '2025-01-01',
      },
    )
    assert.equal(res.status, 403)
  })

  await t.test('TEST 2 — Admin with karyawan:read_only CAN read employees list (200 OK)', async () => {
    const res = await makeRequest(server, '/api/employees', {
      Authorization: `Bearer ${tokenLimitedAdmin}`,
    })
    assert.equal(res.status, 200)
  })

  await t.test('TEST 3 — Admin with karyawan:full CAN create an employee (201 Created)', async () => {
    const res = await makeRequest(
      server,
      '/api/employees',
      { Authorization: `Bearer ${tokenFullEmpAdmin}` },
      {
        nik: testEmpNik,
        nama_karyawan: 'Testing Employee Full',
        email_kantor: `${testEmpNik.toLowerCase()}@esb.co.id`,
        lokasi_kerja: 'JKT',
        status: 'Active',
        title: 'Staff',
        job_level: 'L3',
        departemen: 'Engineering',
        directorate: 'Technology',
        tanggal_mulai_bekerja: '2025-01-01',
        employeement_status: 'Permanent',
      },
    )
    assert.equal(res.status, 201)
    const json = JSON.parse(res.body)
    createdEmpId = json.id
    assert.ok(createdEmpId)
  })

  await t.test('TEST 4 — Admin with only assets/users CANNOT update employee (403 Forbidden)', async () => {
    const res = await makeRequest(
      server,
      `/api/employees/${createdEmpId}`,
      {
        method: 'PUT',
        Authorization: `Bearer ${tokenLimitedAdmin}`,
      },
      {
        nik: testEmpNik,
        nama_karyawan: 'Hacked Name',
        email_kantor: `${testEmpNik.toLowerCase()}@esb.co.id`,
        departemen: 'Engineering',
        directorate: 'Technology',
        tanggal_mulai_bekerja: '2025-01-01',
      },
    )
    assert.equal(res.status, 403)
  })

  await t.test('TEST 5 — Admin with karyawan:full CAN update employee (200 OK)', async () => {
    const res = await makeRequest(
      server,
      `/api/employees/${createdEmpId}`,
      {
        method: 'PUT',
        Authorization: `Bearer ${tokenFullEmpAdmin}`,
      },
      {
        nik: testEmpNik,
        nama_karyawan: 'Updated Valid Employee',
        email_kantor: `${testEmpNik.toLowerCase()}@esb.co.id`,
        lokasi_kerja: 'JKT',
        status: 'Active',
        title: 'Senior Staff',
        job_level: 'L3',
        departemen: 'Engineering',
        directorate: 'Technology',
        tanggal_mulai_bekerja: '2025-01-01',
        employeement_status: 'Permanent',
      },
    )
    assert.equal(res.status, 200)
    const json = JSON.parse(res.body)
    assert.equal(json.nama_karyawan, 'Updated Valid Employee')
  })

  await t.test('TEST 6 — Admin with only assets/users CANNOT delete employee (403 Forbidden)', async () => {
    const res = await makeRequest(server, `/api/employees/${createdEmpId}`, {
      method: 'DELETE',
      Authorization: `Bearer ${tokenLimitedAdmin}`,
    })
    assert.equal(res.status, 403)
  })

  await t.test('TEST 7 — Import Excel with karyawanRows rejected when user lacks karyawan write (403 Forbidden)', async () => {
    const res = await makeRequest(
      server,
      '/api/import/excel',
      { Authorization: `Bearer ${tokenLimitedAdmin}` },
      {
        mode: 'append',
        karyawanRows: [
          {
            NIK: `IMPORT-LEAK-${Date.now()}`,
            Nama: 'Leaked Employee',
            'Email Kantor': 'leaked@esb.co.id',
          },
        ],
        assetRows: [],
      },
    )
    assert.equal(res.status, 403)
  })

  await t.test('TEST 8 — Superadmin CAN update employee (200 OK)', async () => {
    const res = await makeRequest(
      server,
      `/api/employees/${createdEmpId}`,
      {
        method: 'PUT',
        Authorization: `Bearer ${tokenSuperadmin}`,
      },
      {
        nik: testEmpNik,
        nama_karyawan: 'Superadmin Updated Employee',
        email_kantor: `${testEmpNik.toLowerCase()}@esb.co.id`,
        lokasi_kerja: 'JKT',
        status: 'Active',
        title: 'Lead Staff',
        job_level: 'L2',
        departemen: 'Engineering',
        directorate: 'Technology',
        tanggal_mulai_bekerja: '2025-01-01',
        employeement_status: 'Permanent',
      },
    )
    assert.equal(res.status, 200)
  })

  await t.test('TEST 9 — Admin with karyawan:full CAN delete employee (200 OK)', async () => {
    const res = await makeRequest(server, `/api/employees/${createdEmpId}`, {
      method: 'DELETE',
      Authorization: `Bearer ${tokenFullEmpAdmin}`,
    })
    assert.equal(res.status, 200)
    createdEmpId = null
  })
})

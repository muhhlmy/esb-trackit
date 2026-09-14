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

test('CMS Knowledge Base RBAC Authorization Suite (DEFECT: users:read_only mutation leak)', async (t) => {
  let server

  // User 1: Admin with users:read_only and knowledge_base:none (The bug scenario)
  let adminUsersReadOnlyId, tokenAdminUsersReadOnly
  // User 2: Admin with knowledge_base:read_only
  let adminKbReadOnlyId, tokenAdminKbReadOnly
  // User 3: Admin with knowledge_base:full
  let adminKbFullId, tokenAdminKbFull
  // User 4: Superadmin
  let superadminId, tokenSuperadmin

  // Test fixture IDs
  let seedFaqId, seedCaseId, seedKbCatId
  const createdFaqIds = []
  const createdCaseIds = []
  const createdKbCatIds = []

  t.before(async () => {
    await ensureUserSessionsTable(pool)
    const ts = Date.now()

    // 1. Admin with users:read_only & knowledge_base:none
    const resAdminNoKb = await pool.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
       VALUES ('Admin Users ReadOnly', $1, '$2b$10$KUuuaQWHvErN2WNcqrJOXeRC1Ym6GRyxcIzwpmRboOSkDpOPxE/Cu', 'admin', '{"users":"read_only","knowledge_base":"none"}'::jsonb, true)
       RETURNING id`,
      [`admin.nokb.${ts}@company.com`],
    )
    adminUsersReadOnlyId = resAdminNoKb.rows[0].id
    const session1 = await createSession(adminUsersReadOnlyId)
    tokenAdminUsersReadOnly = jwt.sign(
      { sub: String(adminUsersReadOnlyId), id: adminUsersReadOnlyId, sid: session1.sessionId, role: 'admin', permissions: { users: 'read_only', knowledge_base: 'none' } },
      env.jwt.secret,
      { expiresIn: '8h' },
    )

    // 2. Admin with knowledge_base:read_only
    const resAdminKbRead = await pool.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
       VALUES ('Admin KB ReadOnly', $1, '$2b$10$KUuuaQWHvErN2WNcqrJOXeRC1Ym6GRyxcIzwpmRboOSkDpOPxE/Cu', 'admin', '{"knowledge_base":"read_only"}'::jsonb, true)
       RETURNING id`,
      [`admin.kbread.${ts}@company.com`],
    )
    adminKbReadOnlyId = resAdminKbRead.rows[0].id
    const session2 = await createSession(adminKbReadOnlyId)
    tokenAdminKbReadOnly = jwt.sign(
      { sub: String(adminKbReadOnlyId), id: adminKbReadOnlyId, sid: session2.sessionId, role: 'admin', permissions: { knowledge_base: 'read_only' } },
      env.jwt.secret,
      { expiresIn: '8h' },
    )

    // 3. Admin with knowledge_base:full
    const resAdminKbFull = await pool.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
       VALUES ('Admin KB Full', $1, '$2b$10$KUuuaQWHvErN2WNcqrJOXeRC1Ym6GRyxcIzwpmRboOSkDpOPxE/Cu', 'admin', '{"knowledge_base":"full"}'::jsonb, true)
       RETURNING id`,
      [`admin.kbfull.${ts}@company.com`],
    )
    adminKbFullId = resAdminKbFull.rows[0].id
    const session3 = await createSession(adminKbFullId)
    tokenAdminKbFull = jwt.sign(
      { sub: String(adminKbFullId), id: adminKbFullId, sid: session3.sessionId, role: 'admin', permissions: { knowledge_base: 'full' } },
      env.jwt.secret,
      { expiresIn: '8h' },
    )

    // 4. Superadmin
    const resSuper = await pool.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
       VALUES ('Super Admin KB', $1, '$2b$10$KUuuaQWHvErN2WNcqrJOXeRC1Ym6GRyxcIzwpmRboOSkDpOPxE/Cu', 'superadmin', '{}'::jsonb, true)
       RETURNING id`,
      [`superadmin.kb.${ts}@company.com`],
    )
    superadminId = resSuper.rows[0].id
    const session4 = await createSession(superadminId)
    tokenSuperadmin = jwt.sign(
      { sub: String(superadminId), id: superadminId, sid: session4.sessionId, role: 'superadmin' },
      env.jwt.secret,
      { expiresIn: '8h' },
    )

    // Seed test fixtures
    const faqSeed = await pool.query(
      `INSERT INTO faq (question, answer, category, status, sort_order)
       VALUES ('Seed FAQ Question?', 'Seed FAQ Answer', 'General', 'PUBLISHED', 1) RETURNING id`,
    )
    seedFaqId = faqSeed.rows[0].id
    createdFaqIds.push(seedFaqId)

    const caseSeed = await pool.query(
      `INSERT INTO cases (title, category, severity, status, is_custom)
       VALUES ('Seed Case Title', 'hardware', 'medium', 'PUBLISHED', true) RETURNING id`,
    )
    seedCaseId = caseSeed.rows[0].id
    createdCaseIds.push(seedCaseId)

    const kbCatSeed = await pool.query(
      `INSERT INTO kb_categories (key, title, description, status)
       VALUES ($1, 'Seed KB Category', 'Seed Description', 'PUBLISHED') RETURNING id`,
      [`cat-seed-${ts}`],
    )
    seedKbCatId = kbCatSeed.rows[0].id
    createdKbCatIds.push(seedKbCatId)

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve)
    })
  })

  t.after(async () => {
    // Cleanup created items
    if (createdFaqIds.length > 0) {
      await pool.query('DELETE FROM faq WHERE id = ANY($1::int[])', [createdFaqIds]).catch(() => {})
    }
    if (createdCaseIds.length > 0) {
      await pool.query('DELETE FROM cases WHERE id = ANY($1::int[])', [createdCaseIds]).catch(() => {})
    }
    if (createdKbCatIds.length > 0) {
      await pool.query('DELETE FROM kb_categories WHERE id = ANY($1::int[])', [createdKbCatIds]).catch(() => {})
    }

    const userIds = [adminUsersReadOnlyId, adminKbReadOnlyId, adminKbFullId, superadminId].filter(Boolean)
    if (userIds.length > 0) {
      await pool.query('DELETE FROM user_sessions WHERE user_id = ANY($1::int[])', [userIds]).catch(() => {})
      await pool.query('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ANY($1::int[])', [userIds]).catch(() => {})
    }

    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections()
      }
      await new Promise((resolve) => server.close(resolve))
    }
    await pool.end().catch(() => {})
  })

  // SECTION 1: PUBLIC ENDPOINTS
  await t.test('Public endpoints remain accessible without authentication', async () => {
    const resFaq = await makeRequest(server, '/api/faqs/public')
    assert.equal(resFaq.status, 200)

    const resCase = await makeRequest(server, '/api/cases/public')
    assert.equal(resCase.status, 200)

    const resKbCat = await makeRequest(server, '/api/kb-categories/public')
    assert.equal(resKbCat.status, 200)
  })

  // SECTION 2: DEFECT REGRESSION - Admin with users:read_only & knowledge_base:none CANNOT access CMS
  await t.test('Admin with users:read_only and knowledge_base:none is forbidden from CMS GET routes (403)', async () => {
    const resFaq = await makeRequest(server, '/api/faqs', {
      Authorization: `Bearer ${tokenAdminUsersReadOnly}`,
    })
    assert.equal(resFaq.status, 403)

    const resCase = await makeRequest(server, '/api/cases', {
      Authorization: `Bearer ${tokenAdminUsersReadOnly}`,
    })
    assert.equal(resCase.status, 403)

    const resKbCat = await makeRequest(server, '/api/kb-categories', {
      Authorization: `Bearer ${tokenAdminUsersReadOnly}`,
    })
    assert.equal(resKbCat.status, 403)
  })

  await t.test('Admin with users:read_only and knowledge_base:none is forbidden from CMS POST mutations (403)', async () => {
    const resFaq = await makeRequest(server, '/api/faqs', {
      Authorization: `Bearer ${tokenAdminUsersReadOnly}`,
    }, { question: 'Hacked question?', answer: 'Should fail', category: 'General' })
    assert.equal(resFaq.status, 403)

    const resCase = await makeRequest(server, '/api/cases', {
      Authorization: `Bearer ${tokenAdminUsersReadOnly}`,
    }, { title: 'Hacked case', category: 'hardware' })
    assert.equal(resCase.status, 403)

    const resKbCat = await makeRequest(server, '/api/kb-categories', {
      Authorization: `Bearer ${tokenAdminUsersReadOnly}`,
    }, { key: 'hacked-cat', title: 'Hacked Category' })
    assert.equal(resKbCat.status, 403)
  })

  // SECTION 3: READ-ONLY PERMISSION - GET succeeds (200), Mutations fail (403)
  await t.test('Admin with knowledge_base:read_only CAN read CMS data (200)', async () => {
    const resFaq = await makeRequest(server, '/api/faqs', {
      Authorization: `Bearer ${tokenAdminKbReadOnly}`,
    })
    assert.equal(resFaq.status, 200)

    const resCase = await makeRequest(server, '/api/cases', {
      Authorization: `Bearer ${tokenAdminKbReadOnly}`,
    })
    assert.equal(resCase.status, 200)

    const resKbCat = await makeRequest(server, '/api/kb-categories', {
      Authorization: `Bearer ${tokenAdminKbReadOnly}`,
    })
    assert.equal(resKbCat.status, 200)
  })

  await t.test('Admin with knowledge_base:read_only CANNOT create (POST -> 403)', async () => {
    const resFaq = await makeRequest(server, '/api/faqs', {
      Authorization: `Bearer ${tokenAdminKbReadOnly}`,
    }, { question: 'ReadOnly FAQ?', answer: 'ReadOnly Answer', category: 'General' })
    assert.equal(resFaq.status, 403)

    const resCase = await makeRequest(server, '/api/cases', {
      Authorization: `Bearer ${tokenAdminKbReadOnly}`,
    }, { title: 'ReadOnly Case', category: 'hardware' })
    assert.equal(resCase.status, 403)

    const resKbCat = await makeRequest(server, '/api/kb-categories', {
      Authorization: `Bearer ${tokenAdminKbReadOnly}`,
    }, { key: 'ro-cat', title: 'ReadOnly Category' })
    assert.equal(resKbCat.status, 403)
  })

  await t.test('Admin with knowledge_base:read_only CANNOT update (PUT -> 403)', async () => {
    const resFaq = await makeRequest(server, `/api/faqs/${seedFaqId}`, {
      method: 'PUT',
      Authorization: `Bearer ${tokenAdminKbReadOnly}`,
    }, { question: 'Updated FAQ?', answer: 'Updated Answer', category: 'General' })
    assert.equal(resFaq.status, 403)

    const resCase = await makeRequest(server, `/api/cases/${seedCaseId}`, {
      method: 'PUT',
      Authorization: `Bearer ${tokenAdminKbReadOnly}`,
    }, { title: 'Updated Case', category: 'hardware' })
    assert.equal(resCase.status, 403)

    const resKbCat = await makeRequest(server, `/api/kb-categories/${seedKbCatId}`, {
      method: 'PUT',
      Authorization: `Bearer ${tokenAdminKbReadOnly}`,
    }, { key: 'updated-cat', title: 'Updated Category' })
    assert.equal(resKbCat.status, 403)
  })

  await t.test('Admin with knowledge_base:read_only CANNOT delete (DELETE -> 403)', async () => {
    const resFaq = await makeRequest(server, `/api/faqs/${seedFaqId}`, {
      method: 'DELETE',
      Authorization: `Bearer ${tokenAdminKbReadOnly}`,
    })
    assert.equal(resFaq.status, 403)

    const resCase = await makeRequest(server, `/api/cases/${seedCaseId}`, {
      method: 'DELETE',
      Authorization: `Bearer ${tokenAdminKbReadOnly}`,
    })
    assert.equal(resCase.status, 403)

    const resKbCat = await makeRequest(server, `/api/kb-categories/${seedKbCatId}`, {
      method: 'DELETE',
      Authorization: `Bearer ${tokenAdminKbReadOnly}`,
    })
    assert.equal(resKbCat.status, 403)
  })

  // SECTION 4: WRITE/FULL PERMISSION - Complete CRUD cycle
  await t.test('Admin with knowledge_base:full can CREATE, UPDATE, and DELETE FAQs', async () => {
    // 1. Create
    const createRes = await makeRequest(server, '/api/faqs', {
      Authorization: `Bearer ${tokenAdminKbFull}`,
    }, { question: 'Full Admin FAQ?', answer: 'Full Admin Answer', category: 'General', status: 'PUBLISHED' })
    assert.equal(createRes.status, 201)
    const created = JSON.parse(createRes.body)
    const newId = created.data?.id || created.id
    assert.ok(newId)
    createdFaqIds.push(newId)

    // 2. Update
    const updateRes = await makeRequest(server, `/api/faqs/${newId}`, {
      method: 'PUT',
      Authorization: `Bearer ${tokenAdminKbFull}`,
    }, { question: 'Full Admin FAQ Updated?', answer: 'Full Admin Answer Updated', category: 'General' })
    assert.equal(updateRes.status, 200)

    // 3. Delete
    const deleteRes = await makeRequest(server, `/api/faqs/${newId}`, {
      method: 'DELETE',
      Authorization: `Bearer ${tokenAdminKbFull}`,
    })
    assert.equal(deleteRes.status, 200)
  })

  await t.test('Admin with knowledge_base:full can CREATE, UPDATE, and DELETE Cases', async () => {
    // 1. Create
    const createRes = await makeRequest(server, '/api/cases', {
      Authorization: `Bearer ${tokenAdminKbFull}`,
    }, { title: 'Full Admin Case', category: 'hardware', severity: 'medium' })
    assert.equal(createRes.status, 201)
    const created = JSON.parse(createRes.body)
    const newId = created.data?.id || created.id
    assert.ok(newId)
    createdCaseIds.push(newId)

    // 2. Update
    const updateRes = await makeRequest(server, `/api/cases/${newId}`, {
      method: 'PUT',
      Authorization: `Bearer ${tokenAdminKbFull}`,
    }, { title: 'Full Admin Case Updated', category: 'hardware', severity: 'low' })
    assert.equal(updateRes.status, 200)

    // 3. Delete
    const deleteRes = await makeRequest(server, `/api/cases/${newId}`, {
      method: 'DELETE',
      Authorization: `Bearer ${tokenAdminKbFull}`,
    })
    assert.equal(deleteRes.status, 200)
  })

  await t.test('Admin with knowledge_base:full can CREATE, UPDATE, and DELETE KB Categories', async () => {
    const ts = Date.now()
    const catKey = `full-cat-${ts}`
    // 1. Create
    const createRes = await makeRequest(server, '/api/kb-categories', {
      Authorization: `Bearer ${tokenAdminKbFull}`,
    }, { key: catKey, title: 'Full Admin KB Cat', description: 'Description' })
    assert.equal(createRes.status, 201)
    const created = JSON.parse(createRes.body)
    const newId = created.data?.id || created.id
    assert.ok(newId)
    createdKbCatIds.push(newId)

    // 2. Update
    const updateRes = await makeRequest(server, `/api/kb-categories/${newId}`, {
      method: 'PUT',
      Authorization: `Bearer ${tokenAdminKbFull}`,
    }, { key: catKey, title: 'Full Admin KB Cat Updated' })
    assert.equal(updateRes.status, 200)

    // 3. Delete
    const deleteRes = await makeRequest(server, `/api/kb-categories/${newId}`, {
      method: 'DELETE',
      Authorization: `Bearer ${tokenAdminKbFull}`,
    })
    assert.equal(deleteRes.status, 200)
  })

  // SECTION 5: SUPERADMIN HAS FULL ACCESS BY DEFAULT
  await t.test('Superadmin has complete mutation access on all CMS entities', async () => {
    // 1. Create FAQ
    const faqRes = await makeRequest(server, '/api/faqs', {
      Authorization: `Bearer ${tokenSuperadmin}`,
    }, { question: 'Superadmin FAQ?', answer: 'Superadmin Answer', category: 'General', status: 'PUBLISHED' })
    assert.equal(faqRes.status, 201)
    const faqId = JSON.parse(faqRes.body).id || JSON.parse(faqRes.body).data?.id
    createdFaqIds.push(faqId)

    // Delete FAQ
    const delFaqRes = await makeRequest(server, `/api/faqs/${faqId}`, {
      method: 'DELETE',
      Authorization: `Bearer ${tokenSuperadmin}`,
    })
    assert.equal(delFaqRes.status, 200)

    // 2. Create Case
    const caseRes = await makeRequest(server, '/api/cases', {
      Authorization: `Bearer ${tokenSuperadmin}`,
    }, { title: 'Superadmin Case', category: 'software' })
    assert.equal(caseRes.status, 201)
    const caseId = JSON.parse(caseRes.body).id || JSON.parse(caseRes.body).data?.id
    createdCaseIds.push(caseId)

    // Delete Case
    const delCaseRes = await makeRequest(server, `/api/cases/${caseId}`, {
      method: 'DELETE',
      Authorization: `Bearer ${tokenSuperadmin}`,
    })
    assert.equal(delCaseRes.status, 200)
  })
})

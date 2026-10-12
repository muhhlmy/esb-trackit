import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import { app } from '../src/app.js'
import { pool } from '../src/config/database.js'
import { env } from '../src/config/env.js'
import { createSession } from '../src/services/sessionService.js'

test('Settings & Email API Test Suite', async (t) => {
  let server
  let superadminCookie
  let userCookie
  let baseUrl
  let superadminId
  let normalUserId

  t.before(async () => {
    server = app.listen(0)
    const port = server.address().port
    baseUrl = `http://127.0.0.1:${port}`

    const ts = Date.now()

    // 1. Superadmin User
    const resSA = await pool.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
       VALUES ('Settings SA Test', $1, '$2b$10$e8w8X9nZgLp5oN4n44444eR8oOSkDpOPxE/Cu0000000000000000', 'superadmin', '{}'::jsonb, true)
       RETURNING id`,
      [`settings_sa_${ts}@company.com`],
    )
    superadminId = resSA.rows[0].id
    const sessionSA = await createSession(superadminId)
    const saToken = jwt.sign(
      {
        sub: String(superadminId),
        id: superadminId,
        sid: sessionSA.sessionId,
        email: `settings_sa_${ts}@company.com`,
        role: 'superadmin',
        permissions: {},
      },
      env.jwt.secret,
      { expiresIn: '1h' },
    )
    superadminCookie = `Bearer ${saToken}`

    // 2. Normal User
    const resUser = await pool.query(
      `INSERT INTO users (nama, email, password_hash, role, permissions, is_active)
       VALUES ('Settings User Test', $1, '$2b$10$e8w8X9nZgLp5oN4n44444eR8oOSkDpOPxE/Cu0000000000000000', 'user', '{}'::jsonb, true)
       RETURNING id`,
      [`settings_user_${ts}@company.com`],
    )
    normalUserId = resUser.rows[0].id
    const sessionUser = await createSession(normalUserId)
    const uToken = jwt.sign(
      {
        sub: String(normalUserId),
        id: normalUserId,
        sid: sessionUser.sessionId,
        email: `settings_user_${ts}@company.com`,
        role: 'user',
        permissions: {},
      },
      env.jwt.secret,
      { expiresIn: '1h' },
    )
    userCookie = `Bearer ${uToken}`
  })

  t.after(async () => {
    if (server) server.close()
    if (superadminId) await pool.query('DELETE FROM users WHERE id = $1', [superadminId]).catch(() => {})
    if (normalUserId) await pool.query('DELETE FROM users WHERE id = $1', [normalUserId]).catch(() => {})
  })

  await t.test('1. GET /api/settings/email denies regular user with 403', async () => {
    const res = await fetch(`${baseUrl}/api/settings/email`, {
      headers: { Authorization: userCookie },
    })
    assert.equal(res.status, 403)
  })

  await t.test('2. GET /api/settings/email allows superadmin with 200 and masked password', async () => {
    const res = await fetch(`${baseUrl}/api/settings/email`, {
      headers: { Authorization: superadminCookie },
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.success, true)
    assert.ok(body.data)
    assert.equal(typeof body.data.smtp_port, 'number')
    assert.equal(typeof body.data.notify_ticket_create, 'boolean')
    assert.ok(!('smtp_pass' in body.data), 'Password plaintext must never be returned in response')
  })

  await t.test('3. PUT /api/settings/email updates settings successfully', async () => {
    const res = await fetch(`${baseUrl}/api/settings/email`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: superadminCookie,
      },
      body: JSON.stringify({
        smtp_host: 'smtp.mailtrap.io',
        smtp_port: 2525,
        smtp_secure: false,
        smtp_user: 'testuser',
        smtp_pass: 'testpass123',
        email_from_name: 'TrackIT Support',
        email_from_address: 'support@trackit.test',
        email_enabled: true,
        notify_ticket_create: true,
        notify_ticket_status: false,
        notify_ticket_assign: true,
        notify_ticket_comment: true,
        notify_asset_assign: false,
      }),
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.success, true)

    // Verify DB update
    const { rows } = await pool.query('SELECT * FROM system_settings WHERE id = 1')
    assert.equal(rows[0].smtp_host, 'smtp.mailtrap.io')
    assert.equal(rows[0].smtp_port, 2525)
    assert.equal(rows[0].notify_ticket_status, false)
  })

  await t.test('4. GET /api/settings/email/templates returns seeded templates', async () => {
    const res = await fetch(`${baseUrl}/api/settings/email/templates`, {
      headers: { Authorization: superadminCookie },
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.success, true)
    assert.ok(Array.isArray(body.data))
    assert.ok(body.data.length >= 4)
    assert.ok(body.data.some((t) => t.template_key === 'ticket_created'))
  })

  await t.test('5. PUT /api/settings/email/templates/:key updates template', async () => {
    const res = await fetch(`${baseUrl}/api/settings/email/templates/ticket_created`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: superadminCookie,
      },
      body: JSON.stringify({
        subject: 'Custom Ticket Subject {{nomor_tiket}}',
        body_html: '<p>Custom HTML Body {{judul_tiket}}</p>',
        body_text: 'Custom Text Body {{nomor_tiket}}',
        is_active: true,
      }),
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.success, true)
    assert.equal(body.data.subject, 'Custom Ticket Subject {{nomor_tiket}}')
  })

  await t.test('6. POST /api/settings/email/templates/:key/reset restores default template', async () => {
    const res = await fetch(`${baseUrl}/api/settings/email/templates/ticket_created/reset`, {
      method: 'POST',
      headers: { Authorization: superadminCookie },
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.success, true)
    assert.ok(body.data.subject.includes('Tiket Baru {{nomor_tiket}}'))
  })
})

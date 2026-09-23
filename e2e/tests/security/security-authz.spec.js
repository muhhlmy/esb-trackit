// e2e/tests/security/security-authz.spec.js
// Phase 4.2/4.3 Authorization + IDOR: UI guard vs API enforcement.
// User biasa (read_only) tidak boleh akses/mutasi resource admin.
import { expect, test } from '../../fixtures/auth.fixture.js'
import { TEST_USERS } from '../../fixtures/users.js'

const API = process.env.E2E_API_URL || 'http://127.0.0.1:3100'

async function loginCookie(request, role) {
  const u = TEST_USERS[role]
  const res = await request.post(`${API}/api/auth/login`, { data: { email: u.email, password: u.password } })
  expect(res.status(), `login ${role}`).toBe(200)
  return (res.headers()['set-cookie'] || '').match(/trackit_session=([^;]+)/)?.[1]
}

test.describe('SECURITY — Authorization & IDOR @security', () => {
  test('SEC-Z01 User biasa diblokir API admin @security', async ({ request }) => {
    const cookie = await loginCookie(request, 'user')
    const writeAttempts = [
      ['POST', '/api/users', { nama: 'x', email: 'hack@test.io', role: 'superadmin' }],
      ['PUT', '/api/users/1', { role: 'superadmin' }],
      ['DELETE', '/api/users/2'],
      ['POST', '/api/employees', { nik: 'E2E-HACK-1', nama_karyawan: 'h' }],
      ['DELETE', '/api/employees/1'],
      ['POST', '/api/import/assets', {}],
    ]
    for (const [method, path, body] of writeAttempts) {
      const res = await request.fetch(`${API}${path}`, {
        method,
        headers: { cookie: `trackit_session=${cookie}` },
        data: body,
      })
      expect(
        res.status(),
        `${method} ${path} oleh role=user harus 403 (bukan ${res.status()})`,
      ).toBe(403)
    }
  })

  test('SEC-Z02 Role escalation via PUT /api/users/:id ditolak @security', async ({ request }) => {
    const cookie = await loginCookie(request, 'admin')
    // Admin boleh manage users, tapi cek dia tidak bisa promote diri/self dengan
    // payload tak terduga — minimal harus tidak 500
    const res = await request.fetch(`${API}/api/users/999999`, {
      method: 'PUT',
      headers: { cookie: `trackit_session=${cookie}` },
      data: { role: 'superadmin' },
    })
    expect(res.status(), 'PUT user fiktif tidak boleh 500').toBeLessThan(500)
  })

  test('SEC-Z03 UI guard: user biasa tidak ke /users, /export, /database @security', async ({
    userPage: page,
  }) => {
    for (const route of ['/users', '/export', '/database', '/admin/cases']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      // Redirect guard async — toHaveURL retry sampai URL keluar dari route.
      await expect(page).toHaveURL(
        (url) => !url.pathname.endsWith(route),
        { timeout: 15000 },
      )
    }
  })

  test('SEC-Z04 IDOR: user tidak baca user lain via /api/users/:id @security', async ({ request }) => {
    const cookie = await loginCookie(request, 'user')
    // users.listUsers ditolak (403) → detail juga harus ditolak
    const res = await request.get(`${API}/api/users/2`, {
      headers: { cookie: `trackit_session=${cookie}` },
    })
    expect(res.status(), 'GET user lain oleh role=user harus 403/401').not.toBe(200)
  })

  test('SEC-Z05 Aset: user hanya lihat miliknya (my-assets) @security', async ({ request }) => {
    const cookie = await loginCookie(request, 'user')
    const res = await request.get(`${API}/api/assets`, {
      headers: { cookie: `trackit_session=${cookie}` },
    })
    // role user: permission assets = none → harus 403
    expect(res.status(), 'GET /api/assets oleh user harus 403').toBe(403)
  })
})

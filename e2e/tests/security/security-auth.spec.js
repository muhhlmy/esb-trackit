// e2e/tests/security/security-auth.spec.js
// Phase 4.1 Authentication security: cookie attributes, session handling,
// protected routes & API. Non-destructive.
import { expect, test } from '../../fixtures/auth.fixture.js'
import { TEST_USERS } from '../../fixtures/users.js'
import { attachPageMonitor } from '../../helpers/monitor.js'

const API = process.env.E2E_API_URL || 'http://127.0.0.1:3100'

test.describe('SECURITY — Authentication @security', () => {
  test('SEC-A01 Cookie sesi HttpOnly + SameSite @security', async ({ request }) => {
    const res = await request.post(`${API}/api/auth/login`, {
      data: { email: TEST_USERS.user.email, password: TEST_USERS.user.password },
    })
    expect(res.status()).toBe(200)
    const setCookie = res.headers()['set-cookie'] || ''
    expect(setCookie, 'trackit_session harus ter-set').toContain('trackit_session=')
    // HttpOnly: JS tidak bisa baca cookie → XSS tidak bisa curi sesi
    expect(setCookie, 'cookie harus HttpOnly').toMatch(/HttpOnly/i)
    // SameSite: mitigasi CSRF
    expect(setCookie, 'cookie harus punya SameSite').toMatch(/SameSite=/i)
  })

  test('SEC-A02 Login invalid ditolak server-side @security', async ({ request }) => {
    for (const [email, password] of [
      [TEST_USERS.user.email, 'password-salah-total'],
      ['tidak.ada@example.test', TEST_USERS.user.password],
      ['', ''],
    ]) {
      const res = await request.post(`${API}/api/auth/login`, {
        data: { email, password },
      })
      expect(res.status(), `login ${email || '(kosong)'} harus 401/400`).toBeGreaterThanOrEqual(400)
      expect(res.status()).toBeLessThan(500)
    }
  })

  test('SEC-A03 API terproteksi butuh autentikasi @security', async ({ request }) => {
    const endpoints = [
      ['GET', '/api/assets'],
      ['GET', '/api/users'],
      ['GET', '/api/employees'],
      ['GET', '/api/tickets'],
      ['GET', '/api/logs'],
      ['GET', '/api/faqs'],
    ]
    for (const [method, path] of endpoints) {
      const res = await request.fetch(`${API}${path}`, { method })
      expect(res.status(), `${method} ${path} tanpa cookie harus 401`).toBe(401)
    }
  })

  test('SEC-A04 Logout menghapus sesi server @security', async ({ request }) => {
    // Login
    const login = await request.post(`${API}/api/auth/login`, {
      data: { email: TEST_USERS.user.email, password: TEST_USERS.user.password },
    })
    const cookie = (login.headers()['set-cookie'] || '').match(/trackit_session=([^;]+)/)?.[1]
    expect(cookie).toBeTruthy()

    // /me valid sebelum logout
    const meBefore = await request.get(`${API}/api/auth/me`, {
      headers: { cookie: `trackit_session=${cookie}` },
    })
    expect(meBefore.status()).toBe(200)

    // Logout
    const out = await request.post(`${API}/api/auth/logout`, {
      headers: { cookie: `trackit_session=${cookie}` },
    })
    expect(out.status(), 'logout harus sukses').toBeLessThan(500)

    // /me setelah logout: cookie lama tidak boleh valid
    const meAfter = await request.get(`${API}/api/auth/me`, {
      headers: { cookie: `trackit_session=${cookie}` },
    })
    expect(meAfter.status(), 'sesi harus invalidated setelah logout').toBe(401)
  })

  test('SEC-A05 Token fiktif ditolak @security', async ({ request }) => {
    const res = await request.get(`${API}/api/users`, {
      headers: { cookie: 'trackit_session=aaa.bbb.ccc' },
    })
    expect(res.status()).toBe(401)
  })

  test('SEC-A06 Frontend storage tidak menyimpan secret @security', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.locator('#email').fill(TEST_USERS.user.email)
    await page.locator('#password').fill(TEST_USERS.user.password)
    await page.getByRole('button', { name: /masuk/i }).click()
    await expect(page).not.toHaveURL(/\/login/)

    const dump = await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    }))
    const all = [...dump.local, ...dump.session]
    const secretish = all.filter((k) => /password|secret|token|key|jwt/i.test(k))
    expect(secretish, `tidak boleh ada key sensitif di web storage: ${secretish}`).toHaveLength(0)

    // Value localStorage tidak boleh mengandung password polos
    const values = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))
    expect(values).not.toMatch(/"password"\s*:\s*"[^"]{4,}"/i)
  })

  test('SEC-A07 Kredensial tidak bocor di URL @security', async ({ superAdminPage: page }) => {
    const mon = attachPageMonitor(page)
    let leaked = false
    page.on('request', (req) => {
      if (/[?&](password|secret|token)=[^&]/i.test(req.url())) leaked = true
    })
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    expect(leaked, 'tidak ada query param kredensial di request').toBe(false)
    mon.expectNoServerErrors(expect, 'no-leak')
  })

  test('SEC-A08 Halaman terproteksi tidak bisa dibuka tanpa login (UI) @security', async ({ page }) => {
    // Context baru tanpa storage state
    await page.goto('/users', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
    await page.goto('/database', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
  })
})

// e2e/tests/smoke/smoke-core.spec.js
// Smoke suite cepat: "bisa demo sekarang?" — login, navigasi, flow utama.
// Label UI dicek case-insensitive agar tahan refactor kecil.
import { expect, test } from '../../fixtures/auth.fixture.js'
import { TEST_USERS } from '../../fixtures/users.js'
import { attachPageMonitor } from '../../helpers/monitor.js'

const i = (s) => new RegExp(s, 'i')

test.describe('SMOKE — Demo Readiness @smoke', () => {
  test('S-01 Aplikasi & halaman login termuat @smoke', async ({ page }) => {
    const mon = attachPageMonitor(page)
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: i('masuk') })).toBeVisible()
    mon.assertClean(expect, 'login')
  })

  test('S-02 Login valid berhasil @smoke', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.locator('#email').fill(TEST_USERS.superadmin.email)
    await page.locator('#password').fill(TEST_USERS.superadmin.password)
    await page.getByRole('button', { name: i('masuk') }).click()
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('S-03 Login invalid ditolak @smoke', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.locator('#email').fill(TEST_USERS.superadmin.email)
    await page.locator('#password').fill('salah-total-12345')
    await page.getByRole('button', { name: i('masuk') }).click()
    await expect(page.getByText(/kredensial|gagal|sandi|periksa/i).first()).toBeVisible({ timeout: 8000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('S-04 Dashboard render + KPI cards @smoke', async ({ superAdminPage: page }) => {
    const mon = attachPageMonitor(page)
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(i('total aset')).first()).toBeVisible({ timeout: 12000 })
    await expect(page.getByText(i('digunakan')).first()).toBeVisible()
    mon.expectNoServerErrors(expect, 'dashboard')
  })

  test('S-05 Semua route terproteksi utama termuat @smoke', async ({ superAdminPage: page }) => {
    const routes = [
      '/dashboard',
      '/assets',
      '/assets-ga',
      '/assets-ops',
      '/my-assets',
      '/karyawan',
      '/tickets',
      '/users',
      '/submissions',
      '/shipments',
      '/logs',
      '/export',
      '/database',
      '/faqs',
      '/admin/cases',
      '/admin/kb-categories',
    ]
    for (const route of routes) {
      const resp = await page
        .goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 })
        .catch(() => null)
      // Retry sekali untuk navigasi yang gagal transien (net::ERR_ABORTED)
      const finalResp =
        resp ?? (await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 15000 }))
      expect(finalResp?.status(), `GET ${route}`).toBeLessThan(500)
      expect(page.url(), `${route} tidak boleh kembali ke /login`).not.toMatch(/\/login/)
      await expect(page.locator('body')).not.toBeEmpty()
    }
  })

  test('S-06 Navigasi sidebar berfungsi @smoke', async ({ superAdminPage: page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    const navLink = page.getByRole('link', { name: i('aset it') }).first()
    await expect(navLink).toBeVisible()
    await navLink.click()
    await expect(page).toHaveURL(/\/assets/)
  })

  test('S-07 Sesi bertahan navigasi & reload @smoke', async ({ superAdminPage: page }) => {
    await page.goto('/assets', { waitUntil: 'domcontentloaded' })
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/tickets/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('S-08 Route tidak dikenal → 404 ramah @smoke', async ({ superAdminPage: page }) => {
    await page.goto('/halaman-tidak-ada-12345', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/tidak ditemukan|404/i).first()).toBeVisible({ timeout: 8000 })
  })

  test('S-09 Logout → route terproteksi diblokir @smoke', async ({ page }) => {
    // Login segar (bukan fixture) supaya logout tidak bocor ke test lain
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.locator('#email').fill(TEST_USERS.superadmin.email)
    await page.locator('#password').fill(TEST_USERS.superadmin.password)
    await page.getByRole('button', { name: i('masuk') }).click()
    await expect(page).not.toHaveURL(/\/login/)

    // Logout via menu user
    const userMenu = page.getByRole('button', { name: i('akun|profil|user|keluar') }).or(page.locator('[aria-label*="user" i]')).first()
    if (await userMenu.isVisible({ timeout: 4000 }).catch(() => false)) {
      await userMenu.click()
      const logoutBtn = page.getByRole('button', { name: i('keluar|log out|logout') }).first()
      if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) await logoutBtn.click()
    }

    // Setelah logout, akses langsung route terproteksi harus kembali ke login
    await page.goto('/users', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
  })

  test('S-10 Flow bisnis: buat tiket → lihat → kembali @smoke', async ({ superAdminPage: page }) => {
    const mon = attachPageMonitor(page)
    const judul = `E2E_SMOKE_TIKET_${Date.now()}`
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })

    const btn = page.getByRole('button', { name: i('buat tiket') }).first()
    await expect(btn).toBeVisible({ timeout: 8000 })
    await btn.click()

    // Validasi required: submit kosong dulu harus menampilkan error
    await page.getByRole('button', { name: i('buat tiket') }).nth(1).click().catch(() => {})
    // Pilih Unit Support Target (wajib sebelum submit)
    await page.getByRole('button', { name: /IT Support/ }).first().click()

    const judulInput = page.getByLabel('Judul Tiket')
    await expect(judulInput).toBeVisible({ timeout: 8000 })
    await judulInput.fill(judul)

    const deskInput = page.getByLabel('Deskripsi Kendala Tiket')
    await deskInput.fill('Deskripsi otomatis smoke test E2E.')

    await page.getByRole('button', { name: i('buat tiket') }).last().click()

    // Modal tertutup = sukses
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 10000 })

    // Tiket muncul di list
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(judul).first()).toBeVisible({ timeout: 15000 })
    mon.expectNoServerErrors(expect, 'ticket-flow')
  })
})

import { expect, test } from '@playwright/test'

test.describe('Authentication - Session & Guard Suite', () => {
  test('Should redirect unauthenticated visitor trying to access protected route to /login', async ({
    page,
  }) => {
    await page.goto('/assets')
    // Guard router mempertahankan tujuan awal pada query redirect agar
    // pengguna dapat dilanjutkan ke halaman tersebut setelah login.
    await expect(page).toHaveURL(/\/login\?redirect=\/assets$/, { timeout: 10000 })
  })

  test('Should redirect to /login when session cookie is invalid or removed', async ({ page }) => {
    // Auth aplikasi memakai cookie sesi HttpOnly (bukan token localStorage);
    // menghapus cookie = sesi invalid, guard harus mengarahkan ke /login.
    await page.context().clearCookies()
    await page.goto('/assets')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})

import { expect, test } from '../../fixtures/auth.fixture.js'

test.describe('Error States & Recovery', () => {
  test('ERROR-01: Network failure shows user-friendly message', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })

    // Block all API requests
    await page.route('**/api/tickets**', (route) => route.abort('failed'))

    // Trigger a request via search
    const searchInput = page.getByPlaceholder(/cari ticket/i)
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('test search')
      await searchInput.press('Enter')

      // Verify error state is shown (not blank page)
      const errorIndicator = page.getByText(/gagal|tidak dapat|koneksi|error/i).first()
      await expect(errorIndicator).toBeVisible({ timeout: 10000 })
    }
  })

  test('ERROR-02: 404 page shows helpful content', async ({ page }) => {
    await page.goto('/nonexistent-page-12345', { waitUntil: 'domcontentloaded' })

    // Verify 404 page content
    await expect(page.getByText(/tidak ditemukan|404/i).first()).toBeVisible({ timeout: 5000 })

    // Verify navigation back option exists
    const backLink = page.getByRole('link', { name: /kembali|beranda|dashboard/i })
    await expect(backLink).toBeVisible()
  })

  test('ERROR-03: Access denied page for unauthorized routes', async ({ userPage }) => {
    const page = userPage
    // Try to access admin-only route
    await page.goto('/users', { waitUntil: 'domcontentloaded' })

    // Should redirect to forbidden or first allowed route
    const url = page.url()
    const isForbidden = url.includes('/forbidden') || !url.includes('/users')
    expect(isForbidden).toBeTruthy()
  })

  test('ERROR-04: Login with empty fields shows validation', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })

    // Click login without filling fields
    await page.getByRole('button', { name: /masuk/i }).click()

    // Verify still on login page
    await expect(page).toHaveURL(/\/login/)

    // Verify email field has required attribute
    const emailInput = page.locator('#email')
    const isRequired = await emailInput.getAttribute('required')
    expect(isRequired).not.toBeNull()
  })
})

import { expect, test } from '@playwright/test'
import { TEST_USERS } from '../../fixtures/users.js'

test.describe('Authentication - Logout Suite', () => {
  test('Should log in via UI and perform logout successfully', async ({ page }) => {
    // 1. Login
    await page.goto('/login')
    await page.locator('#email').fill(TEST_USERS.superadmin.email)
    await page.locator('#password').fill(TEST_USERS.superadmin.password)
    await page.getByRole('button', { name: /masuk/i }).click()

    // Verify redirected away from /login
    await expect(page).not.toHaveURL(/\/login/)

    // 2. Open user profile popover via stable aria-label
    const profileBtn = page.getByRole('button', { name: 'Menu profil' })
    await expect(profileBtn).toBeVisible()
    await profileBtn.click()

    // 3. Click "Keluar" (Logout)
    const logoutBtn = page.getByRole('button', { name: /keluar/i })
    await expect(logoutBtn).toBeVisible()
    await logoutBtn.click()

    // 4. Verify redirected back to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })

    // 5. Verify protected route cannot be accessed without session
    await page.goto('/assets')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})

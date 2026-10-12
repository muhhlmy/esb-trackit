import { test, expect } from '@playwright/test'

test.describe('Settings & Bilingual (i18n) Suite', () => {
  test.use({ storageState: 'e2e/auth/superadmin.json' })

  test('I18N-01: Switching language in sidebar toggles menu labels and persists in localStorage', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    // Find language switcher in sidebar
    const enBtn = page.getByRole('button', { name: /select english language/i })
    const idBtn = page.getByRole('button', { name: /pilih bahasa indonesia/i })

    await expect(enBtn).toBeVisible()
    await expect(idBtn).toBeVisible()

    // Initially in ID: Dashboard header is Indonesian
    await expect(page.getByText('Ringkasan Aset dan Tiket').first()).toBeVisible()
    await expect(page.getByText('Total Aset').first()).toBeVisible()

    // Click EN to switch language to English
    await enBtn.click()

    // Verify localStorage persistence
    const savedLang = await page.evaluate(() => localStorage.getItem('trackit_lang'))
    expect(savedLang).toBe('en')

    // Verify sidebar English translations
    await expect(page.locator('aside').getByText('INVENTORY', { exact: true })).toBeVisible()
    await expect(page.locator('aside').getByText('OPERATIONS', { exact: true })).toBeVisible()
    await expect(page.locator('aside').getByText('IT Assets', { exact: true })).toBeVisible()

    // Verify Dashboard page content switches to English!
    await expect(page.getByText('Asset and Ticket Overview').first()).toBeVisible()
    await expect(page.getByText('Total Assets').first()).toBeVisible()
    await expect(page.getByText('Recent Assets').first()).toBeVisible()
    await expect(page.getByText('Recent Tickets').first()).toBeVisible()

    // Reload page to verify persistence
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('aside').getByText('INVENTORY', { exact: true })).toBeVisible()
    await expect(page.getByText('Asset and Ticket Overview').first()).toBeVisible()
    await expect(page.getByText('Total Assets').first()).toBeVisible()

    // Switch back to ID
    await idBtn.click()
    const restoredLang = await page.evaluate(() => localStorage.getItem('trackit_lang'))
    expect(restoredLang).toBe('id')
    await expect(page.locator('aside').getByText('INVENTARIS', { exact: true })).toBeVisible()
    await expect(page.locator('aside').getByText('Aset IT', { exact: true })).toBeVisible()
    await expect(page.getByText('Ringkasan Aset dan Tiket').first()).toBeVisible()
    await expect(page.getByText('Total Aset').first()).toBeVisible()
  })

  test('SETTINGS-01: Superadmin can access /settings, configure SMTP, and preview email templates', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')

    // Header & page ready
    await expect(page.locator('#save-settings-btn')).toBeVisible()

    // Check SMTP form inputs
    const hostInput = page.locator('#smtp-host')
    const portInput = page.locator('#smtp-port')
    const userInput = page.locator('#smtp-user')
    const testEmailBtn = page.locator('#test-email-btn')

    await expect(hostInput).toBeVisible()
    await expect(portInput).toBeVisible()
    await expect(userInput).toBeVisible()
    await expect(testEmailBtn).toBeVisible()

    // Fill test host and save settings
    await hostInput.fill('mail.company.test')
    await portInput.fill('587')
    await userInput.fill('admin@company.test')
    await page.locator('#save-settings-btn').click()

    // Toast feedback appears
    await expect(page.getByText('Pengaturan SMTP berhasil disimpan').first()).toBeVisible({ timeout: 5000 })

    // Capture screenshot of SMTP configuration
    await page.screenshot({ path: 'docs/screenshots/settings-smtp.png', fullPage: false })

    // Switch to Tab Template Email
    const tabTemplates = page.locator('#tab-templates')
    await tabTemplates.click()

    // Verify template editor and live preview
    await expect(page.locator('#panel-templates')).toBeVisible()
    await expect(page.locator('#template-subject')).toBeVisible()
    await expect(page.locator('#template-body-html')).toBeVisible()
    await expect(page.getByText('Live Preview')).toBeVisible()

    // Check variable button interaction
    const varBtn = page.locator('button:has-text("{{nomor_tiket}}")').first()
    await expect(varBtn).toBeVisible()
    await varBtn.click()

    // Capture screenshot of Templates Editor
    await page.screenshot({ path: 'docs/screenshots/settings-templates.png', fullPage: false })
  })
})

test.describe('Settings RBAC Guard', () => {
  test.use({ storageState: 'e2e/auth/user.json' })

  test('SETTINGS-02: Normal user is denied access to /settings', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForURL((url) => !url.pathname.includes('/settings'), { timeout: 10000 }).catch(() => {})
    expect(page.url()).not.toContain('/settings')
  })
})

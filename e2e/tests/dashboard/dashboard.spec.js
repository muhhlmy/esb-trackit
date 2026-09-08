import { expect, test } from '../../fixtures/auth.fixture.js'

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173'

// Helper untuk waiting yang terdiri dari expect(locator).toBeVisible()
async function waitForVisible(locator, timeoutMs = 10000) {
  await expect(locator).toBeVisible({ timeout: timeoutMs })
}

test.describe('Home View Mobile Bottom Nav smoke', () => {
  test('SMOKE-02: Load / & verify bottom nav items on home view @smoke', async ({ superAdminPage }) => {
    const page = superAdminPage
    const consoleErrors = []

    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)

    const nav = page.locator('nav[aria-label="Navigasi Utama Mobile"]')
    await waitForVisible(nav, 10000)
    await expect(nav.locator('text=Beranda').first()).toBeVisible()
    await expect(nav.locator('text=Tiket').first()).toBeVisible()
    await expect(nav.locator('text=Profil').first()).toBeVisible()

    const searchInput = page.locator('#global-main-search')
    await expect(searchInput).toBeVisible()
    await expect(searchInput).toHaveAttribute('placeholder')
    const placeholder = await searchInput.getAttribute('placeholder')
    expect(placeholder).toContain('Cari')

    expect(consoleErrors).toHaveLength(0)
  })

  test('Should open search overlay & show simplified results list @smoke', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)

    const searchInput = page.locator('#global-main-search')
    await searchInput.click()
    await page.waitForSelector('.header-search-panel', { state: 'visible', timeout: 8000 })

    // Mobile: overlay fullscreen
    const mobileOverlay = page.locator('.header-search-panel:not(.md\\:bg-white)')
    if (await mobileOverlay.count() > 0) {
      await expect(mobileOverlay.locator('#mobile-overlay-search-input')).toBeVisible()
      await expect(mobileOverlay.locator('button', { hasText: 'Cari' }).first()).toBeVisible()
    }

    // Desktop: expect no filter tabs & no emoji pills & no kbd shortcut
    const desktopPanel = page.locator('.header-search-panel.md\\:bg-white')
    if (await desktopPanel.count() > 0) {
      await expect(desktopPanel.locator('kbd')).toHaveCount(0)
      await expect(desktopPanel.locator('button', { hasText: 'Laptop' })).toHaveCount(0)
      await expect(desktopPanel.locator('button', { hasText: 'Tiket' })).toHaveCount(0)
      await expect(desktopPanel.locator('button', { hasText: 'Active' })).toHaveCount(0)
    }

    // Typing keyword & seeing results
    await searchInput.fill('Laptop')
    await page.waitForTimeout(1200)
    const resultsPanel = page.locator('.header-search-panel .overflow-y-auto')
    await expect(resultsPanel.locator('text=Laptop')).toBeVisible({ timeout: 8000 })

    // Escape closes search
    await page.keyboard.press('Escape')
    await expect(page.locator('.header-search-panel')).toHaveCount(0)

    expect(consoleErrors).toHaveLength(0)
  })

  test('Should tap Beranda from bottom nav and stay on /', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)

    const nav = page.locator('nav[aria-label="Navigasi Utama Mobile"]')
    await nav.locator('text=Beranda').first().click()
    await expect(page).toHaveURL('/')
    await expect(page.locator('nav[aria-label="Navigasi Utama Mobile"]')).toBeVisible()
  })

  test('Should tap Tiket from bottom nav and land on /tickets @smoke', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)

    const nav = page.locator('nav[aria-label="Navigasi Utama Mobile"]')
    await nav.locator('text=Tiket').first().click()
    await expect(page).toHaveURL(/\/tickets/)
    await expect(page.locator('h1:has-text("Tiket")').first()).toBeVisible({ timeout: 10000 })
  })

  test('Should show notification badge on Tiket when unread notifications exist @smoke', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.addInitScript(() => {
      try {
        localStorage.setItem('app_notifications', JSON.stringify([
          { id: 'n1', ticketId: 1, type: 'CREATED', title: 'Tiket Baru', message: 'Test', nomor_tiket: '#1', judul_tiket: 'Test', status_tiket: 'Open', prioritas: 'Medium', pelapor: 'Tester', timestamp: Date.now() - 1000, isRead: false },
          { id: 'n2', ticketId: 2, type: 'UPDATED', title: 'Update Tiket', message: 'Test', nomor_tiket: '#2', judul_tiket: 'Test', status_tiket: 'Open', prioritas: 'Medium', pelapor: 'Tester', timestamp: Date.now() - 500, isRead: false },
        ]))
      } catch {}
    })
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)

    const nav = page.locator('nav[aria-label="Navigasi Utama Mobile"]')
    await waitForVisible(nav.locator('span', { hasText: '2' }).first(), 8000)
  })

  test('Should update notification badge after marking all read @smoke', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.addInitScript(() => {
      try {
        localStorage.setItem('app_notifications', JSON.stringify([
          { id: 'n1', ticketId: 1, type: 'CREATED', title: 'Tiket Baru', message: 'Test', nomor_tiket: '#1', judul_tiket: 'Test', status_tiket: 'Open', prioritas: 'Medium', pelapor: 'Tester', timestamp: Date.now() - 1000, isRead: false },
          { id: 'n2', ticketId: 2, type: 'UPDATED', title: 'Update Tiket', message: 'Test', nomor_tiket: '#2', judul_tiket: 'Test', status_tiket: 'Open', prioritas: 'Medium', pelapor: 'Tester', timestamp: Date.now() - 500, isRead: false },
        ]))
      } catch {}
    })
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)

    const bell = page.locator('#notif-bell-btn')
    await bell.click()
    await page.waitForSelector('#header-notifications', { state: 'visible', timeout: 6000 })
    await page.locator('#header-notifications button[aria-label="Tutup notifikasi"]').click()
    await expect(page.locator('#header-notifications')).toHaveCount(0)

    // Setelah close & reopen, badge harus hilang karena semua terbaca
    await page.locator('#notif-bell-btn').click()
    await page.waitForSelector('#header-notifications', { state: 'visible', timeout: 6000 })
    await page.locator('#header-notifications button[aria-label="Tutup notifikasi"]').click()

    const nav = page.locator('nav[aria-label="Navigasi Utama Mobile"]')
    await expect(nav.locator('span', { hasText: '2' }).first()).toBeHidden({ timeout: 8000 })
  })

  test('Should open notification bell and show unread badge logic @smoke', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)

    const bell = page.locator('#notif-bell-btn')
    await expect(bell).toBeVisible()

    await bell.click()
    await page.waitForSelector('#header-notifications', { state: 'visible', timeout: 6000 })
    await expect(page.locator('#header-notifications h3:has-text("Notifikasi")')).toBeVisible()

    // Close
    await page.locator('#header-notifications button[aria-label="Tutup notifikasi"]').click()
    await expect(page.locator('#header-notifications')).toHaveCount(0)
  })

  test('Should allow Escape to close search overlay from any state @smoke', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)

    const searchInput = page.locator('#global-main-search')
    await searchInput.click()
    await page.waitForSelector('.header-search-panel', { state: 'visible', timeout: 8000 })

    await page.keyboard.press('Escape')
    await expect(page.locator('.header-search-panel')).toHaveCount(0)
  })

  test('Smoke: search placeholder exists & is not empty on mobile viewport @smoke', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.setViewportSize({ width: 390, height: 700 })
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)

    const searchInput = page.locator('#global-main-search')
    await waitForVisible(searchInput, 8000)
    const placeholder = await searchInput.getAttribute('placeholder')
    expect(placeholder && placeholder.trim().length > 0).toBe(true)
    expect(placeholder.toLowerCase()).toContain('cari')
  })
})

test.describe('Dashboard View Mobile Bottom Nav smoke', () => {
  test('Should load dashboard & verify bottom nav & search placeholder @smoke', async ({ superAdminPage }) => {
    const page = superAdminPage
    const consoleErrors = []

    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)

    // KPI cards
    await expect(page.getByText('Total Aset', { exact: true }).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Digunakan', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Stok', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Dalam Perawatan', { exact: true }).first()).toBeVisible()

    // Charts
    await expect(page.getByText('Tren Aset Bulanan', { exact: true })).toBeVisible()
    await expect(page.getByText('Status Aset', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Kondisi Aset', { exact: true }).first()).toBeVisible()

    // Mobile bottom nav ada di dashboard (management view)
    const nav = page.locator('nav[aria-label="Navigasi Utama Mobile"]')
    await waitForVisible(nav, 10000)
    await expect(nav.locator('text=Beranda').first()).toBeVisible()
    await expect(nav.locator('text=Dashboard').first()).toBeVisible()
    await expect(nav.locator('text=Aset').first()).toBeVisible()
    await expect(nav.locator('text=Tiket').first()).toBeVisible()
    await expect(nav.locator('text=Profil').first()).toBeVisible()

    // Search bar ada dan punya placeholder
    const searchInput = page.locator('#global-main-search')
    await expect(searchInput).toBeVisible()
    await expect(searchInput).toHaveAttribute('placeholder')
    const placeholder = await searchInput.getAttribute('placeholder')
    expect(placeholder).toContain('Cari')

    expect(consoleErrors).toHaveLength(0)
  })

  test('Should tap Dashboard from bottom nav and land on /dashboard', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)

    const nav = page.locator('nav[aria-label="Navigasi Utama Mobile"]')
    await nav.locator('text=Dashboard').first().click()
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('nav[aria-label="Navigasi Utama Mobile"]')).toBeVisible()
  })

  test('Should tap Aset from bottom nav and land on /assets', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)

    const nav = page.locator('nav[aria-label="Navigasi Utama Mobile"]')
    await nav.locator('text=Aset').first().click()
    await expect(page).toHaveURL(/\/assets\//)
  })

  test('Should hide bottom nav on desktop (lg+) view', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)

    const nav = page.locator('nav[aria-label="Navigasi Utama Mobile"]')
    await expect(nav).toBeHidden()
  })

  test('Should show bottom nav on tablet (<1024px) view', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.setViewportSize({ width: 900, height: 700 })
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)

    const nav = page.locator('nav[aria-label="Navigasi Utama Mobile"]')
    await waitForVisible(nav, 8000)
    await expect(nav.locator('text=Aset').first()).toBeVisible()
    await expect(nav.locator('text=Tiket').first()).toBeVisible()
  })
})


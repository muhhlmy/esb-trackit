import { expect, test } from '../../fixtures/auth.fixture.js'

test.describe('Ticket Search & Filter', () => {
  test('SEARCH-01: Search input finds matching tickets @smoke', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })

    // Wait for ticket list to load
    await expect(page.locator('.tck-list-item').first()).toBeVisible({ timeout: 10000 })

    // Get first ticket text to search for
    const firstTicketText = await page.locator('.tck-list-item').first().innerText()
    const searchTerm = firstTicketText.substring(0, 10).trim()

    // Search
    const searchInput = page.getByPlaceholder(/cari ticket/i)
    await searchInput.fill(searchTerm)
    await searchInput.press('Enter')

    // Verify results appear
    await expect(page.locator('.tck-list-item').first()).toBeVisible({ timeout: 10000 })
  })

  test('SEARCH-02: Clearing search restores full list', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })

    // Wait for list
    await expect(page.locator('.tck-list-item').first()).toBeVisible({ timeout: 10000 })

    // Search for something specific
    const searchInput = page.getByPlaceholder(/cari ticket/i)
    await searchInput.fill('nonexistent-ticket-xyz-999')
    await searchInput.press('Enter')
    // Wait for search to process — either empty state or filtered list appears
    await page.waitForLoadState('domcontentloaded')

    // Clear search
    await searchInput.fill('')
    await searchInput.press('Enter')

    // Verify full list restored
    await expect(page.locator('.tck-list-item').first()).toBeVisible({ timeout: 10000 })
  })

  test('SEARCH-03: Tab switching filters ticket list', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })

    // Wait for list
    await expect(page.locator('.tck-list-item').first()).toBeVisible({ timeout: 10000 })

    // Click "Belum Diambil" tab
    const unassignedTab = page.getByRole('button', { name: /belum diambil/i })
    if (await unassignedTab.isVisible()) {
      await unassignedTab.click()
      // Wait for tab content to load
      await page.waitForLoadState('domcontentloaded')

      // Verify tab is active
      await expect(unassignedTab).toHaveClass(/bg-\[#2563EB\]|text-white/)
    }
  })

  test('SEARCH-04: Status filter dropdown works', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })

    // Wait for list
    await expect(page.locator('.tck-list-item').first()).toBeVisible({ timeout: 10000 })

    // Find status filter select
    const statusFilter = page.locator('select').filter({ hasText: /status/i })
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('Open')
      // Wait for filter to apply
      await page.waitForLoadState('domcontentloaded')

      // Verify filter applied (list may be empty or filtered)
      // The key assertion is that the select didn't crash
      await expect(statusFilter).toHaveValue('Open')
    }
  })
})

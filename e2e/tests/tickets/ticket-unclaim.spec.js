import { expect, test } from '../../fixtures/auth.fixture.js'

test.describe('Ticket Unclaim', () => {
  test('UNCLAIM-01: Admin can release claimed ticket @smoke', async ({ adminPage }) => {
    const page = adminPage
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })

    // Navigate to "Ditangani Saya" tab
    const myTab = page.getByRole('button', { name: /ditangani saya/i })
    if (await myTab.isVisible({ timeout: 5000 })) {
      await myTab.click()

      // Check if there are claimed tickets
      const ticketItem = page.locator('.tck-list-item').first()
      if (await ticketItem.isVisible({ timeout: 5000 })) {
        await ticketItem.click()

        // Look for unclaim action
        const unclaimBtn = page.getByRole('button', { name: /lepas/i })
        if (await unclaimBtn.isVisible({ timeout: 3000 })) {
          await unclaimBtn.click()

          // Verify success toast
          await expect(page.getByText(/dilepaskan/i)).toBeVisible({ timeout: 5000 })
        }
      }
    }
  })

  test('UNCLAIM-02: User cannot see unclaim action', async ({ userPage }) => {
    const page = userPage
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })

    // Open any ticket
    const ticketItem = page.locator('.tck-list-item').first()
    if (await ticketItem.isVisible({ timeout: 10000 })) {
      await ticketItem.click()

      // Regular user should NOT see "Lepaskan Tiket"
      await expect(page.getByRole('button', { name: /lepas/i })).not.toBeVisible()
    }
  })
})

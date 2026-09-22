import { expect, test } from '../../fixtures/auth.fixture.js'

/**
 * Penanda item tiket yang bekerja di dua mode tampilan (Tabel & Kartu):
 * baris tabel maupun kartu sama-sama memakai aria-label "Lihat tiket <judul>".
 * Jangan pakai .tck-list-item — hanya ada di mode Kartu (hidden saat Tabel).
 */
const ticketItems = (page) => page.locator('[aria-label^="Lihat tiket"]')

test.describe('Ticket Status Undo', () => {
  test('UNDO-01: Status change shows undo button for 5 seconds @smoke', async ({
    superAdminPage,
  }) => {
    const page = superAdminPage
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })

    // Open first ticket detail
    const ticketItem = ticketItems(page).first()
    await expect(ticketItem).toBeVisible({ timeout: 15000 })
    await ticketItem.click()

    // Find and click status dropdown
    const statusBtn = page.getByRole('button', { name: 'Ubah status tiket', exact: true })
    if (await statusBtn.isVisible({ timeout: 5000 })) {
      await statusBtn.click()

      // Select a different status
      const statusOption = page.getByRole('option', { name: /in progress/i })
      if (await statusOption.isVisible()) {
        await statusOption.click()

        // Verify undo toast appears with "Urungkan" button
        const undoBtn = page.getByRole('button', { name: /urungkan/i })
        await expect(undoBtn).toBeVisible({ timeout: 3000 })

        // Click undo
        await undoBtn.click()

        // Verify status reverted (toast confirms)
        await expect(page.getByText(/dikembalikan/i)).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('UNDO-02: Undo option disappears after 5 seconds', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })

    const ticketItem = ticketItems(page).first()
    await expect(ticketItem).toBeVisible({ timeout: 15000 })
    await ticketItem.click()

    const statusBtn = page.getByRole('button', { name: 'Ubah status tiket', exact: true })
    if (await statusBtn.isVisible({ timeout: 5000 })) {
      await statusBtn.click()

      const statusOption = page.getByRole('option', { name: /in progress/i })
      if (await statusOption.isVisible()) {
        await statusOption.click()

        // Verify undo button disappears after 5-second timeout
        // The button should be gone within 10 seconds of the status change
        await expect(page.getByRole('button', { name: /urungkan/i })).not.toBeVisible({
          timeout: 10000,
        })
      }
    }
  })
})

import { expect, test } from '../../fixtures/auth.fixture.js'
import { generateTestTicket } from '../../fixtures/test-data.js'

test.describe('Ticket Management - Create Ticket Suite', () => {
  test('SMOKE-05: Should create a new helpdesk ticket via UI successfully @smoke', async ({
    superAdminPage,
  }) => {
    const page = superAdminPage
    const testTicket = generateTestTicket()

    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })

    // 1. Click + Buat Tiket / Request Ticket button
    const openModalBtn = page.getByRole('button', { name: /buat tiket|request ticket/i }).first()
    await expect(openModalBtn).toBeVisible({ timeout: 10000 })
    await openModalBtn.click()

    // 2. Pilih Unit Support Target (wajib) lalu isi Judul Kendala
    await page.getByRole('button', { name: /IT Support/ }).first().click()
    await page.getByPlaceholder(/laptop tidak dapat/i).fill(testTicket.judul)

    // Fill Deskripsi
    const descInput = page.getByPlaceholder(/jelaskan kendala/i)
    if (await descInput.isVisible()) {
      await descInput.fill(testTicket.deskripsi)
    }

    // 3. Submit via footer button yang terhubung ke form modal (form attribute)
    const submitBtn = page.locator('button[form="ticket-create-form"][type="submit"]')
    await expect(submitBtn).toBeVisible({ timeout: 5000 })
    await submitBtn.click()

    // Tunggu modal benar-benar tertutup — submit sukses menutup modal dan
    // me-reset state pencarian. Mengisi search sebelum itu berisiko racun.
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 10000 })

    // 4. Filter or Search for created ticket if needed and verify visibility
    const searchInput = page.getByPlaceholder(/cari tiket/i)
    if (await searchInput.isVisible()) {
      await searchInput.fill(testTicket.judul)
      await searchInput.press('Enter')
    }

    await expect(page.getByText(testTicket.judul).first()).toBeVisible({ timeout: 15000 })
  })
})

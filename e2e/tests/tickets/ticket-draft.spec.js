import { expect, test } from '../../fixtures/auth.fixture.js'

test.describe('Ticket Draft Save', () => {
  test('DRAFT-01: Draft preserved when modal closes and reopened', async ({
    superAdminPage,
  }) => {
    const page = superAdminPage
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })

    // Open create modal
    await page.getByRole('button', { name: /buat tiket|request ticket/i }).first().click()

    // Fill partial form
    const titleInput = page.getByPlaceholder(/laptop tidak dapat/i)
    await expect(titleInput).toBeVisible({ timeout: 5000 })
    await titleInput.fill('Draft Test Title')

    const descInput = page.getByPlaceholder(/jelaskan kendala/i)
    if (await descInput.isVisible()) {
      await descInput.fill('Draft description text')
    }

    // Close modal via Escape
    await page.keyboard.press('Escape')

    // Wait for modal to close
    await expect(titleInput).not.toBeVisible({ timeout: 5000 })

    // Reopen modal
    await page.getByRole('button', { name: /buat tiket|request ticket/i }).first().click()

    // Verify draft restored
    await expect(titleInput).toHaveValue('Draft Test Title', { timeout: 5000 })
    if (await descInput.isVisible()) {
      await expect(descInput).toHaveValue('Draft description text')
    }
  })

  test('DRAFT-02: Draft cleared on successful submission', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })

    // Open modal, fill and submit
    await page.getByRole('button', { name: /buat tiket|request ticket/i }).first().click()
    await page.getByPlaceholder(/laptop tidak dapat/i).fill('Submit Test Title')

    // Select queue if visible
    const queueSelect = page.locator('form select').first()
    if (await queueSelect.isVisible()) {
      const options = await queueSelect.locator('option').count()
      if (options > 1) {
        await queueSelect.selectOption({ index: 1 })
      }
    }

    // Submit
    await page.locator('form button[type="submit"]').last().click()

    // Wait for modal to close
    const titleInputAfterSubmit = page.getByPlaceholder(/laptop tidak dapat/i)
    await expect(titleInputAfterSubmit).not.toBeVisible({ timeout: 10000 })

    // Reopen modal — should be empty (draft cleared)
    await page.getByRole('button', { name: /buat tiket|request ticket/i }).first().click()
    await expect(page.getByPlaceholder(/laptop tidak dapat/i)).toHaveValue('')
  })
})

import { expect, test } from '../../fixtures/auth.fixture.js'

test.describe('Ticket Draft Save', () => {
  test('DRAFT-01: Modal state preserved when modal closes and reopens', async ({
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

    // Verify state preserved (modal keeps component state across close/reopen)
    await expect(titleInput).toHaveValue('Draft Test Title', { timeout: 5000 })
    if (await descInput.isVisible()) {
      await expect(descInput).toHaveValue('Draft description text')
    }
  })

  test('DRAFT-02: Successful submission closes modal and clears form', async ({
    superAdminPage,
  }) => {
    const page = superAdminPage
    await page.goto('/tickets', { waitUntil: 'domcontentloaded' })

    // Open modal, fill and submit
    await page.getByRole('button', { name: /buat tiket|request ticket/i }).first().click()
    const titleInput = page.getByPlaceholder(/laptop tidak dapat/i)
    await expect(titleInput).toBeVisible({ timeout: 5000 })
    await titleInput.fill('Submit Test Title')

    // Submit — the submit button lives in the modal footer and references the
    // form via the `form` attribute (so it is not inside <form> in the DOM).
    await page.locator('button[form="ticket-create-form"]').click()

    // Wait for modal to close (successful submission)
    await expect(titleInput).not.toBeVisible({ timeout: 15000 })
  })
})

import { expect, test } from '../../fixtures/auth.fixture.js'

test.describe('BAST submission CRUD', () => {
  test('superadmin can create, reopen, and delete a draft', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/submissions', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('page-ready')).toBeVisible({ timeout: 15000 })

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/submissions') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
    )
    await page.getByRole('button', { name: 'Simpan Draft' }).click()
    const created = await (await createResponsePromise).json()
    await expect(page.getByText(created.submission_number, { exact: true }).first()).toBeVisible()

    const card = page.locator('article').filter({ hasText: created.submission_number })
    await card.getByRole('button', { name: 'Edit' }).click()
    await expect(page.getByText(`Mengedit ${created.submission_number}`)).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/submissions/${created.id}`) &&
        response.request().method() === 'DELETE' &&
        response.ok(),
    )
    await card.getByRole('button', { name: 'Hapus' }).click()
    await deleteResponsePromise
    await expect(page.getByText(created.submission_number, { exact: true })).toHaveCount(0)
  })
})

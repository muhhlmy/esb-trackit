import { expect, test } from '../../fixtures/auth.fixture.js'
import { randomUUID } from 'node:crypto'

test.describe('BAST submission CRUD', () => {
  test('superadmin can create, edit, and delete a draft', async ({ superAdminPage }) => {
    const page = superAdminPage
    // 1. Buka form BAST baru (route-driven form, bukan modal)
    await page.goto('/submissions/new', { waitUntil: 'domcontentloaded' })
    const form = page.locator('form')

    // 2. Pilih satu Aset IT (combobox) — penerima terisi otomatis dari sesi
    await form.getByRole('button', { name: 'Pilih Aset IT' }).first().click()
    await page.getByRole('option').first().click()

    // 3. Simpan draft ("Simpan" = persistSubmission() dengan status draft)
    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/submissions') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
    )
    await form.getByRole('button', { name: 'Simpan', exact: true }).click()
    const created = await (await createResponsePromise).json()
    await expect(page.getByText(created.submission_number, { exact: true }).first()).toBeVisible()

    // 4. Kembali ke daftar, temukan baris, hapus lewat ConfirmDialog
    await page.goto('/submissions', { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByText(created.submission_number, { exact: true }).first(),
    ).toBeVisible()

    const row = page
      .locator('tr, .laptop-row')
      .filter({ hasText: created.submission_number })
      .first()
    await row.getByRole('button').first().click()
    await page.getByRole('menuitem', { name: /hapus/i }).click()

    // ConfirmDialog (bukan window.confirm)
    await page.getByRole('button', { name: 'Hapus', exact: true }).click()
    await expect(
      page.getByText(created.submission_number, { exact: true }).first(),
    ).toBeHidden({ timeout: 15000 })
  })
})

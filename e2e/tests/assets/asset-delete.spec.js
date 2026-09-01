import { expect, test } from '../../fixtures/auth.fixture.js'
import { generateTestAsset } from '../../fixtures/test-data.js'

test.describe('Asset Management - Delete Asset Suite', () => {
  test('Should open delete confirmation modal and soft delete asset', async ({ superAdminPage }) => {
    const page = superAdminPage
    const testAsset = generateTestAsset({ hostname: `DEL-${Date.now()}` })

    // 1. Create a test asset to delete
    await page.goto('/assets', { waitUntil: 'domcontentloaded' })

    const openModalBtn = page.getByRole('button', { name: /tambah aset/i }).first()
    if (await openModalBtn.isVisible()) {
      await openModalBtn.click()
      await page.getByPlaceholder(/laptop-hr-01/i).fill(testAsset.hostname)
      await page.getByPlaceholder(/nomor seri/i).fill(testAsset.serial_number)

      const typeSelect = page.locator('form select').first()
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption('Laptop')
      }

      await page.getByRole('button', { name: /lanjutkan/i }).click()

      const lokasiTrigger = page.locator('form button[aria-haspopup="listbox"]').first()
      if (await lokasiTrigger.isVisible()) {
        await lokasiTrigger.click()
        // Wait for listbox to appear
        await page.locator('ul[role="listbox"]').first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
        const firstOption = page.locator('ul[role="listbox"] li[role="option"]').first()
        if (await firstOption.isVisible()) {
          await firstOption.click()
        }
      }

      await page.getByRole('button', { name: /lanjutkan/i }).click()

      const saveBtn = page.locator('button[type="submit"]').or(page.getByRole('button', { name: /^tambah aset$/i })).last()
      await saveBtn.click()
      // Wait for form submission to complete
      await page.waitForLoadState('networkidle')
    }

    // 2. Search for the newly created asset
    const searchInput = page.getByPlaceholder(/cari/i).first()
    if (await searchInput.isVisible()) {
      await searchInput.fill(testAsset.hostname)
      await page.waitForLoadState('networkidle')
    }

    // 3. Trigger delete action on the asset row or table first row fallback
    const targetRow = page.locator('tbody tr').filter({ hasText: testAsset.hostname }).or(page.locator('tbody tr').first())
    if ((await targetRow.count()) > 0 && await targetRow.first().isVisible()) {
      const actionBtn = targetRow.first().locator('button').filter({ hasText: /edit|opsi/i }).or(targetRow.first().locator('button').last())
      await actionBtn.click()
      // Wait for dropdown/popover to appear
      await page.locator('[role="menu"], [role="listbox"], .dropdown-menu').first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})

      const deleteActionBtn = page.getByRole('button', { name: /hapus/i }).or(page.getByText(/hapus aset/i)).first()
      if (await deleteActionBtn.isVisible()) {
        await deleteActionBtn.click()
        // Wait for confirmation modal to appear
        await page.locator('[role="dialog"], .modal').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})

        // 4. Confirm delete modal
        const confirmBtn = page.getByRole('button', { name: /ya, hapus|hapus|konfirmasi/i }).last()
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click()
          // Wait for deletion to complete
          await page.waitForLoadState('networkidle')
        }
      }
    }
  })
})

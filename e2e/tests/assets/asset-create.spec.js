import { expect, test } from '../../fixtures/auth.fixture.js'
import { generateTestAsset } from '../../fixtures/test-data.js'

test.describe('Asset Management - Create Asset Suite', () => {
  test('SMOKE-04: Should create a new asset via UI modal successfully @smoke', async ({
    superAdminPage,
  }) => {
    const page = superAdminPage
    const testAsset = generateTestAsset()

    await page.goto('/assets', { waitUntil: 'domcontentloaded' })

    // 1. Click + Tambah Aset button
    const openModalBtn = page.getByRole('button', { name: /tambah aset/i }).first()
    await expect(openModalBtn).toBeVisible({ timeout: 10000 })
    await openModalBtn.click()

    // 2. Step 1 (Info): Hostname, Serial Number & Type
    await page.getByPlaceholder(/laptop-it-04/i).fill(testAsset.hostname)
    await page.getByPlaceholder(/pf3abcde/i).fill(testAsset.serial_number)

    // Tipe Perangkat CustomSelect = button + listbox (bukan <select native>)
    const tipeSelect = page.getByRole('button', { name: 'Tipe Perangkat Aset' })
    await tipeSelect.click()
    await page.getByRole('option', { name: 'Laptop' }).first().click()

    // Step 1 -> Step 2
    const nextBtn1 = page.getByRole('button', { name: /lanjutkan/i })
    await expect(nextBtn1).toBeVisible()
    await nextBtn1.click()

    // Step 2 (Placement): Select Lokasi Aset option from SearchableSelect
    // (aria-label turun dari placeholder — jangan pakai exact match)
    await page.getByRole('button', { name: /pilih atau ketik lokasi/i }).click()
    await page.getByPlaceholder(/cari atau ketik lokasi/i).fill('QA Test Location')
    await page.getByRole('option').filter({ hasText: 'QA Test Location' }).click()

    // Step 2 -> Step 3
    const nextBtn2 = page.getByRole('button', { name: /lanjutkan/i })
    if (await nextBtn2.isVisible()) {
      await nextBtn2.click()
    }

    // 3. Step 3 (Specifications & Notes): Fill Spesifikasi
    const specInput = page.getByPlaceholder(/cpu, ram, storage/i).or(page.locator('textarea').first())
    if (await specInput.isVisible()) {
      await specInput.fill(testAsset.spesifikasi)
    }

    // 4. Click submit button inside the modal (Step 3 — uses 'Tambah Aset' when modalMode === 'add')
    const saveBtn = page.locator('.modal, [role="dialog"]').locator('button[type="submit"]').or(
      page.getByRole('button', { name: /^tambah aset$/i })
    ).last()
    await expect(saveBtn).toBeVisible({ timeout: 5000 })
    await saveBtn.click()

    // 5. Search for created asset and verify visibility in table
    const searchInput = page.getByPlaceholder(/cari/i).first()
    if (await searchInput.isVisible()) {
      await searchInput.fill(testAsset.hostname)
      await page.waitForLoadState('domcontentloaded')
    }

    await expect(page.getByText(testAsset.hostname, { exact: true }).first()).toBeVisible({
      timeout: 10000,
    })
  })
})

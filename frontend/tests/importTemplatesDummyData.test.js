import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test, { describe } from 'node:test'

const assetCategoryImportModalUrl = new URL(
  '../src/components/ui/AssetCategoryImportModal.vue',
  import.meta.url,
)
const appImportModalUrl = new URL('../src/components/ui/AppImportModal.vue', import.meta.url)

describe('Import Templates Dummy Data Suite', () => {
  test('AssetCategoryImportModal provides exactly 5 dummy rows for Aset IT, Aset GA, and Aset Ops', async () => {
    const content = await readFile(assetCategoryImportModalUrl, 'utf8')

    // Check IT dummy rows: ESB-LAP-001, ESB-LAP-002, ESB-PC-001, ESB-LAP-003, ESB-MAC-001
    const itHostnames = ['ESB-LAP-001', 'ESB-LAP-002', 'ESB-PC-001', 'ESB-LAP-003', 'ESB-MAC-001']
    for (const h of itHostnames) {
      assert.ok(content.includes(h), `AssetCategoryImportModal must contain IT dummy hostname ${h}`)
    }

    // Check GA dummy rows: GA-001, GA-002, GA-003, GA-004, GA-005
    const gaHostnames = ['GA-001', 'GA-002', 'GA-003', 'GA-004', 'GA-005']
    for (const h of gaHostnames) {
      assert.ok(content.includes(h), `AssetCategoryImportModal must contain GA dummy hostname ${h}`)
    }

    // Check Ops dummy rows: OPS-001, OPS-002, OPS-003, OPS-004, OPS-005
    const opsHostnames = ['OPS-001', 'OPS-002', 'OPS-003', 'OPS-004', 'OPS-005']
    for (const h of opsHostnames) {
      assert.ok(
        content.includes(h),
        `AssetCategoryImportModal must contain Ops dummy hostname ${h}`,
      )
    }
  })

  test('AppImportModal provides exactly 5 dummy rows for Template Karyawan', async () => {
    const content = await readFile(appImportModalUrl, 'utf8')

    const employeeNiks = ['2026001', '2026002', '2026003', '2026004', '2026005']
    for (const nik of employeeNiks) {
      assert.ok(content.includes(nik), `AppImportModal must contain Karyawan dummy NIK ${nik}`)
    }
  })
})

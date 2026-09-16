import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sidebarUrl = new URL('../src/components/layout/AppSidebar.vue', import.meta.url)
const useAuthUrl = new URL('../src/composables/useAuth.js', import.meta.url)

describe('Sidebar Public Menu Tests', () => {
  test('AppSidebar defines public items with permission: null', async () => {
    const source = await readFile(sidebarUrl, 'utf8')

    // Public items should exist in menu definitions
    assert.match(source, /to:\s*'\/',[\s\S]*?label:\s*'Help Center',[\s\S]*?permission:\s*null/)
    assert.match(source, /to:\s*'\/cases',[\s\S]*?label:\s*'Cases & Artikel',[\s\S]*?permission:\s*null/)
    assert.match(source, /to:\s*'\/templates',[\s\S]*?label:\s*'Templates Hub',[\s\S]*?permission:\s*null/)
    assert.match(source, /to:\s*'\/analytics',[\s\S]*?label:\s*'KB Analytics',[\s\S]*?permission:\s*null/)
  })

  test('AppSidebar includes public items in menu filtering (does not drop !item.permission)', async () => {
    const source = await readFile(sidebarUrl, 'utf8')

    // isItemVisible or filter logic must allow items when !item.permission
    assert.match(
      source,
      /if \(!item\.permission\) \{\s*return true\s*\}/,
    )
  })

  test('useAuth hasPermission returns true when featureKey is null/falsy', async () => {
    const source = await readFile(useAuthUrl, 'utf8')

    assert.match(source, /const hasPermission = \(featureKey\) => \{\s*if \(!featureKey\) return true/)
  })
})

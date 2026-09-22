import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const navConfigUrl = new URL('../src/config/navigationConfig.js', import.meta.url)
const useAuthUrl = new URL('../src/composables/useAuth.js', import.meta.url)

describe('Sidebar Public Menu Tests', () => {
  test('navigation source of truth defines public items with permission: null', async () => {
    const source = await readFile(navConfigUrl, 'utf8')

    // Public items should exist in menu definitions
    assert.match(source, /to:\s*'\/',[\s\S]*?label:\s*'Help Center',[\s\S]*?permission:\s*null/)
    assert.match(
      source,
      /to:\s*'\/cases',[\s\S]*?label:\s*'Cases & Artikel',[\s\S]*?permission:\s*null/,
    )
  })

  test('navigation source of truth includes public items in filtering (does not drop !item.permission)', async () => {
    const source = await readFile(navConfigUrl, 'utf8')

    // isNavItemVisible must allow items when !item.permission
    assert.match(source, /if \(!item\.permission\) return true/)
  })

  test('useAuth hasPermission returns true when featureKey is null/falsy', async () => {
    const source = await readFile(useAuthUrl, 'utf8')

    assert.match(
      source,
      /const hasPermission = \(featureKey\) => \{\s*if \(!featureKey\) return true/,
    )
  })
})

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const bottomNavUrl = new URL('../src/components/layout/AppBottomNav.vue', import.meta.url)
const navConfigUrl = new URL('../src/config/navigationConfig.js', import.meta.url)

describe('AppBottomNav Mobile Navigation Test Suite', () => {
  test('AppBottomNav binds :to="item.to" on primary bottom nav items', async () => {
    const source = await readFile(bottomNavUrl, 'utf8')

    // RouterLink in primary bottom nav must bind :to="item.to"
    assert.match(
      source,
      /<RouterLink[\s\S]*?v-for="item in items"[\s\S]*?:to="item\.to"/,
      'Primary bottom nav RouterLink must bind :to="item.to"',
    )
  })

  test('AppBottomNav binds :to="item.to" and closes drawer on lainnyaItems', async () => {
    const source = await readFile(bottomNavUrl, 'utf8')

    // RouterLink in Menu Lainnya must bind :to="item.to" and close on click
    assert.match(
      source,
      /<RouterLink[\s\S]*?v-for="item in lainnyaItems"[\s\S]*?:to="item\.to"/,
      'Menu Lainnya RouterLink must bind :to="item.to"',
    )
    assert.match(
      source,
      /@click="isLainnyaOpen = false"/,
      'Menu Lainnya RouterLink must close drawer on click',
    )
  })

  test('navigationConfig defines valid destinations for primaryBottomNav', async () => {
    const source = await readFile(navConfigUrl, 'utf8')

    assert.match(source, /key:\s*'tickets'[\s\S]*?to:\s*'\/tickets'/)
    assert.match(source, /key:\s*'assets'[\s\S]*?to:\s*'\/assets'/)
    assert.match(source, /key:\s*'my-assets'[\s\S]*?to:\s*'\/my-assets'/)
  })
})

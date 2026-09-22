import { expect, test } from '../../fixtures/auth.fixture.js'
import { AxeBuilder } from '@axe-core/playwright'

/**
 * Run axe-core against the current page and fail on any critical/serious
 * violations. Returns the results for inspection.
 */
async function assertNoViolations(page, context) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  const { violations } = results
  if (violations.length > 0) {
    const summary = violations
      .map((v) => {
        const nodes = v.nodes.map((n) => `  - ${n.html || n.target.join(',')}`).join('\n')
        return `[${v.impact}] ${v.id}: ${v.description}\n${nodes}`
      })
      .join('\n')
    throw new Error(`Accessibility violations found:\n${summary}`)
  }
}

test.describe('Accessibility Suite — axe-core', () => {
  test('Skip to content link should be focusable via Tab and navigate focus to #main-content', async ({
    superAdminPage,
  }) => {
    const page = superAdminPage
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    const skipLink = page.locator('a[href="#main-content"]')
    await expect(skipLink).toBeAttached()

    await skipLink.focus()
    await expect(skipLink).toBeFocused()
    await expect(skipLink).toBeVisible()

    await page.keyboard.press('Enter')
    const mainContent = page.locator('#main-content')
    await expect(mainContent).toBeFocused()
  })

  test('Dashboard — no critical or serious axe violations (desktop)', async ({ superAdminPage }) => {
    // Full-page axe scan at 1920x1080 (charts + tables) can exceed the 30s default.
    test.slow()
    const page = superAdminPage
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await assertNoViolations(page)
  })

  test('Dashboard — no critical or serious axe violations (mobile 390x844)', async ({
    superAdminPage,
  }) => {
    const page = superAdminPage
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await assertNoViolations(page)
  })

  test('Menu Lainanya — keyboard navigation and screen reader labels', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    // Open Menu Lainnya
    const lainnyaButton = page.locator('button[aria-label="Menu lainnya"]')
    await expect(lainnyaButton).toBeVisible()
    await lainnyaButton.focus()
    await page.keyboard.press('Enter')

    // Menu Lainnya drawer (role="navigation" with the same aria-label as the
    // trigger button — scope by role to avoid matching both).
    const menu = page.getByRole('navigation', { name: 'Menu lainnya' })
    await expect(menu).toBeVisible()

    // All items should have accessible names
    const items = menu.locator('a')
    const count = await items.count()
    for (let i = 0; i < count; i++) {
      const accessibleName = await items.nth(i).getAttribute('aria-label')
      const hasText = await items.nth(i).textContent()
      expect(accessibleName || hasText).toBeTruthy()
    }

    // Close with Escape
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
  })

  test('Quick Actions — all buttons have accessible labels', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#main-content')).toBeVisible()

    const quickActionButtons = page.locator('.quick-action-btn')
    await expect(quickActionButtons.first()).toBeVisible()
    const count = await quickActionButtons.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      const title = await quickActionButtons.nth(i).getAttribute('title')
      const textContent = await quickActionButtons.nth(i).textContent()
      expect(title || textContent).toBeTruthy()
    }
  })

  test('Focus-visible indicators present on interactive elements', async ({ superAdminPage }) => {
    const page = superAdminPage
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#main-content')).toBeVisible()

    await page.keyboard.press('Tab')
    const focusedElement = page.locator(':focus-visible')
    await expect(focusedElement).toBeVisible()

    const hasOutline = await focusedElement.evaluate((el) => {
      const style = window.getComputedStyle(el)
      return style.outlineWidth !== '0px' || style.outlineStyle !== 'none'
    })
    expect(hasOutline).toBe(true)
  })
})

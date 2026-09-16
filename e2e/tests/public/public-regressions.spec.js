import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const CASES = [
  {
    id: 1,
    title: 'Artikel Pertama',
    summary: 'Ringkasan pertama',
    category: 'hardware',
    severity: 'medium',
    contentHtml: '<p>Isi pertama</p>',
    isCustom: false,
  },
  {
    id: 2,
    title: 'Artikel Target',
    summary: 'Ringkasan target',
    category: 'software',
    severity: 'high',
    contentHtml: '<p>Isi target</p>',
    isCustom: true,
  },
]

async function mockPublicApi(page) {
  await page.route('**/api/cases/public', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CASES) }),
  )
  for (const endpoint of ['faqs/public', 'kb-categories/public', 'kb-search-logs/popular']) {
    await page.route(`**/api/${endpoint}`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )
  }
  await page.route('**/api/kb-search-logs', (route) =>
    route.fulfill({ status: 201, contentType: 'application/json', body: '{}' }),
  )
}

test.describe('Public frontend runtime regressions', () => {
  test.use({ reducedMotion: 'reduce' })

  test.beforeEach(async ({ page }) => mockPublicApi(page))

  test('deep link selects the requested case', async ({ page }) => {
    await page.goto('/cases/2', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Artikel Target' })).toBeVisible()
  })

  test('analytics waits for cases before calculating totals', async ({ page }) => {
    await page.goto('/analytics', { waitUntil: 'networkidle' })
    await expect(page.getByText('2', { exact: true }).first()).toBeVisible()
  })

  test('corrupt recent-search storage cannot blank the application', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('esb_recent_searches', '{invalid-json'))
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1').first()).toBeVisible()
  })

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    test(`public routes have no serious accessibility or overflow failures at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport)
      for (const path of ['/', '/cases/2', '/templates', '/analytics', '/login', '/missing']) {
        await page.goto(path, { waitUntil: 'networkidle' })
        await page.waitForTimeout(250)
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
        const blocking = results.violations.filter((item) =>
          ['serious', 'critical'].includes(item.impact),
        )
        expect(blocking, `${path}: ${blocking.map((item) => item.id).join(', ')}`).toEqual([])
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
          ),
          `${path} has horizontal overflow`,
        ).toBe(false)
      }
    })
  }
})

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test, { describe } from 'node:test'

const viteConfigSourceUrl = new URL('../vite.config.js', import.meta.url)
const routerSourceUrl = new URL('../src/router/index.js', import.meta.url)

describe('Vite OptimizeDeps & Router Recovery Suite', () => {
  test('vite.config.js pre-bundles dompurify and key vendor libraries in optimizeDeps.include', async () => {
    const content = await readFile(viteConfigSourceUrl, 'utf8')
    assert.match(
      content,
      /optimizeDeps\s*:\s*\{[\s\S]*?include\s*:\s*\[[\s\S]*?'dompurify'[\s\S]*?\]/,
      'vite.config.js must include dompurify in optimizeDeps.include to prevent 504 Outdated Optimize Dep',
    )
  })

  test('router.onError contains recovery logic for dynamic import and outdated optimize dep failures', async () => {
    const content = await readFile(routerSourceUrl, 'utf8')
    assert.match(
      content,
      /router\.onError\(\(error,\s*to\)\s*=>/,
      'router.onError must accept error and to route parameters',
    )
    assert.match(
      content,
      /Failed to fetch dynamically imported module/,
      'router.onError must detect Failed to fetch dynamically imported module',
    )
    assert.match(
      content,
      /Outdated Optimize Dep/,
      'router.onError must detect Outdated Optimize Dep',
    )
    assert.match(
      content,
      /sessionStorage\.(setItem|getItem)/,
      'router.onError must track reload attempts in sessionStorage to prevent loops',
    )
  })
})

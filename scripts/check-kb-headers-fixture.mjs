// Isolated static-build fixture; all APIs mocked, external requests blocked.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
const root = resolve('frontend/dist')
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  if (path.startsWith('/api/')) { res.writeHead(500); res.end('Unmocked API'); return }
  try {
    const file = path.startsWith('/assets/') ? resolve(root, '.' + path) : resolve(root, 'index.html')
    res.setHeader('Content-Type', { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html' }[extname(file)] || 'application/octet-stream')
    res.end(await readFile(file))
  } catch { res.writeHead(404); res.end() }
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const baseline = process.argv.includes('--baseline')
try {
  for (const width of [360, 768, 1440, 1920]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    const user = { id: 1, nama: 'Fixture', role: 'admin', permissions: { knowledge_base: 'full' } }
    await context.addInitScript(user => localStorage.setItem('user', JSON.stringify(user)), user)
    await context.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.origin !== origin) return route.abort()
      if (!url.pathname.startsWith('/api/')) return route.continue()
      assert.equal(route.request().method(), 'GET')
      return route.fulfill({ json: url.pathname === '/api/auth/me' ? user : [] })
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    for (const [path, selector] of [['/admin/cases', '.cms-page'], ['/faqs', '.kb-management']]) {
      await page.goto(origin + path)
      await page.locator(selector + ' h1').waitFor()
      const result = await page.locator(selector).evaluate(root => {
        const header = root.firstElementChild
        const style = getComputedStyle(header)
        const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom } }
        const before = rect(header)
        const title = rect(header.firstElementChild)
        const action = rect(header.querySelector('button'))
        // Empty API results need extra height to exercise the actual scroll container.
        root.style.minHeight = '2400px'
        let scroller = root.parentElement
        while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement
        scroller ||= document.scrollingElement
        scroller.scrollTop = 350
        return { padding: ['Top', 'Right', 'Bottom', 'Left'].map(side => parseFloat(style['padding' + side])), position: style.position, direction: style.flexDirection, title, action, before, after: rect(header), scrollTop: scroller.scrollTop, overflow: document.documentElement.scrollWidth > innerWidth }
      })
      console.log(JSON.stringify({ width, path, ...result }))
      if (!baseline) {
        if (path === '/faqs') {
          const padding = width >= 640 ? 18 : 14
          assert.deepEqual(result.padding, [padding, padding, padding, padding], 'FAQ card padding must remain responsive in compact mode')
          assert.ok(Math.abs(result.title.x - result.before.x - padding - 1) < 1)
          assert.ok(Math.abs(result.before.right - result.action.right - padding - 1) < 1)
        }
        assert.equal(result.position, 'static')
        assert.equal(result.direction, width >= 640 ? 'row' : 'column')
        assert.ok(result.scrollTop > 0)
        assert.ok(Math.abs(result.after.y - (result.before.y - result.scrollTop)) < 2)
        assert.equal(result.overflow, false)
        if (width >= 640) assert.ok(result.action.x >= result.title.right, 'Action must sit right of text')
        else assert.ok(result.action.y >= result.title.bottom, 'Mobile action must sit below text')
      }
    }
    assert.deepEqual(errors, [])
    await context.close()
  }
} finally { await browser.close(); server.close() }

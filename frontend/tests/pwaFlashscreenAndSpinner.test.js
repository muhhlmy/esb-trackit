import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')

test('PWA ESB-TrackIT & Startup Flashscreen Suite', async (t) => {
  await t.test('1. manifest.json configures ESB-TrackIT name and comprehensive icons', () => {
    const manifestPath = path.join(frontendRoot, 'public', 'manifest.json')
    assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist in public folder')

    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    assert.equal(manifestContent.name, 'ESB-TrackIT')
    assert.equal(manifestContent.short_name, 'ESB-TrackIT')
    assert.equal(manifestContent.theme_color, '#0a51b0')

    const srcs = manifestContent.icons.map((i) => i.src)
    assert.ok(srcs.includes('/icon-192.png'), 'manifest must include /icon-192.png')
    assert.ok(srcs.includes('/icon-512.png'), 'manifest must include /icon-512.png')
    assert.ok(srcs.includes('/icon-maskable-192.png'), 'manifest must include /icon-maskable-192.png')
    assert.ok(srcs.includes('/icon-maskable-512.png'), 'manifest must include /icon-maskable-512.png')
    assert.ok(srcs.includes('/logo.svg'), 'manifest must include /logo.svg')

    // Verify files exist physically in public folder
    for (const src of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'logo.svg']) {
      const fullPath = path.join(frontendRoot, 'public', src)
      assert.ok(fs.existsSync(fullPath), `Public asset ${src} must physically exist`)
    }
  })

  await t.test('2. index.html embeds ESB-TrackIT startup flashscreen with vue-spinner loader', () => {
    const htmlPath = path.join(frontendRoot, 'index.html')
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8')

    // PWA & branding headers
    assert.ok(htmlContent.includes('<title>ESB-TrackIT - IT Assets Management</title>'))
    assert.ok(htmlContent.includes('content="ESB-TrackIT"'))
    assert.ok(htmlContent.includes('rel="manifest" href="/manifest.json"'))
    assert.ok(htmlContent.includes('rel="apple-touch-icon"'))

    // Zero em dashes check
    assert.ok(!htmlContent.includes('—'), 'index.html must not contain em dashes')

    // Flashscreen elements
    assert.ok(htmlContent.includes('id="app-splashscreen"'), 'index.html must have #app-splashscreen')
    assert.ok(htmlContent.includes('class="splash-logo-img"'), 'flashscreen must render app logo')
    assert.ok(htmlContent.includes('ESB-TrackIT'), 'flashscreen must display ESB-TrackIT brand title')
    assert.ok(htmlContent.includes('splash-clip-ring'), 'flashscreen must include ClipLoader ring')
    assert.ok(htmlContent.includes('splash-pulse-loader'), 'flashscreen must include PulseLoader dots')
    assert.ok(htmlContent.includes('splash-pulse-dot'), 'flashscreen must include PulseLoader dot keyframes')
    assert.ok(htmlContent.includes('splash-hidden'), 'flashscreen must support splash-hidden transition')
  })

  await t.test('3. main.js triggers flashscreen dismissal on router.isReady and mount', () => {
    const mainJsPath = path.join(frontendRoot, 'src', 'main.js')
    const mainJsContent = fs.readFileSync(mainJsPath, 'utf-8')

    assert.ok(mainJsContent.includes("document.getElementById('app-splashscreen')"))
    assert.ok(mainJsContent.includes("classList.add('splash-hidden')"))
  })

  await t.test('4. VueSpinner.vue component implements vue-spinner collection', () => {
    const spinnerPath = path.join(frontendRoot, 'src', 'components', 'ui', 'VueSpinner.vue')
    assert.ok(fs.existsSync(spinnerPath), 'VueSpinner.vue must exist')

    const spinnerContent = fs.readFileSync(spinnerPath, 'utf-8')
    assert.ok(spinnerContent.includes('v-pulse-loader'), 'Must support pulse loader')
    assert.ok(spinnerContent.includes('v-clip-loader'), 'Must support clip loader')
    assert.ok(spinnerContent.includes('v-beat-loader'), 'Must support beat loader')
    assert.ok(spinnerContent.includes('v-sync-loader'), 'Must support sync loader')
    assert.ok(spinnerContent.includes('v-ring-loader'), 'Must support ring loader')
    assert.ok(spinnerContent.includes('v-scale-loader'), 'Must support scale loader')
    assert.ok(spinnerContent.includes('role="status"'), 'Must have accessible role status')
  })
})

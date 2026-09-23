import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'
const dashboard = readFileSync(new URL('../src/views/DashboardView.vue', import.meta.url), 'utf8')
const actions = readFileSync(
  new URL('../src/components/dashboard/QuickActions.vue', import.meta.url),
  'utf8',
)

test('Quick Access stands below compact header, outside loading/error branches', () => {
  assert.match(dashboard, /<PageHeader[\s\S]*?\/>\s*<QuickActions \/>/)
  assert.ok(dashboard.indexOf('<QuickActions />') < dashboard.indexOf('v-if="isLoading"'))
  assert.match(actions, /aria-labelledby="quick-access-title"/)
  assert.match(actions, /v-if="quickActions.length"/)
  assert.match(actions, /action.tooltip/)
})

test('Quick actions preserve destination permissions and create handlers', () => {
  for (const permission of [
    "hasWritePermission('assets')",
    "hasWritePermission('karyawan')",
    "hasPermission('tickets')",
    "hasPermission('submissions')",
  ])
    assert.ok(actions.includes(permission))
  for (const [file, query] of [
    ['AssetsView.vue', 'add'],
    ['EmployeesView.vue', 'add'],
    ['TicketsView.vue', 'new'],
  ]) {
    const source = readFileSync(new URL('../src/views/' + file, import.meta.url), 'utf8')
    assert.ok(source.includes(`route.query.action ${query === 'new' ? '!==' : '==='} '${query}'`))
    assert.ok(source.includes('openAdd()'))
    assert.ok(source.includes('action: undefined'))
  }
  assert.ok(actions.includes("router.push('/submissions')"))
})

test('Create cleanup preserves only intended route identity; BAST and other queries stay distinct', () => {
  const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8')
  const source = app.match(/function pageKey\(currentRoute\) \{([\s\S]*?)\n\}/)[1]
  const router = {
    resolve: ({ path, query, hash }) => {
      const params = new URLSearchParams(
        Object.entries(query).filter(([, value]) => value !== undefined),
      )
      return { fullPath: path + (params.size ? '?' + params : '') + (hash || '') }
    },
  }
  const key = new Function('router', 'currentRoute', source).bind(null, router)
  for (const [path, action] of [
    ['/assets', 'add'],
    ['/karyawan', 'add'],
    ['/tickets', 'new'],
    ['/tickets', 'create'],
  ]) {
    assert.equal(
      key({ path, query: { action, q: 'fixture' }, hash: '#form' }),
      path + '?q=fixture#form',
    )
    assert.equal(key({ path, query: { q: 'fixture' }, hash: '#form' }), path + '?q=fixture#form')
  }
  for (const fullPath of [
    '/submissions',
    '/submissions/new',
    '/submissions/42',
    '/tickets?action=comment',
  ]) {
    assert.equal(
      key({ path: fullPath.split('?')[0], query: { action: 'comment' }, fullPath }),
      fullPath,
    )
  }
})

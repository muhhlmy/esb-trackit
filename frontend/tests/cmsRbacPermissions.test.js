import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const routerUrl = new URL('../src/router/index.js', import.meta.url)
const navConfigUrl = new URL('../src/config/navigationConfig.js', import.meta.url)
const usersViewUrl = new URL('../src/views/UsersView.vue', import.meta.url)
const faqViewUrl = new URL('../src/views/FaqAdminView.vue', import.meta.url)
const adminDashboardUrl = new URL('../src/views/admin/AdminDashboardView.vue', import.meta.url)
const kbCategoriesUrl = new URL('../src/views/admin/KbCategoriesView.vue', import.meta.url)
const docEditorUrl = new URL('../src/views/admin/DocEditorView.vue', import.meta.url)
const docInspectorUrl = new URL('../src/components/admin/DocEditorInspector.vue', import.meta.url)

test('Router specifies knowledge_base permission for all CMS and KB admin routes', async () => {
  const source = await readFile(routerUrl, 'utf8')

  // Check allowedRouteMap
  assert.match(source, /\{\s*key:\s*'knowledge_base',\s*name:\s*'admin-cases'\s*\}/)

  // Verify route permissions (argumen pertama helper page())
  assert.match(source, /page\('\/faqs'[\s\S]*?permission:\s*'knowledge_base'/)
  assert.match(source, /page\('\/admin\/cases'[\s\S]*?permission:\s*'knowledge_base'/)
  assert.match(source, /page\([\s\S]*?'\/admin\/kb-categories'[\s\S]*?permission:\s*'knowledge_base'/)
  assert.match(source, /page\('\/admin\/editor\/:id\?'[\s\S]*?permission:\s*'knowledge_base'/)
})

test('navigation source of truth specifies knowledge_base permission for CMS menu items', async () => {
  const source = await readFile(navConfigUrl, 'utf8')

  assert.match(source, /to:\s*'\/admin\/cases'[\s\S]*?permission:\s*'knowledge_base'/)
  assert.match(source, /to:\s*'\/faqs'[\s\S]*?permission:\s*'knowledge_base'/)
})

test('UsersView defines knowledge_base feature and permission defaults', async () => {
  const source = await readFile(usersViewUrl, 'utf8')

  // Feature definition in ADMINISTRATIVE_FEATURES
  assert.match(source, /key:\s*'knowledge_base'/)
  assert.match(source, /label:\s*'Knowledge Base & CMS'/)

  // defaultPermissions sets knowledge_base to 'none'
  assert.match(source, /knowledge_base:\s*'none'/)

  // superadminPermissions sets knowledge_base to 'full'
  assert.match(source, /knowledge_base:\s*'full'/)
})

test('FaqAdminView enforces canWrite permission on mutations and hides mutation UI', async () => {
  const source = await readFile(faqViewUrl, 'utf8')

  assert.match(
    source,
    /const canWrite = computed\(\(\) => hasWritePermission\('knowledge_base'\)\)/,
  )
  assert.match(source, /if \(!canWrite\.value\) return/)
  assert.match(source, /v-if="canWrite"/)
})

test('AdminDashboardView enforces canWrite permission on mutations and hides mutation UI', async () => {
  const source = await readFile(adminDashboardUrl, 'utf8')

  assert.match(
    source,
    /const canWrite = computed\(\(\) => hasWritePermission\('knowledge_base'\)\)/,
  )
  assert.match(source, /if \(!canWrite\.value\) return/)
  assert.match(source, /v-if="canWrite"/)
})

test('KbCategoriesView enforces canWrite permission on mutations and hides mutation UI', async () => {
  const source = await readFile(kbCategoriesUrl, 'utf8')

  assert.match(
    source,
    /const canWrite = computed\(\(\) => hasWritePermission\('knowledge_base'\)\)/,
  )
  assert.match(source, /if \(!canWrite\.value\) return/)
  assert.match(source, /v-if="canWrite"/)
})

test('DocEditorView enforces canWrite and read-only mode for knowledge_base', async () => {
  const source = await readFile(docEditorUrl, 'utf8')

  assert.match(
    source,
    /const canWrite = computed\(\(\) => hasWritePermission\('knowledge_base'\)\)/,
  )
  assert.match(source, /editable:\s*canWrite\.value/)
  assert.match(source, /editor\.value\?\.setEditable\(val\)/)
  assert.match(source, /Mode Baca Saja/)
  assert.match(source, /:readonly="!canWrite"/)
})

test('DocEditorInspector disables metadata controls when canWrite is false', async () => {
  const source = await readFile(docInspectorUrl, 'utf8')

  assert.match(source, /canWrite:\s*\{[\s\S]*?type:\s*Boolean/)
  assert.match(source, /:disabled="!canWrite"/)
  assert.match(source, /if \(!props\.canWrite\) return/)
})

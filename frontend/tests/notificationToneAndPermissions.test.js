import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test, { describe } from 'node:test'

const soundSourceUrl = new URL('../src/composables/useNotificationSound.js', import.meta.url)
const permissionsSourceUrl = new URL('../src/composables/useBrowserPermissions.js', import.meta.url)
const appHeaderSourceUrl = new URL('../src/components/layout/AppHeader.vue', import.meta.url)
const modalSourceUrl = new URL('../src/components/ui/BrowserPermissionsModal.vue', import.meta.url)

describe('Notification Tone.js & Browser Permissions Suite', () => {
  test('useNotificationSound.js implements Tone.js synthesis and sound controls', async () => {
    const content = await readFile(soundSourceUrl, 'utf8')
    assert.match(content, /import\s+\*\s+as\s+Tone\s+from\s+'tone'/, 'Must import Tone.js')
    assert.match(content, /export\s+(async\s+)?function\s+playToneNotification/, 'Must export playToneNotification')
    assert.match(content, /export\s+function\s+useNotificationSound/, 'Must export useNotificationSound')
    assert.match(content, /Tone\.PolySynth|Tone\.Synth/, 'Must instantiate Tone synthesizer')
    assert.match(content, /isSoundEnabled/, 'Must provide reactive sound enable state')
  })

  test('useBrowserPermissions.js handles Notification, Camera, and Clipboard APIs', async () => {
    const content = await readFile(permissionsSourceUrl, 'utf8')
    assert.match(content, /requestNotificationPermission/, 'Must implement requestNotificationPermission')
    assert.match(content, /showNativeNotification/, 'Must implement showNativeNotification')
    assert.match(content, /requestCameraAccess/, 'Must implement requestCameraAccess')
    assert.match(content, /requestClipboardAccess/, 'Must implement requestClipboardAccess')
  })

  test('AppHeader.vue includes Tone.js audio, desktop notifications, and permissions modal', async () => {
    const content = await readFile(appHeaderSourceUrl, 'utf8')
    assert.match(content, /useNotificationSound/, 'AppHeader must import useNotificationSound')
    assert.match(content, /showNativeNotification/, 'AppHeader must import showNativeNotification')
    assert.match(content, /BrowserPermissionsModal/, 'AppHeader must render BrowserPermissionsModal')
    assert.match(content, /realtimeToast/, 'AppHeader must render realtime toast on screen')
  })

  test('BrowserPermissionsModal.vue provides accessible UI for all browser permissions', async () => {
    const content = await readFile(modalSourceUrl, 'utf8')
    assert.match(content, /Notifikasi Desktop/, 'Modal must cover Desktop Notifications')
    assert.match(content, /Suara Tone\.js/, 'Modal must cover Tone.js Audio')
    assert.match(content, /Kamera & Foto Aset/, 'Modal must cover Camera & Photo access')
    assert.match(content, /Akses File & Clipboard/, 'Modal must cover File & Clipboard access')
  })
})

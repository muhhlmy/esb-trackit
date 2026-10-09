import { ref, onMounted } from 'vue'
import { playToneNotification } from './useNotificationSound.js'

export const notificationPermission = ref('default')
export const cameraPermission = ref('prompt')
export const clipboardPermission = ref('prompt')
export const isBrowserNotificationSupported = ref(false)

/**
 * Checks current browser permission states
 */
export async function checkAllPermissions() {
  if (typeof window === 'undefined') return

  // 1. Notification API
  if ('Notification' in window) {
    isBrowserNotificationSupported.value = true
    notificationPermission.value = Notification.permission
  } else {
    isBrowserNotificationSupported.value = false
    notificationPermission.value = 'unsupported'
  }

  // 2. Camera Permission Query (if supported by Permissions API)
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const cameraStatus = await navigator.permissions.query({ name: 'camera' })
      cameraPermission.value = cameraStatus.state
      cameraStatus.onchange = () => {
        cameraPermission.value = cameraStatus.state
      }
    } catch {
      // Some browsers don't support querying camera via Permissions API
      cameraPermission.value = 'prompt'
    }

    // 3. Clipboard Read Permission Query
    try {
      const clipStatus = await navigator.permissions.query({ name: 'clipboard-read' })
      clipboardPermission.value = clipStatus.state
      clipStatus.onchange = () => {
        clipboardPermission.value = clipStatus.state
      }
    } catch {
      clipboardPermission.value = 'prompt'
    }
  }
}

/**
 * Requests Notification permission from the browser
 * @returns {Promise<'granted'|'denied'|'default'|'unsupported'>}
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }

  try {
    const result = await Notification.requestPermission()
    notificationPermission.value = result

    if (result === 'granted') {
      // Play a confirmation tone and show a welcome notification
      playToneNotification('SUCCESS')
      showNativeNotification({
        title: 'Notifikasi TrackIT Aktif',
        body: 'Anda akan menerima pembaruan tiket dan aset secara langsung.',
        icon: '/logo.svg',
      })
    }
    return result
  } catch (err) {
    console.error('[Browser Notification] Request error:', err)
    return notificationPermission.value
  }
}

/**
 * Shows a native desktop/browser notification
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.body
 * @param {string} [options.icon]
 * @param {string} [options.image]
 * @param {string} [options.badge]
 * @param {string} [options.tag]
 * @param {Function} [options.onClick]
 */
export function showNativeNotification({
  title = 'TrackIT',
  body = '',
  icon = '/logo.svg',
  image = null,
  badge = '/logo.svg',
  tag = 'trackit-notif',
  onClick = null,
} = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null
  if (Notification.permission !== 'granted') return null

  try {
    const notifOptions = {
      body,
      icon,
      badge,
      tag: `${tag}-${Date.now()}`,
      renotify: true,
      requireInteraction: false,
    }

    // Attach image preview if provided
    if (image) {
      notifOptions.image = image
    }

    const n = new Notification(title, notifOptions)

    n.onclick = (event) => {
      event.preventDefault()
      window.focus()
      if (typeof onClick === 'function') {
        onClick(event)
      }
      n.close()
    }

    return n
  } catch (err) {
    console.warn('[Browser Notification] Failed to show notification:', err)
    return null
  }
}

/**
 * Requests camera access (for taking photo of damaged assets/hardware)
 */
export async function requestCameraAccess() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, message: 'Browser tidak mendukung akses kamera langsung.' }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    cameraPermission.value = 'granted'
    // Immediately stop tracks after verifying access
    stream.getTracks().forEach((track) => track.stop())
    playToneNotification('SUCCESS')
    return { ok: true, message: 'Akses kamera berhasil diizinkan.' }
  } catch (err) {
    cameraPermission.value = 'denied'
    return { ok: false, message: err.message || 'Akses kamera ditolak oleh pengguna atau sistem.' }
  }
}

/**
 * Requests clipboard read access (for pasting image/file from clipboard)
 */
export async function requestClipboardAccess() {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.read) {
    return { ok: false, message: 'Browser tidak mendukung pembacaan clipboard otomatis.' }
  }

  try {
    await navigator.clipboard.read()
    clipboardPermission.value = 'granted'
    playToneNotification('SUCCESS')
    return { ok: true, message: 'Akses clipboard gambar dan file berhasil diizinkan.' }
  } catch (err) {
    return { ok: false, message: err.message || 'Izin clipboard ditolak.' }
  }
}

export function useBrowserPermissions() {
  onMounted(() => {
    checkAllPermissions()
  })

  return {
    notificationPermission,
    cameraPermission,
    clipboardPermission,
    isBrowserNotificationSupported,
    checkAllPermissions,
    requestNotificationPermission,
    showNativeNotification,
    requestCameraAccess,
    requestClipboardAccess,
  }
}

import { ref } from 'vue'
import { playToneNotification } from './useNotificationSound.js'

const toasts = ref([])

export function useToast() {
  function showToast(message, type = 'info', duration = 3000) {
    const id = Date.now() + Math.random().toString(36).substring(2, 5)
    const toast = { id, message, type }

    toasts.value.push(toast)
    playToneNotification(type === 'error' ? 'ALERT' : 'SUCCESS')

    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  function removeToast(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return {
    toasts,
    showToast,
    removeToast,
  }
}

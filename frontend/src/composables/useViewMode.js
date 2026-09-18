import { ref, watch } from 'vue'

/**
 * Mode tampilan list (Tabel / Kartu) yang tersimpan per modul.
 * Pilihan user dipersist di localStorage sehingga konsisten antar kunjungan.
 *
 * @param {string} moduleKey Kunci unik modul, mis. 'assets-it', 'tickets'.
 * @param {'table'|'card'} [defaultMode='table'] Mode awal bila belum pernah dipilih.
 */
export function useViewMode(moduleKey, defaultMode = 'table') {
  const storageKey = `trackit_view_mode_${moduleKey}`
  const stored = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null
  const viewMode = ref(stored === 'table' || stored === 'card' ? stored : defaultMode)

  watch(viewMode, (mode) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, mode)
    }
  })

  return { viewMode }
}

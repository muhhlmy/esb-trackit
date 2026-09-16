// ============================================================
// authStorage.js - Penyimpanan state autentikasi di sisi client
// ============================================================
// Keamanan: token JWT TIDAK lagi disimpan di localStorage/sessionStorage.
// Token kini hidup sebagai cookie HttpOnly (diterbitkan backend saat login),
// sehingga tidak dapat dibaca oleh JavaScript browser (ketahanan terhadap XSS).
//
// Yang masih disimpan di localStorage hanyalah objek `user` yang sudah
// di-sanitasi (tanpa password, hash, token, atau metadata internal) —
// murni cache UI untuk guard router & render instan. Kredensial sebenarnya
// (cookie sesi) tetap menjadi sumber kebenaran, dan setiap 401 dari API
// akan menghapus cache ini dan mengarahkan kembali ke /login.
// ============================================================

const AUTH_USER_KEY = 'user'

function getStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage || null
  } catch {
    return null
  }
}

function safeGetItem(storage, key) {
  if (!storage) return null
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function safeRemoveItem(storage, key) {
  if (!storage) return
  try {
    storage.removeItem(key)
  } catch {
    // Storage dapat dinonaktifkan browser; sesi tetap gagal tertutup.
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Projects raw user object to minimal client-safe UI fields.
 * Explicitly excludes passwords, hashes, tokens, secrets, or internal DB metadata.
 */
export function sanitizeUserForStorage(user) {
  if (!isPlainObject(user)) {
    return null
  }

  const {
    id,
    nama,
    email,
    role,
    permissions,
    nik,
    departemen,
    directorate,
    lokasi_kerja,
    title,
    jabatan,
  } = user

  return {
    id: id ? Number(id) : null,
    nama: typeof nama === 'string' ? nama : '',
    email: typeof email === 'string' ? email : '',
    role: typeof role === 'string' ? role : '',
    permissions:
      permissions && typeof permissions === 'object' && !Array.isArray(permissions)
        ? permissions
        : {},
    nik: typeof nik === 'string' ? nik : '',
    departemen: typeof departemen === 'string' ? departemen : '',
    directorate: typeof directorate === 'string' ? directorate : '',
    lokasi_kerja: typeof lokasi_kerja === 'string' ? lokasi_kerja : '',
    title: typeof title === 'string' ? title : typeof jabatan === 'string' ? jabatan : '',
  }
}

/**
 * Ambil objek user ter-sanitasi dari cache lokal (bukan token).
 * Returns null bila tidak ada / tidak valid.
 */
export function getStoredUser() {
  const storage = getStorage()
  const rawUser = safeGetItem(storage, AUTH_USER_KEY)
  if (typeof rawUser !== 'string') return null

  try {
    return sanitizeUserForStorage(JSON.parse(rawUser))
  } catch {
    return null
  }
}

/**
 * Simpan objek user ter-sanitasi ke cache lokal.
 * Catatan: token TIDAK diterima/disimpan — kredensial ada di cookie HttpOnly.
 */
export function storeAuthSession({ user } = {}) {
  const sanitizedUser = sanitizeUserForStorage(user)
  if (!sanitizedUser) {
    throw new TypeError('Data sesi autentikasi tidak valid.')
  }

  const storage = getStorage()
  if (!storage) {
    throw new Error('Penyimpanan sesi tidak tersedia pada browser ini.')
  }

  try {
    storage.setItem(AUTH_USER_KEY, JSON.stringify(sanitizedUser))
  } catch (error) {
    safeRemoveItem(storage, AUTH_USER_KEY)
    throw new Error('Sesi tidak dapat disimpan pada browser ini.', { cause: error })
  }

  return true
}

/**
 * Hapus cache user lokal. Dipanggil saat logout / 401.
 * Cookie sesi sendiri dihapus oleh backend (logout) atau kadaluarsa.
 */
export function clearAuthSession() {
  safeRemoveItem(getStorage(), AUTH_USER_KEY)
}

/**
 * Back-compat: tidak ada token di sisi client lagi (berpindah ke cookie
 * HttpOnly). Mengembalikan null agar konsumen lama tidak error.
 */
export function getAuthToken() {
  return null
}

/**
 * Snapshot autentikasi untuk guard router & boot.
 * `authenticated` = ada cache user; validasi sesungguhnya oleh server
 * (cookie + sesi) dan dikoreksi pada panggilan API pertama (401 → logout).
 */
export function getAuthSnapshot() {
  const user = getStoredUser()
  return {
    token: null,
    user,
    authenticated: Boolean(user),
    persistent: true,
  }
}

// ============================================================
// Pemulihan sesi dari server (session restore)
// ============================================================
// Cache `user` di localStorage hanya salinan UI; sumber kebenaran tetap
// cookie sesi HttpOnly. Saat cache hilang (storage dibersihkan, mode
// private, profile terpartisi, tab baru), guard router tidak boleh
// langsung menganggap user logout — cookie HttpOnly mungkin masih valid.
//
// `restoreSession()` memanggil /api/auth/me:
//   - 200  → simpan kembali cache user, kembalikan { user, restored: true }
//   - 401/403 → sesi memang invalid → kembalikan null (redirect /login)
//   - gangguan jaringan/server → kembalikan { offline: true } agar pemanggil
//     TIDAK logout prematur, melainkan melanjutkan ke halaman tujuan
//     (API pertama akan memunculkan 401 global bila sesi benar-benar mati).
//
// Token/session tetap TIDAK pernah disentuh JavaScript (HttpOnly).
// ============================================================

let restorePromise = null

export async function restoreSession() {
  // Cegah request paralel & race antar beberapa route guard.
  if (restorePromise) return restorePromise

  restorePromise = (async () => {
    if (typeof window === 'undefined') return null

    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      })

      // 401/403 = sesi invalid menurut server → memang harus login ulang.
      if (response.status === 401 || response.status === 403) {
        clearAuthSession()
        return null
      }

      // Server tidak dapat dijangkau / 5xx: jangan logout prematur.
      // Biarkan navigasi lanjut; 401 global akan dikoreksi oleh useApi.
      if (!response.ok) {
        return { offline: true, user: null }
      }

      const payload = await response.json().catch(() => null)
      const user = payload && (payload.user || payload)
      if (!isPlainObject(user) || !user.email) {
        clearAuthSession()
        return null
      }

      try {
        storeAuthSession({ user })
      } catch {
        // Storage tidak dapat ditulis (private mode / diblokir) — tetap
        // kembalikan user agar UI bisa dirender dari memori guard.
      }

      return { user, restored: true }
    } catch {
      // Network failure / abort → tidak ada kepastian sesi mati.
      return { offline: true, user: null }
    } finally {
      restorePromise = null
    }
  })()

  return restorePromise
}

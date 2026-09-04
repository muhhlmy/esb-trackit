import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from './useApi'
import {
  TICKET_ROLES,
  canAccessFrontendFeature,
  canWritePermission,
  getTicketEligibility,
} from '../utils/permissionAccess.js'
import { clearAuthSession, getStoredUser, storeAuthSession } from '../utils/authStorage.js'

// State global menggunakan ref (bisa juga pakai Pinia).
// Kredensial sesi (JWT) berada di cookie HttpOnly — tidak pernah muncul di
// state client. Di sini hanya cache user ter-sanitasi untuk UI & guard.
const user = ref(getStoredUser())

export function useAuth() {
  const api = useApi()
  const router = useRouter()

  const isAuthenticated = computed(() => Boolean(user.value))
  const ticketEligibility = computed(() => getTicketEligibility(user.value))
  const isSuperAdmin = computed(() => ticketEligibility.value.role === TICKET_ROLES.SUPERADMIN)
  const isAdmin = computed(
    () =>
      ticketEligibility.value.role === TICKET_ROLES.ADMIN ||
      ticketEligibility.value.role === TICKET_ROLES.SUPERADMIN,
  )
  const isCrudUnlocked = computed(() => isAdmin.value)
  const isUser = computed(() => ticketEligibility.value.role === TICKET_ROLES.REPORTER)

  const login = async (email, password, rememberMe = false) => {
    const response = await api.post('/api/auth/login', { email, password, rememberMe })

    if (!response || !response.user) {
      throw new Error('Login gagal. Respons server tidak valid.')
    }

    storeAuthSession({ user: response.user })
    user.value = getStoredUser()

    return response
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout').catch(() => {})
    } finally {
      user.value = null
      clearAuthSession()
      router.push('/login')
    }
  }

  const getProfile = () => {
    return user.value
  }

  // Returns true if the user has AT LEAST 'read_only' access to the feature
  const hasPermission = (featureKey) => {
    if (!user.value) return false
    return canAccessFrontendFeature(user.value, featureKey)
  }

  // Returns true only if the user has 'full' (CRUD) access to the feature
  const hasWritePermission = (featureKey) => {
    if (!user.value) return false
    if (!featureKey) return false
    if (featureKey === 'tickets') return ticketEligibility.value.canWrite
    if (isSuperAdmin.value) return true
    if (featureKey === 'export') return false
    const perms = user.value.permissions
    if (perms && typeof perms === 'object') {
      return canWritePermission(perms[featureKey])
    }
    return false
  }

  const refreshUser = async () => {
    if (!user.value) return null
    try {
      const freshUser = await api.get('/api/auth/me')
      user.value = freshUser
      storeAuthSession({ user: freshUser })
      return freshUser
    } catch (err) {
      // 401 sudah ditangani global (auto-logout). Error lain: pertahankan profil lama.
      return user.value
    }
  }

  return {
    user,
    isAuthenticated,
    isSuperAdmin,
    isAdmin,
    isCrudUnlocked,
    isUser,
    hasPermission,
    hasWritePermission,
    login,
    logout,
    getProfile,
    refreshUser,
  }
}

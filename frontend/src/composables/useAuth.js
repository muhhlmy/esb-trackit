import { ref, computed } from 'vue';
import { api, getAuthToken, setAuthToken } from '../services/api.js';
import { useToast } from './useToast.js';

const token = ref(getAuthToken());
const currentUser = ref(null);
const isSecretUnlocked = ref(sessionStorage.getItem('esb_crud_unlocked') === 'true');
const isLoginModalOpen = ref(false);
const logoClickCount = ref(0);
let clickTimer = null;

export function useAuth() {
  const { showToast } = useToast();

  const isAuthenticated = computed(() => !!token.value);
  const isCrudUnlocked = computed(() => isSecretUnlocked.value || isAuthenticated.value);

  // Secret 5x click unlock
  function registerLogoClick() {
    logoClickCount.value++;
    clearTimeout(clickTimer);

    if (logoClickCount.value >= 5) {
      isSecretUnlocked.value = !isSecretUnlocked.value;
      sessionStorage.setItem('esb_crud_unlocked', isSecretUnlocked.value ? 'true' : 'false');
      logoClickCount.value = 0;

      if (isSecretUnlocked.value) {
        showToast('🔓 Mode Admin / CRUD Aktif!', 'success');
      } else {
        showToast('🔒 Mode Admin / CRUD Dinonaktifkan.', 'info');
      }
      return;
    }

    clickTimer = setTimeout(() => {
      logoClickCount.value = 0;
    }, 2000);
  }

  async function login(username, password) {
    try {
      const res = await api.login(username, password);
      token.value = res.token;
      currentUser.value = res.user;
      isSecretUnlocked.value = true;
      sessionStorage.setItem('esb_crud_unlocked', 'true');
      showToast(`Selamat datang, ${res.user.name || res.user.username}!`, 'success');
      isLoginModalOpen.value = false;
      return true;
    } catch (err) {
      showToast(err.message || 'Login gagal.', 'error');
      return false;
    }
  }

  function logout() {
    api.logout();
    token.value = '';
    currentUser.value = null;
    isSecretUnlocked.value = false;
    sessionStorage.removeItem('esb_crud_unlocked');
    showToast('Logout berhasil.', 'info');
  }

  async function checkAuth() {
    if (!token.value) return;
    try {
      const res = await api.getMe();
      currentUser.value = res.user;
    } catch (err) {
      logout();
    }
  }

  return {
    token,
    currentUser,
    isAuthenticated,
    isCrudUnlocked,
    isLoginModalOpen,
    registerLogoClick,
    login,
    logout,
    checkAuth
  };
}

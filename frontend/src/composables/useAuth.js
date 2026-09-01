import { ref, computed } from 'vue';
import { api, getAuthToken, setAuthToken } from '../services/api.js';
import { useToast } from './useToast.js';

const token = ref(getAuthToken());
const isSecretUnlocked = ref(localStorage.getItem('esb_admin_mode') === 'true');
const isLoginModalOpen = ref(false);
const logoClickCount = ref(0);
let clickTimer = null;

export function useAuth() {
  const { showToast } = useToast();

  const isAuthenticated = computed(() => isSecretUnlocked.value);
  const isCrudUnlocked = computed(() => isSecretUnlocked.value);
  const currentUser = computed(() => (isSecretUnlocked.value ? { name: 'Admin User', role: 'admin' } : null));

  // Secret 5x click unlock/lock toggle
  function registerLogoClick() {
    logoClickCount.value++;
    clearTimeout(clickTimer);

    if (logoClickCount.value >= 5) {
      isSecretUnlocked.value = !isSecretUnlocked.value;
      localStorage.setItem('esb_admin_mode', isSecretUnlocked.value ? 'true' : 'false');
      logoClickCount.value = 0;

      if (isSecretUnlocked.value) {
        showToast('🔓 Mode Admin Aktif! Akses CMS dan tombol kelola SOP telah dibuka.', 'success');
      } else {
        showToast('🔒 Mode Admin Dinonaktifkan. Anda beralih ke Mode Non-Admin (Pembaca).', 'info');
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
    isSecretUnlocked.value = false;
    localStorage.setItem('esb_admin_mode', 'false');
    showToast('🔒 Mode Admin Dinonaktifkan. Anda sekarang dalam Mode Non-Admin (Pembaca).', 'info');
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

import { ref } from 'vue';

const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('esb_theme') : null;
const isDark = ref(savedTheme ? savedTheme === 'dark' : false);

export function useTheme() {
  function toggleTheme() {
    isDark.value = !isDark.value;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('esb_theme', isDark.value ? 'dark' : 'light');
    }
    updateThemeClass();
  }

  function updateThemeClass() {
    if (typeof document === 'undefined') return;
    if (isDark.value) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }

  // Initialize
  updateThemeClass();

  return {
    isDark,
    toggleTheme
  };
}

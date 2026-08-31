import { ref } from 'vue';

const savedTheme = localStorage.getItem('esb_theme');
const isDark = ref(savedTheme === 'dark');

export function useTheme() {
  function toggleTheme() {
    isDark.value = !isDark.value;
    localStorage.setItem('esb_theme', isDark.value ? 'dark' : 'light');
    updateThemeClass();
  }

  function updateThemeClass() {
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

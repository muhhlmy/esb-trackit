import { ref } from 'vue'
import { id as idDictionary } from '@/i18n/id/index.js'
import { en as enDictionary } from '@/i18n/en/index.js'

const savedLang = (typeof localStorage !== 'undefined' && localStorage.getItem('trackit_lang')) || 'id'
const currentLang = ref(savedLang === 'en' ? 'en' : 'id')

const dictionaries = {
  id: idDictionary,
  en: enDictionary,
}

export function useLanguage() {
  function setLanguage(lang) {
    if (lang !== 'id' && lang !== 'en') return
    currentLang.value = lang
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('trackit_lang', lang)
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang)
    }
  }

  function toggleLanguage() {
    setLanguage(currentLang.value === 'id' ? 'en' : 'id')
  }

  function t(key, fallback = '') {
    const dict = dictionaries[currentLang.value] || dictionaries.id
    return dict[key] || fallback || key
  }

  return {
    currentLang,
    setLanguage,
    toggleLanguage,
    t,
  }
}

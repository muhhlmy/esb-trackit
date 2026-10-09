import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import './assets/main.css'

const app = createApp(App)

app.use(router)

router.isReady().then(() => {
  app.mount('#app')

  // Layaknya native mobile/desktop app: tahan flashscreen 3-5 detik (3500ms)
  const SPLASH_MIN_HOLD_MS = 3500
  const splashStartTime =
    typeof window !== 'undefined' && window.__SPLASH_START__
      ? window.__SPLASH_START__
      : Date.now()
  const elapsed = Date.now() - splashStartTime
  const remainingWait = Math.max(0, SPLASH_MIN_HOLD_MS - elapsed)

  setTimeout(() => {
    const splash = document.getElementById('app-splashscreen')
    if (splash) {
      splash.classList.add('splash-hidden')
      setTimeout(() => {
        if (splash.parentNode) splash.parentNode.removeChild(splash)
      }, 500)
    }
  }, remainingWait)
})

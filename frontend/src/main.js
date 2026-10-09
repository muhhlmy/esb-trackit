import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import './assets/main.css'

const app = createApp(App)

app.use(router)

router.isReady().then(() => {
  app.mount('#app')

  // Smoothly dismiss startup flashscreen once Vue is mounted
  const splash = document.getElementById('app-splashscreen')
  if (splash) {
    splash.classList.add('splash-hidden')
    setTimeout(() => {
      if (splash.parentNode) splash.parentNode.removeChild(splash)
    }, 450)
  }
})

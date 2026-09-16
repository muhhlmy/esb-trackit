<script setup>
defineOptions({ name: 'AppNavbar' })
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useLanguage } from '@/composables/useLanguage'
import {
  Search,
  LogIn,
  LogOut,
  Ticket,
  LayoutDashboard,
  ChevronDown,
  Laptop,
  Globe,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const { isAuthenticated, user, isAdmin, logout } = useAuth()
const { currentLang, setLanguage, t } = useLanguage()
const isProfileOpen = ref(false)
const profileRoot = ref(null)
const profileTrigger = ref(null)

function closeProfileMenu() {
  isProfileOpen.value = false
}
function handleLogout() {
  closeProfileMenu()
  logout()
  router.push('/login')
}
function handlePointerDown(event) {
  if (!profileRoot.value?.contains(event.target)) closeProfileMenu()
}
function handleProfileFocusOut(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) closeProfileMenu()
}
function handleKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    router.push('/cases')
  } else if (event.key === 'Escape' && isProfileOpen.value) {
    closeProfileMenu()
    profileTrigger.value?.focus()
  }
}
watch(() => route.fullPath, closeProfileMenu)
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('pointerdown', handlePointerDown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('pointerdown', handlePointerDown)
})
</script>

<template>
  <header class="help-navbar">
    <nav class="navbar-inner" aria-label="Help Center">
      <RouterLink to="/" class="navbar-brand" aria-label="ESB TrackIT Help Center">
        <img src="/esb-logo-only.svg" alt="" class="brand-logo" />
        <span class="brand-wordmark"
          >TrackIT<span class="brand-mobile-caption">Help Center</span></span
        >
        <span class="brand-divider" aria-hidden="true"></span>
        <span class="brand-caption">Help Center</span>
      </RouterLink>

      <div class="navbar-actions">
        <RouterLink to="/cases" class="navbar-search" :aria-label="t('search_placeholder_nav')">
          <Search :size="17" aria-hidden="true" />
          <span>{{ t('search_placeholder_nav') }}</span>
          <kbd>Ctrl K</kbd>
        </RouterLink>
        <label v-if="route.path === '/'" class="navbar-language">
          <Globe :size="16" aria-hidden="true" />
          <span class="sr-only">Bahasa / Language</span>
          <select :value="currentLang" @change="setLanguage($event.target.value)">
            <option value="id">ID</option>
            <option value="en">EN</option>
          </select>
          <ChevronDown :size="12" class="language-chevron" aria-hidden="true" />
        </label>
        <span class="action-divider" aria-hidden="true"></span>
        <RouterLink
          v-if="!isAuthenticated"
          :to="{ path: '/login', query: { redirect: route.fullPath } }"
          class="navbar-signin"
        >
          <span>{{ t('sign_in') }}</span
          ><LogIn :size="16" aria-hidden="true" />
        </RouterLink>
        <div v-else ref="profileRoot" class="navbar-profile" @focusout="handleProfileFocusOut">
          <button
            ref="profileTrigger"
            type="button"
            class="profile-trigger"
            :aria-label="t('account_menu')"
            :aria-expanded="isProfileOpen"
            aria-controls="navbar-account"
            @click="isProfileOpen = !isProfileOpen"
          >
            <span class="profile-avatar">{{
              (user?.nama || user?.name || 'U').charAt(0).toUpperCase()
            }}</span>
            <span class="profile-name">{{ user?.nama || user?.name || 'User' }}</span>
            <ChevronDown
              :size="14"
              class="profile-chevron"
              :class="{ 'is-open': isProfileOpen }"
              aria-hidden="true"
            />
          </button>
          <div v-if="isProfileOpen" id="navbar-account" class="profile-dropdown">
            <div class="profile-identity">
              <strong>{{ user?.nama || user?.name || 'User' }}</strong>
              <span>{{ user?.email }}</span>
              <small>{{ user?.role || 'User' }}</small>
            </div>
            <div class="profile-links">
              <RouterLink v-if="isAdmin" to="/dashboard" @click="closeProfileMenu"
                ><LayoutDashboard :size="17" aria-hidden="true" />{{ t('dashboard') }}</RouterLink
              >
              <template v-else>
                <RouterLink to="/my-assets" @click="closeProfileMenu"
                  ><Laptop :size="17" aria-hidden="true" />{{ t('my_asset') }}</RouterLink
                >
                <RouterLink to="/tickets" @click="closeProfileMenu"
                  ><Ticket :size="17" aria-hidden="true" />{{ t('my_tickets') }}</RouterLink
                >
              </template>
            </div>
            <button type="button" class="profile-logout" @click="handleLogout">
              <LogOut :size="17" aria-hidden="true" />{{ t('sign_out') }}
            </button>
          </div>
        </div>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.help-navbar {
  --nav-ink: #172b4d;
  --nav-muted: #526277;
  --nav-line: #e5eaf1;
  --nav-surface: #fff;
  --nav-hover: #f4f7fb;
  position: sticky;
  top: 0;
  z-index: 40;
  padding: 0 24px;
  border-bottom: 1px solid var(--nav-line);
  background: var(--nav-surface);
  color: var(--nav-ink);
}
.navbar-inner {
  max-width: 1200px;
  min-height: 76px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
}
.help-navbar :is(a, button, select):focus-visible {
  outline: 2px solid #0a51b0;
  outline-offset: 4px;
}
.navbar-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-shrink: 0;
  min-height: 44px;
  border-radius: 6px;
}
.brand-logo {
  width: 36px;
  height: 28px;
  object-fit: contain;
}
.brand-wordmark {
  font-size: 19px;
  line-height: 1.2;
  letter-spacing: -0.05em;
  font-weight: 750;
}
.brand-divider {
  width: 1px;
  height: 22px;
  background: var(--nav-line);
  margin: 0 6px;
}
.brand-caption {
  font-size: 12px;
  font-weight: 500;
  color: var(--nav-muted);
}
.brand-mobile-caption {
  display: none;
}
.navbar-actions {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}
.navbar-search {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--nav-line);
  border-radius: 8px;
  background: var(--nav-hover);
  color: var(--nav-muted);
  font-size: 12px;
  transition: border-color 0.15s;
}
.navbar-search:hover {
  border-color: #96b3df;
  color: var(--nav-ink);
}
.navbar-search span {
  max-width: 210px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.navbar-search svg {
  flex-shrink: 0;
}
.navbar-search kbd {
  border: 1px solid var(--nav-line);
  border-radius: 4px;
  background: var(--nav-surface);
  padding: 2px 5px;
  font-size: 10px;
  white-space: nowrap;
}
.navbar-language {
  position: relative;
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--nav-muted);
  flex-shrink: 0;
}
.navbar-language select {
  appearance: none;
  min-height: 44px;
  padding: 0 17px 0 5px;
  background: transparent;
  color: var(--nav-ink);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
}
.navbar-language option {
  color: var(--nav-ink);
  background: var(--nav-surface);
}
.language-chevron {
  position: absolute;
  right: 0;
  pointer-events: none;
}
.action-divider {
  width: 1px;
  height: 24px;
  background: var(--nav-line);
  flex-shrink: 0;
}
.navbar-signin {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 42px;
  padding: 0 17px;
  border-radius: 8px;
  background: #0a51b0;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.navbar-signin:hover {
  background: #0a4391;
}
.navbar-profile {
  position: relative;
  flex-shrink: 0;
}
.profile-trigger {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 4px 0 4px 4px;
  border-radius: 8px;
  cursor: pointer;
}
.profile-trigger:hover {
  background: var(--nav-hover);
}
.profile-avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e8effa;
  color: #234b83;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.profile-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
}
.profile-chevron {
  color: var(--nav-muted);
  transition: transform 0.15s;
}
.profile-chevron.is-open {
  transform: rotate(180deg);
}
.profile-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 12px);
  width: 264px;
  max-width: calc(100vw - 32px);
  padding: 7px;
  border: 1px solid var(--nav-line);
  border-radius: 12px;
  background: var(--nav-surface);
  box-shadow: 0 12px 35px #172b4d1a;
}
.profile-identity {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-bottom: 1px solid var(--nav-line);
  overflow-wrap: anywhere;
}
.profile-identity strong {
  font-size: 13px;
  font-weight: 650;
}
.profile-identity span {
  font-size: 11px;
  color: var(--nav-muted);
}
.profile-identity small {
  font-size: 10px;
  color: var(--nav-muted);
  text-transform: capitalize;
  margin-top: 4px;
}
.profile-links {
  padding: 5px 0;
}
.profile-links a,
.profile-logout {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  width: 100%;
  padding: 10px 12px;
  font-size: 12px;
  border-radius: 7px;
  text-align: left;
}
.profile-links a:hover {
  background: var(--nav-hover);
}
.profile-logout {
  color: #c2414b;
  cursor: pointer;
  border-top: 1px solid var(--nav-line);
}
.profile-logout:hover {
  background: #fff1f2;
}
:global(.dark) .help-navbar {
  --nav-ink: #e2e8f0;
  --nav-muted: #a3b1c6;
  --nav-line: #2a3b53;
  --nav-surface: #142136;
  --nav-hover: #1c2e48;
}
@media (max-width: 1023px) {
  .navbar-inner {
    gap: 20px;
  }
  .navbar-actions {
    gap: 12px;
  }
  .navbar-search span {
    max-width: 150px;
  }
  .navbar-search kbd {
    display: none;
  }
  .brand-caption,
  .brand-divider {
    display: none;
  }
  .profile-name {
    max-width: 100px;
  }
}
@media (max-width: 767px) {
  .help-navbar {
    padding: 0 16px;
  }
  .navbar-inner {
    min-height: 64px;
    gap: 12px;
  }
  .navbar-brand {
    gap: 8px;
  }
  .brand-logo {
    width: 30px;
    height: 24px;
  }
  .brand-wordmark {
    font-size: 16px;
  }
  .brand-mobile-caption {
    display: block;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.01em;
    color: var(--nav-muted);
    margin-top: 4px;
  }
  .navbar-actions {
    gap: 10px;
  }
  .navbar-search {
    width: 40px;
    min-height: 44px;
    border: 0;
    background: transparent;
    padding: 0;
    justify-content: center;
  }
  .navbar-search span,
  .action-divider,
  .profile-name,
  .profile-chevron {
    display: none;
  }
  .navbar-language > svg:first-child {
    display: none;
  }
  .navbar-language select {
    padding-left: 7px;
  }
  .navbar-signin {
    min-height: 44px;
    padding: 0 13px;
    gap: 7px;
  }
  .navbar-signin svg {
    display: none;
  }
  .profile-trigger {
    min-width: 44px;
    justify-content: center;
    padding: 0;
  }
}
@media (max-width: 420px) {
  .navbar-search {
    display: none;
  }
  .navbar-actions {
    gap: 9px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .help-navbar * {
    transition: none !important;
  }
}
</style>

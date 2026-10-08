<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppIcon from '@/components/AppIcon.vue'
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const showShell = computed(() => Boolean(route.meta.requiresAuth))
const isLightMode = ref(localStorage.getItem('theme') === 'light')
const menuOpen = ref(false)
const sidebar = ref<HTMLElement | null>(null)
const menuButton = ref<HTMLButtonElement | null>(null)
watch(menuOpen, async (open) => {
  await nextTick()
  if (open) sidebar.value?.querySelector<HTMLButtonElement>('button')?.focus()
  else menuButton.value?.focus()
})
const handleDrawerKey = (event: KeyboardEvent) => {
  if (!menuOpen.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    menuOpen.value = false
  }
  if (event.key !== 'Tab') return
  const controls = sidebar.value?.querySelectorAll<HTMLElement>('a, button:not(:disabled)')
  const first = controls?.[0]
  const last = controls?.[controls.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}
const titles: Record<string, string> = {
  dashboard: 'Overview',
  courses: 'Courses',
  'course-detail': 'Course workspace',
  'assessment-detail': 'Assessment workspace',
  'verification-queue': 'Verification',
}
const pageTitle = computed(() => titles[String(route.name)] || 'Workspace')
const initials = computed(() =>
  (authStore.user?.first_name?.[0] || authStore.user?.email?.[0] || 'L').toUpperCase(),
)
const applyTheme = () => document.body.classList.toggle('light-theme', isLightMode.value)
const toggleTheme = () => {
  isLightMode.value = !isLightMode.value
  applyTheme()
  localStorage.setItem('theme', isLightMode.value ? 'light' : 'dark')
}
onMounted(applyTheme)
const closeDesktopMenu = () => {
  if (window.innerWidth > 1000) menuOpen.value = false
}
onMounted(() => window.addEventListener('resize', closeDesktopMenu))
onUnmounted(() => window.removeEventListener('resize', closeDesktopMenu))
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)
const logout = async () => {
  const revoked = await authStore.logout()
  if (!revoked && !authStore.accessToken && router.currentRoute.value.name === 'login') {
    await router.push({ name: 'login', query: { logout: 'local' } })
  }
}
</script>
<template>
  <RouterView v-if="route.name === 'ui-proposal'" />
  <div v-else class="app-root" :class="{ 'with-shell': showShell }" @keydown="handleDrawerKey">
    <aside ref="sidebar" v-if="showShell" class="app-sidebar" :class="{ 'is-open': menuOpen }">
      <button
        class="button-secondary drawer-close"
        type="button"
        aria-label="Close navigation"
        @click="menuOpen = false"
      >
        ×
      </button>
      <RouterLink class="brand" to="/dashboard">
        <img src="/postgradeLogo.jpg" alt="PostGrade Logo" class="brand-logo" />
        <span><strong>PostGrade</strong><small>Lecturer workspace</small></span>
      </RouterLink>
      <p class="nav-caption">YOUR WORKSPACE</p>
      <nav id="main-navigation" class="app-nav" aria-label="Main navigation">
        <RouterLink to="/dashboard"><AppIcon name="dashboard" />Dashboard</RouterLink>
        <RouterLink to="/courses"><AppIcon name="courses" />Courses</RouterLink>
        <RouterLink to="/verification-queue"><AppIcon name="verify" />Verification</RouterLink>
      </nav>
      <div class="sidebar-user">
        <span class="avatar">{{ initials }}</span
        ><span
          ><strong>{{ authStore.user?.first_name || 'Lecturer' }}</strong></span
        >
      </div>
    </aside>
    <button
      v-if="showShell && menuOpen"
      class="sidebar-backdrop"
      aria-label="Close navigation"
      @click="menuOpen = false"
    />
    <div :class="showShell ? 'app-content' : 'guest-content'">
      <header class="workspace-bar" :class="{ 'guest-bar': !showShell }">
        <div v-if="showShell" class="workspace-location">
          <button
            ref="menuButton"
            class="button-secondary menu-toggle"
            aria-label="Toggle navigation"
            aria-controls="main-navigation"
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          >
            <AppIcon name="menu" />
          </button>
          <strong>{{ pageTitle }}</strong
          ><span>POSTGRADE / LECTURER</span>
        </div>
        <span v-else class="guest-brand">POSTGRADE</span>
        <div class="workspace-controls">
          <button
            class="button-secondary theme-toggle"
            type="button"
            :aria-pressed="isLightMode"
            :aria-label="isLightMode ? 'Dark Mode' : 'Light Mode'"
            @click="toggleTheme"
          >
            <AppIcon :name="isLightMode ? 'moon' : 'sun'" /><span>{{
              isLightMode ? 'Dark Mode' : 'Light Mode'
            }}</span>
          </button>
          <button
            v-if="showShell"
            class="button-secondary"
            type="button"
            aria-label="Log out"
            @click="logout"
          >
            <AppIcon name="logout" /><span>Log out</span>
          </button>
        </div>
      </header>
      <RouterView />
    </div>
  </div>
</template>
<style scoped>
.app-root {
  min-height: 100vh;
}
.with-shell {
  padding-left: 248px;
}
.app-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: 248px;
  z-index: 40;
  display: flex;
  flex-direction: column;
  padding: 28px 18px 20px;
  background: var(--sidebar-bg);
  color: #eaf3ef;
  border-right: 1px solid var(--sidebar-border);
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
  margin-bottom: 46px;
  padding-inline: 8px;
}
.brand-logo {
  width: 46px;
  height: 46px;
  clip-path: circle(48%);
}
.brand strong {
  display: block;
  font-size: 1.18rem;
  letter-spacing: -0.035em;
}
.brand small {
  display: block;
  margin-top: 4px;
  color: #bdcec6;
  font-size: 0.7rem;
}
.nav-caption {
  margin: 0 12px 12px;
  color: #afc8be;
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  font-weight: 600;
}
.app-nav {
  display: grid;
  gap: 6px;
}
.app-nav a {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 13px 14px;
  border-radius: 9px;
  font-size: 0.88rem;
  font-weight: 550;
  color: #d7e5df;
  text-decoration: none;
}
.app-nav a:hover {
  background: #ffffff0d;
}
.app-nav a.router-link-active {
  background: #e7f1e9;
  color: #23483a;
  box-shadow: 0 3px 12px #00000010;
}
.sidebar-user {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  border-top: 1px solid #ffffff18;
  padding: 20px 8px 0;
  min-width: 0;
}
.sidebar-user > span:last-child {
  min-width: 0;
}
.sidebar-user strong,
.sidebar-user small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sidebar-user strong {
  font-size: 0.8rem;
  font-weight: 550;
}
.sidebar-user small {
  font-size: 0.68rem;
  color: #bdcec6;
  margin-top: 4px;
}
.avatar {
  display: grid;
  place-items: center;
  border-radius: 50%;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  background: #d8e7dd;
  color: #23483a;
  font-weight: 600;
}
.workspace-bar {
  position: sticky;
  top: 0;
  z-index: 30;
  min-height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 16px 36px;
  border-bottom: 1px solid var(--glass-border);
  background: var(--nav-background);
}
.workspace-location {
  display: flex;
  align-items: center;
  gap: 18px;
}
.workspace-location strong {
  font-size: 0.92rem;
}
.workspace-location > span,
.guest-brand {
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  color: var(--text-muted);
  font-weight: 600;
}
.workspace-controls {
  display: flex;
  gap: 10px;
}
.workspace-controls button {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 0.78rem;
}
.menu-toggle {
  display: none;
}
.drawer-close {
  display: none;
}
.guest-bar {
  position: absolute;
  inset: 0 0 auto;
  border: 0;
  background: transparent;
  padding-inline: 32px;
}
.guest-brand {
  visibility: hidden;
}
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  z-index: 35;
  background: #00000066;
  border: 0;
}
@media (max-width: 1000px) {
  .drawer-close {
    display: inline-flex;
    align-self: flex-end;
    padding: 6px;
    min-width: 32px;
    min-height: 32px;
    margin-bottom: 12px;
  }
  .with-shell {
    padding-left: 0;
  }
  .app-sidebar {
    transform: translateX(-100%);
    visibility: hidden;
  }
  .app-sidebar.is-open {
    transform: translateX(0);
    visibility: visible;
  }
  .menu-toggle {
    display: inline-flex;
    padding: 8px;
  }
  .workspace-bar {
    padding: 14px 20px;
  }
  .workspace-location > span {
    display: none;
  }
}
@media (max-width: 480px) {
  .workspace-controls button span {
    display: none;
  }
  .workspace-controls button {
    padding: 10px;
    min-width: 40px;
  }
  .guest-bar {
    justify-content: flex-end;
  }
  .guest-brand {
    display: none;
  }
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppIcon from '@/components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const showShell = computed(() => Boolean(route.meta.requiresAuth))
const isLightMode = ref(localStorage.getItem('theme') === 'light')
const pageTitle = computed(() => {
  const names: Record<string, string> = {
    dashboard: 'Overview',
    courses: 'Courses',
    'course-detail': 'Course workspace',
    'assessment-detail': 'Assessment workspace',
    'verification-queue': 'Verification',
  }
  return names[String(route.name)] || 'Workspace'
})
const toggleTheme = () => {
  isLightMode.value = !isLightMode.value
  document.body.classList.toggle('light-theme', isLightMode.value)
  localStorage.setItem('theme', isLightMode.value ? 'light' : 'dark')
}
onMounted(() => document.body.classList.toggle('light-theme', isLightMode.value))
const logout = async () => {
  const revoked = await authStore.logout()
  if (!revoked && !authStore.accessToken && router.currentRoute.value.name === 'login') {
    await router.push({ name: 'login', query: { logout: 'local' } })
  }
}
</script>

<template>
  <RouterView v-if="route.name === 'ui-proposal'" />
  <div v-else class="app-root">
    <header v-if="showShell" class="console-header">
      <div class="console-header__top">
        <RouterLink class="console-brand" to="/dashboard">
          <img src="/postgradeLogo.jpg" alt="" />
          <span><strong>PostGrade</strong><small>ASSESSMENT OPERATIONS</small></span>
        </RouterLink>
        <div class="console-location">
          <span class="location-pulse" aria-hidden="true"></span>
          <span>{{ pageTitle }}</span>
        </div>
        <div class="header-actions">
          <span class="lecturer-name">{{ authStore.user?.first_name || 'Lecturer' }}</span>
          <button
            class="header-button"
            type="button"
            :aria-label="isLightMode ? 'Dark Mode' : 'Light Mode'"
            :aria-pressed="isLightMode"
            @click="toggleTheme"
          >
            <AppIcon :name="isLightMode ? 'moon' : 'sun'" />
          </button>
          <button class="header-button logout-button" type="button" @click="logout">
            <AppIcon name="logout" /><span>Log out</span>
          </button>
        </div>
      </div>
      <nav class="console-nav" aria-label="Main navigation">
        <RouterLink to="/dashboard"><AppIcon name="dashboard" /> Overview</RouterLink>
        <RouterLink to="/courses"><AppIcon name="courses" /> Courses</RouterLink>
        <RouterLink to="/verification-queue"><AppIcon name="verify" /> Verification</RouterLink>
      </nav>
    </header>
    <div v-else class="guest-actions">
      <button
        class="header-button"
        type="button"
        :aria-label="isLightMode ? 'Dark Mode' : 'Light Mode'"
        :aria-pressed="isLightMode"
        @click="toggleTheme"
      >
        <AppIcon :name="isLightMode ? 'moon' : 'sun'" />
      </button>
    </div>
    <RouterView />
  </div>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
}
.console-header {
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--nav-background);
  border-bottom: 1px solid var(--glass-border);
}
.console-header__top {
  max-width: 1480px;
  min-height: 70px;
  margin: 0 auto;
  padding: 0 36px;
  display: flex;
  align-items: center;
  gap: 34px;
}
.console-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  color: var(--text-primary);
  text-decoration: none;
  white-space: nowrap;
}
.console-brand img {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  object-fit: cover;
}
.console-brand strong,
.console-brand small {
  display: block;
}
.console-brand strong {
  font-size: 1.12rem;
  line-height: 1;
  letter-spacing: -0.03em;
}
.console-brand small {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 0.61rem;
  letter-spacing: 0.13em;
}
.console-location {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 28px;
  border-left: 1px solid var(--glass-border);
  color: var(--text-secondary);
  font-size: 0.83rem;
}
.location-pulse {
  width: 7px;
  height: 7px;
  background: var(--accent-green);
  border-radius: 50%;
  box-shadow: 0 0 0 4px #46bde022;
}
.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.lecturer-name {
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-right: 8px;
}
.header-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 8px 11px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.78rem;
}
.header-button:hover {
  border-color: var(--accent-green);
  background: var(--surface-hover);
}
.header-button svg {
  width: 18px;
  height: 18px;
}
.console-nav {
  max-width: 1480px;
  margin: 0 auto;
  padding: 0 36px;
  display: flex;
  align-items: center;
  gap: 28px;
  min-height: 47px;
}
.console-nav a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: stretch;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.84rem;
  font-weight: 600;
}
.console-nav a:hover,
.console-nav a.router-link-active {
  color: var(--accent-green);
  border-bottom-color: var(--accent-green);
}
.console-nav svg {
  width: 16px;
  height: 16px;
}
.guest-actions {
  position: absolute;
  z-index: 20;
  top: 24px;
  right: 30px;
}
.app-root > main {
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
  padding: 36px 36px 64px;
}
.app-root > .login-page,
.app-root > .recovery-page {
  max-width: none;
  padding: 0;
}
@media (max-width: 760px) {
  .console-header__top {
    padding: 0 18px;
    min-height: 62px;
    gap: 10px;
  }
  .console-location,
  .lecturer-name,
  .console-brand small,
  .logout-button span {
    display: none;
  }
  .header-actions {
    gap: 6px;
  }
  .console-nav {
    padding: 0 18px;
    gap: 22px;
    overflow-x: auto;
  }
  .console-nav a {
    white-space: nowrap;
  }
  .app-root > main {
    padding: 22px 18px 48px;
  }
}
</style>

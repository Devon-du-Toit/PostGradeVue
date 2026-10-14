<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppIcon from '@/components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const showShell = computed(() => Boolean(route.meta.requiresAuth))
const isLightMode = ref(localStorage.getItem('theme') !== 'dark')
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
    <header v-if="showShell" class="editorial-header">
      <div class="masthead">
        <div class="edition-label"><span>POSTGRADE</span><small>THE LECTURER EDITION</small></div>
        <RouterLink class="masthead-brand" to="/dashboard">
          <img src="/postgradeLogo.jpg" alt="" />
          <strong>PostGrade</strong>
        </RouterLink>
        <div class="masthead-actions">
          <span>{{ authStore.user?.first_name || 'Lecturer' }}</span>
          <button
            type="button"
            :aria-label="isLightMode ? 'Dark Mode' : 'Light Mode'"
            :aria-pressed="isLightMode"
            @click="toggleTheme"
          >
            <AppIcon :name="isLightMode ? 'moon' : 'sun'" />
          </button>
          <button type="button" aria-label="Log out" @click="logout">
            <AppIcon name="logout" />
          </button>
        </div>
      </div>
      <nav class="editorial-nav" aria-label="Main navigation">
        <RouterLink to="/dashboard"><span>01</span> Overview</RouterLink>
        <RouterLink to="/courses"><span>02</span> Courses</RouterLink>
        <RouterLink to="/verification-queue"><span>03</span> Verification</RouterLink>
      </nav>
    </header>
    <div v-else class="guest-actions">
      <button
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
.editorial-header {
  background: var(--nav-background);
  border-bottom: 1px solid var(--glass-border);
}
.masthead {
  position: relative;
  max-width: 1380px;
  min-height: 104px;
  margin: 0 auto;
  padding: 22px 42px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 20px;
}
.edition-label {
  display: grid;
  gap: 4px;
  color: var(--text-muted);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.17em;
}
.edition-label span {
  color: var(--accent-green);
}
.edition-label small {
  font-size: 0.63rem;
}
.masthead-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  color: var(--text-primary);
  text-decoration: none;
}
.masthead-brand img {
  width: 40px;
  height: 40px;
  clip-path: circle(48%);
}
.masthead-brand strong {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.75rem;
  font-weight: 500;
  letter-spacing: -0.04em;
}
.masthead-actions {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 8px;
}
.masthead-actions > span {
  margin-right: 10px;
  color: var(--text-secondary);
  font-size: 0.83rem;
}
.masthead-actions button,
.guest-actions button {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--glass-border);
  border-radius: 3px;
  background: var(--glass-bg);
  color: var(--text-primary);
  cursor: pointer;
}
.masthead-actions button:hover,
.guest-actions button:hover {
  border-color: var(--accent-green);
}
.masthead-actions svg,
.guest-actions svg {
  width: 18px;
  height: 18px;
}
.editorial-nav {
  display: flex;
  justify-content: center;
  gap: clamp(32px, 6vw, 96px);
  min-height: 48px;
  border-top: 1px solid var(--glass-border);
}
.editorial-nav a {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0 3px;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 0.84rem;
  text-decoration: none;
}
.editorial-nav a span {
  color: var(--text-muted);
  font-size: 0.64rem;
}
.editorial-nav a:hover,
.editorial-nav a.router-link-active {
  color: var(--accent-green);
  border-bottom-color: var(--accent-green);
}
.guest-actions {
  position: absolute;
  z-index: 20;
  top: 25px;
  right: 30px;
}
.app-root > main {
  max-width: 1380px;
  margin: 0 auto;
  padding: 50px 42px 70px;
}
.app-root > .login-page,
.app-root > .recovery-page {
  max-width: none;
  padding: 0;
}
@media (max-width: 700px) {
  .masthead {
    min-height: 72px;
    padding: 14px 18px;
    grid-template-columns: 1fr auto;
  }
  .edition-label,
  .masthead-actions > span {
    display: none;
  }
  .masthead-brand {
    justify-self: start;
  }
  .masthead-brand strong {
    font-size: 1.35rem;
  }
  .masthead-brand img {
    width: 30px;
    height: 30px;
  }
  .editorial-nav {
    justify-content: space-around;
    gap: 10px;
    padding: 0 12px;
  }
  .editorial-nav a {
    font-size: 0.76rem;
  }
  .editorial-nav a span {
    display: none;
  }
  .app-root > main {
    padding: 28px 18px 50px;
  }
}
</style>

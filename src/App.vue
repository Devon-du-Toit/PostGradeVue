<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const showShell = computed(() => Boolean(route.meta.requiresAuth))

const logout = async () => {
  authStore.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="app-root">
    <header v-if="showShell" class="app-header">
      <div class="app-header__inner">
        <RouterLink class="brand" to="/dashboard">
          <!-- Replaced the 'P' box with the official logo -->
          <img src="/postgradeLogo.jpg" alt="PostGrade Logo" class="header-logo" />
          <span>
            <strong>PostGrade</strong>
            <small>Assessment workflow</small>
          </span>
        </RouterLink>

        <nav class="app-nav" aria-label="Main navigation">
          <RouterLink to="/dashboard">Dashboard</RouterLink>
          <RouterLink to="/courses">Courses</RouterLink>
          <RouterLink to="/verification-queue">Verification</RouterLink>
        </nav>

        <div class="app-user">
          <span class="app-user__email">{{ authStore.user?.email }}</span>
          <button class="button-secondary button-small" type="button" @click="logout">
            Log out
          </button>
        </div>
      </div>
    </header>

    <RouterView />
  </div>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
}

.app-header {
  position: sticky;
  z-index: 20;
  top: 0;
  border-bottom: 1px solid var(--glass-border);
  /* Uses a slightly darker navy to ground the navigation bar */
  background: rgba(11, 17, 33, 0.75);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}

.app-header__inner {
  display: flex;
  max-width: 1200px;
  min-height: 68px;
  margin: 0 auto;
  padding: 0 1.5rem;
  align-items: center;
  gap: 2rem;
}

.brand {
  display: flex;
  min-width: 190px;
  align-items: center;
  gap: 0.7rem;
  color: var(--text-primary);
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.brand:hover {
  opacity: 0.85;
}

.header-logo {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
}

.brand strong,
.brand small {
  display: block;
}

.brand strong {
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.brand small {
  margin-top: 0.15rem;
  color: var(--accent-green);
  font-size: 0.68rem;
  font-weight: 500;
}

.app-nav {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 0.35rem;
}

.app-nav a {
  padding: 0.5rem 0.7rem;
  border-radius: 7px;
  color: var(--text-secondary);
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.app-nav a:hover {
  background: var(--glass-bg-hover);
  color: var(--text-primary);
}

/* Make the active tab pop with the brand green */
.app-nav a.router-link-active {
  background: rgba(91, 166, 91, 0.15);
  color: var(--accent-green);
}

.app-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.app-user__email {
  max-width: 190px;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Glassy logout button */
.button-secondary {
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.button-secondary:hover:not(:disabled) {
  border-color: var(--glass-border-highlight);
  background: var(--glass-bg-hover);
  color: var(--accent-green);
}

.button-small {
  min-height: 36px;
  padding: 0.45rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 600;
}

@media (max-width: 760px) {
  .app-header__inner {
    padding: 0 1rem;
    gap: 0.75rem;
  }

  .brand {
    min-width: auto;
  }

  .brand small,
  .app-user__email {
    display: none;
  }

  .app-nav {
    justify-content: center;
  }

  .app-nav a {
    padding: 0.45rem 0.5rem;
    font-size: 0.8rem;
  }
}
</style>

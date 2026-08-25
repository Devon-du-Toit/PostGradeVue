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
          <span class="brand-mark">P</span>
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
  border-bottom: 1px solid var(--pg-border);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(14px);
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
  color: var(--pg-navy);
  text-decoration: none;
}

.brand:hover {
  color: var(--pg-navy);
}

.brand-mark {
  display: grid;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--pg-navy);
  color: #fff;
  font-weight: 700;
  place-items: center;
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
  color: var(--pg-muted);
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
  color: #566176;
  font-size: 0.88rem;
  font-weight: 600;
}

.app-nav a:hover,
.app-nav a.router-link-active {
  background: var(--pg-blue-soft);
  color: var(--pg-blue);
}

.app-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.app-user__email {
  max-width: 190px;
  overflow: hidden;
  color: var(--pg-muted);
  font-size: 0.8rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.button-secondary {
  border-color: var(--pg-border);
  background: #fff;
  color: #34405a;
}

.button-secondary:hover:not(:disabled) {
  border-color: #c8d0dd;
  background: #f8f9fc;
  color: var(--pg-navy);
  box-shadow: none;
}

.button-small {
  min-height: 36px;
  padding: 0.45rem 0.7rem;
  font-size: 0.82rem;
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

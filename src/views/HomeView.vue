<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { RouterLink } from 'vue-router'

const authStore = useAuthStore()
</script>

<template>
  <main class="home-page">
    <section class="glass-panel home-card">
      <h1>PostGrade</h1>

      <template v-if="authStore.user">
        <p class="user-info">Logged in as <strong>{{ authStore.user.email }}</strong></p>

        <div class="actions">
          <RouterLink to="/dashboard" class="btn-primary dashboard-link">
            Go to Dashboard
          </RouterLink>

          <button class="btn-secondary" type="button" @click="authStore.logout">
            Log out
          </button>
        </div>
      </template>

      <template v-else>
        <p class="user-info">Assessment administration, without the admin burden.</p>
        <RouterLink to="/login" class="btn-primary dashboard-link">Sign in</RouterLink>
      </template>
    </section>
  </main>
</template>

<style scoped>
.home-page {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.home-card {
  width: 100%;
  max-width: 420px;
  padding: 3rem 2rem;
  text-align: center;
}

h1 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--text-primary);
  font-size: 2.2rem;
  letter-spacing: -0.02em;
}

.user-info {
  color: var(--text-secondary);
  margin-bottom: 2rem;
  font-size: 0.95rem;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard-link {
  text-decoration: none;
  display: block;
}

.btn-secondary {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--glass-border);
  color: var(--text-secondary);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--glass-bg-hover);
  border-color: var(--status-error);
  color: #fca5a5;
}
</style>

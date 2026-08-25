<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const logout = async () => {
  authStore.logout()
  await router.push('/login')
}
</script>

<template>
  <main class="dashboard">
    <h1>Dashboard</h1>

    <p v-if="authStore.user">
      Welcome, {{ authStore.user.first_name || authStore.user.email }}
    </p>

    <section class="actions">
      <RouterLink class="action-card" to="/courses">
        <strong>Courses</strong>
        <span>Manage courses, students and assessments.</span>
      </RouterLink>
    </section>

    <button type="button" @click="logout">
      Log out
    </button>
  </main>
</template>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
}

.actions {
  margin: 2rem 0;
}

.action-card {
  display: flex;
  max-width: 360px;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 0.75rem;
  color: inherit;
  text-decoration: none;
}

.action-card:hover {
  background: #f7f7f7;
}
</style>

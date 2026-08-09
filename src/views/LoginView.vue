<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const router = useRouter()
const authStore = useAuthStore()

const login = async () => {
  error.value = ''
  loading.value = true

  try {
    await authStore.login(email.value, password.value)
    await router.push('/dashboard')
  } catch (err) {
    console.error(err)
    error.value = 'Login failed. Check the browser console.'
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <h1>PostGrade</h1>
      <p>Sign in to continue</p>

      <form @submit.prevent="login">
        <label for="email">Email</label>

        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          required
        />

        <label for="password">Password</label>

        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
        />

        <p v-if="error" class="error">
          {{ error }}
        </p>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
}

.error {
  color: crimson;
}

form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

input {
  padding: 0.75rem;
  font-size: 1rem;
}

button {
  margin-top: 1rem;
  padding: 0.75rem;
  cursor: pointer;
}
</style>

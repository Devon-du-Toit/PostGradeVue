<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import AlertBox from '@/components/AlertBox.vue'

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
    error.value = 'Could not sign in. Check your email and password and try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-brand-panel">
      <div class="login-brand-content">
        <img src="/postgradeLogo.jpg" alt="PostGrade Logo" class="login-logo-img" />
        <h1>Assessment administration, without the admin burden.</h1>
        <p class="login-intro">
          Organise classes, recognise scanned submissions, verify students and keep results
          in one focused workflow.
        </p>

        <div class="feature-list">
          <div><span>01</span><p><strong>Recognise</strong><br />Match scanned submissions with OCR.</p></div>
          <div><span>02</span><p><strong>Verify</strong><br />Review uncertain student matches quickly.</p></div>
          <div><span>03</span><p><strong>Grade</strong><br />Record results and maintain the gradebook.</p></div>
        </div>
      </div>
    </section>

    <section class="login-form-panel">
      <!-- Applied the new global glass-panel class here -->
      <div class="login-card glass-panel">
        <p class="page-eyebrow">Welcome back</p>
        <h2>Sign in to PostGrade</h2>
        <p class="login-help">Use your lecturer account to continue.</p>

        <form @submit.prevent="login">
          <label for="email">Email address</label>
          <!-- Applied glass-input -->
          <input
            id="email"
            class="glass-input"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="you@university.edu"
            required
          />

          <label for="password">Password</label>
          <!-- Applied glass-input -->
          <input
            id="password"
            class="glass-input"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Enter your password"
            required
          />

          <AlertBox type="error" v-if="error">{{ error }}</AlertBox>

          <!-- Applied btn-primary -->
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* Stripped out all hardcoded backgrounds so the global gradient shows */
.login-page {
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(0, 1.05fr) minmax(420px, 0.95fr);
  background: transparent;
}

.login-brand-panel {
  display: flex;
  padding: clamp(3rem, 7vw, 7rem);
  align-items: center;
  color: var(--text-primary);
}

.login-brand-content {
  width: 100%;
  max-width: 590px;
}

.login-logo-img {
  width: 140px;
  height: 140px;
  margin-bottom: 1.5rem;
  border-radius: 50%;
  box-shadow: var(--glass-shadow);
  border: 1px solid var(--glass-border);
  transition: transform 0.3s ease;
}

.login-logo-img:hover {
  transform: scale(1.05); /* Adds a subtle floating effect on hover */
}

.login-brand-panel .page-eyebrow {
  color: var(--accent-green);
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.login-brand-panel h1 {
  max-width: 570px;
  margin-bottom: 1.25rem;
  color: var(--text-primary);
  font-size: clamp(2.25rem, 5vw, 4rem);
  line-height: 1.05;
}

.login-intro {
  max-width: 540px;
  color: var(--text-secondary);
  font-size: 1.05rem;
}

.feature-list {
  display: grid;
  margin-top: 3.5rem;
  gap: 1.35rem;
}

.feature-list > div {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.feature-list span {
  color: var(--accent-green);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.feature-list p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.feature-list strong {
  color: var(--text-primary);
}

.login-form-panel {
  display: flex;
  padding: 2rem;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: 100%;
  max-width: 420px;
  padding: 2.5rem;
}

.login-card h2 {
  margin-bottom: 0.4rem;
  color: var(--text-primary);
  font-size: 1.8rem;
}

.login-help {
  margin-bottom: 2rem;
  color: var(--text-secondary);
}

form {
  display: grid;
  gap: 0.7rem;
}

form input + label {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

form button {
  width: 100%;
  margin-top: 1.2rem;
}

@media (max-width: 850px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-brand-panel {
    display: none;
  }

  .login-form-panel {
    min-height: 100vh;
  }
}
</style>

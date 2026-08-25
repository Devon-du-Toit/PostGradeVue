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
        <div class="login-logo">P</div>
        <p class="page-eyebrow">PostGrade</p>
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
      <div class="login-card">
        <p class="page-eyebrow">Welcome back</p>
        <h2>Sign in to PostGrade</h2>
        <p class="login-help">Use your lecturer account to continue.</p>

        <form @submit.prevent="login">
          <label for="email">Email address</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="you@university.edu"
            required
          />

          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Enter your password"
            required
          />

          <p v-if="error" class="error error-box">{{ error }}</p>

          <button type="submit" :disabled="loading">
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(0, 1.05fr) minmax(420px, 0.95fr);
  background: #fff;
}

.login-brand-panel {
  display: flex;
  padding: clamp(3rem, 7vw, 7rem);
  align-items: center;
  background:
    radial-gradient(circle at 20% 15%, rgba(78, 137, 255, 0.22), transparent 34%),
    linear-gradient(145deg, #14203a 0%, #1d3157 100%);
  color: #fff;
}

.login-brand-content {
  width: 100%;
  max-width: 590px;
}

.login-logo {
  display: grid;
  width: 48px;
  height: 48px;
  margin-bottom: 2.25rem;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 1.35rem;
  font-weight: 700;
  place-items: center;
}

.login-brand-panel .page-eyebrow {
  color: #87adff;
}

.login-brand-panel h1 {
  max-width: 570px;
  margin-bottom: 1.25rem;
  color: #fff;
  font-size: clamp(2.25rem, 5vw, 4rem);
  line-height: 1.05;
}

.login-intro {
  max-width: 540px;
  color: #c6d1e7;
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
  color: #7fa9ff;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.feature-list p {
  margin: 0;
  color: #aebbd2;
  font-size: 0.9rem;
}

.feature-list strong {
  color: #fff;
}

.login-form-panel {
  display: flex;
  padding: 2rem;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.login-card {
  width: 100%;
  max-width: 410px;
}

.login-card h2 {
  margin-bottom: 0.4rem;
  color: var(--pg-navy);
  font-size: 1.8rem;
}

.login-help {
  margin-bottom: 2rem;
  color: var(--pg-muted);
}

form {
  display: grid;
  gap: 0.7rem;
}

form input + label {
  margin-top: 0.5rem;
}

form button {
  width: 100%;
  margin-top: 0.9rem;
}

.error-box {
  margin: 0.6rem 0 0;
  padding: 0.75rem 0.9rem;
  border: 1px solid #f2c5c2;
  border-radius: 8px;
  background: #fff5f4;
  font-size: 0.86rem;
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
    background: var(--pg-bg);
  }

  .login-card {
    padding: 2rem;
    border: 1px solid var(--pg-border);
    border-radius: 14px;
    background: #fff;
    box-shadow: var(--pg-shadow);
  }
}
</style>

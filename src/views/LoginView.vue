<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import AlertBox from '@/components/AlertBox.vue'
import { registerUser } from '@/services/registration'

const props = withDefaults(defineProps<{ mode?: 'login' | 'signup' }>(), { mode: 'login' })
const signingUp = computed(() => props.mode === 'signup')
const firstName = ref('')
const lastName = ref('')
const confirmPassword = ref('')

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

watch(
  () => props.mode,
  () => {
    error.value = ''
    password.value = ''
    confirmPassword.value = ''
  },
)

const signup = async () => {
  if (loading.value) return
  error.value = ''
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }
  loading.value = true
  try {
    await registerUser({
      email: email.value,
      first_name: firstName.value,
      last_name: lastName.value,
      password: password.value,
    })
    password.value = ''
    confirmPassword.value = ''
    await router.push({ name: 'login', query: { registered: '1' } })
  } catch (cause) {
    const data = (cause as { response?: { data?: Record<string, unknown> } }).response?.data
    const labels: Record<string, string> = {
      email: 'Email',
      password: 'Password',
      first_name: 'First name',
      last_name: 'Last name',
    }
    const messages = data
      ? Object.entries(data).flatMap(([field, value]) => {
          const values = Array.isArray(value) ? value : [value]
          return values
            .filter((item): item is string => typeof item === 'string')
            .map((item) => `${labels[field] ? `${labels[field]}: ` : ''}${item}`)
        })
      : []
    error.value = messages.join(' ') || 'Could not create your account. Please try again.'
  } finally {
    loading.value = false
  }
}

const login = async () => {
  if (loading.value) return
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
          Organise classes, recognise scanned submissions, verify students and return scripts in one
          focused workflow.
        </p>

        <div class="feature-list">
          <div>
            <span>01</span>
            <p><strong>Recognise</strong><br />Read handwritten digits or filled bubbles.</p>
          </div>
          <div>
            <span>02</span>
            <p><strong>Verify</strong><br />Review uncertain student matches quickly.</p>
          </div>
          <div>
            <span>03</span>
            <p><strong>Return</strong><br />Email verified scripts to their students.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="login-form-panel">
      <!-- Applied the new global glass-panel class here -->
      <div class="login-card glass-panel">
        <p class="page-eyebrow">{{ signingUp ? 'Welcome to PostGrade' : 'Welcome back' }}</p>
        <h2>{{ signingUp ? 'Create your account' : 'Sign in to PostGrade' }}</h2>
        <p class="login-help">
          {{
            signingUp
              ? 'Create a lecturer account to get started.'
              : 'Use your lecturer account to continue.'
          }}
        </p>
        <AlertBox v-if="!signingUp && route.query.registered === '1'" type="success"
          >Your account has been created. Sign in to continue.</AlertBox
        >

        <form @submit.prevent="signingUp ? signup() : login()">
          <template v-if="signingUp">
            <label for="first-name">First name</label>
            <input
              id="first-name"
              class="glass-input"
              v-model.trim="firstName"
              autocomplete="given-name"
              maxlength="150"
              required
            />
            <label for="last-name">Last name</label>
            <input
              id="last-name"
              class="glass-input"
              v-model.trim="lastName"
              autocomplete="family-name"
              maxlength="150"
              required
            />
          </template>
          <label for="email">Email address</label>
          <!-- Applied glass-input -->
          <input
            id="email"
            class="glass-input"
            v-model.trim="email"
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
            :autocomplete="signingUp ? 'new-password' : 'current-password'"
            :aria-describedby="signingUp ? 'password-help' : undefined"
            placeholder="Enter your password"
            required
          />
          <template v-if="signingUp">
            <p id="password-help" class="password-help">
              Use at least 8 characters. Avoid common passwords or personal details.
            </p>
            <label for="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              class="glass-input"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
            />
          </template>

          <AlertBox type="error" v-if="error">{{ error }}</AlertBox>

          <!-- Applied btn-primary -->
          <button type="submit" class="btn-primary" :disabled="loading">
            {{
              signingUp
                ? loading
                  ? 'Creating account…'
                  : 'Create account'
                : loading
                  ? 'Signing in…'
                  : 'Sign in'
            }}
          </button>
        </form>
        <p class="account-link">
          {{ signingUp ? 'Already have an account?' : 'New to PostGrade?' }}
          <RouterLink :to="signingUp ? '/login' : '/signup'">{{
            signingUp ? 'Sign in' : 'Sign up'
          }}</RouterLink>
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.password-help,
.account-link {
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.account-link a {
  color: var(--accent-green);
}
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
    box-sizing: border-box;
    padding: 1.25rem;
  }

  .login-card {
    padding: 1.5rem;
  }
}
</style>

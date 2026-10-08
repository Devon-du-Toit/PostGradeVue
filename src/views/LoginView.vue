<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import AlertBox from '@/components/AlertBox.vue'
import { registerUser } from '@/services/registration'
import { fetchRecoveryPolicy } from '@/services/passwordRecovery'

const props = withDefaults(defineProps<{ mode?: 'login' | 'signup' }>(), { mode: 'login' })
const signingUp = computed(() => props.mode === 'signup')
const recoveryAvailable = ref(false)
onMounted(async () => {
  try {
    recoveryAvailable.value = await fetchRecoveryPolicy()
  } catch {
    recoveryAvailable.value = false
  }
})
const firstName = ref('')
const lastName = ref('')
const confirmPassword = ref('')
const showPasswordRules = ref(false)
const hasSpecialCharacter = (value: string) => /[^\p{L}\p{N}\s]/u.test(value)

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
    showPasswordRules.value = false
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
  if (!hasSpecialCharacter(password.value)) {
    error.value = 'Password must contain at least one special character, such as !, @ or #.'
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
    error.value = (err as { response?: unknown } | null)?.response
      ? 'Could not sign in. Check your email and password and try again.'
      : 'Could not reach PostGrade. Check your connection and try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-brand-panel">
      <div class="login-brand-content">
        <div class="login-brand">
          <img src="/postgradeLogo.jpg" alt="PostGrade Logo" class="login-logo-img" /><span
            >PostGrade</span
          >
        </div>
        <h1>Scripts, simplified.</h1>
        <p class="login-intro">Recognise. Verify. Return.</p>
      </div>
    </section>

    <section class="login-form-panel">
      <div class="login-card glass-panel">
        <span class="mobile-brand">PostGrade</span>
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
        <AlertBox v-if="!signingUp && route.query.reset === '1'" type="success"
          >Password updated. Sign in with your new password.</AlertBox
        >

        <AlertBox v-if="!signingUp && route.query.logout === 'local'" type="error"
          >You are signed out on this device. Server session revocation could not be
          confirmed.</AlertBox
        >
        <AlertBox type="error" v-if="error">{{ error }}</AlertBox>
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
            placeholder="you@mynwu.ac.za"
            required
          />

          <div class="password-label-row">
            <label for="password">Password</label>
            <button
              v-if="signingUp"
              type="button"
              class="password-rules-toggle"
              aria-label="Show password rules"
              aria-controls="password-help"
              :aria-expanded="showPasswordRules"
              @click="showPasswordRules = !showPasswordRules"
            >
              ?
            </button>
          </div>
          <!-- Applied glass-input -->
          <input
            id="password"
            class="glass-input"
            v-model="password"
            type="password"
            :autocomplete="signingUp ? 'new-password' : 'current-password'"
            :aria-describedby="signingUp && showPasswordRules ? 'password-help' : undefined"
            placeholder="Enter your password"
            required
          />
          <template v-if="signingUp">
            <p v-if="showPasswordRules" id="password-help" class="password-help">
              Use at least 8 characters and include at least one special character, such as !, @ or
              #. Avoid common passwords, entirely numeric passwords or personal details.
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
        <p v-if="!signingUp && recoveryAvailable" class="account-link">
          <RouterLink to="/forgot-password">Forgot your password?</RouterLink>
        </p>
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
.login-page {
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
}
.login-brand-panel {
  position: relative;
  display: flex;
  padding: 64px clamp(32px, 5vw, 80px);
  align-items: center;
  background: var(--hero-bg);
  color: #f0f6f2;
  overflow: hidden;
}
.login-brand-panel::before {
  content: '';
  position: absolute;
  width: 750px;
  height: 750px;
  border: 1px solid #c5dbc326;
  border-radius: 42%;
  transform: rotate(-22deg);
  top: -420px;
  left: -200px;
  box-shadow:
    0 0 0 90px #c5dbc309,
    0 0 0 180px #c5dbc308,
    0 0 0 270px #c5dbc307;
  pointer-events: none;
}
.login-brand-content {
  position: relative;
  max-width: 540px;
  width: 100%;
}
.login-brand {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: clamp(50px, 8vh, 90px);
}
.login-logo-img {
  width: 78px;
  height: 78px;
  clip-path: circle(48%);
  border: 0;
  box-shadow: none;
}
.login-brand > span {
  font-size: 1.6rem;
  font-weight: 650;
  letter-spacing: -0.04em;
}
.login-brand small {
  display: block;
  font-size: 0.72rem;
  font-weight: 400;
  color: #c7dbcd;
  letter-spacing: 0.03em;
  margin-top: 2px;
}
.brand-eyebrow {
  color: #c8dfcc;
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  font-weight: 600;
}
.login-brand-panel h1 {
  margin: 20px 0;
  color: #f3f7f4;
  font-size: clamp(2.3rem, 4.2vw, 3.7rem);
  line-height: 1.1;
  font-weight: 600;
  letter-spacing: -0.045em;
}
.login-intro {
  max-width: 425px;
  color: #d0e0d6;
  font-size: 0.98rem;
  line-height: 1.8;
}
.feature-list {
  display: grid;
  margin-top: 44px;
  gap: 18px;
}
.feature-list > div {
  display: flex;
  align-items: center;
  gap: 18px;
}
.feature-list span {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #ffffff0f;
  border: 1px solid #ffffff24;
  color: #d6e7d9;
  font-size: 0.68rem;
  flex-shrink: 0;
}
.feature-list p {
  margin: 0;
  color: #c7dbce;
  font-size: 0.8rem;
}
.feature-list strong {
  color: #f3f7f4;
  font-size: 0.87rem;
  font-weight: 550;
}
.login-form-panel {
  display: flex;
  padding: 94px 36px 48px;
  align-items: center;
  justify-content: center;
}
.login-card {
  width: 100%;
  max-width: 455px;
  padding: 36px;
}
.login-card .page-eyebrow {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0 0 10px;
}
.login-card h2 {
  margin: 0 0 8px;
  color: var(--text-primary);
  font-size: 1.75rem;
  letter-spacing: -0.035em;
}
.login-help {
  margin: 0 0 30px;
  color: var(--text-secondary);
  font-size: 0.87rem;
}
form {
  display: grid;
  gap: 8px;
}
form label {
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 550;
}
form input + label {
  margin-top: 12px;
}
form input {
  width: 100%;
}
form button {
  width: 100%;
  margin-top: 16px;
  min-height: 46px;
}
.password-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}
form .password-rules-toggle {
  width: 24px;
  min-height: 24px;
  margin: 0;
  padding: 0;
  border: 1px solid var(--text-secondary);
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}
.password-rules-toggle:focus-visible {
  outline: 2px solid var(--accent-green);
  outline-offset: 3px;
}
.password-help,
.account-link {
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.65;
}
.password-help {
  margin: 4px 0;
}
.account-link {
  margin-top: 20px;
}
.account-link a {
  color: var(--accent-green);
  font-weight: 550;
  text-underline-offset: 3px;
}
.mobile-brand {
  display: none;
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
    padding: 90px 20px 36px;
  }
  .login-card {
    padding: 28px;
  }
  .mobile-brand {
    display: block;
    color: var(--accent-green);
    font-weight: 650;
    font-size: 1.15rem;
    margin-bottom: 24px;
  }
}
</style>

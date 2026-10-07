<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AlertBox from '@/components/AlertBox.vue'
import {
  fetchRecoveryPolicy,
  requestPasswordReset,
  confirmPasswordReset,
} from '@/services/passwordRecovery'
import { useAuthStore } from '@/stores/auth'

const props = withDefaults(defineProps<{ mode?: 'request' | 'confirm' }>(), { mode: 'request' })
const confirming = computed(() => props.mode === 'confirm')
const route = useRoute()
const router = useRouter()
// Copy credentials once, then remove them from address/history and referrer URLs.
const credentials = new URLSearchParams(route.hash.slice(1))
const uid = credentials.get('uid') ?? ''
const token = credentials.get('token') ?? ''
const validLink = Boolean(uid && token && uid.length <= 100 && token.length <= 100)
const available = ref<boolean | null>(null)
const loading = ref(false)
const email = ref('')
const password = ref('')
const confirmation = ref('')
const error = ref('')
const message = ref('')
onMounted(async () => {
  if (confirming.value) await router.replace({ path: route.path, query: {}, hash: '' })
  try {
    available.value = await fetchRecoveryPolicy()
  } catch {
    error.value = 'Could not check password recovery. Please try again later.'
  }
})
const submit = async () => {
  if (loading.value || available.value !== true) return
  error.value = ''
  message.value = ''
  if (confirming.value && password.value !== confirmation.value) {
    error.value = 'Passwords do not match.'
    return
  }
  loading.value = true
  try {
    if (confirming.value) {
      await confirmPasswordReset(uid, token, password.value)
      password.value = ''
      confirmation.value = ''
      await useAuthStore().logout(false, false)
      await router.replace({ name: 'login', query: { reset: '1' } })
    } else message.value = await requestPasswordReset(email.value)
  } catch (cause) {
    const data = (cause as { response?: { data?: Record<string, unknown> } }).response?.data
    error.value = data
      ? Object.values(data)
          .flat()
          .filter((value) => typeof value === 'string')
          .join(' ')
      : ''
    error.value ||= 'Could not reset your password. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="recovery-page">
    <section class="glass-panel recovery-card">
      <p class="recovery-brand">PostGrade / Account recovery</p>
      <h1>{{ confirming ? 'Choose a new password' : 'Forgot your password?' }}</h1>
      <AlertBox v-if="available === false" type="error"
        >Password recovery is unavailable. Contact an administrator.</AlertBox
      >
      <AlertBox v-if="error" type="error">{{ error }}</AlertBox>
      <AlertBox v-if="message" type="success">{{ message }}</AlertBox>
      <AlertBox v-if="confirming && !validLink" type="error"
        >This reset link is invalid. Request a new link.</AlertBox
      >
      <form v-if="available === true && (!confirming || validLink)" @submit.prevent="submit">
        <template v-if="!confirming">
          <p>Enter your account email to request a reset link.</p>
          <label for="recovery-email">Email address</label>
          <input
            id="recovery-email"
            v-model.trim="email"
            class="glass-input"
            type="email"
            autocomplete="email"
            required
            maxlength="254"
          />
        </template>
        <template v-else>
          <p>Use at least eight characters and avoid common passwords or personal details.</p>
          <label for="recovery-password">New password</label>
          <input
            id="recovery-password"
            v-model="password"
            class="glass-input"
            type="password"
            autocomplete="new-password"
            required
            minlength="8"
            maxlength="128"
          />
          <label for="recovery-confirm">Confirm password</label>
          <input
            id="recovery-confirm"
            v-model="confirmation"
            class="glass-input"
            type="password"
            autocomplete="new-password"
            required
            maxlength="128"
          />
        </template>
        <button class="btn-primary" type="submit" :disabled="loading">
          {{ loading ? 'Please wait…' : confirming ? 'Reset password' : 'Send reset link' }}
        </button>
      </form>
      <p>
        <RouterLink v-if="confirming" to="/forgot-password">Request a new reset link</RouterLink>
      </p>
      <RouterLink to="/login">Back to sign in</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.recovery-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 96px 20px 40px;
}
.recovery-card {
  width: 100%;
  max-width: 480px;
  padding: 36px;
}
.recovery-brand {
  color: var(--accent-green);
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0 0 22px;
}
.recovery-card h1 {
  font-size: 1.7rem;
}
form {
  display: grid;
  gap: 0.8rem;
  margin-block: 1rem;
}
a {
  color: var(--accent-green);
}
</style>

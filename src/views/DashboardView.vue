<script setup lang="ts">
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const logout = async () => {
  authStore.logout()
  await router.push('/login')
}
</script>

<template>
  <main>
    <h1>Dashboard</h1>

    <p v-if="authStore.user">
      Welcome, {{ authStore.user.first_name || authStore.user.email }}
    </p>

    <button type="button" @click="logout">
      Log out
    </button>
  </main>
</template>

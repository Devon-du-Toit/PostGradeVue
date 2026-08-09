<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <main>
    <h1>PostGrade</h1>

    <p v-if="authStore.user">
      Logged in as {{ authStore.user.email }}
    </p>

    <button
      v-if="authStore.user"
      type="button"
      @click="authStore.logout"
    >
      Log out
    </button>
  </main>
</template>

import { defineStore } from 'pinia'
import { ref } from 'vue'

import api from '@/services/api'
import type { User } from '@/types/user'

interface LoginResponse {
  access: string
  refresh: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)

  const login = async (email: string, password: string) => {
    const response = await api.post<LoginResponse>('auth/login/', {
      email,
      password,
    })

    accessToken.value = response.data.access
    refreshToken.value = response.data.refresh

    const userResponse = await api.get<User>('auth/me/', {
      headers: {
        Authorization: `Bearer ${accessToken.value}`,
      },
    })

    user.value = userResponse.data
  }

  return {
    user,
    accessToken,
    refreshToken,
    login,
  }
})

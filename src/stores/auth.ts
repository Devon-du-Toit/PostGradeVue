import { defineStore } from 'pinia'
import { ref } from 'vue'

import api from '@/services/api'
import type { User } from '@/types/user'

interface LoginResponse {
  access: string
  refresh: string
}

interface RefreshResponse {
  access: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)

  const accessToken = ref<string | null>(
    localStorage.getItem('accessToken'),
  )

  const refreshToken = ref<string | null>(
    localStorage.getItem('refreshToken'),
  )

  const fetchUser = async () => {
    if (!accessToken.value) {
      return
    }

    const response = await api.get<User>('auth/me/')

    user.value = response.data
  }

  const login = async (email: string, password: string) => {
    const response = await api.post<LoginResponse>('auth/login/', {
      email,
      password,
    })

    accessToken.value = response.data.access
    refreshToken.value = response.data.refresh

    localStorage.setItem('accessToken', response.data.access)
    localStorage.setItem('refreshToken', response.data.refresh)

    await fetchUser()
  }

  const logout = () => {
    user.value = null
    accessToken.value = null
    refreshToken.value = null

    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  const refreshAccessToken = async () => {
    if (!refreshToken.value) {
      logout()
      return null
    }

    try {
      const response = await api.post<RefreshResponse>('auth/refresh/', {
        refresh: refreshToken.value,
      })

      accessToken.value = response.data.access
      localStorage.setItem('accessToken', response.data.access)

      return response.data.access
    } catch {
      logout()
      return null
    }
  }

  return {
    user,
    accessToken,
    refreshToken,
    login,
    fetchUser,
    refreshAccessToken,
    logout,
  }
})

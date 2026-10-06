import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import router from '@/router'
import api, { baseURL } from '@/services/api'
import type { User } from '@/types/user'

interface TokenResponse {
  access: string
  refresh?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))
  let generation = 0
  let refreshPromise: Promise<string | null> | null = null

  const fetchUser = async () => {
    if (!accessToken.value) return
    const current = generation
    const response = await api.get<User>('auth/me/')
    if (current === generation && accessToken.value) user.value = response.data
  }

  const revoke = async (token: string) => {
    try {
      await axios.post(`${baseURL}auth/logout/`, { refresh: token }, { timeout: 10_000 })
      return true
    } catch (error) {
      // A rejected refresh token is already unusable; other errors leave revocation uncertain.
      return axios.isAxiosError(error) && error.response?.status === 401
    }
  }

  const logout = async (force = false, revokeServer = true) => {
    const token = refreshToken.value
    generation += 1
    refreshPromise = null
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    const route = router.currentRoute.value
    const navigation =
      route.name !== 'login'
        ? router.push(
            force ? { name: 'login', query: { redirect: route.fullPath } } : { name: 'login' },
          )
        : Promise.resolve()
    // Local logout always completes, even when the server is unavailable.
    const revoked = !revokeServer || !token || (await revoke(token))
    await navigation
    return revoked
  }

  const login = async (email: string, password: string) => {
    const current = ++generation
    const response = await api.post<TokenResponse>('auth/login/', { email, password })
    if (current !== generation) throw new Error('Sign-in was cancelled.')
    accessToken.value = response.data.access
    refreshToken.value = response.data.refresh ?? null
    localStorage.setItem('accessToken', response.data.access)
    if (response.data.refresh) localStorage.setItem('refreshToken', response.data.refresh)
    await fetchUser()
  }

  const refreshAccessToken = (): Promise<string | null> => {
    if (refreshPromise) return refreshPromise
    const token = refreshToken.value
    if (!token) {
      void logout(true, false)
      return Promise.resolve(null)
    }
    const current = generation
    const pending = (async () => {
      try {
        // Bypass interceptors, preventing recursive refresh on a refresh failure.
        const response = await axios.post<TokenResponse>(
          `${baseURL}auth/refresh/`,
          { refresh: token },
          { timeout: 10_000 },
        )
        if (current !== generation) {
          // Rotation may finish after logout; revoke the new token without restoring it.
          if (response.data.refresh) await revoke(response.data.refresh)
          return null
        }
        accessToken.value = response.data.access
        localStorage.setItem('accessToken', response.data.access)
        if (response.data.refresh) {
          refreshToken.value = response.data.refresh
          localStorage.setItem('refreshToken', response.data.refresh)
        }
        return response.data.access
      } catch {
        if (current === generation) await logout(true, false)
        return null
      }
    })().finally(() => {
      if (refreshPromise === pending) refreshPromise = null
    })
    refreshPromise = pending
    return pending
  }

  return { user, accessToken, refreshToken, login, fetchUser, refreshAccessToken, logout }
})

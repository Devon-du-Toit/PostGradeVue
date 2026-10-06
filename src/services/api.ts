import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'

// Local development default. Production builds must set VITE_API_BASE_URL
// (enforced in vite.config.ts), so this never reaches a deployed bundle.
const LOCAL_API_BASE_URL = 'http://127.0.0.1:8000/api/'

// Exactly one trailing slash, so `${baseURL}auth/refresh/` works whether or
// not the configured value ends with "/".
export const normalizeBaseURL = (url: string) => url.replace(/\/*$/, '/')

// Export baseURL so we can reuse it in auth.ts for the clean refresh call
export const baseURL = normalizeBaseURL(import.meta.env.VITE_API_BASE_URL || LOCAL_API_BASE_URL)

const api = axios.create({
  baseURL,
  // A hung request fails instead of spinning forever. Uploads set their own.
  timeout: 30_000,
})

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let refreshPromise: Promise<string | null> | null = null

api.interceptors.request.use((config) => {
  const authStore = useAuthStore()

  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error)
    }

    originalRequest._retry = true
    const authStore = useAuthStore()

    refreshPromise ??= authStore.refreshAccessToken().finally(() => {
      refreshPromise = null
    })

    const newAccessToken = await refreshPromise

    if (newAccessToken) {
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return api(originalRequest)
    }

    // Refresh failed; refreshAccessToken has already logged the user out.
    return Promise.reject(error)
  },
)

export default api

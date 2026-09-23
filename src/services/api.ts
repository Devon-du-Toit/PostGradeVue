import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const baseURL = 'http://127.0.0.1:8000/api/'

const api = axios.create({
  baseURL,
})

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

interface RefreshResponse {
  access: string
}

let refreshPromise: Promise<string> | null = null

const clearTokens = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken')

  if (!refreshToken) {
    clearTokens()
    throw new Error('No refresh token available')
  }

  const response = await axios.post<RefreshResponse>(`${baseURL}auth/refresh/`, {
    refresh: refreshToken,
  })

  localStorage.setItem('accessToken', response.data.access)

  return response.data.access
}

api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken')

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
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

    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })

      const accessToken = await refreshPromise
      originalRequest.headers.Authorization = `Bearer ${accessToken}`

      return api(originalRequest)
    } catch (refreshError) {
      clearTokens()
      return Promise.reject(refreshError)
    }
  },
)

export default api

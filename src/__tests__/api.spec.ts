import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { createPinia, setActivePinia } from 'pinia'

import api, { normalizeBaseURL } from '@/services/api'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'

let mockStorage: Record<string, string> = {}

vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value
  },
  removeItem: (key: string) => {
    delete mockStorage[key]
  },
  clear: () => {
    mockStorage = {}
  },
})

// Answers 401 unless the request carries the refreshed token.
const adapter = async (config: InternalAxiosRequestConfig) => {
  if (config.headers.Authorization === 'Bearer fresh') {
    return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }
  }
  const response = { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config }
  throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response)
}

describe('normalizeBaseURL', () => {
  it('ends every base URL with exactly one slash', () => {
    expect(normalizeBaseURL('https://host/api')).toBe('https://host/api/')
    expect(normalizeBaseURL('https://host/api/')).toBe('https://host/api/')
    expect(normalizeBaseURL('https://host/api//')).toBe('https://host/api/')
    expect(normalizeBaseURL('/api')).toBe('/api/')
  })
})

describe('token refresh', () => {
  const originalAdapter = api.defaults.adapter

  beforeEach(async () => {
    localStorage.clear()
    localStorage.setItem('accessToken', 'expired')
    localStorage.setItem('refreshToken', 'refresh')
    setActivePinia(createPinia())
    api.defaults.adapter = adapter
    await router.push('/courses')
    await router.isReady()
  })

  afterEach(() => {
    api.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  it('refreshes once for parallel 401s and retries each request', async () => {
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'fresh' } })

    const results = await Promise.all([api.get('courses/'), api.get('students/')])

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(results.map((r) => r.status)).toEqual([200, 200])
    expect(useAuthStore().accessToken).toBe('fresh')
  })

  it('logs out once when the refresh fails', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh expired'))
    const push = vi.spyOn(router, 'push')

    await expect(api.get('courses/')).rejects.toBeInstanceOf(AxiosError)

    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith({ name: 'login', query: { redirect: '/courses' } })
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })
})

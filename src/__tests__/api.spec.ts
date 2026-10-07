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
  it('persists rotated tokens and restores them after application reload', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'fresh', refresh: 'rotated' } })
    await api.get('courses/')
    expect(useAuthStore().refreshToken).toBe('rotated')
    expect(localStorage.getItem('refreshToken')).toBe('rotated')
    setActivePinia(createPinia())
    expect(useAuthStore().accessToken).toBe('fresh')
    expect(useAuthStore().refreshToken).toBe('rotated')
  })

  it('coordinates direct refresh calls through the same promise', async () => {
    const post = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { access: 'fresh', refresh: 'rotated' } })
    const store = useAuthStore()
    const first = store.refreshAccessToken()
    const second = store.refreshAccessToken()
    expect(await Promise.all([first, second])).toEqual(['fresh', 'fresh'])
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('does not restore tokens when logout happens during rotation', async () => {
    let finish!: (response: { data: { access: string; refresh: string } }) => void
    const post = vi.spyOn(axios, 'post').mockImplementation((url) =>
      String(url).endsWith('auth/refresh/')
        ? new Promise((resolve) => {
            finish = resolve
          })
        : Promise.resolve({ data: {} }),
    )
    const store = useAuthStore()
    const refreshing = store.refreshAccessToken()
    await store.logout()
    finish({ data: { access: 'fresh', refresh: 'rotated-after-logout' } })
    expect(await refreshing).toBeNull()
    expect(store.accessToken).toBeNull()
    expect(store.refreshToken).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(
      post.mock.calls.some(
        ([url, body]) =>
          String(url).endsWith('auth/logout/') &&
          (body as { refresh: string }).refresh === 'rotated-after-logout',
      ),
    ).toBe(true)
  })

  it('clears the local session even if server logout is unavailable', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('offline'))
    const store = useAuthStore()
    expect(await store.logout()).toBe(false)
    expect(store.accessToken).toBeNull()
    expect(store.refreshToken).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })

  it('ignores a user response that arrives after logout', async () => {
    let finish!: (response: { data: { id: number } }) => void
    vi.spyOn(api, 'get').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    vi.spyOn(axios, 'post').mockResolvedValue({ data: {} })
    const store = useAuthStore()
    const fetching = store.fetchUser()
    await store.logout()
    finish({ data: { id: 1 } })
    await fetching
    expect(store.user).toBeNull()
  })

  it('does not refresh a session on incorrect login credentials', async () => {
    const post = vi.spyOn(axios, 'post')
    await expect(
      api.post('auth/login/', { email: 'test@example.invalid', password: 'wrong' }),
    ).rejects.toBeInstanceOf(AxiosError)
    expect(post).not.toHaveBeenCalled()
  })

  it('does not send JWTs or refresh a session for password recovery', async () => {
    const refresh = vi.spyOn(axios, 'post')
    let bearer: unknown
    api.defaults.adapter = async (config) => {
      bearer = config.headers.Authorization
      throw new AxiosError('Rejected', 'ERR_BAD_REQUEST', config, undefined, {
        data: {},
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      })
    }
    await expect(api.post('auth/password-reset/confirm/', {})).rejects.toBeInstanceOf(AxiosError)
    expect(bearer).toBeUndefined()
    expect(refresh).not.toHaveBeenCalled()
  })
})

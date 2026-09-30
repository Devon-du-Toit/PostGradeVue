import { describe, it, expect, beforeEach, vi } from 'vitest'
import router from '../router'

// Bypass JSDOM's broken storage by injecting a fake localStorage
let mockStorage: Record<string, string> = {}

vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value },
  clear: () => { mockStorage = {} }
})

describe('router auth guards', () => {
  beforeEach(async () => {
    localStorage.clear()
    await router.push('/')
    await router.isReady()
  })

  it('redirects unauthenticated users away from protected routes', async () => {
    await router.push('/verification-queue')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('allows authenticated users to open protected routes', async () => {
    localStorage.setItem('accessToken', 'token')
    await router.push('/courses')
    expect(router.currentRoute.value.name).toBe('courses')
  })

  it('redirects authenticated users away from login', async () => {
    localStorage.setItem('accessToken', 'token')
    await router.push('/login')
    expect(router.currentRoute.value.name).toBe('dashboard')
  })
})

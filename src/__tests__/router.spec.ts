import { describe, it, expect, beforeEach } from 'vitest'
import router from '../router'

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

  it('opens the sign-in form directly from the landing URL', () => {
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('allows guests to sign up', async () => {
    await router.push('/signup')
    expect(router.currentRoute.value.name).toBe('signup')
  })

  it('sends authenticated users from the landing URL and sign-up to dashboard', async () => {
    localStorage.setItem('accessToken', 'token')
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('dashboard')
    await router.push('/signup')
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('allows authenticated users to open protected routes', async () => {
    localStorage.setItem('accessToken', 'token')
    await router.push('/courses')
    expect(router.currentRoute.value.name).toBe('courses')
  })

  it('redirects authenticated users away from login', async () => {
    localStorage.setItem('accessToken', 'token')
    await router.push('/courses')
    await router.push('/login')
    expect(router.currentRoute.value.name).toBe('dashboard')
  })
})

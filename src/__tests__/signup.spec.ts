import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import LoginView from '@/views/LoginView.vue'
import { registerUser, fetchRegistrationPolicy } from '@/services/registration'

const { push, login, route } = vi.hoisted(() => ({
  push: vi.fn<(destination: unknown) => Promise<void>>(),
  login: vi.fn<(email: string, password: string) => Promise<void>>(),
  route: { query: {} as Record<string, string> },
}))
vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRouter: () => ({ push }),
  useRoute: () => route,
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ login }) }))
vi.mock('@/services/registration', () => ({
  registerUser: vi.fn<typeof registerUser>(),
  fetchRegistrationPolicy: vi.fn<typeof fetchRegistrationPolicy>(),
}))

const mounted: ReturnType<typeof mount>[] = []
const signupPage = async () => {
  const wrapper = mount(LoginView, {
    props: { mode: 'signup' },
    global: { stubs: { RouterLink: true } },
  })
  mounted.push(wrapper)
  await flushPromises()
  await wrapper.get('#first-name').setValue(' Synthetic ')
  await wrapper.get('#last-name').setValue(' Lecturer ')
  await wrapper.get('#email').setValue(' synthetic@example.invalid ')
  await wrapper.get('#password').setValue('ExamplePassword!42')
  await wrapper.get('#confirm-password').setValue('ExamplePassword!42')
  return wrapper
}

describe('sign up', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(fetchRegistrationPolicy).mockResolvedValue(true)
    route.query = {}
  })
  afterEach(() => mounted.splice(0).forEach((wrapper) => wrapper.unmount()))

  it('prevents mismatched passwords from creating an account', async () => {
    const wrapper = await signupPage()
    await wrapper.get('#confirm-password').setValue('different')
    await wrapper.get('form').trigger('submit')
    expect(registerUser).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toBe('Passwords do not match.')
  })

  it('registers once, trims names/email, clears passwords and returns to sign-in', async () => {
    const wrapper = await signupPage()
    vi.mocked(registerUser).mockResolvedValue({
      id: 7,
      email: 'synthetic@example.invalid',
      first_name: 'Synthetic',
      last_name: 'Lecturer',
    })
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(registerUser).toHaveBeenCalledWith({
      email: 'synthetic@example.invalid',
      first_name: 'Synthetic',
      last_name: 'Lecturer',
      password: 'ExamplePassword!42',
    })
    expect(push).toHaveBeenCalledWith({ name: 'login', query: { registered: '1' } })
    expect((wrapper.get('#password').element as HTMLInputElement).value).toBe('')
    expect(login).not.toHaveBeenCalled()
  })

  it('shows backend email/password validation instead of reporting success', async () => {
    const wrapper = await signupPage()
    vi.mocked(registerUser).mockRejectedValue({
      response: {
        data: { email: ['This email already exists.'], password: ['This password is too common.'] },
      },
    })
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Email: This email already exists.')
    expect(wrapper.get('[role="alert"]').text()).toContain('Password: This password is too common.')
    expect(push).not.toHaveBeenCalled()
  })

  it('does not issue duplicate registrations while the request is pending', async () => {
    const wrapper = await signupPage()
    let finish!: (data: Awaited<ReturnType<typeof registerUser>>) => void
    vi.mocked(registerUser).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')
    expect(registerUser).toHaveBeenCalledTimes(1)
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    finish({
      id: 7,
      email: 'synthetic@example.invalid',
      first_name: 'Synthetic',
      last_name: 'Lecturer',
    })
    await flushPromises()
  })

  it('shows the registration confirmation on sign-in', async () => {
    route.query = { registered: '1' }
    const wrapper = mount(LoginView, { global: { stubs: { RouterLink: true } } })
    mounted.push(wrapper)
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toContain('Your account has been created.')
    expect(wrapper.find('#first-name').exists()).toBe(false)
  })
  it('shows a closed-registration message and hides the signup form', async () => {
    vi.mocked(fetchRegistrationPolicy).mockResolvedValue(false)
    const wrapper = mount(LoginView, {
      props: { mode: 'signup' },
      global: { stubs: { RouterLink: true } },
    })
    mounted.push(wrapper)
    await flushPromises()
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('Registration is closed.')
    expect(registerUser).not.toHaveBeenCalled()
  })

  it('shows policy errors without enabling signup', async () => {
    vi.mocked(fetchRegistrationPolicy).mockRejectedValue(new Error('offline'))
    const wrapper = mount(LoginView, {
      props: { mode: 'signup' },
      global: { stubs: { RouterLink: true } },
    })
    mounted.push(wrapper)
    await flushPromises()
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('Could not check account registration.')
  })

  it('keeps initial sign-in usable without showing a failed signup availability check', async () => {
    vi.mocked(fetchRegistrationPolicy).mockRejectedValue(new Error('offline'))
    const wrapper = mount(LoginView, { global: { stubs: { RouterLink: true } } })
    mounted.push(wrapper)
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Could not check account registration.')
  })

  it('reports a connection problem when a submitted sign-in cannot reach the server', async () => {
    vi.mocked(fetchRegistrationPolicy).mockRejectedValue(new Error('offline'))
    login.mockRejectedValue(new Error('offline'))
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mount(LoginView, { global: { stubs: { RouterLink: true } } })
    mounted.push(wrapper)
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Could not reach PostGrade.')
    logged.mockRestore()
  })

  it('does not let a late policy failure replace the sign-in credential error', async () => {
    let rejectPolicy!: (cause: Error) => void
    vi.mocked(fetchRegistrationPolicy).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectPolicy = reject
        }),
    )
    login.mockRejectedValue({ response: { status: 401 } })
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mount(LoginView, { global: { stubs: { RouterLink: true } } })
    mounted.push(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    rejectPolicy(new Error('offline'))
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Check your email and password')
    logged.mockRestore()
  })
})

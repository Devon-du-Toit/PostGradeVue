import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PasswordRecoveryView from '@/views/PasswordRecoveryView.vue'
import {
  fetchRecoveryPolicy,
  requestPasswordReset,
  confirmPasswordReset,
} from '@/services/passwordRecovery'

const { route, replace, logout } = vi.hoisted(() => ({
  route: {
    path: '/reset-password',
    hash: '#uid=synthetic-uid&token=synthetic-token',
  },
  replace: vi.fn<(location: unknown) => Promise<void>>(),
  logout: vi.fn<(force: boolean, revoke: boolean) => Promise<void>>(),
}))
vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRoute: () => route,
  useRouter: () => ({ replace }),
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ logout }) }))
vi.mock('@/services/passwordRecovery', () => ({
  fetchRecoveryPolicy: vi.fn<typeof fetchRecoveryPolicy>(),
  requestPasswordReset: vi.fn<typeof requestPasswordReset>(),
  confirmPasswordReset: vi.fn<typeof confirmPasswordReset>(),
}))

describe('password recovery screens', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(fetchRecoveryPolicy).mockResolvedValue(true)
    route.hash = '#uid=synthetic-uid&token=synthetic-token'
  })

  const page = async (mode: 'request' | 'confirm') => {
    const wrapper = mount(PasswordRecoveryView, {
      props: { mode },
      global: { stubs: { RouterLink: true } },
    })
    await flushPromises()
    return wrapper
  }

  it('requests a link and shows the account-neutral server response', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue(
      'If an active account matches, a link will be sent.',
    )
    const wrapper = await page('request')
    await wrapper.get('#recovery-email').setValue('synthetic@example.com')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(requestPasswordReset).toHaveBeenCalledWith('synthetic@example.com')
    expect(wrapper.text()).toContain('If an active account matches')
    wrapper.unmount()
  })

  it('clears link credentials from history, rejects mismatched passwords, and resets successfully', async () => {
    const wrapper = await page('confirm')
    expect(replace).toHaveBeenCalledWith({ path: '/reset-password', query: {}, hash: '' })
    await wrapper.get('#recovery-password').setValue('SyntheticPassword854!')
    await wrapper.get('#recovery-confirm').setValue('different')
    await wrapper.get('form').trigger('submit')
    expect(confirmPasswordReset).not.toHaveBeenCalled()
    await wrapper.get('#recovery-confirm').setValue('SyntheticPassword854!')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(confirmPasswordReset).toHaveBeenCalledWith(
      'synthetic-uid',
      'synthetic-token',
      'SyntheticPassword854!',
    )
    expect(logout).toHaveBeenCalledWith(false, false)
    expect(replace).toHaveBeenLastCalledWith({ name: 'login', query: { reset: '1' } })
    wrapper.unmount()
  })

  it('shows expired-token errors and leaves the reset form usable', async () => {
    vi.mocked(confirmPasswordReset).mockRejectedValue({
      response: { data: { detail: 'Reset link expired.' } },
    })
    const wrapper = await page('confirm')
    await wrapper.get('#recovery-password').setValue('SyntheticPassword854!')
    await wrapper.get('#recovery-confirm').setValue('SyntheticPassword854!')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Reset link expired.')
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('fails closed when recovery is disabled or link parameters are absent', async () => {
    vi.mocked(fetchRecoveryPolicy).mockResolvedValue(false)
    const disabled = await page('request')
    expect(disabled.find('form').exists()).toBe(false)
    expect(disabled.text()).toContain('Contact an administrator')
    disabled.unmount()
    vi.mocked(fetchRecoveryPolicy).mockResolvedValue(true)
    route.hash = ''
    const invalid = await page('confirm')
    expect(invalid.find('form').exists()).toBe(false)
    expect(invalid.text()).toContain('This reset link is invalid')
    invalid.unmount()
  })
})

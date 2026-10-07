import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/services/api'
import { registerUser } from '@/services/registration'

vi.mock('@/services/api', () => ({
  default: { post: vi.fn<typeof api.post>(), get: vi.fn<typeof api.get>() },
}))

describe('registration API', () => {
  beforeEach(() => vi.clearAllMocks())
  it('creates an account with the backend registration contract and no role override', async () => {
    const input = {
      email: 'synthetic@example.invalid',
      first_name: 'Synthetic',
      last_name: 'Lecturer',
      password: 'ExamplePassword!42',
    }
    vi.mocked(api.post).mockResolvedValue({ data: { id: 7, email: input.email } })
    expect(await registerUser(input)).toEqual({ id: 7, email: input.email })
    expect(api.post).toHaveBeenCalledWith('auth/register/', input)
    expect(api.post).toHaveBeenCalledTimes(1)
  })
})

import api from '@/services/api'
import type { User } from '@/types/user'

export interface RegistrationInput {
  email: string
  first_name: string
  last_name: string
  password: string
}

export const registerUser = async (data: RegistrationInput) => {
  const response = await api.post<Pick<User, 'id' | 'email' | 'first_name' | 'last_name'>>(
    'auth/register/',
    data,
  )
  return response.data
}

export const fetchRegistrationPolicy = async () => {
  try {
    const response = await api.get<{ registration_open: boolean }>('auth/registration-policy/')
    return response.data.registration_open
  } catch (error) {
    // Compatibility during rollout with the older backend that has open signup.
    if ((error as { response?: { status?: number } }).response?.status === 404) return true
    throw error
  }
}

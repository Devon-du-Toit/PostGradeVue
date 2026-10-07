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

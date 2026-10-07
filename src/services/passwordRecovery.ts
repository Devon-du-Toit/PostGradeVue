import api from '@/services/api'

export const fetchRecoveryPolicy = async () => {
  const response = await api.get<{ password_recovery_available?: boolean }>(
    'auth/registration-policy/',
  )
  return response.data.password_recovery_available === true
}

export const requestPasswordReset = async (email: string) => {
  const response = await api.post<{ detail: string }>('auth/password-reset/', { email })
  return response.data.detail
}

export const confirmPasswordReset = async (uid: string, token: string, password: string) => {
  await api.post('auth/password-reset/confirm/', { uid, token, password })
}

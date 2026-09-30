import api from '@/services/api'

export interface DashboardStats {
  active_courses: number
  pending_verifications: number
}

export const fetchDashboardStats = async () => {
  const response = await api.get<DashboardStats>('dashboard/stats/')
  return response.data
}

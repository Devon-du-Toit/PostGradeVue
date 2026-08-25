import api from '@/services/api'
import type { Gradebook } from '@/types/gradebook'

export const fetchCourseGradebook = async (courseId: number) => {
  const response = await api.get<Gradebook>(`courses/${courseId}/gradebook/`)
  return response.data
}

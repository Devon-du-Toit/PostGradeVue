import api from '@/services/api'
import { fetchAllPages } from '@/services/pagination'
import type { Assessment, CreateAssessmentPayload } from '@/types/assessment'

export const fetchCourseAssessments = async (courseId: number) => {
  return fetchAllPages<Assessment>(`courses/${courseId}/assessments/`)
}

export const createAssessment = async (courseId: number, payload: CreateAssessmentPayload) => {
  const response = await api.post<Assessment>(`courses/${courseId}/assessments/`, payload)
  return response.data
}

export const fetchAssessment = async (assessmentId: number) => {
  const response = await api.get<Assessment>(`assessments/${assessmentId}/`)
  return response.data
}

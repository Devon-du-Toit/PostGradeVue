import api from '@/services/api'
import { fetchAllPages } from '@/services/pagination'
import type { CreateResultPayload, Result, UpdateResultPayload } from '@/types/result'

export const fetchAssessmentResults = async (assessmentId: number) => {
  return fetchAllPages<Result>(`assessments/${assessmentId}/results/`)
}

export const createAssessmentResult = async (
  assessmentId: number,
  payload: CreateResultPayload,
) => {
  const response = await api.post<Result>(
    `assessments/${assessmentId}/results/`,
    payload,
  )
  return response.data
}

export const updateAssessmentResult = async (
  resultId: number,
  payload: UpdateResultPayload,
) => {
  const response = await api.patch<Result>(`results/${resultId}/`, payload)
  return response.data
}

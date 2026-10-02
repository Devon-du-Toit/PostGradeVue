import api from '@/services/api'
import { fetchAllPages } from '@/services/pagination'
import type { CreateResultPayload, Result, UpdateResultPayload } from '@/types/result'

export const fetchAssessmentResults = async (assessmentId: number): Promise<Result[]> => {
  const data = await fetchAllPages(`assessments/${assessmentId}/results/`)
  return data as Result[]
}

export const createAssessmentResult = async (
  assessmentId: number,
  payload: CreateResultPayload,
): Promise<Result> => {
  const response = await api.post(`assessments/${assessmentId}/results/`, payload)
  return response.data
}

export const updateAssessmentResult = async (
  resultId: number,
  payload: UpdateResultPayload,
): Promise<Result> => {
  const response = await api.patch(`results/${resultId}/`, payload)
  return response.data
}

// Added for Issue #8: Retry email delivery
export const retryResultEmail = async (resultId: number) => {
  const response = await api.post(`results/${resultId}/retry-email`)
  return response.data
}

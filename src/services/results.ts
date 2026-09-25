import api from '@/services/api'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { CreateResultPayload, Result, UpdateResultPayload } from '@/types/result'

export const fetchAssessmentResults = async (assessmentId: number) => {
  const response = await api.get(`assessments/${assessmentId}/results/`)
  return response.data
}

export const createAssessmentResult = async (
  assessmentId: number,
  payload: CreateResultPayload,
) => {
  const response = await api.post(
    `assessments/${assessmentId}/results/`,
    payload,
  )
  return response.data
}

export const updateAssessmentResult = async (
  resultId: number,
  payload: UpdateResultPayload,
) => {
  const response = await api.patch(`results/${resultId}/`, payload)
  return response.data
}

// Added for Issue #8: Retry email delivery
export const retryResultEmail = async (resultId: number) => {
  const response = await api.post(`results/${resultId}/retry-email/`)
  return response.data
}

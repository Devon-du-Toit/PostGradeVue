import api from '@/services/api'
import axios from 'axios'
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

export const fetchAssessmentScripts = async (assessmentId: number, signal?: AbortSignal) => {
  try {
    const response = await api.get<Blob>(`assessments/${assessmentId}/scripts/export/`, {
      responseType: 'blob',
      signal,
      timeout: 120_000,
    })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      try {
        const body = JSON.parse(await error.response.data.text()) as { detail?: string }
        if (typeof body.detail === 'string') throw new Error(body.detail)
      } catch (parsed) {
        if (parsed instanceof Error && !(parsed instanceof SyntaxError)) throw parsed
      }
    }
    throw new Error('Could not download scripts. Please try again.')
  }
}

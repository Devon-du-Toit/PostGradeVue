import api from '@/services/api'
import { fetchAllPages } from '@/services/pagination'
import type { ResultEmail } from '@/types/resultEmail'

export const fetchResultEmails = (assessmentId: number, signal?: AbortSignal) =>
  fetchAllPages<ResultEmail>(`assessments/${assessmentId}/result-emails/`, {}, signal)

export const approveResultEmail = async (emailId: number) => {
  const response = await api.post<ResultEmail>(`result-emails/${emailId}/approve/`)
  return response.data
}

export const approveAssessmentEmails = async (assessmentId: number) => {
  const response = await api.post<{ approved: number }>(
    `assessments/${assessmentId}/result-emails/approve/`,
  )
  return response.data
}

export const retryResultEmail = async (emailId: number, confirmDuplicate = false) => {
  const response = await api.post<ResultEmail>(`result-emails/${emailId}/retry/`, {
    confirm_duplicate: confirmDuplicate,
  })
  return response.data
}

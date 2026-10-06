import api from '@/services/api'
import { fetchAllPages } from '@/services/pagination'
import type { ScriptEmail } from '@/types/scriptEmail'

export const fetchScriptEmails = (assessmentId: number, signal?: AbortSignal) =>
  fetchAllPages<ScriptEmail>(`assessments/${assessmentId}/script-emails/`, {}, signal)

export const approveScriptEmail = async (emailId: number) => {
  const response = await api.post<ScriptEmail>(`script-emails/${emailId}/approve/`)
  return response.data
}

export const approveAssessmentEmails = async (assessmentId: number) => {
  const response = await api.post<{ approved: number }>(
    `assessments/${assessmentId}/script-emails/approve/`,
  )
  return response.data
}

export const retryScriptEmail = async (emailId: number, confirmDuplicate = false) => {
  const response = await api.post<ScriptEmail>(`script-emails/${emailId}/retry/`, {
    confirm_duplicate: confirmDuplicate,
  })
  return response.data
}

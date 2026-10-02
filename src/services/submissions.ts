import api from '@/services/api'
import { fetchAllPages } from '@/services/pagination'
import type { Result } from '@/types/result'
import type { Submission } from '@/types/submission'

export interface VerificationFilters {
  search?: string
  status?: string
}

export interface SubmissionFilters {
  assessment?: number
  course?: number
  status?: string
}

// Filtered on the server: the backend returns only the matching submissions.
export const fetchSubmissions = async (filters: SubmissionFilters = {}) => {
  return fetchAllPages<Submission>('submissions/', { ...filters })
}

// Added filters and AbortSignal support
export const fetchVerificationQueue = async (
  filters: VerificationFilters = {},
  signal?: AbortSignal,
) => {
  return fetchAllPages<Submission>('submissions/verification-queue/', { ...filters }, signal)
}

export const uploadSubmission = async (assessmentId: number, file: File) => {
  const formData = new FormData()
  formData.append('assessment', String(assessmentId))
  formData.append('file', file)

  const response = await api.post<Submission>('submissions/', formData)
  return response.data
}

export const verifySubmission = async (submissionId: number, enrollment: number) => {
  const response = await api.post<Submission>(`submissions/${submissionId}/verify/`, {
    enrollment,
  })
  return response.data
}

export const markSubmission = async (submissionId: number, mark: number) => {
  const response = await api.post<Result>(`submissions/${submissionId}/mark/`, {
    mark,
  })
  return response.data
}

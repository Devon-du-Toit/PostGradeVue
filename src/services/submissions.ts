import api from '@/services/api'
import { fetchAllPages } from '@/services/pagination'
import type { ScriptEmail } from '@/types/scriptEmail'
import type { RecognitionCapabilities, RecognitionMethod, Submission } from '@/types/submission'

export const fetchRecognitionMethods = async () => {
  const response = await api.get<RecognitionCapabilities>('submissions/recognition-methods/')
  return response.data
}

export const UPLOAD_TIMEOUT_MS = 120_000

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
export const fetchSubmissions = async (filters: SubmissionFilters = {}, signal?: AbortSignal) => {
  return fetchAllPages<Submission>('submissions/', { ...filters }, signal)
}

// Added filters and AbortSignal support
export const fetchVerificationQueue = async (
  filters: VerificationFilters = {},
  signal?: AbortSignal,
) => {
  return fetchAllPages<Submission>('submissions/verification-queue/', { ...filters }, signal)
}

export const uploadSubmission = async (
  assessmentId: number,
  file: File,
  method: RecognitionMethod = 'ocr',
) => {
  const formData = new FormData()
  formData.append('assessment', String(assessmentId))
  formData.append('file', file)
  formData.append('recognition_method', method)

  // Up to 15 MB on a slow connection needs longer than the 30 s default.
  const response = await api.post<Submission>('submissions/', formData, {
    timeout: UPLOAD_TIMEOUT_MS,
  })
  return response.data
}

export const fetchSubmission = async (submissionId: number) => {
  const response = await api.get<Submission>(`submissions/${submissionId}/`)
  return response.data
}

// Protected files need the login token, which <img src> can't send, so they
// are fetched as blobs and shown through object URLs.
export const fetchRecognitionImage = async (submissionId: number, signal?: AbortSignal) => {
  const response = await api.get<Blob>(`submissions/${submissionId}/recognition-image/`, {
    responseType: 'blob',
    signal,
  })
  return response.data
}

export const fetchSubmissionFile = async (submissionId: number, signal?: AbortSignal) => {
  const response = await api.get<Blob>(`submissions/${submissionId}/file/`, {
    responseType: 'blob',
    signal,
  })
  return response.data
}

export const retryRecognition = async (submissionId: number) => {
  const response = await api.post<Submission>(`submissions/${submissionId}/retry-recognition/`)
  return response.data
}

export const verifySubmission = async (submissionId: number, enrollment: number) => {
  const response = await api.post<Submission>(`submissions/${submissionId}/verify/`, {
    enrollment,
  })
  return response.data
}

export const emailSubmission = async (submissionId: number) => {
  const response = await api.post<ScriptEmail>(`submissions/${submissionId}/email/`)
  return response.data
}

import api from '@/services/api'
import type { Submission } from '@/types/submission'

export const fetchSubmissions = async () => {
  const response = await api.get<Submission[]>('submissions/')
  return response.data
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

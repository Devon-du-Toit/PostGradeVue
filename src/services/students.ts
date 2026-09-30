import api from '@/services/api'
import { fetchAllPages } from '@/services/pagination'
import type { Student } from '@/types/student'

export interface ImportRowError {
  row?: number
  student_number?: string
  message: string
}

export interface ImportSummary {
  total: number
  created: number
  updated: number
  failed: number
}

export interface ImportResponse {
  message: string
  summary?: ImportSummary
  errors?: ImportRowError[]
}

export const fetchCourseStudents = async (courseId: number) => {
  return fetchAllPages<Student>(`courses/${courseId}/students/`)
}

export const importCourseStudents = async (
  courseId: number,
  file: File,
  updateExisting: boolean = false
) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('update_existing', String(updateExisting))

  const response = await api.post<ImportResponse>(
    `courses/${courseId}/import-students/`,
    formData,
  )

  return response.data
}

export const removeCourseStudent = async (courseId: number, studentId: number) => {
  await api.delete(`courses/${courseId}/students/${studentId}/`)
}

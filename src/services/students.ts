import api from '@/services/api'
import type { Student } from '@/types/student'

export const fetchCourseStudents = async (courseId: number) => {
  const response = await api.get<Student[]>(`courses/${courseId}/students/`)
  return response.data
}

export const importCourseStudents = async (courseId: number, file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post<{ message: string }>(
    `courses/${courseId}/import-students/`,
    formData,
  )

  return response.data
}

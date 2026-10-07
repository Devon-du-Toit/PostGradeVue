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
  mismatches?: { student_number: string; differences: Record<string, unknown> }[]
}

export const fetchCourseStudents = async (courseId: number) => {
  return fetchAllPages<Student>(`courses/${courseId}/students/`)
}

export const importCourseStudents = async (
  courseId: number,
  file: File,
  updateExisting: boolean = false,
) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('update_existing', String(updateExisting))

  const response = await api.post<ImportResponse>(`courses/${courseId}/import-students/`, formData)

  return response.data
}

export interface CourseStudentInput {
  student_number: string
  first_name: string
  last_name: string
  email: string
}

export const addCourseStudent = async (courseId: number, student: CourseStudentInput) => {
  // Reuse the atomic, owner-scoped course import so contact creation and
  // enrollment cannot partially succeed. Existing history is never restored
  // or overwritten implicitly. Escape CSV fields, including commas/quotes.
  const fields = ['student_number', 'first_name', 'last_name', 'email'] as const
  const escape = (value: string) => `"${value.trim().replace(/"/g, '""')}"`
  const csv = `${fields.join(',')}\r\n${fields.map((field) => escape(student[field])).join(',')}\r\n`
  const response = await importCourseStudents(
    courseId,
    new File([csv], 'student.csv', { type: 'text/csv' }),
  )
  if (response.summary?.failed || response.errors?.length) {
    throw new Error(
      response.errors?.map((item) => item.message).join(' ') ||
        response.message ||
        'Could not add the student.',
    )
  }
  return response
}

import { fetchAllPages } from '@/services/pagination'
import api from '@/services/api'
import type { EnrolledStudent } from '@/types/enrollment'

export const fetchCourseEnrollments = (courseId: number) =>
  fetchAllPages<EnrolledStudent>('enrollments/', { course: courseId })

export const fetchEnrollmentHistory = (course: number) =>
  fetchAllPages<EnrolledStudent>('students/enrollments/', { course, include_withdrawn: 'true' })
export const withdrawEnrollment = async (id: number, version: number, reason: string) => {
  await api.delete(`students/enrollments/${id}/`, { data: { version, reason } })
}
export const restoreEnrollment = async (id: number, version: number, reason: string) => {
  await api.post(`students/enrollments/${id}/restore/`, { version, reason })
}

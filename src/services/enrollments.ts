import { fetchAllPages } from '@/services/pagination'
import type { EnrolledStudent } from '@/types/enrollment'

export const fetchCourseEnrollments = (courseId: number) =>
  fetchAllPages<EnrolledStudent>('enrollments/', { course: courseId })

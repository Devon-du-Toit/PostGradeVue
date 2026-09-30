import api from '@/services/api'
import { fetchAllPages } from '@/services/pagination'
import type { Course, CreateCoursePayload } from '@/types/course'

export interface CourseFilters {
  search?: string
  year?: number | string
  semester?: number | string
}

// Added filters and an AbortSignal to handle stale request cancellation
export const fetchCourses = async (filters: CourseFilters = {}, signal?: AbortSignal) => {
  return fetchAllPages<Course>('courses/', { ...filters }, signal)
}

export const fetchCourse = async (courseId: number) => {
  const response = await api.get<Course>(`courses/${courseId}/`)
  return response.data
}

export const createCourse = async (payload: CreateCoursePayload) => {
  const response = await api.post<Course>('courses/', payload)
  return response.data
}

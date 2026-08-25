import api from '@/services/api'
import type { Course, CreateCoursePayload } from '@/types/course'

export const fetchCourses = async () => {
  const response = await api.get<Course[]>('courses/')
  return response.data
}

export const createCourse = async (payload: CreateCoursePayload) => {
  const response = await api.post<Course>('courses/', payload)
  return response.data
}

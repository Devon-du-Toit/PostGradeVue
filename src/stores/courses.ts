import { defineStore } from 'pinia'
import { ref } from 'vue'

import { createCourse, fetchCourses } from '@/services/courses'
import type { Course, CreateCoursePayload } from '@/types/course'

export const useCoursesStore = defineStore('courses', () => {
  const courses = ref<Course[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loadCourses = async () => {
    loading.value = true
    error.value = null

    try {
      courses.value = await fetchCourses()
    } catch {
      error.value = 'Could not load courses.'
      throw new Error(error.value)
    } finally {
      loading.value = false
    }
  }

  const addCourse = async (payload: CreateCoursePayload) => {
    error.value = null

    try {
      const course = await createCourse(payload)
      courses.value.push(course)
      return course
    } catch {
      error.value = 'Could not create course.'
      throw new Error(error.value)
    }
  }

  return {
    courses,
    loading,
    error,
    loadCourses,
    addCourse,
  }
})

export interface Course {
  id: number
  code: string
  name: string
  year: number
  semester: number
  created_at: string
  updated_at: string
}

export interface CreateCoursePayload {
  code: string
  name: string
  year: number
  semester: number
}

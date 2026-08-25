export interface Assessment {
  id: number
  course: number
  name: string
  max_mark: number
  weight: number
  date: string
  created_at: string
  updated_at: string
}

export interface CreateAssessmentPayload {
  name: string
  max_mark: number
  weight: number
  date: string
}

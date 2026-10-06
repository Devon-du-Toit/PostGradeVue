import type { ResultEmail } from '@/types/resultEmail'

export interface Result {
  id: number
  assessment: number
  enrollment: number
  student_number: string
  student_name: string
  mark: number | string
  percentage: number | string
  created_at: string
  updated_at: string
  version?: number
  email_delivery?: ResultEmail | null
}

export interface CreateResultPayload {
  enrollment: number
  mark: number
}

export interface UpdateResultPayload {
  mark: number
}

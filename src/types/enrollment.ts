export interface EnrolledStudent {
  version?: number
  withdrawn_at?: string | null
  withdrawal_reason?: string
  id: number
  course: number
  student: number
  student_number: string
  first_name: string
  last_name: string
}

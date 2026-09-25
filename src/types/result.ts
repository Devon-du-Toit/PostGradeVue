export type EmailStatus = 'pending' | 'queued' | 'sent' | 'failed'

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

  // Future delivery contract for Issue #8
  email_status?: EmailStatus
  email_error?: string
  email_sent_at?: string
}

export interface CreateResultPayload {
  enrollment: number
  mark: number
}

export interface UpdateResultPayload {
  mark: number
}

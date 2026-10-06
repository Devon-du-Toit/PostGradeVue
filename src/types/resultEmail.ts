export type ResultEmailStatus =
  'awaiting_approval' | 'queued' | 'sending' | 'sent' | 'failed' | 'superseded'

export interface ResultEmail {
  id: number
  result: number
  result_version: number
  is_current: boolean
  student_number: string
  recipient: string
  subject: string
  body: string
  status: ResultEmailStatus
  failure_reason: string
  attempts: number
  max_attempts: number
  run_after: string
  approved_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

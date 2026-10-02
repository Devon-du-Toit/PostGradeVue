export type SubmissionStatus =
  | 'uploaded'
  | 'matched'
  | 'needs_verification'
  | 'verified'
  | 'marked'
  | 'processing'
  | 'recognition_failed'
  | 'matched'
  | 'needs_verification'

export interface Submission {
  id: number
  assessment: number
  enrollment: number | null
  file: string
  original_filename: string
  status: SubmissionStatus
  created_at: string
  updated_at: string
}

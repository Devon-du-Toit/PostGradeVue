export interface Assessment {
  expected_qr_page_labels?: string[]
  qr_test?: string
  id: number
  course: number
  name: string
  date: string
  created_at: string
  updated_at: string
}

export interface CreateAssessmentPayload {
  name: string
  date: string
}

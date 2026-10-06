export type SubmissionStatus =
  'uploaded' | 'processing' | 'matched' | 'needs_verification' | 'recognition_failed' | 'verified'

export type RecognitionMethod = 'ocr' | 'bubble'
export interface RecognitionCapabilities {
  methods: { value: RecognitionMethod; label: string }[]
  bubble_templates: string[]
}
export interface BubbleColumnScore {
  column: number
  scores: number[]
  digit: number | null
  margin: number
  reason: 'multiple' | 'empty' | 'unreadable' | null
}

export type RecognitionOutcome =
  'matched' | 'no_match' | 'no_candidate' | 'region_not_found' | 'image_unusable' | 'error'

// One column of the bubble grid that could not be read (bubble recognition only).
export interface ColumnAmbiguity {
  column: number
  reason: 'multiple' | 'empty' | 'unreadable'
}

// Recognition evidence; see DOCS/RECOGNITION_EVIDENCE_API.md in the backend.
export interface RecognitionEvidence {
  id: number
  method: 'ocr' | 'bubble'
  outcome: RecognitionOutcome
  processing_version: string
  template_version?: string
  column_scores?: BubbleColumnScore[]
  raw_text: string
  // Ambiguous positions are written as "X". A string: keeps leading zeros.
  raw_candidate: string
  raw_candidates: { value: string; confidence: number | null }[]
  suggested_enrollment: number | null
  suggested_student_number: string
  confidence: number | null
  confidence_type: 'none' | 'ocr_score' | 'bubble_margin'
  column_ambiguity: ColumnAmbiguity[]
  region_image_url: string | null
  quality_issues: string[]
  error_type: string
  created_at: string
}

export interface RecognitionJob {
  id: number
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  attempts: number
  max_attempts: number
  failure_reason: string
}

export interface Submission {
  student_identity?: HistoryIdentity
  audit_entries?: HistoryAudit[]
  qr_metadata?: Record<string, string>
  qr_review_issues?: string[]
  qr_group_status?: 'manual_review' | 'pending_identification' | 'linked' | null
  grouped_pages?: GroupedPage[]
  upload_group_ids?: number[]
  archived_at?: string | null
  superseded_at?: string | null
  superseded_by?: number | null
  file_revisions?: FileRevision[]
  version?: number
  id: number
  assessment: number
  recognition_method?: RecognitionMethod
  enrollment: number | null
  file: string
  original_filename: string
  status: SubmissionStatus
  created_at: string
  updated_at: string
  // Present once the backend evidence API is deployed; null for old uploads.
  recognition?: RecognitionEvidence | null
  recognition_job?: RecognitionJob | null
  // Protected download endpoint (backend #4); absent until that is merged.
  download_url?: string | null
}

export interface HistoryIdentity {
  origin?: string
  student_number?: string
  first_name?: string
  last_name?: string
}
export interface HistoryAudit {
  id: number
  timestamp: string
  previous_status: string
  new_status: string
  previous_identity: HistoryIdentity
  new_identity: HistoryIdentity
  reason: string
  actor: number | null
}

export interface FileRevision {
  student_identity?: HistoryIdentity
  id: number
  version: number
  original_filename: string
  download_url: string
  created_at: string
}

export interface GroupedPage {
  id: number
  page_label: string
  source_page: number
  qr_fields: Record<string, string>
  qr_status: string
  excluded: boolean
  recognition_outcome: string
  quality_issues: string[]
  suggested_enrollment: number | null
  linked_enrollment: number | null
  upload_id: number
  download_url: string
  source_download_url: string
  review_history: Record<string, unknown>[]
}

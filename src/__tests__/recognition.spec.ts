import { describe, expect, it } from 'vitest'

import type { RecognitionEvidence } from '@/types/submission'
import {
  canRetryRecognition,
  preselectedEnrollment,
  summarizeRecognition,
  uncertainPositions,
} from '@/utils/recognition'

export const evidence = (overrides: Partial<RecognitionEvidence> = {}): RecognitionEvidence => ({
  id: 1,
  method: 'ocr',
  outcome: 'matched',
  processing_version: 'ocr-1',
  raw_text: 'Student number: 0727 9432',
  raw_candidate: '07279432',
  raw_candidates: [{ value: '07279432', confidence: 0.97 }],
  suggested_enrollment: 5,
  suggested_student_number: '07279432',
  confidence: 0.973,
  confidence_type: 'ocr_score',
  column_ambiguity: [],
  region_image_url: '/api/submissions/1/recognition-image/',
  quality_issues: [],
  error_type: '',
  created_at: '2026-10-01T20:00:00Z',
  ...overrides,
})

describe('summarizeRecognition', () => {
  it('explains a confident OCR match and keeps leading zeros', () => {
    const summary = summarizeRecognition(evidence())

    expect(summary.headline).toBe('Read 07279432, which matches one enrolled student.')
    expect(summary.details).toEqual([
      'Read from the handwritten number (OCR).',
      'OCR confidence: 97%',
    ])
    expect(summary.needsCareful).toBe(false)
  })

  it('asks for care when the number matches nobody', () => {
    const summary = summarizeRecognition(
      evidence({ outcome: 'no_match', suggested_enrollment: null, suggested_student_number: '' }),
    )

    expect(summary.headline).toBe(
      'Read 07279432, but it does not match exactly one enrolled student.',
    )
    expect(summary.needsCareful).toBe(true)
  })

  it('lists image quality problems for unusable scans', () => {
    const summary = summarizeRecognition(
      evidence({
        outcome: 'image_unusable',
        raw_candidate: '',
        confidence: null,
        confidence_type: 'none',
        quality_issues: ['Image is too blurry'],
      }),
    )

    expect(summary.headline).toBe('The scan is not clear enough to read.')
    expect(summary.details).toContain('Image is too blurry.')
  })

  it('names the error type but never a message', () => {
    const summary = summarizeRecognition(
      evidence({ outcome: 'error', raw_candidate: '', error_type: 'FileNotFoundError' }),
    )

    expect(summary.details).toContain('Error type: FileNotFoundError.')
  })

  // Planned bubble format, DOCS/RECOGNITION_EVIDENCE_API.md section 8.5.
  it('explains ambiguous bubble columns in plain language', () => {
    const summary = summarizeRecognition(
      evidence({
        method: 'bubble',
        outcome: 'no_match',
        raw_text: '',
        raw_candidate: '3727X432',
        confidence: 0.41,
        confidence_type: 'bubble_margin',
        column_ambiguity: [{ column: 4, reason: 'multiple' }],
      }),
    )

    expect(summary.details).toEqual([
      'Read from the bubble grid.',
      'Weakest column contrast: 41%',
      'Column 5: more than one bubble is filled.',
    ])
  })

  it('handles scripts without evidence', () => {
    expect(summarizeRecognition(null, 'processing').headline).toBe('Recognition is still running.')
    expect(summarizeRecognition(undefined, 'needs_verification').needsCareful).toBe(true)
  })
})

describe('uncertainPositions', () => {
  it('marks ambiguous columns and X placeholders', () => {
    const positions = uncertainPositions(
      evidence({
        raw_candidate: '3X27X432',
        column_ambiguity: [{ column: 4, reason: 'multiple' }],
      }),
    )

    expect([...positions].sort()).toEqual([1, 4])
  })
})

describe('preselectedEnrollment', () => {
  it('preselects only an unambiguous match', () => {
    expect(preselectedEnrollment(evidence(), null)).toBe(5)
    expect(preselectedEnrollment(evidence({ outcome: 'no_match' }), 7)).toBeNull()
    expect(
      preselectedEnrollment(evidence({ column_ambiguity: [{ column: 0, reason: 'empty' }] }), null),
    ).toBeNull()
  })

  it('keeps the current student when there is no evidence', () => {
    expect(preselectedEnrollment(null, 9)).toBe(9)
  })
})

describe('canRetryRecognition', () => {
  it('matches the statuses the backend allows', () => {
    expect(canRetryRecognition('recognition_failed')).toBe(true)
    expect(canRetryRecognition('needs_verification')).toBe(true)
    expect(canRetryRecognition('matched')).toBe(false)
  })
})

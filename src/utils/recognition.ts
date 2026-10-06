import type { RecognitionEvidence, SubmissionStatus } from '@/types/submission'

export interface RecognitionSummary {
  // One sentence for the lecturer.
  headline: string
  // Supporting facts, in plain language.
  details: string[]
  // True when the lecturer must choose the student deliberately.
  needsCareful: boolean
}

const COLUMN_REASONS: Record<string, string> = {
  multiple: 'more than one bubble is filled',
  empty: 'no bubble is filled',
  unreadable: 'the marks could not be read',
}

const methodName = (evidence: RecognitionEvidence) =>
  evidence.method === 'bubble' ? 'bubble grid' : 'handwritten number (OCR)'

const confidenceText = (evidence: RecognitionEvidence) => {
  if (evidence.confidence === null || evidence.confidence_type === 'none') return null
  const percent = Math.round(evidence.confidence * 100)
  return evidence.confidence_type === 'bubble_margin'
    ? `Weakest column contrast: ${percent}%`
    : `OCR confidence: ${percent}%`
}

// Turns recognition evidence into an explanation a lecturer can act on.
export const summarizeRecognition = (
  evidence: RecognitionEvidence | null | undefined,
  status?: SubmissionStatus,
): RecognitionSummary => {
  if (!evidence) {
    if (status === 'processing' || status === 'uploaded') {
      return { headline: 'Recognition is still running.', details: [], needsCareful: true }
    }
    return {
      headline: 'No recognition evidence for this script. Choose the student from the script.',
      details: [],
      needsCareful: true,
    }
  }

  const details: string[] = [`Read from the ${methodName(evidence)}.`]
  const confidence = confidenceText(evidence)
  if (confidence) details.push(confidence)

  for (const column of evidence.column_ambiguity) {
    details.push(`Column ${column.column + 1}: ${COLUMN_REASONS[column.reason] ?? column.reason}.`)
  }

  const read = evidence.raw_candidate

  switch (evidence.outcome) {
    case 'matched':
      return {
        headline: `Read ${evidence.suggested_student_number || read}, which matches one enrolled student.`,
        details,
        needsCareful: evidence.column_ambiguity.length > 0,
      }
    case 'no_match':
      return {
        headline: read
          ? `Read ${read}, but it does not match exactly one enrolled student.`
          : 'A number was read, but it does not match exactly one enrolled student.',
        details,
        needsCareful: true,
      }
    case 'no_candidate':
      return {
        headline: 'The student-number area was found, but no number could be read from it.',
        details,
        needsCareful: true,
      }
    case 'region_not_found':
      return {
        headline: 'The student-number area was not found on the page.',
        details,
        needsCareful: true,
      }
    case 'image_unusable':
      return {
        headline: 'The scan is not clear enough to read.',
        details: [...details, ...evidence.quality_issues.map((issue) => `${issue}.`)],
        needsCareful: true,
      }
    case 'error':
      return {
        headline: 'Recognition failed with an internal error.',
        details: evidence.error_type
          ? [...details, `Error type: ${evidence.error_type}.`]
          : details,
        needsCareful: true,
      }
  }
}

// Positions of the read number that need attention (ambiguous bubble columns
// and "X" placeholders), for highlighting.
export const uncertainPositions = (evidence: RecognitionEvidence | null | undefined) => {
  const positions = new Set<number>()
  if (!evidence) return positions
  for (const column of evidence.column_ambiguity) positions.add(column.column)
  ;[...evidence.raw_candidate].forEach((char, index) => {
    if (char === 'X') positions.add(index)
  })
  return positions
}

// The student to preselect, or null when the lecturer must choose explicitly.
// Only an unambiguous match is preselected, so an uncertain reading can never
// be confirmed by just pressing "Confirm".
export const preselectedEnrollment = (
  evidence: RecognitionEvidence | null | undefined,
  currentEnrollment: number | null,
) => {
  if (!evidence) return currentEnrollment
  if (evidence.outcome !== 'matched' || evidence.column_ambiguity.length > 0) return null
  return evidence.suggested_enrollment ?? currentEnrollment
}

export const canRetryRecognition = (status: SubmissionStatus) =>
  status === 'recognition_failed' || status === 'needs_verification'

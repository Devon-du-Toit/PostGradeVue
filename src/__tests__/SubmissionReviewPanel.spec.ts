import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import SubmissionReviewPanel from '@/components/SubmissionReviewPanel.vue'
import {
  fetchRecognitionImage,
  fetchSubmissionFile,
  retryRecognition,
  verifySubmission,
} from '@/services/submissions'
import type { EnrolledStudent } from '@/types/enrollment'
import type { RecognitionEvidence, Submission } from '@/types/submission'

vi.mock('@/services/submissions', () => ({
  fetchRecognitionImage: vi.fn<typeof fetchRecognitionImage>(),
  fetchSubmissionFile: vi.fn<typeof fetchSubmissionFile>(),
  retryRecognition: vi.fn<typeof retryRecognition>(),
  verifySubmission: vi.fn<typeof verifySubmission>(),
}))

const mocked = {
  image: vi.mocked(fetchRecognitionImage),
  file: vi.mocked(fetchSubmissionFile),
  retry: vi.mocked(retryRecognition),
  verify: vi.mocked(verifySubmission),
}

const student = (enrollment: number, number: string, name: string): EnrolledStudent => ({
  id: enrollment,
  course: 1,
  student: enrollment,
  student_number: number,
  first_name: name,
  last_name: 'Test',
})

const students = [student(5, '07279432', 'Anna'), student(6, '35226455', 'Sipho')]

const recognition = (overrides: Partial<RecognitionEvidence> = {}): RecognitionEvidence => ({
  id: 1,
  method: 'ocr',
  outcome: 'matched',
  processing_version: 'ocr-1',
  raw_text: 'Student number: 0727 9432',
  raw_candidate: '07279432',
  raw_candidates: [],
  suggested_enrollment: 5,
  suggested_student_number: '07279432',
  confidence: 0.97,
  confidence_type: 'ocr_score',
  column_ambiguity: [],
  region_image_url: '/api/submissions/1/recognition-image/',
  quality_issues: [],
  error_type: '',
  created_at: '2026-10-01T20:00:00Z',
  ...overrides,
})

const submission = (overrides: Partial<Submission> = {}): Submission => ({
  id: 1,
  assessment: 3,
  version: 7,
  enrollment: 5,
  file: 'submissions/script.pdf',
  original_filename: 'script.pdf',
  status: 'matched',
  created_at: '2026-10-01T20:00:00Z',
  updated_at: '2026-10-01T20:00:00Z',
  recognition: recognition(),
  ...overrides,
})

const mountPanel = async (sub: Submission, hasNext = true) => {
  const wrapper = mount(SubmissionReviewPanel, {
    props: { submission: sub, students, hasNext },
  })
  await flushPromises()
  return wrapper
}

const createObjectURL = vi.fn<(blob: Blob) => string>((blob) => `blob:${blob.type}`)
const revokeObjectURL = vi.fn<(url: string) => void>()

describe('SubmissionReviewPanel', () => {
  it('blocks verification of processing or unresolved QR scripts, including keyboard confirmation', async () => {
    const wrapper = await mountPanel(submission({ qr_review_issues: ['duplicate:P1'] }))
    expect(wrapper.get('[data-test="confirm"]').attributes('disabled')).toBeDefined()
    await wrapper.trigger('keydown', { key: 'Enter', ctrlKey: true })
    expect(mocked.verify).not.toHaveBeenCalled()
    wrapper.unmount()
    const processing = await mountPanel(submission({ status: 'processing' }))
    expect(processing.get('[data-test="confirm"]').attributes('disabled')).toBeDefined()
    processing.unmount()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
    mocked.image.mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the evidence and preselects a confident match', async () => {
    const wrapper = await mountPanel(submission())

    expect(wrapper.get('[data-test="headline"]').text()).toContain('Read 07279432')
    expect(wrapper.find('img').attributes('src')).toBe('blob:image/png')
    expect((wrapper.get('[data-test="student-select"]').element as HTMLSelectElement).value).toBe(
      '5',
    )
    expect(wrapper.get('[data-test="confirm"]').attributes('disabled')).toBeUndefined()
  })

  it('makes the lecturer choose when the reading is uncertain', async () => {
    const wrapper = await mountPanel(
      submission({
        status: 'needs_verification',
        enrollment: null,
        // A suggestion exists, but the reading is uncertain: never preselect it.
        recognition: recognition({ outcome: 'no_match', suggested_enrollment: 5 }),
      }),
    )

    // Index 0 is the "Select student" placeholder: nobody chosen.
    expect(
      (wrapper.get('[data-test="student-select"]').element as HTMLSelectElement).selectedIndex,
    ).toBe(0)
    expect(wrapper.get('[data-test="confirm"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('choose the student yourself')

    await wrapper.get('[data-test="student-select"]').setValue('6')

    expect(wrapper.get('[data-test="confirm"]').attributes('disabled')).toBeUndefined()
  })

  it('highlights ambiguous bubble columns (planned format)', async () => {
    const wrapper = await mountPanel(
      submission({
        status: 'needs_verification',
        recognition: recognition({
          method: 'bubble',
          outcome: 'no_match',
          raw_candidate: '3727X432',
          confidence_type: 'bubble_margin',
          column_ambiguity: [{ column: 4, reason: 'multiple' }],
        }),
      }),
    )

    expect(wrapper.findAll('.uncertain').map((span) => span.text())).toEqual(['X'])
    expect(wrapper.text()).toContain('Column 5: more than one bubble is filled.')
  })

  it('confirms the selected student and reports it', async () => {
    const verified = submission({ status: 'verified' })
    mocked.verify.mockResolvedValue(verified)
    const wrapper = await mountPanel(submission())

    await wrapper.get('[data-test="confirm"]').trigger('click')
    await flushPromises()

    expect(mocked.verify).toHaveBeenCalledWith(1, 5, 7)
    expect(wrapper.emitted('verified')).toEqual([[verified]])
  })

  it('confirms with Ctrl+Enter', async () => {
    mocked.verify.mockResolvedValue(submission({ status: 'verified' }))
    const wrapper = await mountPanel(submission())

    await wrapper.get('section').trigger('keydown', { key: 'Enter', ctrlKey: true })
    await flushPromises()

    expect(mocked.verify).toHaveBeenCalledTimes(1)
  })

  it('explains a stale or concurrent change instead of failing silently', async () => {
    mocked.verify.mockRejectedValue({
      response: {
        status: 400,
        data: { detail: 'The submission has changed. Reload and try again.' },
      },
    })
    const wrapper = await mountPanel(submission())

    await wrapper.get('[data-test="confirm"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('The submission has changed. Reload and try again.')
    expect(wrapper.text()).toContain('reload the queue')
    expect(wrapper.emitted('verified')).toBeUndefined()
  })

  it('handles missing previews', async () => {
    mocked.file.mockRejectedValue({ response: { status: 404 } })
    const wrapper = await mountPanel(
      submission({ recognition: recognition({ region_image_url: null }) }),
    )

    expect(mocked.image).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="crop-missing"]').exists()).toBe(true)

    await wrapper.get('[data-test="show-script"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="script-missing"]').exists()).toBe(true)
  })

  it('offers retry only where the backend allows it', async () => {
    const matched = await mountPanel(submission())
    expect(matched.find('[data-test="retry"]').exists()).toBe(false)

    const retried = submission({ status: 'processing' })
    mocked.retry.mockResolvedValue(retried)
    const failed = await mountPanel(
      submission({ status: 'recognition_failed', recognition: recognition({ outcome: 'error' }) }),
    )
    await failed.get('[data-test="retry"]').trigger('click')
    await flushPromises()

    expect(mocked.retry).toHaveBeenCalledWith(1, 7)
    expect(failed.emitted('retried')).toEqual([[retried]])
  })

  it('releases image memory when closed', async () => {
    const wrapper = await mountPanel(submission())

    wrapper.unmount()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image/png')
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AssessmentDetailView from '@/views/AssessmentDetailView.vue'
import { fetchAssessment } from '@/services/assessments'
import { fetchCourseGradebook } from '@/services/gradebook'
import {
  fetchAssessmentResults,
  createAssessmentResult,
  updateAssessmentResult,
} from '@/services/results'
import {
  fetchSubmissions,
  fetchRecognitionMethods,
  markSubmission,
  uploadSubmission,
  verifySubmission,
} from '@/services/submissions'
import type { Submission } from '@/types/submission'

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ params: { id: '7' } }),
}))
vi.mock('@/services/assessments', () => ({ fetchAssessment: vi.fn<typeof fetchAssessment>() }))
vi.mock('@/services/gradebook', () => ({
  fetchCourseGradebook: vi.fn<typeof fetchCourseGradebook>(),
}))
vi.mock('@/services/results', () => ({
  fetchAssessmentResults: vi.fn<typeof fetchAssessmentResults>(),
  createAssessmentResult: vi.fn<typeof createAssessmentResult>(),
  updateAssessmentResult: vi.fn<typeof updateAssessmentResult>(),
}))
vi.mock('@/services/submissions', () => ({
  fetchRecognitionMethods: vi
    .fn<typeof fetchRecognitionMethods>()
    .mockResolvedValue({ methods: [], bubble_templates: [] }),
  fetchSubmissions: vi.fn<typeof fetchSubmissions>(),
  markSubmission: vi.fn<typeof markSubmission>(),
  uploadSubmission: vi.fn<typeof uploadSubmission>(),
  verifySubmission: vi.fn<typeof verifySubmission>(),
}))

const submission = (assessment = 7, status: Submission['status'] = 'processing'): Submission => ({
  id: assessment,
  assessment,
  enrollment: null,
  file: '',
  original_filename: `script-${assessment}.pdf`,
  status,
  created_at: '',
  updated_at: '',
})
const fetch = vi.mocked(fetchSubmissions)
const mounted: ReturnType<typeof mount>[] = []
const mountPage = async () => {
  const wrapper = mount(AssessmentDetailView, {
    global: { stubs: { RouterLink: true, ResultEmailPanel: true } },
  })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

describe('assessment polling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    vi.mocked(fetchRecognitionMethods).mockResolvedValue({
      methods: [
        { value: 'ocr', label: 'OCR' },
        { value: 'bubble', label: 'Filled bubbles' },
      ],
      bubble_templates: [],
    })
    vi.mocked(fetchAssessment).mockResolvedValue({
      id: 7,
      course: 1,
      name: 'Assessment',
      max_mark: 100,
      weight: 1,
      date: '',
      created_at: '',
      updated_at: '',
    })
    vi.mocked(fetchCourseGradebook).mockResolvedValue({ course: 1, students: [] })
    vi.mocked(fetchAssessmentResults).mockResolvedValue([])
    fetch.mockResolvedValue([submission()])
  })
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
    vi.useRealTimers()
  })

  it('captures the selected method per queued file, even if the selector changes', async () => {
    fetch.mockResolvedValue([])
    const wrapper = await mountPage()
    const selector = wrapper.get('.recognition-method-label select')
    await selector.setValue('bubble')
    const input = wrapper.get('input[type="file"]')
    const file = new File(['synthetic'], 'bubbles.pdf', { type: 'application/pdf' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await selector.setValue('ocr')
    vi.mocked(uploadSubmission).mockResolvedValue(submission(7, 'needs_verification'))
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Upload queue')!
      .trigger('click')
    await flushPromises()
    expect(uploadSubmission).toHaveBeenCalledWith(7, file, 'bubble')
  })

  it('does not offer bubble processing when the backend has no method capability', async () => {
    fetch.mockResolvedValue([])
    vi.mocked(fetchRecognitionMethods).mockRejectedValue(new Error('not deployed'))
    const wrapper = await mountPage()
    expect(wrapper.get('option[value="bubble"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Bubble recognition is unavailable')
  })

  it('loads once and scopes every poll, even if the backend returns other assessments', async () => {
    fetch.mockResolvedValueOnce([submission(), submission(8)])
    fetch.mockResolvedValueOnce([submission(7, 'matched'), submission(8)])
    const wrapper = await mountPage()
    expect(fetchAssessment).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls.map(([filters]) => filters)).toEqual([
      { assessment: 7 },
      { assessment: 7 },
    ])
    expect(wrapper.text()).toContain('script-7.pdf')
    expect(wrapper.text()).not.toContain('script-8.pdf')
    await vi.advanceTimersByTimeAsync(9000)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('waits for a slow poll to finish before scheduling the next one', async () => {
    let finish!: (value: Submission[]) => void
    fetch.mockResolvedValueOnce([submission()])
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    await mountPage()
    await vi.advanceTimersByTimeAsync(9000)
    expect(fetch).toHaveBeenCalledTimes(2)
    finish([submission()])
    await flushPromises()
    await vi.advanceTimersByTimeAsync(2999)
    expect(fetch).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('retries a failed poll without overlapping requests', async () => {
    fetch.mockResolvedValueOnce([submission()]).mockRejectedValueOnce(new Error('offline'))
    await mountPage()
    await vi.advanceTimersByTimeAsync(3000)
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(fetch.mock.calls[2]?.[0]).toEqual({ assessment: 7 })
  })

  it('aborts an in-flight poll and ignores its late response after leaving the page', async () => {
    let finish!: (value: Submission[]) => void
    fetch.mockResolvedValueOnce([submission()])
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const wrapper = await mountPage()
    const signal = fetch.mock.calls[1]?.[1]
    expect(signal?.aborted).toBe(false)
    wrapper.unmount()
    expect(signal?.aborted).toBe(true)
    finish([submission()])
    await flushPromises()
    await vi.advanceTimersByTimeAsync(9000)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not start polling when the initial load completes after leaving the page', async () => {
    let finish!: (value: Submission[]) => void
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const wrapper = await mountPage()
    wrapper.unmount()
    finish([submission()])
    await flushPromises()
    await vi.advanceTimersByTimeAsync(9000)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

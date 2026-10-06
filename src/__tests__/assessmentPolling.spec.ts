import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AssessmentDetailView from '@/views/AssessmentDetailView.vue'
import { fetchAssessment, updateAssessmentQR } from '@/services/assessments'
import { fetchCourseEnrollments } from '@/services/enrollments'
import {
  fetchSubmissions,
  fetchRecognitionMethods,
  emailSubmission,
  uploadSubmission,
  verifySubmission,
} from '@/services/submissions'
import type { Submission } from '@/types/submission'

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ params: { id: '7' } }),
}))
vi.mock('@/services/assessments', () => ({
  fetchAssessment: vi.fn<typeof fetchAssessment>(),
  updateAssessmentQR: vi.fn<typeof updateAssessmentQR>(),
}))
vi.mock('@/services/enrollments', () => ({
  fetchCourseEnrollments: vi.fn<typeof fetchCourseEnrollments>(),
}))
vi.mock('@/services/submissions', () => ({
  fetchRecognitionMethods: vi
    .fn<typeof fetchRecognitionMethods>()
    .mockResolvedValue({ methods: [], bubble_templates: [] }),
  fetchSubmissions: vi.fn<typeof fetchSubmissions>(),
  emailSubmission: vi.fn<typeof emailSubmission>(),
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
    global: { stubs: { RouterLink: true, ScriptEmailPanel: true } },
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
      date: '',
      created_at: '',
      updated_at: '',
    })
    vi.mocked(fetchCourseEnrollments).mockResolvedValue([])
    fetch.mockResolvedValue([submission()])
  })
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
    vi.useRealTimers()
  })

  it('emails a verified script without requesting or entering a numeric mark', async () => {
    fetch.mockResolvedValue([{ ...submission(7, 'verified'), enrollment: 5 }])
    vi.mocked(fetchCourseEnrollments).mockResolvedValue([
      {
        id: 5,
        course: 1,
        student: 3,
        student_number: '00123456',
        first_name: 'Ava',
        last_name: 'Example',
      },
    ])
    vi.mocked(emailSubmission).mockResolvedValue({ id: 10, status: 'queued' } as Awaited<
      ReturnType<typeof emailSubmission>
    >)
    const wrapper = await mountPage()
    expect(wrapper.findAll('input[type="number"]')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('Maximum mark')
    expect(wrapper.text()).not.toContain('Results')
    expect(wrapper.text()).toContain('00123456')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Email script')!
      .trigger('click')
    await flushPromises()
    expect(emailSubmission).toHaveBeenCalledWith(7)
    expect(wrapper.text()).toContain('Script email is scheduled')
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

  it('offers QR intake configuration only when supported and saves expected printed labels before upload', async () => {
    fetch.mockResolvedValue([])
    const legacy = await mountPage()
    expect(legacy.text()).not.toContain('QR page intake')
    legacy.unmount()
    const assessment = {
      id: 7,
      course: 1,
      name: 'Synthetic exam',
      date: '',
      created_at: '',
      updated_at: '',
      expected_qr_page_labels: [] as string[],
      qr_test: '',
    }
    vi.mocked(fetchAssessment).mockResolvedValue(assessment)
    vi.mocked(updateAssessmentQR).mockResolvedValue({
      ...assessment,
      expected_qr_page_labels: ['P1', 'P3'],
      qr_test: 'KT2',
    })
    const wrapper = await mountPage()
    const firstFile = wrapper.get('input[type="file"]')
    Object.defineProperty(firstFile.element, 'files', {
      value: [new File(['synthetic'], 'qr.pdf', { type: 'application/pdf' })],
      configurable: true,
    })
    await firstFile.trigger('change')
    const upload = wrapper.findAll('button').find((item) => item.text() === 'Upload queue')!
    expect(upload.attributes('disabled')).toBeDefined()
    await wrapper
      .findAll('select')
      .find((item) => item.text().includes('Choose the script layout'))!
      .setValue('qr')
    expect(upload.attributes('disabled')).toBeDefined()
    await wrapper.get('input[placeholder="P1, P3"]').setValue('P1, P3')
    await wrapper.get('input[placeholder="KT2"]').setValue('KT2')
    await wrapper
      .findAll('button')
      .find((item) => item.text() === 'Save QR configuration')!
      .trigger('submit')
    await flushPromises()
    expect(updateAssessmentQR).toHaveBeenCalledWith(7, ['P1', 'P3'], 'KT2')
    expect(wrapper.text()).toContain('QR intake configuration saved')
    expect(upload.attributes('disabled')).toBeUndefined()
  })

  it('replaces the assessment snapshot after a two-group upload without duplicating an existing group', async () => {
    const group = (id: number, version: number): Submission => ({
      ...submission(7, 'needs_verification'),
      id,
      version,
      original_filename: `group-${id}.pdf`,
      qr_metadata: {
        module: 'CMPG211',
        date: '20230412',
        test: 'KT2',
        test_number: id === 7 ? '#1' : '#2',
      },
      grouped_pages: ['P3', 'P1'].map((label, index) => ({
        id: id * 10 + index,
        page_label: label,
        source_page: index + 1,
        qr_fields: {
          module: 'CMPG211',
          date: '20230412',
          test: 'KT2',
          page_label: label,
          test_number: id === 7 ? '#1' : '#2',
        },
        qr_status: 'readable',
        excluded: false,
        recognition_outcome: 'no_candidate',
        quality_issues: [],
        suggested_enrollment: null,
        linked_enrollment: null,
        upload_id: 2,
        download_url: '/api/private/',
        source_download_url: '/api/private/',
        review_history: [],
      })),
    })
    fetch
      .mockResolvedValueOnce([group(7, 1)])
      .mockResolvedValue([group(7, 2), group(20, 1), submission(8, 'matched')])
    vi.mocked(uploadSubmission).mockResolvedValue({ ...group(7, 2), upload_group_ids: [7, 20] })
    const wrapper = await mountPage()
    const input = wrapper.get('input[type="file"]')
    const file = new File(['synthetic QR pages'], 'two-groups.pdf', { type: 'application/pdf' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await wrapper
      .findAll('button')
      .find((item) => item.text() === 'Upload queue')!
      .trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.glass-table tbody tr')).toHaveLength(2)
    expect(wrapper.findAll('.glass-table tbody tr')[0]!.text()).toContain('Paper #1 · P1, P3')
    expect(wrapper.findAll('.glass-table tbody tr')[1]!.text()).toContain('Paper #2 · P1, P3')
    expect(wrapper.findAll('.qr-page h4').map((heading) => heading.text().slice(0, 2))).toEqual([
      'P1',
      'P3',
      'P1',
      'P3',
    ])
    expect(wrapper.text()).toContain('group-20.pdf')
    expect(wrapper.text()).not.toContain('script-8.pdf')
    expect(fetch.mock.calls.every(([filter]) => filter?.assessment === 7)).toBe(true)
  })

  it('refreshes QR evidence when the version changes while status stays processing', async () => {
    fetch
      .mockResolvedValueOnce([{ ...submission(), version: 1 }])
      .mockResolvedValue([
        { ...submission(), version: 2, qr_review_issues: ['missing:P3'], updated_at: 'new' },
      ])
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('missing:P3')
    expect(wrapper.text()).toContain('Recognition in progress')
  })

  it('ignores an older in-flight poll after a grouped upload refreshes the assessment', async () => {
    let finish!: (items: Submission[]) => void
    fetch
      .mockResolvedValueOnce([{ ...submission(), version: 1 }])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve
          }),
      )
      .mockResolvedValue([
        { ...submission(), version: 2 },
        { ...submission(7, 'needs_verification'), id: 20, original_filename: 'new-group.pdf' },
      ])
    vi.mocked(uploadSubmission).mockResolvedValue({
      ...submission(),
      version: 2,
      upload_group_ids: [7, 20],
    })
    const wrapper = await mountPage()
    const input = wrapper.get('input[type="file"]')
    const file = new File(['synthetic'], 'additional-pages.pdf', { type: 'application/pdf' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change')
    await wrapper
      .findAll('button')
      .find((item) => item.text() === 'Upload queue')!
      .trigger('click')
    await flushPromises()
    finish([{ ...submission(7, 'matched'), version: 1 }])
    await flushPromises()
    expect(wrapper.findAll('.glass-table tbody tr')).toHaveLength(2)
    expect(wrapper.text()).toContain('new-group.pdf')
    expect(wrapper.text()).toContain('Recognition in progress')
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

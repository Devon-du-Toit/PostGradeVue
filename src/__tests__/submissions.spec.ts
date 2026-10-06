import { beforeEach, describe, expect, it, vi } from 'vitest'

import api from '@/services/api'
import {
  fetchSubmissions,
  fetchRecognitionMethods,
  fetchVerificationQueue,
  emailSubmission,
  UPLOAD_TIMEOUT_MS,
  uploadSubmission,
  verifySubmission,
} from '@/services/submissions'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn<typeof api.get>(),
    post: vi.fn<typeof api.post>(),
  },
}))

const mockedApi = vi.mocked(api)

describe('submission service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const page = <T>(results: T[]) => ({
    data: { count: results.length, next: null, previous: null, results },
  })

  it("fetches only the requested assessment's submissions", async () => {
    mockedApi.get.mockResolvedValueOnce(page([{ id: 1 }]))

    const result = await fetchSubmissions({ assessment: 7 })

    expect(mockedApi.get).toHaveBeenCalledWith('submissions/', {
      params: { assessment: 7, page: 1, page_size: 100 },
      signal: undefined,
    })
    expect(result).toEqual([{ id: 1 }])
  })

  it('fetches the verification queue', async () => {
    mockedApi.get.mockResolvedValueOnce(page([{ id: 2 }]))

    const result = await fetchVerificationQueue()

    expect(mockedApi.get).toHaveBeenCalledWith('submissions/verification-queue/', {
      params: { page: 1, page_size: 100 },
      signal: undefined,
    })
    expect(result).toEqual([{ id: 2 }])
  })

  it('passes the assessment polling abort signal through to the API', async () => {
    mockedApi.get.mockResolvedValueOnce(page([]))
    const controller = new AbortController()

    await fetchSubmissions({ assessment: 7 }, controller.signal)

    expect(mockedApi.get).toHaveBeenCalledWith('submissions/', {
      params: { assessment: 7, page: 1, page_size: 100 },
      signal: controller.signal,
    })
  })

  it('passes verification queue filters to the API', async () => {
    mockedApi.get.mockResolvedValueOnce(page([]))
    const controller = new AbortController()

    await fetchVerificationQueue({ search: 'sipho', status: 'matched' }, controller.signal)

    expect(mockedApi.get).toHaveBeenCalledWith('submissions/verification-queue/', {
      params: { search: 'sipho', status: 'matched', page: 1, page_size: 100 },
      signal: controller.signal,
    })
  })

  it('uploads a submission with assessment and file', async () => {
    const file = new File(['example'], 'submission.pdf', { type: 'application/pdf' })
    mockedApi.post.mockResolvedValueOnce({ data: { id: 3 } })

    await uploadSubmission(12, file)

    expect(mockedApi.post).toHaveBeenCalledTimes(1)
    const [url, formData, config] = mockedApi.post.mock.calls[0]!
    expect(url).toBe('submissions/')
    expect(config).toEqual({ timeout: UPLOAD_TIMEOUT_MS })
    expect(formData).toBeInstanceOf(FormData)
    expect((formData as FormData).get('assessment')).toBe('12')
    expect((formData as FormData).get('file')).toBe(file)
    expect((formData as FormData).get('recognition_method')).toBe('ocr')
  })

  it('uploads bubbles with an explicit method instead of OCR', async () => {
    const file = new File(['example'], 'bubbles.pdf', { type: 'application/pdf' })
    mockedApi.post.mockResolvedValueOnce({ data: { id: 3 } })
    await uploadSubmission(12, file, 'bubble')
    expect((mockedApi.post.mock.calls[0]![1] as FormData).get('recognition_method')).toBe('bubble')
  })

  it('checks advertised recognition methods before offering bubbles', async () => {
    const methods = { methods: [{ value: 'ocr' }, { value: 'bubble' }], bubble_templates: [] }
    mockedApi.get.mockResolvedValueOnce({ data: methods })
    expect(await fetchRecognitionMethods()).toEqual(methods)
    expect(mockedApi.get).toHaveBeenCalledWith('submissions/recognition-methods/')
  })

  it('verifies a submission', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { id: 4, status: 'verified' } })

    await verifySubmission(4, 9, 3)

    expect(mockedApi.post).toHaveBeenCalledWith('submissions/4/verify/', {
      enrollment: 9,
      version: 3,
    })
  })

  it('requests email delivery of a verified script', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: { id: 5, submission: 7 } })

    await emailSubmission(7)

    expect(mockedApi.post).toHaveBeenCalledWith('submissions/7/email/')
  })
})

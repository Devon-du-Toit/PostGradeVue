import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '@/services/api'
import {
  approveAssessmentEmails,
  approveScriptEmail,
  fetchScriptEmails,
  retryScriptEmail,
} from '@/services/scriptEmails'

vi.mock('@/services/api', () => ({
  default: { get: vi.fn<typeof api.get>(), post: vi.fn<typeof api.post>() },
}))
const mocked = vi.mocked(api)

describe('result email API', () => {
  beforeEach(() => vi.clearAllMocks())
  it('loads the assessment outbox through pagination and supports cancellation', async () => {
    mocked.get.mockResolvedValueOnce({ data: { count: 101, next: 'next', results: [{ id: 11 }] } })
    mocked.get.mockResolvedValueOnce({ data: { count: 101, next: null, results: [{ id: 12 }] } })
    const controller = new AbortController()
    expect(await fetchScriptEmails(7, controller.signal)).toEqual([{ id: 11 }, { id: 12 }])
    expect(mocked.get).toHaveBeenNthCalledWith(2, 'assessments/7/script-emails/', {
      params: { page: 2, page_size: 100 },
      signal: controller.signal,
    })
  })
  it('approves an email by outbox ID rather than result ID', async () => {
    mocked.post.mockResolvedValueOnce({ data: { id: 11, submission: 4, status: 'queued' } })
    expect(await approveScriptEmail(11)).toEqual({ id: 11, submission: 4, status: 'queued' })
    expect(mocked.post).toHaveBeenCalledWith('script-emails/11/approve/')
  })
  it('approves current awaiting emails for the assessment', async () => {
    mocked.post.mockResolvedValueOnce({ data: { approved: 3 } })
    expect(await approveAssessmentEmails(7)).toEqual({ approved: 3 })
    expect(mocked.post).toHaveBeenCalledWith('assessments/7/script-emails/approve/')
  })
  it('does not claim duplicate confirmation for an ordinary retry', async () => {
    mocked.post.mockResolvedValueOnce({ data: { id: 11 } })
    await retryScriptEmail(11)
    expect(mocked.post).toHaveBeenCalledWith('script-emails/11/retry/', {
      confirm_duplicate: false,
    })
  })
  it('sends explicit confirmation only for an authorized resend', async () => {
    mocked.post.mockResolvedValueOnce({ data: { id: 11 } })
    await retryScriptEmail(11, true)
    expect(mocked.post).toHaveBeenCalledWith('script-emails/11/retry/', { confirm_duplicate: true })
  })
})

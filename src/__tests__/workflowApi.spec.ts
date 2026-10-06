import { describe, expect, it, vi } from 'vitest'
import api from '@/services/api'
import {
  fetchSubmissionPage,
  fetchSubmissionSource,
  fetchSubmissionRevision,
  fetchHistoryScript,
  reviewSubmissionPage,
  archiveScript,
  fetchScriptHistory,
} from '@/services/submissions'
import {
  fetchEnrollmentHistory,
  withdrawEnrollment,
  restoreEnrollment,
} from '@/services/enrollments'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn<typeof api.get>(),
    post: vi.fn<typeof api.post>(),
    delete: vi.fn<typeof api.delete>(),
  },
}))

describe('private page/history and class membership API contracts', () => {
  it('fetches protected originals using the authenticated blob client rather than public media URLs', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: new Blob(['original']) })
    await fetchSubmissionPage(10, 20)
    expect(api.get).toHaveBeenLastCalledWith('submissions/10/pages/20/file/', {
      responseType: 'blob',
    })
    await fetchSubmissionSource(10, 30)
    expect(api.get).toHaveBeenLastCalledWith('submissions/10/uploads/30/file/', {
      responseType: 'blob',
    })
    await fetchSubmissionRevision(10, 40)
    expect(api.get).toHaveBeenLastCalledWith('submissions/10/revisions/40/file/', {
      responseType: 'blob',
    })
    await fetchHistoryScript(10)
    expect(api.get).toHaveBeenLastCalledWith('submissions/10/history-file/', {
      responseType: 'blob',
    })
  })

  it('scopes paginated history to the selected assessment or class including withdrawn memberships', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { count: 0, next: null, previous: null, results: [] },
    })
    await fetchScriptHistory(7)
    expect(api.get).toHaveBeenLastCalledWith('submissions/history/', {
      params: { assessment: 7, page: 1, page_size: 100 },
      signal: undefined,
    })
    await fetchEnrollmentHistory(2)
    expect(api.get).toHaveBeenLastCalledWith('students/enrollments/', {
      params: { course: 2, include_withdrawn: 'true', page: 1, page_size: 100 },
      signal: undefined,
    })
  })

  it('withdraws/restores the enrollment ID with a reason/version, without deleting a global student', async () => {
    await withdrawEnrollment(99, 4, 'Left this class')
    expect(api.delete).toHaveBeenLastCalledWith('students/enrollments/99/', {
      data: { version: 4, reason: 'Left this class' },
    })
    await restoreEnrollment(99, 5, 'Rejoined')
    expect(api.post).toHaveBeenLastCalledWith('students/enrollments/99/restore/', {
      version: 5,
      reason: 'Rejoined',
    })
  })

  it('sends reviewed grouping versions and soft-archive reasons', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} })
    const review = {
      version: 2,
      reason: 'Printed evidence checked',
      destination_submission: 11,
      destination_version: 3,
      exclude: false,
    }
    await reviewSubmissionPage(10, 20, review)
    expect(api.post).toHaveBeenLastCalledWith('submissions/10/pages/20/review/', review)
    await archiveScript(10, 4, 'Retain obsolete scan')
    expect(api.delete).toHaveBeenLastCalledWith('submissions/10/', {
      data: { version: 4, reason: 'Retain obsolete scan' },
    })
  })
})

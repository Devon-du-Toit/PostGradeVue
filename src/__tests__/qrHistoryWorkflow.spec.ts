import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import QRPageReviewPanel from '@/components/QRPageReviewPanel.vue'
import CourseMembershipPanel from '@/components/CourseMembershipPanel.vue'
import ScriptHistoryPanel from '@/components/ScriptHistoryPanel.vue'
import ScriptArchiveControl from '@/components/ScriptArchiveControl.vue'
import * as scripts from '@/services/submissions'
import * as memberships from '@/services/enrollments'
import type { Submission, GroupedPage } from '@/types/submission'

vi.mock('@/services/submissions', () => ({
  fetchSubmissions: vi.fn<typeof scripts.fetchSubmissions>(),
  fetchSubmissionPage: vi.fn<typeof scripts.fetchSubmissionPage>(),
  fetchSubmissionSource: vi.fn<typeof scripts.fetchSubmissionSource>(),
  reviewSubmissionPage: vi.fn<typeof scripts.reviewSubmissionPage>(),
  fetchScriptHistory: vi.fn<typeof scripts.fetchScriptHistory>(),
  fetchSubmissionFile: vi.fn<typeof scripts.fetchSubmissionFile>(),
  fetchHistoryScript: vi.fn<typeof scripts.fetchHistoryScript>(),
  fetchSubmissionRevision: vi.fn<typeof scripts.fetchSubmissionRevision>(),
  archiveScript: vi.fn<typeof scripts.archiveScript>(),
}))
vi.mock('@/services/enrollments', () => ({
  fetchEnrollmentHistory: vi.fn<typeof memberships.fetchEnrollmentHistory>(),
  withdrawEnrollment: vi.fn<typeof memberships.withdrawEnrollment>(),
  restoreEnrollment: vi.fn<typeof memberships.restoreEnrollment>(),
}))

const page: GroupedPage = {
  id: 11,
  page_label: 'P3',
  source_page: 2,
  qr_fields: { module: 'SYNTH', page_label: 'P3' },
  qr_status: 'readable',
  excluded: false,
  recognition_outcome: 'matched',
  quality_issues: [],
  suggested_enrollment: 99,
  linked_enrollment: null,
  upload_id: 5,
  download_url: '/api/private/',
  source_download_url: '/api/private/',
  review_history: [],
}
const script = (id = 1): Submission => ({
  id,
  assessment: 7,
  version: 3,
  enrollment: null,
  file: '',
  original_filename: `synthetic-${id}.pdf`,
  status: 'needs_verification',
  created_at: '',
  updated_at: '',
  grouped_pages: [page],
  qr_review_issues: ['duplicate:P3'],
  qr_group_status: 'manual_review',
  archived_at: null,
})
const student = {
  id: 99,
  student: 4,
  course: 2,
  student_number: '00123456',
  first_name: 'Synthetic',
  last_name: 'Example',
  version: 7,
  withdrawn_at: null as string | null,
}
const button = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll('button').find((item) => item.text() === text)!

describe('QR review and retained history', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    URL.createObjectURL = vi.fn<() => string>().mockReturnValue('blob:synthetic')
    URL.revokeObjectURL = vi.fn<(url: string) => void>()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  it('uses captured source and destination versions, a reason and explicit grouping repair', async () => {
    const destination = { ...script(2), version: 8 }
    const wrapper = mount(QRPageReviewPanel, {
      props: { submission: script(), students: [student], groups: [script(), destination] },
    })
    expect(wrapper.text()).toContain('duplicate:P3')
    await button(wrapper, 'Review page').trigger('click')
    const form = wrapper.get('form')
    await form.get('input[type="text"], input:not([type])').setValue('SYNTH,20261007,KT2,P3,#2')
    const selects = form.findAll('select')
    await selects[0]!.setValue('dismiss')
    await selects[1]!.setValue('2')
    await form.get('textarea').setValue('Lecturer checked printed QR and student evidence')
    await wrapper.setProps({
      submission: { ...script(), version: 4 },
      groups: [script(), { ...destination, version: 9 }],
    })
    vi.mocked(scripts.reviewSubmissionPage).mockRejectedValueOnce({
      response: {
        status: 409,
        data: { detail: 'This submission has changed. Reload and try again.' },
      },
    })
    await form.trigger('submit')
    await flushPromises()
    expect(scripts.reviewSubmissionPage).toHaveBeenCalledWith(1, 11, {
      version: 3,
      reason: 'Lecturer checked printed QR and student evidence',
      exclude: false,
      qr_value: 'SYNTH,20261007,KT2,P3,#2',
      reviewed_enrollment: null,
      destination_submission: 2,
      destination_version: 8,
    })
    expect(wrapper.text()).toContain('This submission has changed')
    expect(wrapper.emitted('updated')).toBeUndefined()
    wrapper.unmount()
  })

  it('downloads original pages and source evidence through authenticated blob services', async () => {
    vi.mocked(scripts.fetchSubmissionPage).mockResolvedValue(
      new Blob(['page'], { type: 'application/pdf' }),
    )
    vi.mocked(scripts.fetchSubmissionSource).mockResolvedValue(
      new Blob(['source'], { type: 'application/pdf' }),
    )
    const wrapper = mount(QRPageReviewPanel, {
      props: { submission: script(), students: [], readonly: true },
    })
    expect(wrapper.find('a[href="/api/private/"]').exists()).toBe(false)
    expect(wrapper.findAll('button').some((item) => item.text() === 'Review page')).toBe(false)
    await button(wrapper, 'Download original page').trigger('click')
    await button(wrapper, 'Download source upload').trigger('click')
    await flushPromises()
    expect(scripts.fetchSubmissionPage).toHaveBeenCalledWith(1, 11)
    expect(scripts.fetchSubmissionSource).toHaveBeenCalledWith(1, 5)
    wrapper.unmount()
  })

  it('withdraws only a class membership and restores it with the latest version', async () => {
    vi.mocked(memberships.fetchEnrollmentHistory)
      .mockResolvedValueOnce([student])
      .mockResolvedValue([{ ...student, version: 8, withdrawn_at: '2026-10-07' }])
    const wrapper = mount(CourseMembershipPanel, { props: { courseId: 2, refreshKey: 0 } })
    await flushPromises()
    expect(memberships.fetchEnrollmentHistory).toHaveBeenCalledWith(2)
    await button(wrapper, 'Withdraw from class').trigger('click')
    await wrapper.get('textarea').setValue('Student withdrew from this class')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(memberships.withdrawEnrollment).toHaveBeenCalledWith(
      99,
      7,
      'Student withdrew from this class',
    )
    expect(wrapper.text()).toContain('Other classes and the global student record remain unchanged')
    await button(wrapper, 'Restore membership').trigger('click')
    await wrapper.get('textarea').setValue('Student rejoined this class')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(memberships.restoreEnrollment).toHaveBeenCalledWith(99, 8, 'Student rejoined this class')
    wrapper.unmount()
  })

  it('keeps history and original revisions read-only without delivery or verification actions', async () => {
    const historical = {
      ...script(),
      archived_at: '2026-10-07',
      student_identity: {
        student_number: '00123456',
        first_name: 'Synthetic',
        last_name: 'Example',
      },
      file_revisions: [
        {
          id: 20,
          version: 1,
          original_filename: 'original.pdf',
          download_url: '/api/private/',
          created_at: '2026-10-06',
        },
      ],
    }
    vi.mocked(scripts.fetchScriptHistory).mockResolvedValue([historical])
    vi.mocked(scripts.fetchSubmissionRevision).mockResolvedValue(
      new Blob(['original'], { type: 'application/pdf' }),
    )
    vi.mocked(scripts.fetchHistoryScript).mockResolvedValue(
      new Blob(['canonical original'], { type: 'application/pdf' }),
    )
    const wrapper = mount(ScriptHistoryPanel, { props: { assessmentId: 7, refreshKey: 0 } })
    await button(wrapper, 'View script history').trigger('click')
    await flushPromises()
    expect(scripts.fetchScriptHistory).toHaveBeenCalledWith(7)
    expect(wrapper.text()).toContain('Archived 2026-10-07')
    expect(wrapper.text()).toContain('00123456 Synthetic Example')
    expect(
      wrapper
        .findAll('button')
        .some((item) => /^(Verify|Email|Review page|Archive script)/.test(item.text())),
    ).toBe(false)
    await button(wrapper, 'Download revision').trigger('click')
    await flushPromises()
    expect(scripts.fetchSubmissionRevision).toHaveBeenCalledWith(1, 20)
    await button(wrapper, 'Download original script').trigger('click')
    await flushPromises()
    expect(scripts.fetchHistoryScript).toHaveBeenCalledWith(1)
    expect(scripts.fetchSubmissionFile).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('archives with the reviewed version and preserves errors for a stale form', async () => {
    const wrapper = mount(ScriptArchiveControl, { props: { submission: script() } })
    await button(wrapper, 'Archive script').trigger('click')
    await wrapper.get('input').setValue('Superseded scan retained for history')
    await wrapper.setProps({ submission: { ...script(), version: 4 } })
    vi.mocked(scripts.archiveScript).mockRejectedValueOnce({
      response: { data: { detail: 'Version conflict. Reload.' } },
    })
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(scripts.archiveScript).toHaveBeenCalledWith(1, 3, 'Superseded scan retained for history')
    expect(wrapper.text()).toContain('Version conflict. Reload.')
    wrapper.unmount()
  })
})

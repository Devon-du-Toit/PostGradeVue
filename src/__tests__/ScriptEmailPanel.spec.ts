import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ScriptEmailPanel from '@/components/ScriptEmailPanel.vue'
import {
  approveAssessmentEmails,
  approveScriptEmail,
  fetchScriptEmails,
  retryScriptEmail,
} from '@/services/scriptEmails'
import type { ScriptEmail } from '@/types/scriptEmail'

vi.mock('@/services/scriptEmails', () => ({
  fetchScriptEmails: vi.fn<typeof fetchScriptEmails>(),
  approveAssessmentEmails: vi.fn<typeof approveAssessmentEmails>(),
  approveScriptEmail: vi.fn<typeof approveScriptEmail>(),
  retryScriptEmail: vi.fn<typeof retryScriptEmail>(),
}))
const fetch = vi.mocked(fetchScriptEmails)
const record = (overrides: Partial<ScriptEmail> = {}): ScriptEmail => ({
  id: 11,
  submission: 4,
  attachment_filename: 'script.pdf',
  submission_version: 1,
  is_current: true,
  student_number: '00123456',
  recipient: 'student@example.invalid',
  subject: 'Stored subject',
  body: 'Your verified script is attached.',
  status: 'awaiting_approval',
  failure_reason: '',
  attempts: 0,
  max_attempts: 3,
  run_after: '',
  approved_at: null,
  sent_at: null,
  created_at: '',
  updated_at: '',
  ...overrides,
})
const mounted: ReturnType<typeof mount>[] = []
const mountPanel = async (records = [record()]) => {
  fetch.mockResolvedValue(records)
  const wrapper = mount(ScriptEmailPanel, { props: { assessmentId: 7, refreshKey: 0 } })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}
const button = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll('button').find((item) => item.text() === text)!

describe('ScriptEmailPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
    vi.useRealTimers()
  })

  it('previews the exact backend recipient, subject and body without invented addresses', async () => {
    const wrapper = await mountPanel([record({ recipient: '' })])
    expect(wrapper.text()).toContain('No email address')
    expect(wrapper.text()).toContain('Stored subject')
    expect(wrapper.find('pre').text()).toBe('Your verified script is attached.')
    expect(wrapper.text()).not.toContain('student@example.com')
    expect(wrapper.text()).toContain('Awaiting approval')
  })
  it('approves one email and refreshes the queued status', async () => {
    const wrapper = await mountPanel()
    vi.mocked(approveScriptEmail).mockResolvedValue(record({ status: 'queued' }))
    fetch.mockResolvedValue([record({ status: 'queued' })])
    await button(wrapper, 'Approve email').trigger('click')
    await flushPromises()
    expect(approveScriptEmail).toHaveBeenCalledWith(11)
    expect(wrapper.text()).toContain('Queued')
    expect(wrapper.text()).not.toContain('Sent:')
  })
  it('supports assessment-wide approval without assuming a release policy', async () => {
    const wrapper = await mountPanel()
    vi.mocked(approveAssessmentEmails).mockResolvedValue({ approved: 1 })
    await button(wrapper, 'Approve 1 current emails').trigger('click')
    await flushPromises()
    expect(approveAssessmentEmails).toHaveBeenCalledWith(7)
  })
  it('shows missing-address guidance and preserves backend retry errors', async () => {
    const wrapper = await mountPanel([
      record({ status: 'failed', recipient: '', failure_reason: 'missing_recipient' }),
    ])
    expect(wrapper.text()).toContain('Add the student’s address')
    vi.mocked(retryScriptEmail).mockRejectedValue({
      response: { data: { detail: 'The student has no email address.' } },
    })
    await button(wrapper, 'Retry failed email').trigger('click')
    await flushPromises()
    expect(retryScriptEmail).toHaveBeenCalledWith(11, false)
    expect(wrapper.get('[role="alert"]').text()).toContain('The student has no email address.')
  })
  it('requires deliberate duplicate confirmation only for uncertain delivery', async () => {
    const wrapper = await mountPanel([
      record({ status: 'failed', failure_reason: 'delivery_unknown' }),
    ])
    expect(button(wrapper, 'Confirm resend').attributes('disabled')).toBeDefined()
    expect(retryScriptEmail).not.toHaveBeenCalled()
    await wrapper.get('input[type="checkbox"]').setValue(true)
    vi.mocked(retryScriptEmail).mockResolvedValue(record({ status: 'queued' }))
    await button(wrapper, 'Confirm resend').trigger('click')
    await flushPromises()
    expect(retryScriptEmail).toHaveBeenCalledWith(11, true)
  })
  it('never offers approval or retry for sent, sending, queued or outdated records', async () => {
    const wrapper = await mountPanel([
      record({ status: 'sent' }),
      record({ id: 12, status: 'sending' }),
      record({ id: 13, status: 'queued' }),
      record({ id: 14, is_current: false, status: 'failed' }),
      record({ id: 15, is_current: false }),
    ])
    expect(wrapper.findAll('button').map((item) => item.text())).toEqual([
      'Refresh delivery status',
    ])
    expect(wrapper.text()).toContain('Previous script version')
  })
  it('refreshes changed script deliveries when refreshed', async () => {
    const wrapper = await mountPanel()
    fetch.mockResolvedValue([
      record({ submission_version: 2, body: 'Your verified replacement script is attached.' }),
    ])
    await wrapper.setProps({ refreshKey: 1 })
    await flushPromises()
    expect(wrapper.text()).toContain('Script version 2')
    expect(wrapper.text()).toContain('Your verified replacement script is attached.')
  })
  it('polls pending deliveries without overlapping a slow request and stops on sent', async () => {
    const wrapper = await mountPanel([record({ status: 'queued' })])
    let finish!: (records: ScriptEmail[]) => void
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    await vi.advanceTimersByTimeAsync(9000)
    expect(fetch).toHaveBeenCalledTimes(2)
    finish([record({ status: 'sent' })])
    await flushPromises()
    await vi.advanceTimersByTimeAsync(9000)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Sent')
  })
  it('ignores a stale refresh and aborts outstanding requests on unmount', async () => {
    const wrapper = await mountPanel()
    let finish!: (records: ScriptEmail[]) => void
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    await wrapper.setProps({ refreshKey: 1 })
    const signal = fetch.mock.calls[1]?.[1]
    wrapper.unmount()
    expect(signal?.aborted).toBe(true)
    finish([record({ status: 'queued' })])
    await flushPromises()
    await vi.advanceTimersByTimeAsync(9000)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

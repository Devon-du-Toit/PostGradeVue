import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ResultEmailPanel from '@/components/ResultEmailPanel.vue'
import {
  approveAssessmentEmails,
  approveResultEmail,
  fetchResultEmails,
  retryResultEmail,
} from '@/services/resultEmails'
import type { ResultEmail } from '@/types/resultEmail'

vi.mock('@/services/resultEmails', () => ({
  fetchResultEmails: vi.fn<typeof fetchResultEmails>(),
  approveAssessmentEmails: vi.fn<typeof approveAssessmentEmails>(),
  approveResultEmail: vi.fn<typeof approveResultEmail>(),
  retryResultEmail: vi.fn<typeof retryResultEmail>(),
}))
const fetch = vi.mocked(fetchResultEmails)
const record = (overrides: Partial<ResultEmail> = {}): ResultEmail => ({
  id: 11,
  result: 4,
  result_version: 1,
  is_current: true,
  student_number: '00123456',
  recipient: 'student@example.invalid',
  subject: 'Stored subject',
  body: 'Stored body\n75 / 100',
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
  const wrapper = mount(ResultEmailPanel, { props: { assessmentId: 7, refreshKey: 0 } })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}
const button = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll('button').find((item) => item.text() === text)!

describe('ResultEmailPanel', () => {
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
    expect(wrapper.find('pre').text()).toBe('Stored body\n75 / 100')
    expect(wrapper.text()).not.toContain('student@example.com')
    expect(wrapper.text()).toContain('Awaiting approval')
  })
  it('approves one email and refreshes the queued status', async () => {
    const wrapper = await mountPanel()
    vi.mocked(approveResultEmail).mockResolvedValue(record({ status: 'queued' }))
    fetch.mockResolvedValue([record({ status: 'queued' })])
    await button(wrapper, 'Approve email').trigger('click')
    await flushPromises()
    expect(approveResultEmail).toHaveBeenCalledWith(11)
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
    vi.mocked(retryResultEmail).mockRejectedValue({
      response: { data: { detail: 'The student has no email address.' } },
    })
    await button(wrapper, 'Retry failed email').trigger('click')
    await flushPromises()
    expect(retryResultEmail).toHaveBeenCalledWith(11, false)
    expect(wrapper.get('[role="alert"]').text()).toContain('The student has no email address.')
  })
  it('requires deliberate duplicate confirmation only for uncertain delivery', async () => {
    const wrapper = await mountPanel([
      record({ status: 'failed', failure_reason: 'delivery_unknown' }),
    ])
    expect(button(wrapper, 'Confirm resend').attributes('disabled')).toBeDefined()
    expect(retryResultEmail).not.toHaveBeenCalled()
    await wrapper.get('input[type="checkbox"]').setValue(true)
    vi.mocked(retryResultEmail).mockResolvedValue(record({ status: 'queued' }))
    await button(wrapper, 'Confirm resend').trigger('click')
    await flushPromises()
    expect(retryResultEmail).toHaveBeenCalledWith(11, true)
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
    expect(wrapper.text()).toContain('Previous mark version')
  })
  it('refreshes corrected results when a mark is saved', async () => {
    const wrapper = await mountPanel()
    fetch.mockResolvedValue([record({ result_version: 2, body: 'Corrected result: 80 / 100' })])
    await wrapper.setProps({ refreshKey: 1 })
    await flushPromises()
    expect(wrapper.text()).toContain('Result version 2')
    expect(wrapper.text()).toContain('Corrected result: 80 / 100')
  })
  it('polls pending deliveries without overlapping a slow request and stops on sent', async () => {
    const wrapper = await mountPanel([record({ status: 'queued' })])
    let finish!: (records: ResultEmail[]) => void
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
    let finish!: (records: ResultEmail[]) => void
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

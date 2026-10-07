import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import api from '@/services/api'
import AddCourseStudentForm from '@/components/AddCourseStudentForm.vue'
import { addCourseStudent } from '@/services/students'

vi.mock('@/services/api', () => ({ default: { post: vi.fn<typeof api.post>() } }))
const student = {
  student_number: '00123456',
  first_name: ' Alice, "Ali" ',
  last_name: ' Smith ',
  email: ' alice@example.invalid ',
}
describe('manual course enrollment', () => {
  beforeEach(() => vi.resetAllMocks())
  it('uses one atomic course request with escaped fields and leading zeros', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        message: 'Imported',
        summary: { total: 1, created: 1, updated: 0, failed: 0 },
        errors: [],
      },
    })
    await addCourseStudent(7, student)
    const [url, body] = vi.mocked(api.post).mock.calls[0]!
    expect(url).toBe('courses/7/import-students/')
    const data = body as FormData
    expect(data.get('update_existing')).toBe('false')
    const csv = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsText(data.get('file') as File)
    })
    expect(csv).toBe(
      'student_number,first_name,last_name,email\r\n"00123456","Alice, ""Ali""","Smith","alice@example.invalid"\r\n',
    )
  })
  it('retains entered data and reports backend validation errors', async () => {
    vi.mocked(api.post).mockRejectedValue({
      response: {
        data: { errors: [{ message: 'Student is withdrawn. Restore membership explicitly.' }] },
      },
    })
    const wrapper = mount(AddCourseStudentForm, { props: { courseId: 7 } })
    await wrapper.findAll('input')[0]!.setValue('00123456')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Restore membership explicitly')
    expect((wrapper.findAll('input')[0]!.element as HTMLInputElement).value).toBe('00123456')
    expect(wrapper.emitted('added')).toBeUndefined()
    wrapper.unmount()
  })
  it('clears the form and refreshes the course only after successful enrollment', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { summary: { failed: 0 }, errors: [] } })
    const wrapper = mount(AddCourseStudentForm, { props: { courseId: 7 } })
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.emitted('added')).toHaveLength(1)
    expect(wrapper.get('[role="status"]').text()).toContain('Student added')
    wrapper.unmount()
  })
  it('does not report success for a rejected row in a 200 response', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { summary: { failed: 1 }, errors: [{ message: 'Email is invalid.' }] },
    })
    await expect(addCourseStudent(7, student)).rejects.toThrow('Email is invalid.')
  })
  it('explains when an existing student is enrolled without overwriting contact details', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        summary: { failed: 0 },
        mismatches: [{ student_number: '00123456', differences: { email: {} } }],
      },
    })
    const wrapper = mount(AddCourseStudentForm, { props: { courseId: 7 } })
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toContain('existing saved name and email')
    expect(wrapper.emitted('added')).toHaveLength(1)
    wrapper.unmount()
  })
})

import { describe, expect, it, vi } from 'vitest'
import api from '@/services/api'
import { fetchAssessmentScripts } from '@/services/assessments'

vi.mock('@/services/api', () => ({ default: { get: vi.fn<typeof api.get>() } }))

describe('assessment script export', () => {
  it('requests the selected assessment through the authenticated client as a blob', async () => {
    const blob = new Blob(['original ZIP'])
    vi.mocked(api.get).mockResolvedValueOnce({ data: blob })
    const controller = new AbortController()
    expect(await fetchAssessmentScripts(7, controller.signal)).toBe(blob)
    expect(api.get).toHaveBeenLastCalledWith('assessments/7/scripts/export/', {
      responseType: 'blob',
      signal: controller.signal,
      timeout: 120_000,
    })
  })

  it('shows backend empty, unavailable, and limit messages from blob errors', async () => {
    const data = new Blob()
    data.text = async () => JSON.stringify({ detail: 'This assessment has no uploaded scripts.' })
    vi.mocked(api.get).mockRejectedValueOnce({ isAxiosError: true, response: { data } })
    await expect(fetchAssessmentScripts(7)).rejects.toThrow(
      'This assessment has no uploaded scripts.',
    )
  })

  it('gives a readable message for a network failure', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('network'))
    await expect(fetchAssessmentScripts(7)).rejects.toThrow(
      'Could not download scripts. Please try again.',
    )
  })
})

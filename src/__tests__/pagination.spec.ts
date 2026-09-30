import { beforeEach, describe, expect, it, vi } from 'vitest'

import api from '@/services/api'
import { fetchAllPages, PAGE_SIZE } from '@/services/pagination'

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

const mockedApi = vi.mocked(api)

const pageOf = (count: number, ids: number[]) => ({
  data: {
    count,
    next: null,
    previous: null,
    results: ids.map((id) => ({ id })),
  },
})

describe('fetchAllPages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns one page without further requests', async () => {
    mockedApi.get.mockResolvedValueOnce(pageOf(2, [1, 2]))

    const items = await fetchAllPages<{ id: number }>('courses/')

    expect(items).toEqual([{ id: 1 }, { id: 2 }])
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
  })

  it('joins every page in order', async () => {
    const count = PAGE_SIZE * 2 + 1
    mockedApi.get
      .mockResolvedValueOnce(pageOf(count, [1]))
      .mockResolvedValueOnce(pageOf(count, [2]))
      .mockResolvedValueOnce(pageOf(count, [3]))

    const items = await fetchAllPages<{ id: number }>('submissions/')

    expect(items).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    expect(mockedApi.get).toHaveBeenCalledTimes(3)
    const pages = mockedApi.get.mock.calls.map(
      ([, config]) => (config?.params as { page: number }).page,
    )
    expect(pages).toEqual([1, 2, 3])
  })

  it('sends the filters and abort signal with every page', async () => {
    const controller = new AbortController()
    mockedApi.get
      .mockResolvedValueOnce(pageOf(PAGE_SIZE + 1, [1]))
      .mockResolvedValueOnce(pageOf(PAGE_SIZE + 1, [2]))

    await fetchAllPages('submissions/', { assessment: 7 }, controller.signal)

    for (const [url, config] of mockedApi.get.mock.calls) {
      expect(url).toBe('submissions/')
      expect(config?.params).toMatchObject({ assessment: 7, page_size: PAGE_SIZE })
      expect(config?.signal).toBe(controller.signal)
    }
  })

  it('accepts a plain array from a backend without pagination', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: 1 }, { id: 2 }] })

    await expect(fetchAllPages('courses/')).resolves.toEqual([{ id: 1 }, { id: 2 }])
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
  })

  it('returns an empty list when there is nothing', async () => {
    mockedApi.get.mockResolvedValueOnce(pageOf(0, []))

    await expect(fetchAllPages('courses/')).resolves.toEqual([])
    expect(mockedApi.get).toHaveBeenCalledTimes(1)
  })
})

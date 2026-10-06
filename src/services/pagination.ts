import api from '@/services/api'

// Every backend list endpoint is paginated (#11).
export interface Page<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Largest page the backend allows, so full lists need the fewest requests.
export const PAGE_SIZE = 100

type Params = Record<string, string | number | undefined>

// For views that need the whole list (submission list, class list): page 1 gives
// the total, then the remaining pages are fetched in parallel. Pages are
// requested by number rather than by following `next`, which the server
// builds as an absolute URL that can carry the wrong scheme behind a proxy.
export const fetchAllPages = async <T>(
  url: string,
  params: Params = {},
  signal?: AbortSignal,
): Promise<T[]> => {
  const fetchPage = async (page: number) => {
    const response = await api.get<Page<T> | T[]>(url, {
      params: { ...params, page, page_size: PAGE_SIZE },
      signal,
    })
    return response.data
  }

  const firstResponse = await fetchPage(1)

  // Rollout compatibility: a backend without #11 still returns a plain array.
  // Remove once backend #11 (PR #29) is merged everywhere.
  if (Array.isArray(firstResponse)) {
    return firstResponse
  }

  const first = firstResponse
  const pageCount = Math.ceil(first.count / PAGE_SIZE)
  const rest = await Promise.all(
    Array.from({ length: Math.max(pageCount - 1, 0) }, (_, index) => fetchPage(index + 2)),
  )

  return [first, ...(rest as Page<T>[])].flatMap((page) => page.results)
}

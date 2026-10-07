import type { GroupedPage } from '@/types/submission'

export const orderedScriptPages = (pages: GroupedPage[] = []) =>
  [...pages].sort((left, right) => {
    const number = (label: string) => Number(/^P(\d+)$/.exec(label)?.[1] ?? Number.MAX_SAFE_INTEGER)
    return number(left.page_label) - number(right.page_label) || left.id - right.id
  })

export const workflowError = (cause: unknown, fallback: string) => {
  const response = (
    cause as { response?: { data?: Record<string, unknown>; status?: number } } | null
  )?.response
  const messages = response?.data
    ? Object.values(response.data)
        .flat()
        .filter((item) => typeof item === 'string')
    : []
  return messages.join(' ') || fallback
}

export const savePrivateBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

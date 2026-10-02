import { vi } from 'vitest'

let store: Record = {}

const localStorageMock = {
  getItem: vi.fn<(key: string) => string | null>((key) => store[key] || null),
  setItem: vi.fn<(key: string, value: string) => void>((key, value) => { store[key] = value }),
  removeItem: vi.fn<(key: string) => void>((key) => { delete store[key] }),
  clear: vi.fn<() => void>(() => { store = {} }),
}

vi.stubGlobal('localStorage', localStorageMock)

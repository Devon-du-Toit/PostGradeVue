import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from '../App.vue'
import router from '../router'

// Bypass JSDOM's broken storage by injecting a fake localStorage
let mockStorage: Record<string, string> = {}

vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value },
  clear: () => { mockStorage = {} }
})

describe('App', () => {
  it('renders the active route', () => {
    const wrapper = mount(App, {
      global: {
        // Add createPinia() here so App.vue has access to the auth store
        plugins: [router, createPinia()]
      }
    })

    expect(wrapper.exists()).toBe(true)
  })
})

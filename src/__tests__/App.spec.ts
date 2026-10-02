import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from '../App.vue'
import router from '../router'

describe('App', () => {
  it('renders the active route', () => {
    const wrapper = mount(App, {
      global: {
        // Add createPinia() here so App.vue has access to the auth store
        plugins: [router, createPinia()]
      }
    })

    expect(wrapper.find('header').exists()).toBe(true)
  })
})

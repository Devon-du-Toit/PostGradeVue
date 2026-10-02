import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from '../App.vue'
import router from '../router'

describe('App', () => {
  it('renders the active route', async () => {
    // 1. Set the token so the router allows access
    localStorage.setItem('accessToken', 'test-token')

    // 2. Await the router resolution
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router, createPinia()]
      }
    })

    // 3. Satisfy requirement by asserting the header text rendered
    expect(wrapper.text()).toContain('PostGrade')
  })
})

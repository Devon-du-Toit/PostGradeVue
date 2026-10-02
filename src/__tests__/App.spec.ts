import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from '../App.vue'
import router from '../router'

describe('App', () => {
  it('renders the active route', async () => {
    // 1. Set a token so the app bypasses the login screen and loads the main layout
    localStorage.setItem('accessToken', 'token')

    // 2. Await the router resolution BEFORE mounting
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router, createPinia()],
      },
    })

    // 3. Now that the route is fully resolved, the header will be in the DOM
    expect(wrapper.find('header').exists()).toBe(true)
  })
})
